import { describe, expect, it } from "vitest";
import type { s_event_category_dump_row } from "../../../src/blam/cseries/event_categories.ts";
import {
  e_event_level,
  k_event_level_none,
} from "../../../src/blam/cseries/event_levels.ts";
import {
  build_banner,
  build_networking_buffer_for_log,
  format_category_dump,
  format_console_line,
  format_event_for_log,
  type s_event_log_line,
} from "../../../src/blam/cseries/event_log_format.ts";
import { make_log_line } from "../../support/event_lines.ts";

function make_line(
  overrides: Partial<s_event_log_line> = {}
): s_event_log_line {
  return make_log_line({ game_time: 25, ...overrides });
}

describe("format_event_for_log, Destiny style", () => {
  it("is the default, with no index, frame or context", () => {
    const line = make_line({
      context: "[(job)A]",
      game_time: 25_637,
      thread_id: 0xab_cd,
    });
    expect(format_event_for_log(line)).toBe(
      "10/16/2026 00:53:27.067 g00025637 0000ABCD message  networking: request started\r\n"
    );
    expect(format_event_for_log(line, "3.1")).toBe(format_event_for_log(line));
  });

  it("pads the lower case level to eight columns", () => {
    const text = (level: e_event_level) =>
      format_event_for_log(make_line({ level, text: "x" }), "3.1");
    expect(text(e_event_level.error)).toBe(
      "10/16/2026 00:53:27.067 g00000025 00000007 error    x\r\n"
    );
    expect(text(e_event_level.critical)).toBe(
      "10/16/2026 00:53:27.067 g00000025 00000007 critical x\r\n"
    );
    expect(text(e_event_level.verbose)).toBe(
      "10/16/2026 00:53:27.067 g00000025 00000007 verbose  x\r\n"
    );
  });

  it("prints zero game time while no game is in progress", () => {
    expect(
      format_event_for_log(make_line({ game_time: undefined }), "3.1")
    ).toContain(" g00000000 00000007 ");
  });

  it("leaves the netbuf columns out", () => {
    const custom_prefix = build_networking_buffer_for_log([1, 2, 3]);
    expect(format_event_for_log(make_line({ custom_prefix }), "3.1")).toBe(
      format_event_for_log(make_line(), "3.1")
    );
  });

  it("writes UTC when asked", () => {
    const line = make_line({
      date: new Date(Date.UTC(2026, 9, 16, 1, 2, 3, 4)),
    });
    expect(format_event_for_log(line, "3.1", true)).toContain(
      "10/16/2026 01:02:03.004"
    );
  });
});

describe("format_event_for_log, Halo style", () => {
  it("writes every column in order", () => {
    expect(
      format_event_for_log(
        make_line({
          game_time: 25_637,
          frame_index: 92_363,
          event_index: 8550,
          level: e_event_level.warning,
          context: "[(job)A:(job)B]",
        }),
        "1.1"
      )
    ).toBe(
      "10.16.26 00:53:27.067 0008550 g025637 f0092363  WARNING networking: request started [(job)A:(job)B]\r\n"
    );
  });

  it("is the same for every layout but 3.1", () => {
    const line = make_line({ text: "a: b" });
    for (const layout of ["1.0", "1.1", "2.0", "2.1"] as const) {
      expect(format_event_for_log(line, layout)).toBe(
        format_event_for_log(line, "1.1")
      );
    }
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
      expect(format_event_for_log(make_line({ level }), "1.1")).toContain(
        `  ${expected[level]} networking`
      );
    }
  });

  it("replaces the game time with eight spaces while no game is in progress", () => {
    expect(
      format_event_for_log(make_line({ game_time: undefined }), "1.1")
    ).toContain(` 0000061 ${" ".repeat(8)}f0000001 `);
  });

  it("writes frame zero when the frame is not known", () => {
    expect(
      format_event_for_log(make_line({ frame_index: undefined }), "1.1")
    ).toContain(" g000025 f0000000 ");
  });

  it("leaves a double space for an empty netbuf and a trailing space for an empty context", () => {
    expect(format_event_for_log(make_line({ text: "a: b" }), "1.1")).toBe(
      "10.16.26 00:53:27.067 0000061 g000025 f0000001  message a: b \r\n"
    );
  });

  it("puts the netbuf columns before the level", () => {
    const custom_prefix = build_networking_buffer_for_log([
      3_723_456,
      undefined,
      59_999,
    ]);
    const line = format_event_for_log(
      make_line({ custom_prefix, level: e_event_level.warning }),
      "1.1"
    );
    expect(line).toBe(
      `10.16.26 00:53:27.067 0000061 g000025 f0000001 01:02:03.456 ${" ".repeat(12)} 00:00:59.999 WARNING networking: request started \r\n`
    );
  });
});

describe("format_event_for_log, length", () => {
  it("cuts at the length it is given", () => {
    const long = format_event_for_log(
      make_line({ text: "x".repeat(5000) }),
      "3.1",
      false,
      10_000
    );
    expect(long.length).toBe(5000 + long.indexOf("xxx") + 2);
    const short = format_event_for_log(
      make_line({ text: "x".repeat(50) }),
      "1.1",
      false,
      40
    );
    expect(short.length).toBe(40 + 2);
  });

  it("keeps the CRLF on a line cut at 2048 characters", () => {
    for (const layout of ["1.1", "3.1"] as const) {
      const line = format_event_for_log(
        make_line({ text: "x".repeat(3000) }),
        layout
      );
      expect(line.endsWith("\r\n")).toBe(true);
      expect(line.length).toBe(2047 + 2);
      expect(line.slice(0, -2)).toMatch(/x$/);
    }
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
  it("prints the lower case level and text for Destiny's layout", () => {
    expect(
      format_console_line({
        level: e_event_level.warning,
        text: "low on cheese",
        context: "",
        forced: false,
      })
    ).toBe("warning  low on cheese");
  });

  it("prints upper case severities for Halo's layouts", () => {
    expect(
      format_console_line(
        {
          level: e_event_level.status,
          text: "loaded",
          context: "map:bsp",
          forced: false,
        },
        "2.1"
      )
    ).toBe("status  loaded (map:bsp)");
  });

  it("prints forced display as critical", () => {
    const line = {
      level: e_event_level.verbose,
      text: "forced",
      context: "",
      forced: true,
    };
    expect(format_console_line(line, "1.1")).toBe("-FATAL- forced");
    expect(format_console_line(line, "3.1")).toBe("critical forced");
  });
});

describe("build_banner", () => {
  it("is an 80 column rule around the version, then a blank line", () => {
    const rule = "=".repeat(80);
    expect(build_banner("web-tiger 1.0")).toBe(
      `${rule}\r\nweb-tiger 1.0\r\n${rule}\r\n\r\n`
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
