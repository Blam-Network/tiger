import { describe, expect, it } from "vitest";
import { e_event_level } from "../../src/blam/cseries/event_levels.ts";
import {
  build_banner,
  build_networking_buffer_for_log,
  event_line_options_resolve,
  format_event_for_log,
  k_event_line_options_default,
  type s_event_line_options,
  type s_event_log_line,
} from "../../src/blam/cseries/event_log_format.ts";
import {
  c_log_text_parser,
  log_detect_format,
  log_detect_text_format,
} from "../../src/reading/log_text_parser.ts";
import {
  k_line_date as k_date,
  make_log_line,
  parse_log_text,
} from "../support/event_lines.ts";

function make_line(
  overrides: Partial<s_event_log_line> = {}
): s_event_log_line {
  return make_log_line({ game_time: 25, ...overrides });
}

function parse_all(text: string, chunk_size = text.length || 1) {
  return parse_log_text(text, undefined, chunk_size);
}

const k_levels = [
  e_event_level.verbose,
  e_event_level.status,
  e_event_level.message,
  e_event_level.warning,
  e_event_level.error,
  e_event_level.critical,
] as const;

// Every combination of the toggles, so each column order and absence is read back.
function every_column_set(): s_event_line_options[] {
  const flags = [false, true];
  const sets: s_event_line_options[] = [];
  for (const date of ["short", "long"] as const) {
    for (const level of ["upper", "lower"] as const) {
      for (const event_index of flags) {
        for (const game_time of flags) {
          for (const thread_id of flags) {
            for (const context of flags) {
              sets.push({
                date,
                level,
                event_index,
                game_time,
                thread_id,
                context,
              });
            }
          }
        }
      }
    }
  }
  return sets;
}

describe("event logs", () => {
  it("reads every column combination the banner announces", () => {
    for (const columns of every_column_set()) {
      const lines = k_levels.map((level, index) =>
        make_line({
          level,
          event_index: 100 + index,
          game_time: 25 + index,
          frame_index: index % 2 === 0 ? 1000 + index : undefined,
          thread_id: 0xab_cd + index,
          text: `design:hs: line ${index}`,
          context: index % 2 === 0 ? "[(job)A:(job)B]" : "",
        })
      );
      const text =
        build_banner("test 1.0", columns) +
        lines.map((line) => format_event_for_log(line, columns)).join("");
      const { entries, parser, sessions } = parse_all(text);
      const label = JSON.stringify(columns);
      expect(parser.format, label).toBe("event_log");
      expect(sessions, label).toHaveLength(1);
      expect(sessions[0].session, label).toEqual({
        number: 1,
        version: "test 1.0",
        columns,
      });
      expect(entries, label).toHaveLength(lines.length);
      for (const [index, entry] of entries.entries()) {
        const line = lines[index];
        expect(entry.date, label).toEqual(k_date);
        expect(entry.date_text, label).toBe(
          columns.date === "short"
            ? "10.16.26 00:53:27.067"
            : "10/16/2026 00:53:27.067"
        );
        expect(entry.level, label).toBe(line.level);
        expect(entry.text, label).toBe(`design:hs: line ${index}`);
        expect(entry.category_path, label).toBe("design:hs");
        expect(entry.event_index, label).toBe(
          columns.event_index ? line.event_index : undefined
        );
        expect(entry.game_time, label).toBe(
          columns.game_time ? line.game_time : undefined
        );
        expect(entry.frame_index, label).toBe(
          columns.game_time ? line.frame_index : undefined
        );
        expect(entry.thread_id, label).toBe(
          columns.thread_id ? line.thread_id : undefined
        );
        expect(entry.context, label).toBe(
          columns.context && line.context ? line.context : undefined
        );
      }
    }
  });

  it("reads the netbuf columns and a context on the same line", () => {
    const custom_prefix = build_networking_buffer_for_log([1500, undefined, 2]);
    const text =
      build_banner("v", event_line_options_resolve({ date: "short" })) +
      format_event_for_log(
        make_line({
          custom_prefix,
          level: e_event_level.error,
          context: "[(game)match:(ui)lobby]",
        }),
        event_line_options_resolve({ date: "short" })
      ) +
      format_event_for_log(
        make_line({ event_index: 62 }),
        event_line_options_resolve({ date: "short" })
      );
    const { entries } = parse_all(text);
    expect(entries).toHaveLength(2);
    expect(entries[0].custom_prefix).toBe(custom_prefix);
    expect(entries[0].context).toBe("[(game)match:(ui)lobby]");
    expect(entries[0].level).toBe(e_event_level.error);
    expect(entries[0].text).toBe("networking: request started");
    expect(entries[1].custom_prefix).toBeUndefined();
  });

  it("keeps text that begins with spaces, and continuation lines", () => {
    const text =
      build_banner("v") +
      format_event_for_log(make_line({ text: "  indented" })) +
      format_event_for_log(
        make_line({ text: "a: first\nsecond", context: "[(x)y]" })
      );
    const { entries } = parse_all(text);
    expect(entries[0].text).toBe("  indented");
    expect(entries[1].text).toBe("a: first\nsecond");
    expect(entries[1].context).toBe("[(x)y]");
  });

  it("gives the same entries whatever the chunk size", () => {
    const text =
      build_banner("v") +
      format_event_for_log(make_line()) +
      format_event_for_log(make_line({ text: "a: b\nc", context: "[(x)y]" }));
    const whole = parse_all(text).all;
    for (const size of [1, 2, 7, 50]) {
      expect(parse_all(text, size).all).toEqual(whole);
    }
  });

  it("follows the columns of each banner in an appended file", () => {
    const first = event_line_options_resolve({ date: "short", level: "upper" });
    const second = k_event_line_options_default;
    const text =
      build_banner("run one", first) +
      format_event_for_log(make_line({ text: "a: one" }), first) +
      build_banner("run two", second) +
      format_event_for_log(make_line({ text: "b: two" }), second);
    const { all, entries, sessions } = parse_all(text);
    expect(sessions.map((entry) => entry.session?.version)).toEqual([
      "run one",
      "run two",
    ]);
    expect(entries.map((entry) => entry.text)).toEqual(["a: one", "b: two"]);
    expect(entries[0].date_text).toBe("10.16.26 00:53:27.067");
    expect(entries[1].date_text).toBe("10/16/2026 00:53:27.067");
    expect(all.map((entry) => entry.ordinal)).toEqual([0, 1, 2, 3]);
  });

  it("skips the cut-off start of a trimmed file", () => {
    const text = `ng started\r\n${build_banner("v")}${format_event_for_log(make_line())}`;
    const { entries } = parse_all(text);
    expect(entries).toHaveLength(1);
  });

  it("puts the banner's columns on its session row", () => {
    const columns = event_line_options_resolve({
      date: "short",
      level: "upper",
    });
    const { sessions } = parse_all(build_banner("v", columns));
    expect(sessions[0].session?.columns).toEqual(columns);
  });

  it("reads a lone line with the columns it is given", () => {
    const columns = event_line_options_resolve({
      date: "short",
      level: "upper",
    });
    const text = format_event_for_log(make_line({ text: "a: b" }), columns);
    const parser = new c_log_text_parser("event_log", { columns });
    const entries = [...parser.push(text), ...parser.finish()];
    expect(parser.columns).toEqual(columns);
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("a: b");
    // without them the line is not understood
    const bare = new c_log_text_parser("event_log");
    expect([...bare.push(text), ...bare.finish()]).toEqual([]);
  });

  it("is detected from the columns line", () => {
    const text = build_banner("v") + format_event_for_log(make_line());
    expect(log_detect_text_format(text)).toBe("event_log");
    expect(log_detect_format("debug.txt", new TextEncoder().encode(text))).toBe(
      "event_log"
    );
  });
});
