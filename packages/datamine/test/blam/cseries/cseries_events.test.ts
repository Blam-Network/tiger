import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  event,
  event_critical,
  event_dump_categories,
  event_error,
  event_logs_flush,
  event_logs_snapshot,
  event_message,
  event_once,
  event_set_debugger_break_level_by_name,
  event_set_debugger_break_level_global,
  event_set_display_level_by_name,
  event_set_force_display_level_by_name,
  event_set_halt_level_by_name,
  event_set_log_level_by_name,
  event_set_log_level_global,
  event_set_remote_log_level_by_name,
  event_status,
  event_verbose,
  event_warning,
  events_clear,
  events_dispose,
  events_get,
  events_initialize,
  events_initialized,
  events_register_listener,
  events_set_remote_log_handler,
  events_spam_suppression_enable,
  events_unregister_listener,
  type s_event_listener_event,
  type s_event_remote_record,
} from "../../../src/blam/cseries/cseries_events.ts";
import type { s_real_rgb_color } from "../../../src/blam/cseries/event_categories.ts";
import type { s_event_category_default_configuration } from "../../../src/blam/cseries/event_category_defaults.ts";
import { event_context_run } from "../../../src/blam/cseries/event_context.ts";
import {
  e_event_level,
  k_event_level_none,
} from "../../../src/blam/cseries/event_levels.ts";
import {
  build_banner,
  event_line_options_resolve,
  type s_event_line_options,
} from "../../../src/blam/cseries/event_log_format.ts";
import { k_console_spam_notice } from "../../../src/blam/cseries/event_spam.ts";
import type { s_events_initialize_options } from "../../../src/config/event_options.ts";
import { DatamineError } from "../../../src/datamine_error.ts";
import { k_test_category_defaults } from "../../fixtures/category_defaults.ts";
import { fixed_clock } from "../../support/clocks.ts";
import { temp_dirs } from "../../support/temp_dirs.ts";

const k_start = new Date(2026, 9, 16, 12, 0, 0, 0);
const k_version = "test build";
// Short date, index, game time and frame, upper case level: the shape of a Halo report.
const k_upper_line: Partial<s_event_line_options> = {
  date: "short",
  event_index: true,
  game_time: true,
  thread_id: false,
  level: "upper",
  context: true,
};
const k_banner = build_banner(
  k_version,
  event_line_options_resolve(k_upper_line)
);

const temp = temp_dirs("datamine-events-");
const make_root = temp.make;
const k_clock = fixed_clock(k_start, 100_000);

function init(
  root: string,
  options: Partial<s_events_initialize_options> = {}
): void {
  events_initialize({
    root,
    install_exit_flush: false,
    categories: k_test_category_defaults,
    line: k_upper_line,
    root_debug_log: true,
    version_string: k_version,
    ...options,
    providers: { clock: k_clock, frame_index: () => 1, ...options.providers },
  });
}

function read(path: string): string {
  return readFileSync(path, "latin1");
}

function lines_of(path: string): string[] {
  return read(path)
    .split("\r\n")
    .filter((line) => line.length > 0);
}

function count_of(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

afterEach(() => {
  events_dispose();
  events_set_remote_log_handler(undefined);
  vi.useRealTimers();
  temp.remove_all();
});

describe("lifecycle", () => {
  it("does nothing before initialize", () => {
    expect(events_initialized()).toBe(false);
    expect(() => event_error("networking: nobody home")).not.toThrow();
    expect(() => event(e_event_level.critical, "x")).not.toThrow();
    expect(events_get()).toBe("");
    expect(event_logs_snapshot()).toEqual([]);
  });

  it("throws on a second initialize", () => {
    const root = make_root();
    init(root);
    expect(events_initialized()).toBe(true);
    expect(() => init(root)).toThrow(DatamineError);
  });

  it("can initialize again after dispose", () => {
    const root = make_root();
    init(root);
    events_dispose();
    expect(events_initialized()).toBe(false);
    expect(() => init(root)).not.toThrow();
  });

  it("registers one exit handler and removes it on dispose", () => {
    const before = process.listenerCount("exit");
    events_initialize({ root: make_root() });
    expect(process.listenerCount("exit")).toBe(before + 1);
    events_dispose();
    expect(process.listenerCount("exit")).toBe(before);
  });
});

describe("report files", () => {
  it("writes the primary logs and the category's own file", () => {
    const root = make_root();
    init(root);
    event_error("networking: link down");
    event_message("networking: ping");
    events_dispose();

    for (const file of [
      join(root, "debug.txt"),
      join(root, "reports", "debug.txt"),
      join(root, "reports", "debug_full.txt"),
      join(root, "reports", "networking_debug.txt"),
    ]) {
      expect(existsSync(file), file).toBe(true);
    }
    expect(existsSync(join(root, "reports", "hs_log.txt"))).toBe(false);

    // Only the error reaches debug.txt, the message stays in the full log and the category file.
    expect(read(join(root, "debug.txt"))).toContain("networking: link down");
    expect(read(join(root, "debug.txt"))).not.toContain("networking: ping");
    expect(read(join(root, "reports", "debug_full.txt"))).toContain(
      "networking: ping"
    );
    expect(read(join(root, "reports", "networking_debug.txt"))).toContain(
      "networking: ping"
    );
  });

  it("writes exact lines with the event index counting up", () => {
    const root = make_root();
    init(root);
    event_error("hs: first");
    event_error("hs: second %d", 2);
    events_dispose();
    const body = read(join(root, "debug.txt")).slice(k_banner.length);
    expect(body).toBe(
      [
        "10.16.26 12:00:00.000 0000000 g00000000 f0000001 -ERROR- hs: first\r\n",
        "10.16.26 12:00:00.000 0000001 g00000000 f0000001 -ERROR- hs: second 2\r\n",
      ].join("")
    );
  });

  it("writes the long date, index, thread and lower case level by default", () => {
    const root = make_root();
    events_initialize({
      root,
      install_exit_flush: false,
      categories: k_test_category_defaults,
      version_string: k_version,
      providers: { clock: k_clock, thread_id: () => 0x1f },
    });
    event_error("hs: plain");
    events_dispose();
    const full = read(join(root, "reports", "debug_full.txt"));
    expect(full).toBe(
      `${build_banner(k_version)}10/16/2026 12:00:00.000 0000000 0000001F error    hs: plain\r\n`
    );
  });

  it("prints game time and netbuf columns from the providers", () => {
    const root = make_root();
    init(root, {
      providers: {
        game_time: () => 25_637,
        frame_index: () => 92_363,
        network_session_clocks: () => [3_723_456, undefined, undefined],
      },
    });
    event_message("networking: ping");
    events_dispose();
    const category_line = lines_of(
      join(root, "reports", "networking_debug.txt")
    ).at(-1);
    expect(category_line).toBe(
      `10.16.26 12:00:00.000 0000000 g00025637 f0092363 01:02:03.456 ${" ".repeat(12)} ${" ".repeat(12)} message networking: ping`
    );
    // The full log gets the same event without the netbuf columns.
    expect(lines_of(join(root, "reports", "debug_full.txt")).at(-1)).toBe(
      "10.16.26 12:00:00.000 0000000 g00025637 f0092363 message networking: ping"
    );
  });

  it("leaves the frame out when no provider knows it", () => {
    const root = make_root();
    events_initialize({
      root,
      install_exit_flush: false,
      categories: k_test_category_defaults,
      line: k_upper_line,
      providers: { clock: k_clock, game_time: () => 7 },
    });
    event_error("hs: no frame");
    events_dispose();
    expect(lines_of(join(root, "reports", "debug_full.txt")).at(-1)).toBe(
      "10.16.26 12:00:00.000 0000000 g00000007 -ERROR- hs: no frame"
    );
  });

  it("writes the banner once per file", () => {
    const root = make_root();
    init(root);
    for (let i = 0; i < 5; i++) {
      event_error("hs: line %d", i);
    }
    events_dispose();
    const debug = read(join(root, "debug.txt"));
    expect(debug.startsWith(k_banner)).toBe(true);
    expect(count_of(debug, k_version)).toBe(1);
  });

  it("names the columns in the banner", () => {
    const root = make_root();
    init(root);
    event_error("hs: x");
    events_dispose();
    expect(read(join(root, "debug.txt"))).toContain(
      "columns: date=short,event_index,game_time,level=upper,context\r\n"
    );
  });

  it("recreates the root log and trims the append logs on first open", () => {
    const root = make_root();
    mkdirSync(join(root, "reports"), { recursive: true });
    const old = Buffer.alloc(300_000);
    for (let i = 0; i < old.length; i++) {
      old[i] = (i % 90) + 33;
    }
    writeFileSync(join(root, "reports", "debug.txt"), old);
    writeFileSync(join(root, "debug.txt"), "stale\r\n");
    writeFileSync(join(root, "reports", "networking_debug.txt"), "stale\r\n");

    init(root, { trim_bytes: 262_144 });
    event_error("networking: fresh");
    events_dispose();

    expect(read(join(root, "debug.txt"))).not.toContain("stale");
    const reports_debug = readFileSync(join(root, "reports", "debug.txt"));
    const kept = old.subarray(old.length - 262_144);
    expect(reports_debug.subarray(0, kept.length).equals(kept)).toBe(true);
    expect(reports_debug.subarray(kept.length).toString("latin1")).toBe(
      `${k_banner}10.16.26 12:00:00.000 0000000 g00000000 f0000001 -ERROR- networking: fresh\r\n`
    );
    // The category file is appended to like the others.
    const category = read(join(root, "reports", "networking_debug.txt"));
    expect(category.startsWith("stale\r\n")).toBe(true);
    expect(category).toContain("networking: fresh");
  });

  it.each([
    ["trim_bytes is 0", 0, "x".repeat(300_000)],
    ["the log is smaller than the limit", 262_144, "keep me\r\n"],
  ])("keeps an appended log whole when %s", (_name, trim_bytes, existing) => {
    const root = make_root();
    mkdirSync(join(root, "reports"), { recursive: true });
    writeFileSync(join(root, "reports", "debug.txt"), existing);
    init(root, { trim_bytes });
    event_error("hs: fresh");
    events_dispose();
    const debug = read(join(root, "reports", "debug.txt"));
    expect(debug.startsWith(existing)).toBe(true);
    expect(debug).toContain("hs: fresh");
  });

  it("recreates every file on first open with append off", () => {
    const root = make_root();
    mkdirSync(join(root, "reports"), { recursive: true });
    writeFileSync(join(root, "reports", "debug.txt"), "stale\r\n");
    writeFileSync(join(root, "reports", "debug_full.txt"), "stale\r\n");
    writeFileSync(join(root, "reports", "hs_log.txt"), "stale\r\n");
    init(root, { append: false });
    event_error("hs: fresh");
    events_dispose();
    for (const name of ["debug.txt", "debug_full.txt", "hs_log.txt"]) {
      const content = read(join(root, "reports", name));
      expect(content, name).not.toContain("stale");
      expect(content, name).toContain("hs: fresh");
    }
  });

  it("appends across a dispose within one process", () => {
    const root = make_root();
    init(root);
    event_error("hs: before");
    events_dispose();
    init(root);
    event_error("hs: after");
    events_dispose();
    const full = read(join(root, "reports", "debug_full.txt"));
    expect(full).toContain("hs: before");
    expect(full).toContain("hs: after");
    expect(count_of(full, k_version)).toBe(2);
  });

  it("writes only debug.txt, debug_full.txt and category files by default", () => {
    const root = make_root();
    events_initialize({
      root,
      install_exit_flush: false,
      categories: k_test_category_defaults,
      providers: { clock: k_clock },
    });
    event_error("hs: a");
    event_error("a plain line with no category");
    events_dispose();
    expect(existsSync(join(root, "debug.txt"))).toBe(false);
    expect(readdirSync(join(root, "reports")).sort()).toEqual([
      "debug.txt",
      "debug_full.txt",
      "hs_log.txt",
    ]);
  });

  it("leaves debug_full.txt out with full_log off", () => {
    const root = make_root();
    init(root, { full_log: false });
    event_error("hs: a");
    events_dispose();
    expect(existsSync(join(root, "reports", "debug_full.txt"))).toBe(false);
    expect(existsSync(join(root, "reports", "debug.txt"))).toBe(true);
  });

  it("writes debug_datamine.txt for events sent to the datamine", () => {
    const root = make_root();
    init(root, { datamine_log: true });
    event_error("test: boom");
    event_message("hs: hello");
    event_message("ui: quiet");
    events_dispose();
    const datamine = read(join(root, "reports", "debug_datamine.txt"));
    expect(datamine).toContain("test: boom");
    expect(datamine).not.toContain("hs: hello");
    expect(datamine).not.toContain("ui: quiet");
  });

  it("writes debug_spam.txt for events without a category", () => {
    const root = make_root();
    init(root, { uncategorized_log: true });
    event_error("a plain line with no category");
    event_error("hs: categorised");
    events_dispose();
    const spam = read(join(root, "reports", "debug_spam.txt"));
    expect(spam).toContain("a plain line with no category");
    expect(spam).not.toContain("hs: categorised");
  });

  it("takes events from categories without a file into debug.txt only when asked", () => {
    const quiet_categories: s_event_category_default_configuration[] = [
      ...k_test_category_defaults,
      {
        name: "unfiled:",
        display_level: k_event_level_none,
        display_color: { red: 1, green: 1, blue: 1 },
        log_level: e_event_level.message,
        remote_log_level: k_event_level_none,
      },
    ];
    for (const includes_unfiled of [false, true]) {
      const root = make_root();
      init(root, {
        categories: quiet_categories,
        debug_log_includes_unfiled: includes_unfiled,
      });
      event_message("unfiled: hello");
      event_message("hs: not in debug");
      events_dispose();
      const path = join(root, "reports", "debug.txt");
      const debug = existsSync(path) ? read(path) : "";
      expect(debug.includes("unfiled: hello"), String(includes_unfiled)).toBe(
        includes_unfiled
      );
      expect(debug).not.toContain("not in debug");
    }
  });

  it("writes no files at all with write_files off", () => {
    const root = make_root();
    init(root, { write_files: false });
    events_register_listener("", () => {
      event_error("inner: thrown away");
    });
    event_error("hs: nowhere");
    expect(event_logs_snapshot()).toEqual([]);
    events_dispose();
    expect(readdirSync(root)).toEqual([]);
  });
});

describe("separate session reports", () => {
  it("puts a run in a folder named for its start", () => {
    const root = make_root();
    init(root, { separate_session_reports: true, root_debug_log: false });
    event_error("test: boom");
    event_message("hs: hello");
    events_dispose();

    const reports = join(root, "reports");
    expect(readdirSync(reports)).toEqual(["20261016_120000"]);
    const folder = join(reports, "20261016_120000");
    expect(readdirSync(folder).sort()).toEqual([
      "debug.txt",
      "debug_full.txt",
      "hs_log.txt",
    ]);
    expect(read(join(folder, "debug.txt"))).toContain("test: boom");
    expect(read(join(folder, "debug.txt"))).not.toContain("hs: hello");
    expect(read(join(folder, "debug_full.txt"))).toContain("hs: hello");
  });

  it("ends the folder name with the session suffix", () => {
    const root = make_root();
    init(root, {
      separate_session_reports: true,
      session_suffix: "pc_web-tiger",
    });
    event_error("hs: boom");
    events_dispose();
    expect(readdirSync(join(root, "reports"))).toEqual([
      "20261016_120000_pc_web-tiger",
    ]);
    // The extra debug.txt stays in the root.
    expect(existsSync(join(root, "debug.txt"))).toBe(true);
  });

  it("ignores the session suffix while reports share one folder", () => {
    const root = make_root();
    init(root, { session_suffix: "pc_web-tiger" });
    event_error("hs: boom");
    events_dispose();
    expect(readdirSync(join(root, "reports"))).toContain("debug_full.txt");
  });

  it("recreates the files of a run folder that already exists, with append off", () => {
    const root = make_root();
    const folder = join(root, "reports", "20261016_120000");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "debug.txt"), "x".repeat(300_000));
    init(root, { separate_session_reports: true, append: false });
    event_error("test: fresh");
    events_dispose();
    const debug = read(join(folder, "debug.txt"));
    expect(debug.length).toBeLessThan(1000);
    expect(debug).not.toContain("xxxx");
  });

  it("writes each line once however the files collapse", () => {
    const root = make_root();
    init(root, { separate_session_reports: true });
    event_error("hs: once only");
    events_dispose();
    const folder = join(root, "reports", "20261016_120000");
    expect(count_of(read(join(folder, "debug.txt")), "hs: once only")).toBe(1);
    expect(
      count_of(read(join(folder, "debug_full.txt")), "hs: once only")
    ).toBe(1);
    expect(count_of(read(join(root, "debug.txt")), "hs: once only")).toBe(1);
  });
});

describe("spam", () => {
  function emit_same(count: number) {
    for (let i = 0; i < count; i++) {
      event_error("spamcat: same text");
    }
  }

  it("console_only drops the console line but keeps the logs", () => {
    const root = make_root();
    const displayed: string[] = [];
    init(root, {
      spam_mode: "console_only",
      sinks: { display: (line) => displayed.push(line) },
    });
    emit_same(8);
    events_dispose();
    expect(
      count_of(
        read(join(root, "reports", "debug_full.txt")),
        "spamcat: same text"
      )
    ).toBe(8);
    expect(
      displayed.filter((line) => line.includes("spamcat")).length
    ).toBeLessThan(8);
  });

  it("faithful drops everything from the 7th repeat", () => {
    const root = make_root();
    init(root, { spam_mode: "faithful" });
    emit_same(8);
    events_dispose();
    expect(
      count_of(
        read(join(root, "reports", "debug_full.txt")),
        "spamcat: same text"
      )
    ).toBe(6);
  });

  it("disabled lets every repeat through", () => {
    const root = make_root();
    const displayed: string[] = [];
    init(root, {
      spam_mode: "disabled",
      sinks: { display: (line) => displayed.push(line) },
    });
    // The console limiter is separate and keeps working.
    events_spam_suppression_enable(false);
    displayed.length = 0;
    emit_same(8);
    events_dispose();
    expect(
      count_of(
        read(join(root, "reports", "debug_full.txt")),
        "spamcat: same text"
      )
    ).toBe(8);
    expect(displayed.length).toBe(8);
  });

  it("the console limiter prints a notice once and stops printing lines", () => {
    const root = make_root();
    const displayed: string[] = [];
    const debug_output: string[] = [];
    init(root, {
      spam_mode: "disabled",
      sinks: {
        display: (line) => displayed.push(line),
        debug_output: (line) => debug_output.push(line),
      },
    });
    for (let i = 0; i < 8; i++) {
      event_error("limiter: distinct %d", i);
    }
    expect(
      displayed.filter((line) => line === k_console_spam_notice).length
    ).toBe(1);
    expect(displayed.filter((line) => line.includes("distinct")).length).toBe(
      5
    );
    // Debug output still gets every line.
    expect(
      debug_output.filter((line) => line.includes("distinct")).length
    ).toBe(8);
    expect(events_get()).toContain("distinct 4");
    expect(events_get()).not.toContain("distinct 5");
  });

  it("critical events skip both filters", () => {
    const root = make_root();
    const displayed: string[] = [];
    init(root, { sinks: { display: (line) => displayed.push(line) } });
    for (let i = 0; i < 10; i++) {
      event_critical("crit: same");
    }
    expect(displayed.length).toBe(10);
  });
});

describe("console", () => {
  it("shows level, text, context and the category color", () => {
    const root = make_root();
    const shown: { color: s_real_rgb_color; level: number; line: string }[] =
      [];
    init(root, {
      sinks: {
        display: (line, level, color) => shown.push({ line, level, color }),
      },
    });
    event_context_run(
      "map",
      "bsp_a",
      () => {
        event_error("hs: shown");
      },
      { display_to_console: true }
    );
    event_critical("crash: red");
    expect(shown[0]?.line).toBe("-ERROR- hs: shown (bsp_a)");
    expect(shown[0]?.color).toEqual({ red: 0.5, green: 0.8, blue: 0.3 });
    expect(shown[1]?.line).toBe("-FATAL- crash: red");
    expect(shown[1]?.color).toEqual({ red: 1, green: 0, blue: 0 });
  });

  it("prints forced display as critical", () => {
    const root = make_root();
    const displayed: string[] = [];
    init(root, { sinks: { display: (line) => displayed.push(line) } });
    event_set_force_display_level_by_name("zz:", 0);
    displayed.length = 0;
    event_status("zz: forced");
    expect(displayed).toEqual(["-FATAL- zz: forced"]);
  });

  it("keeps the recent lines and marks overflow", () => {
    const root = make_root();
    init(root, { sinks: {} });
    events_spam_suppression_enable(false);
    for (let i = 0; i < 100; i++) {
      event_error("buffer: line number %d with some padding to fill it up", i);
    }
    const buffer = events_get();
    expect(buffer.length).toBeLessThan(2048);
    expect(buffer.startsWith("[...too many errors to print...]\r\n")).toBe(
      true
    );
    expect(buffer).toContain("line number 99 ");
    expect(buffer).not.toContain("line number 0 ");
    events_clear();
    expect(events_get()).toBe("");
  });

  it("cuts console lines at 1026 characters", () => {
    const root = make_root();
    const displayed: string[] = [];
    init(root, { sinks: { display: (line) => displayed.push(line) } });
    event_error("%s", "q".repeat(1500));
    expect(displayed[0]?.length).toBe(1026);
  });
});

describe("contexts", () => {
  it("keeps concurrent async flows apart in the log", async () => {
    const root = make_root();
    init(root);
    const flow = (name: string) =>
      event_context_run("job", name, async () => {
        await Promise.resolve();
        event_error("ctx: step %s", name);
        await new Promise((resolve) => setImmediate(resolve));
        event_error("ctx: done %s", name);
      });
    await Promise.all([flow("A"), flow("B")]);
    events_dispose();
    const lines = lines_of(join(root, "reports", "debug_full.txt"));
    for (const name of ["A", "B"]) {
      expect(
        lines.some((line) => line.endsWith(`ctx: step ${name} [(job)${name}]`))
      ).toBe(true);
      expect(
        lines.some((line) => line.endsWith(`ctx: done ${name} [(job)${name}]`))
      ).toBe(true);
    }
  });

  it("hands the remote form to the remote handler", () => {
    const root = make_root();
    const records: s_event_remote_record[] = [];
    init(root, { remote_log: (record) => records.push(record) });
    event_context_run("job", "X", () => {
      event_error("networking:session: remote %d", 5);
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      level: e_event_level.error,
      format: "networking:session: remote %d",
      args: [5],
      text: "networking:session: remote 5",
      category_path: "networking:session",
      categories: ["networking", "session"],
      context: "[(job)X]",
    });
  });
});

describe("recursion", () => {
  it("sends an event raised during handling to thrown_away_events.txt", () => {
    const root = make_root();
    const debug_output: string[] = [];
    init(root, { sinks: { debug_output: (line) => debug_output.push(line) } });
    events_register_listener("", () => {
      event_error("inner: re-entered");
    });
    event_error("outer: starts it");
    events_dispose();

    const thrown = read(join(root, "thrown_away_events.txt"));
    expect(thrown).toMatch(
      /-ERROR- inner: re-entered\(!datamined\)\(!logged\)\r\n/
    );
    expect(read(join(root, "reports", "debug_full.txt"))).not.toContain(
      "inner: re-entered"
    );
    expect(debug_output).toContain("inner: re-entered(!datamined)(!logged)");
  });

  it("keeps working after a listener threw", () => {
    const root = make_root();
    const debug_output: string[] = [];
    init(root, { sinks: { debug_output: (line) => debug_output.push(line) } });
    events_register_listener("", () => {
      throw new Error("listener broke");
    });
    event_error("outer: one");
    event_error("outer: two");
    events_dispose();
    expect(debug_output.some((line) => line.includes("listener broke"))).toBe(
      true
    );
    expect(read(join(root, "reports", "debug_full.txt"))).toContain(
      "outer: two"
    );
  });
});

describe("listeners", () => {
  it("honours the category mask and keeps working across slot gaps", () => {
    const root = make_root();
    init(root);
    const seen = { a: [] as string[], b: [] as string[], c: [] as string[] };
    const a = events_register_listener("networking:", (e) =>
      seen.a.push(e.text)
    );
    const b = events_register_listener("hs:", (e) => seen.b.push(e.text));
    const c = events_register_listener("", (e) => seen.c.push(e.text));
    expect([a, b, c]).toEqual([0, 1, 2]);

    event_error("networking: n1");
    event_error("hs: h1");
    event_error("other: o1");
    expect(seen.a).toEqual(["networking: n1"]);
    expect(seen.b).toEqual(["hs: h1"]);
    expect(seen.c).toEqual(["networking: n1", "hs: h1", "other: o1"]);

    events_unregister_listener(b);
    event_error("hs: h2");
    event_error("networking: n2");
    expect(seen.b).toEqual(["hs: h1"]);
    expect(seen.c).toContain("hs: h2");
    expect(seen.a).toEqual(["networking: n1", "networking: n2"]);

    // The freed slot is reused and the later slot kept receiving events.
    const again = events_register_listener("hs:", (e) => seen.b.push(e.text));
    expect(again).toBe(1);
    event_error("hs: h3");
    expect(seen.b).toEqual(["hs: h1", "hs: h3"]);
  });

  it("registers a function once and refuses a ninth listener", () => {
    init(make_root());
    const listener = (_event: s_event_listener_event) => undefined;
    expect(events_register_listener("", listener)).toBe(0);
    expect(events_register_listener("", listener)).toBe(0);
    for (let i = 1; i < 8; i++) {
      expect(events_register_listener("", () => undefined)).toBe(i);
    }
    expect(events_register_listener("", () => undefined)).toBe(-1);
  });
});

describe("levels and sinks", () => {
  it("applies per-category log levels by name to the subtree", () => {
    const root = make_root();
    init(root);
    event_set_log_level_by_name("quiet:", 0);
    event_verbose("quiet:child: seen");
    event_verbose("elsewhere: not seen");
    events_dispose();
    const full = read(join(root, "reports", "debug_full.txt"));
    expect(full).toContain("quiet:child: seen");
    expect(full).not.toContain("not seen");
  });

  it("raises the global log level", () => {
    const root = make_root();
    init(root);
    event_set_log_level_global(0);
    event_verbose("global: now logged");
    events_dispose();
    expect(read(join(root, "reports", "debug_full.txt"))).toContain(
      "global: now logged"
    );
  });

  it("reports an invalid level on the console", () => {
    const displayed: string[] = [];
    init(make_root(), { sinks: { display: (line) => displayed.push(line) } });
    event_set_display_level_by_name("hs:", 42);
    expect(displayed).toContain("invalid display_level (42)");
  });

  it("calls the break and halt sinks and never exits", () => {
    const breaks: string[] = [];
    const halts: string[] = [];
    init(make_root(), {
      sinks: {
        debugger_break: (text) => breaks.push(text),
        halt: (text) => halts.push(text),
      },
    });
    event_set_debugger_break_level_by_name("brk:", 4);
    event_set_halt_level_by_name("hlt:", 5);
    event_warning("brk: not yet");
    event_error("brk: now");
    event_error("hlt: not yet");
    event_critical("hlt: now");
    expect(breaks).toEqual(["critical event encountered: brk: now"]);
    expect(halts).toEqual(["critical event encountered: hlt: now"]);
  });

  it("breaks into the debugger from the global level, which a category can override", () => {
    const breaks: string[] = [];
    init(make_root(), {
      sinks: { debugger_break: (text) => breaks.push(text) },
    });
    event_warning("gbrk: before");
    expect(breaks).toEqual([]);

    event_set_debugger_break_level_global(e_event_level.warning);
    event_warning("gbrk: after");
    event_message("gbrk: too low");
    expect(breaks).toEqual(["critical event encountered: gbrk: after"]);

    event_set_debugger_break_level_by_name("gbrk:", e_event_level.critical);
    event_error("gbrk: category wins");
    expect(breaks).toHaveLength(1);

    event_set_debugger_break_level_global(6);
    event_warning("gbrk2: off");
    expect(breaks).toHaveLength(1);
  });

  it("breaks into the debugger when only the global break level is low", () => {
    const breaks: string[] = [];
    init(make_root(), {
      sinks: { debugger_break: (text) => breaks.push(text) },
    });
    event_set_debugger_break_level_global(e_event_level.verbose);
    event_verbose("gbrk3: deep");
    expect(breaks).toHaveLength(1);
  });

  it("sends to the remote handler when only a category lowers its remote level", () => {
    const records: s_event_remote_record[] = [];
    init(make_root(), { remote_log: (record) => records.push(record) });
    event_verbose("remoteonly: deep");
    expect(records).toHaveLength(0);
    event_set_remote_log_level_by_name("remoteonly:", 0);
    event_verbose("remoteonly: deep");
    expect(records).toHaveLength(1);
  });

  it("fires event_once one time per format", () => {
    const root = make_root();
    init(root);
    for (let i = 0; i < 3; i++) {
      event_once(e_event_level.error, "once: only %d", i);
    }
    event_once(e_event_level.error, "once: other");
    events_dispose();
    const full = read(join(root, "reports", "debug_full.txt"));
    expect(count_of(full, "once: only")).toBe(1);
    expect(count_of(full, "once: other")).toBe(1);
  });

  it("dumps a table of the categories", () => {
    init(make_root());
    expect(event_dump_categories("nope:")).toBe("");
    const dump = event_dump_categories("");
    expect(dump.split("\n")[0]).toBe(
      "ID Parent Log Output     Force      Log        Debug      Datamine   Name"
    );
    expect(dump).toContain(" networking");
  });
});

describe("snapshot", () => {
  it("copies the logs and thrown_away_events.txt after emptying the folder", () => {
    const root = make_root();
    init(root);
    mkdirSync(join(root, "error_snapshot"), { recursive: true });
    writeFileSync(join(root, "error_snapshot", "stale.txt"), "old");
    events_register_listener("", () => {
      event_error("inner: thrown away");
    });
    event_error("networking: snapped");
    const copies = event_logs_snapshot();

    const names = readdirSync(join(root, "error_snapshot")).sort();
    expect(names).not.toContain("stale.txt");
    expect(names).toContain("debug_full.txt");
    expect(names).toContain("networking_debug.txt");
    expect(names).toContain("thrown_away_events.txt");
    // debug.txt exists in the root and in reports, so one gets its folder prefixed.
    expect(names).toContain("debug.txt");
    expect(names).toContain("reports_debug.txt");
    expect(copies.length).toBe(names.length);
    expect(
      read(join(root, "error_snapshot", "networking_debug.txt"))
    ).toContain("networking: snapped");

    // Logging carries on after a snapshot, appending to the same files.
    event_error("networking: after");
    events_dispose();
    const category = read(join(root, "reports", "networking_debug.txt"));
    expect(category).toContain("networking: snapped");
    expect(category).toContain("networking: after");
    expect(count_of(category, k_version)).toBe(1);
  });
});

describe("write modes", () => {
  it("cached mode holds lines until dispose", () => {
    const root = make_root();
    init(root, { write_mode: "cached" });
    event_error("hs: buffered");
    expect(read(join(root, "reports", "debug_full.txt"))).toBe("");
    events_dispose();
    expect(read(join(root, "reports", "debug_full.txt"))).toContain(
      "hs: buffered"
    );
  });

  it("cached mode flushes on the timer", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const root = make_root();
    init(root, { write_mode: "cached" });
    event_error("hs: timed");
    expect(read(join(root, "reports", "debug_full.txt"))).toBe("");
    vi.advanceTimersByTime(1000);
    expect(read(join(root, "reports", "debug_full.txt"))).toContain(
      "hs: timed"
    );
  });

  it("cached mode flushes at 32 KiB", () => {
    const root = make_root();
    init(root, { write_mode: "cached" });
    events_spam_suppression_enable(false);
    event_error("%s", "w".repeat(1000));
    expect(read(join(root, "reports", "debug_full.txt"))).toBe("");
    for (let i = 0; i < 40; i++) {
      event_error("%s", "w".repeat(1000));
    }
    expect(
      read(join(root, "reports", "debug_full.txt")).length
    ).toBeGreaterThan(30_000);
  });

  it("event_logs_flush writes the cached lines", () => {
    const root = make_root();
    init(root, { write_mode: "cached" });
    event_error("hs: flushed");
    event_logs_flush();
    expect(read(join(root, "reports", "debug_full.txt"))).toContain(
      "hs: flushed"
    );
  });

  it("events_clear flushes the logs and empties the message buffer", () => {
    const root = make_root();
    init(root, {
      write_mode: "cached",
      sinks: { display: () => undefined },
    });
    event_error("hs: clearing");
    expect(events_get()).toContain("clearing");
    events_clear();
    expect(events_get()).toBe("");
    expect(read(join(root, "reports", "debug_full.txt"))).toContain("clearing");
  });
});
