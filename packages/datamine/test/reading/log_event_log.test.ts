import { describe, expect, it } from "vitest";
import { e_event_level } from "../../src/blam/cseries/event_levels.ts";
import {
  build_banner,
  build_networking_buffer_for_log,
  format_event_for_log,
  type s_event_log_line,
} from "../../src/blam/cseries/event_log_format.ts";
import type { t_data_mine_header_layout } from "../../src/blam/data_mining/data_mine_formats.ts";
import {
  log_detect_format,
  log_detect_text_format,
} from "../../src/reading/log_text_parser.ts";
import {
  destiny_style_line,
  halo_style_line,
} from "../fixtures/game_report_lines.ts";
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

const k_halo_layouts = ["1.0", "1.1", "2.0", "2.1"] as const;

// One line per level, with the optional columns on and off in turn.
function make_lines(): s_event_log_line[] {
  return k_levels.map((level, index) =>
    make_line({
      level,
      event_index: 100 + index,
      game_time: index % 3 === 0 ? undefined : 25 + index,
      frame_index: 1000 + index,
      thread_id: 0xab_cd + index,
      text: `design:hs: line ${index}`,
      context: index % 2 === 0 ? "[(job)A:(job)B]" : "",
    })
  );
}

describe("halo style event logs", () => {
  it("reads back every column of every line the writer makes", () => {
    for (const layout of k_halo_layouts) {
      const lines = make_lines();
      const text =
        build_banner("test 1.0") +
        lines.map((line) => format_event_for_log(line, layout)).join("");
      const { entries, parser, sessions } = parse_all(text);
      expect(parser.format, layout).toBe("halo_style_log");
      expect(sessions, layout).toHaveLength(1);
      expect(sessions[0].session, layout).toEqual({
        number: 1,
        version: "test 1.0",
      });
      expect(entries, layout).toHaveLength(lines.length);
      for (const [index, entry] of entries.entries()) {
        const line = lines[index];
        expect(entry.date, layout).toEqual(k_date);
        expect(entry.date_text, layout).toBe("10.16.26 00:53:27.067");
        expect(entry.level, layout).toBe(line.level);
        expect(entry.text, layout).toBe(`design:hs: line ${index}`);
        expect(entry.category_path, layout).toBe("design:hs");
        expect(entry.event_index, layout).toBe(line.event_index);
        expect(entry.game_time, layout).toBe(line.game_time);
        expect(entry.frame_index, layout).toBe(line.frame_index);
        expect(entry.thread_id, layout).toBeUndefined();
        expect(entry.custom_prefix, layout).toBeUndefined();
        expect(entry.context, layout).toBe(line.context || undefined);
      }
    }
  });

  it("reads a frame that was not known as zero", () => {
    const text = format_event_for_log(
      make_line({ frame_index: undefined }),
      "1.1"
    );
    expect(parse_all(text).entries[0].frame_index).toBe(0);
  });

  it("reads the netbuf columns and a context on the same line", () => {
    const custom_prefix = build_networking_buffer_for_log([1500, undefined, 2]);
    const text =
      build_banner("v") +
      format_event_for_log(
        make_line({
          custom_prefix,
          level: e_event_level.error,
          context: "[(game)match:(ui)lobby]",
        }),
        "1.1"
      ) +
      format_event_for_log(make_line({ event_index: 62 }), "1.1");
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
      format_event_for_log(make_line({ text: "  indented" }), "1.1") +
      format_event_for_log(
        make_line({ text: "a: first\nsecond", context: "[(x)y]" }),
        "1.1"
      );
    const { entries } = parse_all(text);
    expect(entries[0].text).toBe("  indented");
    expect(entries[1].text).toBe("a: first\nsecond");
    expect(entries[1].context).toBe("[(x)y]");
  });

  it("reads the same lines as the game's report fixtures write", () => {
    const line = make_line({
      context: "[(x)y]",
      custom_prefix: " ".repeat(38),
    });
    expect(format_event_for_log(line, "1.1")).toBe(halo_style_line(line));
    const bare = make_line({ game_time: undefined });
    expect(format_event_for_log(bare, "1.1")).toBe(halo_style_line(bare));
  });
});

describe("destiny style event logs", () => {
  it("reads back every column of every line the writer makes", () => {
    const lines = make_lines();
    const text =
      build_banner("test 1.0") +
      lines.map((line) => format_event_for_log(line, "3.1")).join("");
    const { entries, parser, sessions } = parse_all(text);
    expect(parser.format).toBe("destiny_style_log");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].session).toEqual({ number: 1, version: "test 1.0" });
    expect(entries).toHaveLength(lines.length);
    for (const [index, entry] of entries.entries()) {
      const line = lines[index];
      expect(entry.date).toEqual(k_date);
      expect(entry.date_text).toBe("10/16/2026 00:53:27.067");
      expect(entry.level).toBe(line.level);
      expect(entry.text).toBe(`design:hs: line ${index}`);
      expect(entry.category_path).toBe("design:hs");
      expect(entry.game_time).toBe(line.game_time ?? 0);
      expect(entry.thread_id).toBe(line.thread_id);
      expect(entry.event_index).toBeUndefined();
      expect(entry.frame_index).toBeUndefined();
      expect(entry.context).toBeUndefined();
    }
  });

  it("reads the same lines as the game's report fixtures write", () => {
    const line = make_line({ thread_id: 0xab_cd });
    expect(format_event_for_log(line, "3.1")).toBe(destiny_style_line(line));
  });

  it("keeps a bracketed ending as part of the text", () => {
    const text = format_event_for_log(
      make_line({ text: "a: b [(x)y]" }),
      "3.1"
    );
    const entry = parse_all(text).entries[0];
    expect(entry.text).toBe("a: b [(x)y]");
    expect(entry.context).toBeUndefined();
  });

  it("keeps text that begins with spaces, and continuation lines", () => {
    const text =
      format_event_for_log(make_line({ text: "  indented" }), "3.1") +
      format_event_for_log(make_line({ text: "a: first\nsecond" }), "3.1");
    const { entries } = parse_all(text);
    expect(entries[0].text).toBe("  indented");
    expect(entries[1].text).toBe("a: first\nsecond");
  });
});

describe("event log files", () => {
  it("give the same entries whatever the chunk size", () => {
    for (const layout of ["1.1", "3.1"] as const) {
      const text =
        build_banner("v") +
        format_event_for_log(make_line(), layout) +
        format_event_for_log(
          make_line({ text: "a: b\nc", context: "[(x)y]" }),
          layout
        );
      const whole = parse_all(text).all;
      for (const size of [1, 2, 7, 50]) {
        expect(parse_all(text, size).all).toEqual(whole);
      }
    }
  });

  it("have a session row per banner in an appended file", () => {
    for (const layout of ["1.1", "3.1"] as const) {
      const text =
        build_banner("run one") +
        format_event_for_log(make_line({ text: "a: one" }), layout) +
        build_banner("run two") +
        format_event_for_log(make_line({ text: "b: two" }), layout);
      const { all, entries, sessions } = parse_all(text);
      expect(sessions.map((entry) => entry.session?.version)).toEqual([
        "run one",
        "run two",
      ]);
      expect(entries.map((entry) => entry.text)).toEqual(["a: one", "b: two"]);
      expect(all.map((entry) => entry.ordinal)).toEqual([0, 1, 2, 3]);
    }
  });

  it("skip the cut-off start of a trimmed file", () => {
    for (const layout of ["1.1", "3.1"] as const) {
      const text = `ng started\r\n${build_banner("v")}${format_event_for_log(make_line(), layout)}`;
      expect(parse_all(text).entries).toHaveLength(1);
    }
  });

  it("are detected from the first line", () => {
    const formats: [t_data_mine_header_layout, string][] = [
      ["1.1", "halo_style_log"],
      ["2.1", "halo_style_log"],
      ["3.1", "destiny_style_log"],
    ];
    for (const [layout, format] of formats) {
      const text =
        build_banner("v") + format_event_for_log(make_line(), layout);
      expect(log_detect_text_format(text)).toBe(format);
      expect(
        log_detect_format("debug.txt", new TextEncoder().encode(text))
      ).toBe(format);
    }
  });

  it("have no columns line in the banner", () => {
    expect(build_banner("v")).not.toContain("columns:");
  });

  it("take an old columns banner line as banner text", () => {
    const rule = "=".repeat(80);
    const banner = `${rule}\r\nweb-tiger 1.0\r\ncolumns: date=long,event_index,game_time,thread_id,level=lower,context\r\n${rule}\r\n\r\n`;
    const text = banner + format_event_for_log(make_line(), "3.1");
    const { all, entries, sessions } = parse_all(text);
    expect(all).toHaveLength(2);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].session?.version).toBe("web-tiger 1.0");
    expect(sessions[0].raw).toContain("columns: date=long");
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("networking: request started");
  });
});
