import { describe, expect, it } from "vitest";
import type { s_event_category_dump_row } from "../../../src/blam/cseries/event_categories.ts";
import {
  e_event_level,
  k_event_level_none,
} from "../../../src/blam/cseries/event_levels.ts";
import {
  build_banner,
  build_networking_buffer_for_log,
  event_line_columns_format,
  event_line_columns_parse,
  event_line_options_resolve,
  format_category_dump,
  format_console_line,
  format_event_for_log,
  k_event_line_options_default,
  type s_event_line_options,
} from "../../../src/blam/cseries/event_log_format.ts";
import { make_log_line as make_line } from "../../support/event_lines.ts";

const k_all_columns: s_event_line_options = {
  date: "short",
  event_index: true,
  game_time: true,
  thread_id: true,
  level: "upper",
  context: true,
};

describe("format_event_for_log", () => {
  it("writes the default columns", () => {
    expect(format_event_for_log(make_line())).toBe(
      "10/16/2026 00:53:27.067 0000061 00000007 message  networking: request started\r\n"
    );
  });

  it("pads the lower case level to eight columns", () => {
    const options = event_line_options_resolve({
      event_index: false,
      thread_id: false,
    });
    expect(
      format_event_for_log(make_line({ level: e_event_level.error }), options)
    ).toBe("10/16/2026 00:53:27.067 error    networking: request started\r\n");
    expect(
      format_event_for_log(
        make_line({ level: e_event_level.critical }),
        options
      )
    ).toBe("10/16/2026 00:53:27.067 critical networking: request started\r\n");
    expect(
      format_event_for_log(
        make_line({ level: e_event_level.verbose, text: "x" }),
        options
      )
    ).toBe("10/16/2026 00:53:27.067 verbose  x\r\n");
  });

  it("uses every upper case severity string", () => {
    const expected = [
      "verbose",
      "status ",
      "message",
      "WARNING",
      "-ERROR-",
      "-FATAL-",
    ];
    for (const level of [0, 1, 2, 3, 4, 5] as const) {
      expect(
        format_event_for_log(make_line({ level }), k_all_columns)
      ).toContain(` ${expected[level]} networking`);
    }
  });

  it("writes every column in order", () => {
    expect(
      format_event_for_log(
        make_line({
          game_time: 25_637,
          frame_index: 92_363,
          event_index: 8550,
          level: e_event_level.warning,
          thread_id: 0xab_cd,
          context: "[(job)A:(job)B]",
        }),
        k_all_columns
      )
    ).toBe(
      "10.16.26 00:53:27.067 0008550 g00025637 f0092363 0000ABCD WARNING networking: request started [(job)A:(job)B]\r\n"
    );
  });

  it("leaves the frame out of the game time when it is not known", () => {
    const line = format_event_for_log(
      make_line({ frame_index: undefined, game_time: 5 }),
      k_all_columns
    );
    expect(line).toContain(" g00000005 0000");
    expect(line).not.toContain(" f0");
  });

  it("prints zero game time while no game is in progress", () => {
    expect(format_event_for_log(make_line(), k_all_columns)).toContain(
      " g00000000 f0000001 "
    );
  });

  it("leaves out the columns that are off, and an empty context", () => {
    const options = event_line_options_resolve({
      date: "short",
      event_index: false,
      thread_id: false,
      context: false,
    });
    expect(
      format_event_for_log(make_line({ context: "[(job)A]" }), options)
    ).toBe("10.16.26 00:53:27.067 message  networking: request started\r\n");
    expect(
      format_event_for_log(make_line(), k_all_columns).endsWith("started\r\n")
    ).toBe(true);
  });

  it("puts the netbuf columns before the level", () => {
    const custom_prefix = build_networking_buffer_for_log([
      3_723_456,
      undefined,
      59_999,
    ]);
    const line = format_event_for_log(
      make_line({ custom_prefix, level: e_event_level.warning }),
      k_all_columns
    );
    expect(line).toBe(
      `10.16.26 00:53:27.067 0000061 g00000000 f0000001 00000007 01:02:03.456 ${" ".repeat(12)} 00:00:59.999 WARNING networking: request started\r\n`
    );
  });

  it("writes UTC when asked", () => {
    const options = event_line_options_resolve({ date: "short" });
    const line = make_line({
      date: new Date(Date.UTC(2026, 9, 16, 1, 2, 3, 4)),
    });
    expect(format_event_for_log(line, options, true)).toContain(
      "10.16.26 01:02:03.004"
    );
  });

  it("cuts at the length it is given", () => {
    const long = format_event_for_log(
      make_line({ text: "x".repeat(5000) }),
      k_event_line_options_default,
      false,
      10_000
    );
    expect(long.length).toBe(5000 + long.indexOf("xxx") + 2);
    const short = format_event_for_log(
      make_line({ text: "x".repeat(50) }),
      k_event_line_options_default,
      false,
      40
    );
    expect(short.length).toBe(40 + 2);
  });

  it("keeps the CRLF on a line cut at 2048 characters", () => {
    const line = format_event_for_log(make_line({ text: "x".repeat(3000) }));
    expect(line.endsWith("\r\n")).toBe(true);
    expect(line.length).toBe(2047 + 2);
    expect(line.slice(0, -2)).toMatch(/x$/);
  });
});

describe("event line options", () => {
  it("changes only what is given", () => {
    expect(event_line_options_resolve()).toEqual(k_event_line_options_default);
    expect(
      event_line_options_resolve({ game_time: true, level: undefined })
    ).toEqual({ ...k_event_line_options_default, game_time: true });
  });

  it("writes and reads the banner column list", () => {
    expect(event_line_columns_format(k_event_line_options_default)).toBe(
      "date=long,event_index,thread_id,level=lower,context"
    );
    expect(event_line_columns_format(k_all_columns)).toBe(
      "date=short,event_index,game_time,thread_id,level=upper,context"
    );
    for (const options of [k_event_line_options_default, k_all_columns]) {
      expect(
        event_line_columns_parse(event_line_columns_format(options))
      ).toEqual(options);
    }
    expect(event_line_columns_parse("date=short,level=upper")).toEqual({
      date: "short",
      event_index: false,
      game_time: false,
      thread_id: false,
      level: "upper",
      context: false,
    });
  });

  it("rejects a date or level it does not know", () => {
    expect(event_line_columns_parse("date=iso,level=lower")).toBeUndefined();
    expect(event_line_columns_parse("date=long,level=title")).toBeUndefined();
  });
});

describe("build_networking_buffer_for_log", () => {
  it("prints three columns, blank ones as twelve spaces", () => {
    expect(build_networking_buffer_for_log([])).toBe(" ".repeat(38));
    expect(build_networking_buffer_for_log([0, 1000, 3_661_005])).toBe(
      "00:00:00.000 00:00:01.000 01:01:01.005"
    );
    expect(
      build_networking_buffer_for_log([undefined, 61_001, undefined])
    ).toBe(`${" ".repeat(12)} 00:01:01.001 ${" ".repeat(12)}`);
  });
});

describe("format_console_line", () => {
  it("prints the level and text", () => {
    expect(
      format_console_line({
        level: e_event_level.warning,
        text: "low on cheese",
        context: "",
        forced: false,
      })
    ).toBe("warning  low on cheese");
  });

  it("puts the context in parentheses after the text", () => {
    expect(
      format_console_line(
        {
          level: e_event_level.status,
          text: "loaded",
          context: "map:bsp",
          forced: false,
        },
        k_all_columns
      )
    ).toBe("status  loaded (map:bsp)");
  });

  it("prints forced display as critical", () => {
    expect(
      format_console_line(
        {
          level: e_event_level.verbose,
          text: "forced",
          context: "",
          forced: true,
        },
        k_all_columns
      )
    ).toBe("-FATAL- forced");
  });
});

describe("build_banner", () => {
  it("is an 80 column rule around the version and the column list", () => {
    const rule = "=".repeat(80);
    expect(build_banner("web-tiger 1.0")).toBe(
      `${rule}\r\nweb-tiger 1.0\r\ncolumns: date=long,event_index,thread_id,level=lower,context\r\n${rule}\r\n\r\n`
    );
    expect(build_banner("v", k_all_columns)).toBe(
      `${rule}\r\nv\r\ncolumns: date=short,event_index,game_time,thread_id,level=upper,context\r\n${rule}\r\n\r\n`
    );
  });
});

describe("category dump", () => {
  const rows: s_event_category_dump_row[] = [
    {
      index: 0,
      parent_index: -1,
      depth: 0,
      name: "",
      path: "",
      display_level: k_event_level_none,
      force_display_level: k_event_level_none,
      log_level: k_event_level_none,
      remote_log_level: k_event_level_none,
      debugger_break_level: k_event_level_none,
      halt_level: k_event_level_none,
      log_name: undefined,
      log_format: "none",
      display_color: { red: 1, green: 1, blue: 1 },
      listener_mask: 0,
    },
    {
      index: 1,
      parent_index: 0,
      depth: 1,
      name: "networking",
      path: "networking",
      display_level: e_event_level.warning,
      force_display_level: k_event_level_none,
      log_level: e_event_level.verbose,
      remote_log_level: e_event_level.message,
      debugger_break_level: k_event_level_none,
      halt_level: k_event_level_none,
      log_name: "networking_debug.txt",
      log_format: "none",
      display_color: { red: 1, green: 1, blue: 1 },
      listener_mask: 0,
    },
  ];

  it("prints the header and a row per category", () => {
    const lines = format_category_dump(rows).split("\n");
    expect(lines[0]).toBe(
      "ID Parent Log Output     Force      Log        Debug      Datamine   Name"
    );
    expect(lines[1]).toBe(
      "0000 -001 000 [none    ] [none    ] [none    ] [none    ] [none    ] [none    ] "
    );
    expect(lines[2]).toBe(
      "0001 0000 000 [warning ] [none    ] [verbose ] [none    ] [message ] [none    ] networking"
    );
  });
});
