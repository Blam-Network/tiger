import { describe, expect, it } from "vitest";
import { e_event_level } from "../../src/blam/cseries/event_levels.ts";
import { build_networking_buffer_for_log } from "../../src/blam/cseries/event_log_format.ts";
import type { t_data_mine_header_layout } from "../../src/blam/data_mining/data_mine_formats.ts";
import type { t_byte_order } from "../../src/byte_writer.ts";
import { encode_datamine_file } from "../../src/data_mine_reader.ts";
import {
  c_log_text_parser,
  log_detect_format,
  log_detect_text_format,
} from "../../src/reading/log_text_parser.ts";
import { zip_create_single_entry } from "../../src/transport/zip_writer.ts";
import {
  destiny_style_banner,
  destiny_style_line,
  halo_style_banner,
  halo_style_line,
} from "../fixtures/game_report_lines.ts";
import {
  k_line_date as k_date,
  make_log_line as make_line,
  parse_log_text as parse_all,
} from "../support/event_lines.ts";

const k_halo_version = "halo test build x64";
const k_tiger_version = "alpha tiger release_internal xenon 1.2.3.4.alpha";

function halo_file(): string {
  return (
    halo_style_banner(k_halo_version) +
    halo_style_line(make_line()) +
    halo_style_line(
      make_line({
        event_index: 62,
        game_time: 1234,
        frame_index: 99,
        level: e_event_level.warning,
        text: "design:hs: thread cam attempted to access unplaced object",
      })
    ) +
    halo_style_line(
      make_line({
        event_index: 63,
        level: e_event_level.error,
        custom_prefix: build_networking_buffer_for_log([1500, undefined, 2]),
        text: "networking:session: lost host",
        context: "[(game)match:(ui)lobby]",
      })
    ) +
    halo_style_line(
      make_line({ event_index: 64, level: e_event_level.status, text: "hi" })
    ) +
    halo_style_line(
      make_line({
        event_index: 65,
        level: e_event_level.critical,
        text: "boom: details",
      })
    )
  );
}

describe("halo style logs", () => {
  it("parses what halo_style_line writes", () => {
    const { entries, parser, sessions } = parse_all(halo_file());
    expect(parser.format).toBe("halo_style_log");
    expect(parser.banner_version).toBe(k_halo_version);
    expect(entries).toHaveLength(5);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].ordinal).toBe(0);
    expect(sessions[0].session).toEqual({ number: 1, version: k_halo_version });

    const [first, second, third, fourth, fifth] = entries;
    expect(first.ordinal).toBe(1);
    expect(first.line).toBe(8);
    expect(first.date).toEqual(k_date);
    expect(first.date_text).toBe("10.16.26 00:53:27.067");
    expect(first.event_index).toBe(61);
    expect(first.frame_index).toBe(1);
    expect(first.game_time).toBeUndefined();
    expect(first.level).toBe(e_event_level.message);
    expect(first.level_text).toBe("message");
    expect(first.categories).toEqual(["networking"]);
    expect(first.message).toBe("request started");
    expect(first.text).toBe("networking: request started");
    expect(first.custom_prefix).toBeUndefined();
    expect(first.context).toBeUndefined();

    expect(second.game_time).toBe(1234);
    expect(second.frame_index).toBe(99);
    expect(second.level).toBe(e_event_level.warning);
    expect(second.level_text).toBe("WARNING");
    expect(second.category_path).toBe("design:hs");

    expect(third.level).toBe(e_event_level.error);
    expect(third.custom_prefix).toBe(
      build_networking_buffer_for_log([1500, undefined, 2])
    );
    expect(third.context).toBe("[(game)match:(ui)lobby]");
    expect(third.text).toBe("networking:session: lost host");

    expect(fourth.level).toBe(e_event_level.status);
    expect(fourth.level_text).toBe("status");
    expect(fourth.text).toBe("hi");
    expect(fourth.categories).toEqual([]);

    expect(fifth.level).toBe(e_event_level.critical);
    expect(fifth.level_text).toBe("-FATAL-");
    expect(fifth.category_path).toBe("boom");
    expect(fifth.ordinal).toBe(5);
  });

  it("appends continuation lines and keeps blank lines between them", () => {
    const text =
      halo_style_line(
        make_line({
          text: "a: first line\nsecond line\n\nthird line",
          context: "[(x)y]",
        })
      ) +
      halo_style_line(make_line({ event_index: 62, text: "b: next" })) +
      "\r\n\r\n";
    const { entries } = parse_all(text);
    expect(entries).toHaveLength(2);
    expect(entries[0].text).toBe("a: first line\nsecond line\n\nthird line");
    expect(entries[0].message).toBe("first line\nsecond line\n\nthird line");
    expect(entries[0].context).toBe("[(x)y]");
    expect(entries[0].raw?.split("\n")).toHaveLength(4);
    expect(entries[1].text).toBe("b: next");
    expect(entries[1].raw?.split("\n")).toHaveLength(1);
  });

  it("holds an entry back until the next one starts", () => {
    const parser = new c_log_text_parser("halo_style_log");
    const lines = [
      halo_style_line(make_line({ event_index: 1 })),
      halo_style_line(make_line({ event_index: 2 })),
      halo_style_line(make_line({ event_index: 3 })),
    ];
    expect(parser.push(lines[0])).toEqual([]);
    expect(parser.push(lines[1]).map((entry) => entry.event_index)).toEqual([
      1,
    ]);
    expect(parser.push(lines[2].slice(0, 30))).toEqual([]);
    expect(
      parser.push(lines[2].slice(30)).map((entry) => entry.event_index)
    ).toEqual([2]);
    expect(parser.finish().map((entry) => entry.event_index)).toEqual([3]);
    expect(parser.finish()).toEqual([]);
  });

  it("gives the same entries whatever the chunk size", () => {
    const text = halo_file();
    const whole = parse_all(text).all;
    for (const size of [1, 2, 7, 50, 91]) {
      expect(parse_all(text, undefined, size).all).toEqual(whole);
    }
  });

  it("takes a CRLF split across chunks and a last line with no line ending", () => {
    const line = halo_style_line(make_line()).replace(/\r\n$/, "");
    const parser = new c_log_text_parser();
    expect(parser.push(`${line}\r`)).toEqual([]);
    expect(parser.push("\n")).toEqual([]);
    const entries = parser.finish();
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("networking: request started");
  });

  it("drops the cut-off start of a trimmed file", () => {
    const text = `2 to287 S- alc70.0kb loss  0/ 2/10\r\n${halo_style_line(make_line())}`;
    const { entries, parser } = parse_all(text);
    expect(parser.format).toBe("halo_style_log");
    expect(entries).toHaveLength(1);
    expect(entries[0].line).toBe(2);
  });

  it("ends an entry at a banner in the middle of an appended file", () => {
    const text =
      halo_file() +
      halo_style_banner("second run") +
      halo_style_line(make_line({ event_index: 1, text: "c: new" }));
    const { entries, parser } = parse_all(text);
    expect(entries).toHaveLength(6);
    expect(entries[4].text).toBe("boom: details");
    expect(entries[5].text).toBe("c: new");
    expect(parser.banner_version).toBe(k_halo_version);
  });

  it("makes one session row per banner, in place", () => {
    const text =
      halo_style_banner("first run") +
      halo_style_line(make_line({ text: "a: one" })) +
      halo_style_banner("second run") +
      halo_style_line(make_line({ text: "b: two" }));
    const { all } = parse_all(text);
    expect(all.map((entry) => entry.kind ?? "event")).toEqual([
      "session",
      "event",
      "session",
      "event",
    ]);
    expect(all[2].session).toEqual({ number: 2, version: "second run" });
    expect(all[2].raw?.startsWith("=")).toBe(true);
    expect(all.map((entry) => entry.ordinal)).toEqual([0, 1, 2, 3]);
  });

  it("starts an entry for a timestamped line it cannot read further", () => {
    const { entries } = parse_all(
      "10.16.26 00:53:27.067 0000061 something odd\r\n",
      "halo_style_log"
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].date_text).toBe("10.16.26 00:53:27.067");
    expect(entries[0].level).toBeUndefined();
  });
});

describe("destiny style logs", () => {
  function tiger_file(): string {
    return (
      destiny_style_banner(k_tiger_version) +
      destiny_style_line(
        make_line({ level: e_event_level.error, text: "test: try again" })
      ) +
      destiny_style_line(
        make_line({
          game_time: 77,
          thread_id: 0xab,
          level: e_event_level.critical,
          text: "design:hs: not a function",
        })
      ) +
      destiny_style_line(
        make_line({ level: e_event_level.verbose, text: "  indented" })
      ) +
      destiny_style_line(
        make_line({
          level: e_event_level.status,
          text: "networking:sessionid: [Thu_09172026_144241_000001@xe@pn-x@7C1E] hash [-1]",
        })
      ) +
      "tail of a long text\r\n"
    );
  }

  it("parses what destiny_style_line writes", () => {
    const { entries, parser } = parse_all(tiger_file());
    expect(parser.format).toBe("destiny_style_log");
    expect(parser.banner_version).toBe(k_tiger_version);
    expect(entries).toHaveLength(4);

    expect(entries[0].date).toEqual(k_date);
    expect(entries[0].date_text).toBe("10/16/2026 00:53:27.067");
    expect(entries[0].game_time).toBe(0);
    expect(entries[0].thread_id).toBe(7);
    expect(entries[0].level).toBe(e_event_level.error);
    expect(entries[0].level_text).toBe("error");
    expect(entries[0].category_path).toBe("test");
    expect(entries[0].message).toBe("try again");
    expect(entries[0].event_index).toBeUndefined();

    expect(entries[1].game_time).toBe(77);
    expect(entries[1].thread_id).toBe(0xab);
    expect(entries[1].level).toBe(e_event_level.critical);
    expect(entries[1].level_text).toBe("critical");

    expect(entries[2].level).toBe(e_event_level.verbose);
    expect(entries[2].text).toBe("  indented");

    expect(entries[3].text).toContain("\ntail of a long text");
    expect(entries[3].categories).toEqual(["networking", "sessionid"]);
  });

  it("gives the same entries whatever the chunk size", () => {
    const text = tiger_file();
    const whole = parse_all(text).all;
    for (const size of [1, 3, 64]) {
      expect(parse_all(text, undefined, size).all).toEqual(whole);
    }
  });
});

describe("datamine text", () => {
  const k_text =
    "============================================================================================\n" +
    "blamnet datamine tiger_release_internal default 1.2.3.4.alpha \n" +
    "============================================================================================\n" +
    "\n" +
    "08.10.26 15:45:43.527 0001336 status game start\n" +
    "08.10.26 15:45:43.529 0001341 WARNING networking:update_async: late\n" +
    "08.10.26 15:45:43.530 0001342 -ERROR- hs: bad\n" +
    "08.10.26 15:45:43.531 0001343 -CRITICAL- hs: worse\n" +
    "08.10.26 15:45:43.532 0001344 Unknown (63) world_controller: Initializing.\n" +
    "08.10.26 15:45:43.533 0001345 no priority at all\n" +
    "08.10.26 15:45:43.534 0001346 status  padded status\n";

  it("reads the banner, the priorities and the missing priority", () => {
    const { entries, parser } = parse_all(k_text);
    expect(parser.format).toBe("datamine_text");
    expect(parser.banner_version).toBe(
      "tiger_release_internal default 1.2.3.4.alpha"
    );
    expect(entries.map((entry) => entry.level)).toEqual([
      e_event_level.status,
      e_event_level.warning,
      e_event_level.error,
      e_event_level.critical,
      undefined,
      undefined,
      e_event_level.status,
    ]);
    expect(entries[0].text).toBe("game start");
    expect(entries[0].event_index).toBe(1336);
    expect(entries[0].date).toEqual(new Date(2026, 7, 10, 15, 45, 43, 527));
    expect(entries[1].category_path).toBe("networking:update_async");
    expect(entries[4].level_text).toBe("Unknown (63)");
    expect(entries[4].category_path).toBe("world_controller");
    expect(entries[5].level_text).toBe("");
    expect(entries[5].text).toBe("no priority at all");
    expect(entries[6].text).toBe("padded status");
  });

  it("works in chunks", () => {
    const whole = parse_all(k_text).entries;
    expect(parse_all(k_text, undefined, 5).entries).toEqual(whole);
  });
});

describe("format detection", () => {
  it("tells the text formats apart", () => {
    expect(log_detect_text_format(halo_file())).toBe("halo_style_log");
    expect(
      log_detect_text_format(
        destiny_style_banner("v") + destiny_style_line(make_line())
      )
    ).toBe("destiny_style_log");
    expect(
      log_detect_text_format(
        "08.10.26 15:45:43.527 0001336 status game start\n"
      )
    ).toBe("datamine_text");
    expect(
      log_detect_text_format("blamnet datamine tiger default 1.0 \n")
    ).toBe("datamine_text");
  });

  it("falls back to the banner rule and gives up on other text", () => {
    expect(log_detect_text_format(destiny_style_banner("v"))).toBe(
      "destiny_style_log"
    );
    expect(log_detect_text_format(halo_style_banner("v"))).toBe(
      "halo_style_log"
    );
    expect(
      log_detect_text_format("just some text\nand more\n")
    ).toBeUndefined();
  });

  it("skips a head that starts mid-line", () => {
    const head = `partial line of text\r\n${destiny_style_line(make_line())}`;
    expect(log_detect_text_format(head)).toBe("destiny_style_log");
  });

  it("refuses the binary formats in the parser", () => {
    expect(() => new c_log_text_parser("datamine_binary")).toThrow();
  });

  it("finds nothing in text it cannot place", () => {
    const { entries, parser } = parse_all("hello\nworld\n");
    expect(parser.format).toBeUndefined();
    expect(entries).toEqual([]);
  });
});

describe("log_detect_format", () => {
  function datamine_bytes(
    layout: t_data_mine_header_layout,
    byte_order: t_byte_order
  ): Uint8Array {
    return encode_datamine_file({
      encoding: "utf8",
      header: {
        layout,
        byte_order,
        sessionid: "s",
        build_string: "b",
        build_number: 1,
        systemid: "x",
        title: "t",
        session_start_date: 0n,
      },
      records: [],
    });
  }

  function encode(text: string): Uint8Array {
    return new TextEncoder().encode(text);
  }

  it("recognises binary datamine files of either byte order", () => {
    expect(log_detect_format("a.datamine", datamine_bytes("3.1", "big"))).toBe(
      "datamine_binary"
    );
    expect(log_detect_format("a", datamine_bytes("1.1", "little"))).toBe(
      "datamine_binary"
    );
  });

  it("recognises an upload zip by its compressed.dat entry", async () => {
    const zip = await zip_create_single_entry(
      "compressed.dat",
      datamine_bytes("3.1", "big")
    );
    expect(log_detect_format("upload.bin", zip)).toBe("datamine_upload");
    const other = await zip_create_single_entry("other.txt", encode("hello"));
    expect(log_detect_format("x.zip", other)).toBeUndefined();
  });

  it("recognises the text formats", () => {
    expect(
      log_detect_format(
        "debug.txt",
        encode(halo_style_banner("v") + halo_style_line(make_line()))
      )
    ).toBe("halo_style_log");
    expect(
      log_detect_format(
        "debug.txt",
        encode(destiny_style_banner("v") + destiny_style_line(make_line()))
      )
    ).toBe("destiny_style_log");
    expect(
      log_detect_format(
        "x.txt",
        encode(
          "blamnet datamine tiger default 1 \n08.10.26 15:45:43.527 0000001 hi\n"
        )
      )
    ).toBe("datamine_text");
  });

  it("is not fooled by a UTF-16 byte order mark on text", () => {
    const text = new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0x42, 0x00]);
    expect(log_detect_format("x.txt", text)).toBeUndefined();
  });

  it("uses the file extension as a last resort", () => {
    expect(log_detect_format("a.datamine", encode("junk"))).toBe(
      "datamine_binary"
    );
    expect(log_detect_format("a.txt", encode("junk"))).toBeUndefined();
    expect(log_detect_format("a.txt", new Uint8Array())).toBeUndefined();
  });
});
