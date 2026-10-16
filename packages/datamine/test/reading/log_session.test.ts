import { describe, expect, it } from "vitest";
import { e_event_level } from "../../src/blam/cseries/event_levels.ts";
import type { s_log_entry } from "../../src/reading/log_entry.ts";
import {
  log_session_info_build,
  report_folder_parse,
} from "../../src/reading/log_session.ts";
import { c_log_text_parser } from "../../src/reading/log_text_parser.ts";

function make_entry(overrides: Partial<s_log_entry>): s_log_entry {
  return {
    ordinal: 0,
    date_text: "",
    level_text: "",
    category_path: "",
    categories: [],
    message: "",
    text: "",
    ...overrides,
  };
}

describe("report_folder_parse", () => {
  it("reads the run folder name", () => {
    expect(report_folder_parse("20260929_163747")).toEqual({
      date: new Date(2026, 8, 29, 16, 37, 47),
    });
    expect(report_folder_parse("20260929_163747_xe_tiger")).toEqual({
      date: new Date(2026, 8, 29, 16, 37, 47),
      suffix: "xe_tiger",
    });
    expect(report_folder_parse("20260929_163747_pc_web-tiger")?.suffix).toBe(
      "pc_web-tiger"
    );
  });

  it("refuses other names", () => {
    expect(report_folder_parse("debug_full.txt")).toBeUndefined();
    expect(report_folder_parse("2026_163747_xe_tiger")).toBeUndefined();
  });
});

describe("log_session_info_build", () => {
  it("counts levels and categories and finds the dates", () => {
    const entries = [
      make_entry({
        level: e_event_level.message,
        category_path: "a:b",
        date: new Date(2026, 0, 2),
      }),
      make_entry({
        level: e_event_level.message,
        category_path: "a:b",
        date: new Date(2026, 0, 1),
      }),
      make_entry({
        level: e_event_level.error,
        category_path: "c",
        date: new Date(2026, 0, 3),
      }),
      make_entry({ level_text: "Unknown (63)" }),
      make_entry({}),
    ];
    const info = log_session_info_build(
      "C:\\runs\\20260929_163747_xe_tiger\\debug.txt",
      "destiny_style_log",
      entries,
      { banner_version: "1.0" }
    );
    expect(info.entry_count).toBe(5);
    expect(info.counts_by_level).toEqual({
      message: 2,
      error: 1,
      "Unknown (63)": 1,
      unknown: 1,
    });
    expect(info.categories).toEqual([
      { path: "a:b", count: 2 },
      { path: "c", count: 1 },
    ]);
    expect(info.first_date).toEqual(new Date(2026, 0, 1));
    expect(info.last_date).toEqual(new Date(2026, 0, 3));
    expect(info.banner_version).toBe("1.0");
    expect(info.report_folder?.suffix).toBe("xe_tiger");
    expect(info.session_id).toBeUndefined();
    expect(info.format).toBe("destiny_style_log");
  });

  it("takes the session id from a datamine header", () => {
    const info = log_session_info_build("x.datamine", "datamine_binary", [], {
      header: {
        layout: "3.1",
        byte_order: "big",
        sessionid: "header-session",
        build_string: "b",
        build_number: 1,
        systemid: "s",
        title: "t",
      },
      truncated_at: 99,
    });
    expect(info.session_id).toBe("header-session");
    expect(info.truncated_at).toBe(99);
    expect(info.header?.title).toBe("t");
    expect(info.first_date).toBeUndefined();
  });

  it("takes the session id from the networking:sessionid line", () => {
    const parser = new c_log_text_parser("destiny_style_log");
    const entries = [
      ...parser.push(
        "09/29/2026 16:37:49.682 g00000000 00000007 message  networking:sessionid: [Tue_09292026_163742_000001@xe@pn-test@AABB] hash [-1]\r\n"
      ),
      ...parser.finish(),
    ];
    const info = log_session_info_build(
      "debug_datamine.txt",
      "destiny_style_log",
      entries
    );
    expect(info.session_id).toBe("Tue_09292026_163742_000001@xe@pn-test@AABB");
  });
});
