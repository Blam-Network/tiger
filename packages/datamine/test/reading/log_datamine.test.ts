import { describe, expect, it } from "vitest";
import { filetime_from_date } from "../../src/blam/cseries/cseries_time.ts";
import { e_event_level } from "../../src/blam/cseries/event_levels.ts";
import type {
  s_data_mine_header,
  t_data_mine_header_layout,
} from "../../src/blam/data_mining/data_mine_formats.ts";
import {
  e_datamine_parameter_type,
  type s_datamine_parameter,
  type s_datamine_record,
} from "../../src/blam/data_mining/data_mining.ts";
import type { t_byte_order } from "../../src/byte_writer.ts";
import {
  encode_datamine_file,
  read_datamine_file,
  read_datamine_upload,
  type s_datamine_file,
} from "../../src/data_mine_reader.ts";
import {
  datamine_record_format_text,
  log_entries_from_datamine,
  log_header_from_datamine,
} from "../../src/reading/log_datamine.ts";
import type { s_log_entry } from "../../src/reading/log_entry.ts";
import { zip_create_single_entry } from "../../src/transport/zip_writer.ts";

// The first row is always the file's session; the rest are its events.
function split_session(entries: s_log_entry[]): {
  events: s_log_entry[];
  session: s_log_entry | undefined;
} {
  return { events: entries.slice(1), session: entries[0] };
}

const k_date = new Date(Date.UTC(2026, 8, 17, 14, 42, 41, 120));

function make_header(
  layout: t_data_mine_header_layout,
  byte_order: t_byte_order
): s_data_mine_header {
  return {
    layout,
    byte_order,
    sessionid: "Thu_09172026_144241_000001@xe@pn-test@AABBCC",
    build_string: "1.2.3.4.alpha",
    build_number: 1,
    systemid: "xe@pn-test@AABBCC",
    title: "tiger_release_internal default",
    session_start_date: filetime_from_date(k_date),
  };
}

function make_record(
  overrides: Partial<s_datamine_record> = {}
): s_datamine_record {
  return {
    priority: e_event_level.message,
    event_name: "a:b: hello",
    parameter_signature: "",
    event_index: 0,
    game_info: { game_instance: 0n, map: "" },
    event_date: filetime_from_date(k_date),
    categories: ["a", "b"],
    parameters: [],
    ...overrides,
  };
}

function long(value: number, name = ""): s_datamine_parameter {
  return { name, type: e_datamine_parameter_type.long, value };
}

function text(value: string, name = ""): s_datamine_parameter {
  return { name, type: e_datamine_parameter_type.string, value };
}

function round_trip(file: s_datamine_file): s_datamine_file {
  return read_datamine_file(encode_datamine_file(file));
}

describe("datamine_record_format_text", () => {
  it("prints the unnamed parameters in order", () => {
    expect(
      datamine_record_format_text(
        make_record({
          event_name: "a:b: %s joined with %d of %d",
          parameters: [text("someone"), long(3), long(4)],
        })
      )
    ).toBe("a:b: someone joined with 3 of 4");
  });

  it("skips the named parameters the bridge adds", () => {
    expect(
      datamine_record_format_text(
        make_record({
          event_name: "a:b: %s at %d",
          parameters: [
            {
              name: "squad session id",
              type: e_datamine_parameter_type.int64,
              value: 5n,
            },
            long(9, "squad session timestamp"),
            text("[(x)y]", "context"),
            text("host"),
            long(2),
          ],
        })
      )
    ).toBe("a:b: host at 2");
  });

  it("copes with missing, extra and odd parameters", () => {
    expect(
      datamine_record_format_text(
        make_record({ event_name: "a: %d and %s", parameters: [long(1)] })
      )
    ).toBe("a: 1 and %s");
    expect(
      datamine_record_format_text(
        make_record({ event_name: "a: nothing", parameters: [long(1)] })
      )
    ).toBe("a: nothing");
    expect(
      datamine_record_format_text(
        make_record({ event_name: "a: %d", parameters: [text("word")] })
      )
    ).toContain("a: ");
    expect(
      datamine_record_format_text(
        make_record({
          event_name: "a: %I64d",
          parameters: [
            {
              name: "",
              type: e_datamine_parameter_type.int64,
              value: 1_099_511_627_776n,
            },
          ],
        })
      )
    ).toBe("a: 1099511627776");
  });
});

describe("log_entries_from_datamine", () => {
  it("makes one entry per v3 occurrence and none for definitions", () => {
    const file: s_datamine_file = {
      encoding: "utf8",
      header: make_header("3.1", "big"),
      records: [
        {
          kind: "definition",
          definition: {
            definition_id: 7,
            priority: e_event_level.warning,
            event_name: "networking:session: join %s failed %d",
            parameter_signature: "%s, %d, ",
            categories: ["networking", "session"],
            parameters: [
              { name: "", type: e_datamine_parameter_type.string },
              { name: "", type: e_datamine_parameter_type.long },
            ],
          },
        },
        {
          kind: "occurrence",
          definition_id: 7,
          record: make_record({
            event_index: 3,
            priority: e_event_level.warning,
            event_name: "networking:session: join %s failed %d",
            parameter_signature: "%s, %d, ",
            categories: ["networking", "session"],
            parameters: [text("someone"), long(5)],
          }),
        },
        {
          kind: "occurrence",
          definition_id: 7,
          record: make_record({
            event_index: 4,
            event_date: 0n,
            priority: e_event_level.warning,
            event_name: "networking:session: join %s failed %d",
            parameter_signature: "%s, %d, ",
            categories: ["networking", "session"],
            parameters: [text("another"), long(6)],
          }),
        },
        {
          kind: "occurrence",
          definition_id: 99,
          unresolved_values: Buffer.from([1, 2, 3]),
          record: make_record({
            event_index: 5,
            event_name: "",
            categories: [],
            parameters: [],
          }),
        },
      ],
    };
    const { events: entries, session } = split_session(
      log_entries_from_datamine(round_trip(file))
    );
    expect(session?.kind).toBe("session");
    expect(session?.ordinal).toBe(0);
    expect(session?.session?.session_id).toBe(file.header.sessionid);
    expect(session?.session?.version).toBe(file.header.build_string);
    expect(entries).toHaveLength(3);

    expect(entries[0].ordinal).toBe(1);
    expect(entries[0].event_index).toBe(3);
    expect(entries[0].definition_id).toBe(7);
    expect(entries[0].level).toBe(e_event_level.warning);
    expect(entries[0].level_text).toBe("warning");
    expect(entries[0].text).toBe("networking:session: join someone failed 5");
    expect(entries[0].message).toBe("join someone failed 5");
    expect(entries[0].category_path).toBe("networking:session");
    expect(entries[0].categories).toEqual(["networking", "session"]);
    expect(entries[0].date).toEqual(k_date);
    expect(entries[0].date_text).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:/);
    expect(entries[0].parameters).toEqual([
      { name: "", type: e_datamine_parameter_type.string, value: "someone" },
      { name: "", type: e_datamine_parameter_type.long, value: 5 },
    ]);

    expect(entries[1].ordinal).toBe(2);
    expect(entries[1].date).toBeUndefined();
    expect(entries[1].date_text).toBe("");

    expect(entries[2].definition_id).toBe(99);
    expect(entries[2].text).toContain("99");
    expect(entries[2].level).toBeUndefined();
  });

  it("reads halo records, with their session columns and context", () => {
    const file: s_datamine_file = {
      encoding: "utf8",
      header: make_header("1.1", "little"),
      records: [
        {
          kind: "event",
          record: make_record({
            priority: e_event_level.error,
            event_name: "a:b: %s broke",
            categories: ["root", "a", "b"],
            parameters: [
              {
                name: "squad session id",
                type: e_datamine_parameter_type.int64,
                value: 0n,
              },
              long(0, "squad session timestamp"),
              text("[(game)match]", "context"),
              text("thing"),
            ],
          }),
        },
        {
          kind: "event",
          record: make_record({ priority: 40, event_index: 1 }),
        },
      ],
    };
    const { events: entries } = split_session(
      log_entries_from_datamine(round_trip(file))
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].text).toBe("a:b: thing broke");
    expect(entries[0].context).toBe("[(game)match]");
    expect(entries[0].categories).toEqual(["root", "a", "b"]);
    expect(entries[0].message).toBe("thing broke");
    expect(entries[0].level).toBe(e_event_level.error);
    expect(entries[0].date_text).toMatch(/^\d{2}\.\d{2}\.\d{2} /);
    expect(entries[0].parameters).toHaveLength(4);
    expect(entries[1].level).toBeUndefined();
    expect(entries[1].level_text).toBe("Unknown (40)");
  });

  it("reads an upload", async () => {
    const file: s_datamine_file = {
      encoding: "utf8",
      header: make_header("1.1", "little"),
      records: [{ kind: "event", record: make_record() }],
    };
    const zip = await zip_create_single_entry(
      "compressed.dat",
      encode_datamine_file(file)
    );
    const { events: entries } = split_session(
      log_entries_from_datamine(read_datamine_upload(zip))
    );
    expect(entries.map((entry) => entry.text)).toEqual(["a:b: hello"]);
  });
});

describe("log_header_from_datamine", () => {
  it("keeps the fields a viewer shows and turns the start into a date", () => {
    const header = make_header("3.1", "big");
    expect(log_header_from_datamine(header)).toEqual({
      layout: "3.1",
      byte_order: "big",
      sessionid: header.sessionid,
      build_string: "1.2.3.4.alpha",
      build_number: 1,
      systemid: header.systemid,
      title: header.title,
      session_start_date: k_date,
    });
    expect(
      log_header_from_datamine({ ...header, session_start_date: 0n })
        .session_start_date
    ).toBeUndefined();
  });
});
