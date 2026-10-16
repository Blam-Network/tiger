import {
  read_datamine_file as blf_read_datamine_file,
  get_formatted_event_string,
} from "@blamnetwork/blf";
import { describe, expect, it } from "vitest";
import {
  encode_data_mine_header,
  encode_datamine_definition_v3,
  encode_datamine_event_record,
  encode_datamine_occurrence_v3,
  k_data_mine_header_layout_sizes,
  k_data_mine_header_layouts,
  type s_data_mine_header,
  type t_data_mine_header_layout,
} from "../../../src/blam/data_mining/data_mine_formats.ts";
import {
  e_datamine_parameter_type,
  type s_datamine_record,
} from "../../../src/blam/data_mining/data_mining.ts";
import type { t_byte_order } from "../../../src/byte_writer.ts";
import {
  c_datamine_definition_file_state,
  c_datamine_definition_registry,
} from "../../../src/data_mine_definitions.ts";
import {
  encode_datamine_file,
  read_datamine_file,
} from "../../../src/data_mine_reader.ts";

const k_orders = ["little", "big"] as const;

function read_u16(buffer: Buffer, offset: number, order: string): number {
  return order === "little"
    ? buffer.readUInt16LE(offset)
    : buffer.readUInt16BE(offset);
}

function read_u32(buffer: Buffer, offset: number, order: string): number {
  return order === "little"
    ? buffer.readUInt32LE(offset)
    : buffer.readUInt32BE(offset);
}

function read_i32(buffer: Buffer, offset: number, order: string): number {
  return order === "little"
    ? buffer.readInt32LE(offset)
    : buffer.readInt32BE(offset);
}

function read_u64(buffer: Buffer, offset: number, order: string): bigint {
  return order === "little"
    ? buffer.readBigUInt64LE(offset)
    : buffer.readBigUInt64BE(offset);
}

function read_text(buffer: Buffer, offset: number): string {
  const end = buffer.indexOf(0, offset);
  return buffer.toString("utf8", offset, end);
}

function make_header(
  layout: t_data_mine_header_layout,
  byte_order: t_byte_order
): s_data_mine_header {
  return {
    layout,
    byte_order,
    sessionid: "session_a",
    build_string: "build_b",
    build_number: -1,
    systemid: "system_c",
    title: "title_d",
    session_start_date: 0x01_dd_00_00_12_34_56_78n,
    source_flag: 1,
  };
}

interface s_header_offsets {
  build_number: number;
  build_string: number;
  major: number;
  minor?: number;
  session_start_date: number;
  sessionid: number;
  source_flag?: number;
  systemid: number;
  title: number;
}

const k_header_offsets: Record<t_data_mine_header_layout, s_header_offsets> = {
  "1.0": {
    major: 2,
    sessionid: 0x4,
    build_string: 0x84,
    build_number: 0xa4,
    systemid: 0xa8,
    title: 0x148,
    session_start_date: 0x168,
  },
  "2.0": {
    major: 2,
    sessionid: 0x4,
    build_string: 0x84,
    build_number: 0xa4,
    systemid: 0xa8,
    title: 0x148,
    session_start_date: 0x168,
    source_flag: 0x170,
  },
  "1.1": {
    major: 2,
    minor: 4,
    sessionid: 0x6,
    build_string: 0x86,
    build_number: 0xa6,
    systemid: 0xaa,
    title: 0x14a,
    session_start_date: 0x16a,
  },
  "2.1": {
    major: 2,
    minor: 4,
    sessionid: 0x6,
    build_string: 0x86,
    build_number: 0xa6,
    systemid: 0xaa,
    title: 0x14a,
    session_start_date: 0x16a,
    source_flag: 0x172,
  },
  "3.1": {
    major: 2,
    minor: 4,
    sessionid: 0x6,
    build_string: 0x86,
    build_number: 0x110,
    systemid: 0x114,
    title: 0x1b4,
    session_start_date: 0x108,
  },
};

const k_expected_major: Record<t_data_mine_header_layout, number> = {
  "1.0": 1,
  "2.0": 2,
  "1.1": 1,
  "2.1": 2,
  "3.1": 3,
};

describe("encode_data_mine_header", () => {
  for (const layout of k_data_mine_header_layouts) {
    for (const order of k_orders) {
      it(`puts every ${layout} field at its offset (${order} endian)`, () => {
        const buffer = encode_data_mine_header(make_header(layout, order));
        const offsets = k_header_offsets[layout];

        expect(buffer).toHaveLength(k_data_mine_header_layout_sizes[layout]);
        // The marker 0xFFFE is stored in the file's own order.
        expect([...buffer.subarray(0, 2)]).toEqual(
          order === "little" ? [0xfe, 0xff] : [0xff, 0xfe]
        );
        expect(read_u16(buffer, offsets.major, order)).toBe(
          k_expected_major[layout]
        );
        if (offsets.minor !== undefined) {
          expect(read_u16(buffer, offsets.minor, order)).toBe(1);
        }
        expect(read_text(buffer, offsets.sessionid)).toBe("session_a");
        expect(read_text(buffer, offsets.build_string)).toBe("build_b");
        expect(read_i32(buffer, offsets.build_number, order)).toBe(-1);
        expect(read_text(buffer, offsets.systemid)).toBe("system_c");
        expect(read_text(buffer, offsets.title)).toBe("title_d");
        expect(read_u64(buffer, offsets.session_start_date, order)).toBe(
          0x01_dd_00_00_12_34_56_78n
        );
        if (offsets.source_flag !== undefined) {
          expect(buffer[offsets.source_flag]).toBe(1);
        }
      });
    }
  }

  it("lists the layout sizes", () => {
    expect(k_data_mine_header_layout_sizes).toEqual({
      "1.0": 368,
      "1.1": 370,
      "2.0": 369,
      "2.1": 371,
      "3.1": 472,
    });
  });

  it("writes a 128 byte 3.1 build string and zero padding", () => {
    const long_build = "b".repeat(100);
    const buffer = encode_data_mine_header({
      ...make_header("3.1", "big"),
      build_string: long_build,
    });
    expect(read_text(buffer, 0x86)).toBe(long_build);
    expect(
      buffer.subarray(0x86 + long_build.length, 0x108).every((b) => b === 0)
    ).toBe(true);
    expect(read_u32(buffer, 0x1d4, "big")).toBe(0);
  });
});

function make_record(): s_datamine_record {
  return {
    priority: 3,
    event_name: "networking:hello %s %d %I64d %f",
    parameter_signature: "%s, %d, %I64d, %f",
    event_index: 77,
    game_info: { game_instance: 0x1122_3344_5566_7788n, map: "maps\\test" },
    event_date: 0x01_dd_00_00_aa_bb_cc_ddn,
    categories: ["networking", "hello"],
    parameters: [
      { name: "", type: e_datamine_parameter_type.string, value: "bob" },
      { name: "n", type: e_datamine_parameter_type.long, value: -2 },
      { name: "big", type: e_datamine_parameter_type.int64, value: 2n ** 40n },
      { name: "f", type: e_datamine_parameter_type.float, value: 1.5 },
    ],
  };
}

describe("encode_datamine_event_record", () => {
  for (const order of k_orders) {
    it(`uses the 1.x record offsets (${order} endian)`, () => {
      const buffer = encode_datamine_event_record(make_record(), order);

      expect(read_u32(buffer, 0, order)).toBe(buffer.length);
      expect(read_text(buffer, 4)).toBe("networking:hello %s %d %I64d %f");
      expect(read_text(buffer, 0x204)).toBe("%s, %d, %I64d, %f");
      expect(read_i32(buffer, 0x404, order)).toBe(3);
      expect(read_i32(buffer, 0x408, order)).toBe(77);
      expect(read_u64(buffer, 0x40c, order)).toBe(0x1122_3344_5566_7788n);
      expect(read_text(buffer, 0x414)).toBe("maps\\test");
      expect(read_u64(buffer, 0x518, order)).toBe(0x01_dd_00_00_aa_bb_cc_ddn);
      expect(read_i32(buffer, 0x520, order)).toBe(2);
      expect(read_text(buffer, 0x524)).toBe("networking");
      expect(read_text(buffer, 0x544)).toBe("hello");

      // Two categories, then the parameter count and the parameters.
      const parameters_at = 0x524 + 64;
      expect(read_i32(buffer, parameters_at, order)).toBe(4);
      let at = parameters_at + 4;
      expect(read_text(buffer, at)).toBe("");
      expect(read_u32(buffer, at + 32, order)).toBe(3);
      expect(read_u32(buffer, at + 36, order)).toBe(3);
      expect(buffer.toString("utf8", at + 40, at + 43)).toBe("bob");
      at += 43;
      expect(read_text(buffer, at)).toBe("n");
      expect(read_i32(buffer, at + 36, order)).toBe(-2);
      at += 40;
      expect(read_u32(buffer, at + 32, order)).toBe(1);
      expect(
        order === "little"
          ? buffer.readBigInt64LE(at + 36)
          : buffer.readBigInt64BE(at + 36)
      ).toBe(2n ** 40n);
      at += 44;
      expect(
        order === "little"
          ? buffer.readFloatLE(at + 36)
          : buffer.readFloatBE(at + 36)
      ).toBe(1.5);
      expect(at + 40).toBe(buffer.length);
    });
  }
});

describe("v3 records", () => {
  const definition = {
    definition_id: 51,
    priority: 4,
    event_name: "x:y %d",
    parameter_signature: "%d, ",
    categories: ["x"],
    parameters: [{ name: "", type: e_datamine_parameter_type.long }],
  };

  for (const order of k_orders) {
    it(`uses the definition and occurrence offsets (${order} endian)`, () => {
      const encoded = encode_datamine_definition_v3(definition, order);
      expect(read_u32(encoded, 0, order)).toBe(encoded.length);
      expect(encoded[4]).toBe(1);
      expect(encoded[5]).toBe(4);
      expect(read_text(encoded, 6)).toBe("x:y %d");
      expect(read_text(encoded, 0x206)).toBe("%d, ");
      expect(read_u32(encoded, 0x406, order)).toBe(51);
      expect(read_u32(encoded, 0x40a, order)).toBe(1);
      expect(read_text(encoded, 0x40e)).toBe("x");
      expect(read_u32(encoded, 0x42e, order)).toBe(1);
      expect(read_text(encoded, 0x432)).toBe("");
      expect(read_u32(encoded, 0x432 + 32, order)).toBe(0);
      expect(encoded).toHaveLength(0x432 + 36);

      const occurrence = encode_datamine_occurrence_v3(
        {
          event_index: 9,
          definition_id: 51,
          event_date: 0x01_dd_00_00_aa_bb_cc_ddn,
          values: [
            { type: e_datamine_parameter_type.long, value: 12 },
            { type: e_datamine_parameter_type.string, value: "hi" },
          ],
        },
        order
      );
      expect(read_u32(occurrence, 0, order)).toBe(occurrence.length);
      expect(occurrence[4]).toBe(2);
      expect(read_u32(occurrence, 5, order)).toBe(9);
      expect(read_u32(occurrence, 9, order)).toBe(51);
      expect(read_u64(occurrence, 13, order)).toBe(0x01_dd_00_00_aa_bb_cc_ddn);
      expect(read_i32(occurrence, 21, order)).toBe(12);
      expect(read_u32(occurrence, 25, order)).toBe(2);
      expect(occurrence.toString("utf8", 29)).toBe("hi");
    });
  }
});

describe("blf compatibility", () => {
  it.each(k_orders)("reads 1.0 files (%s endian)", (order) => {
    const header = make_header("1.0", order);
    // The formatter only uses unnamed parameters, like the ones add_args produces.
    const record = make_record();
    record.parameters = record.parameters.map((p) => ({ ...p, name: "" }));
    const file = Buffer.concat([
      encode_data_mine_header(header),
      encode_datamine_event_record(record, order),
    ]);
    const parsed = blf_read_datamine_file(file);
    expect(parsed).toBeDefined();
    expect(parsed?.header).toMatchObject({
      version: 1,
      version_major: 1,
      sessionid: "session_a",
      build_string: "build_b",
      build_number: -1,
      systemid: "system_c",
      title: "title_d",
      session_start_date: header.session_start_date,
    });
    expect(parsed?.events).toHaveLength(1);
    const [event] = parsed?.events ?? [];
    expect(event.categories).toEqual(["networking", "hello"]);
    expect(event.header.event_index).toBe(77);
    expect(event.header.game_info.map).toBe("maps\\test");
    expect(event.parameters.map((p) => p.name)).toEqual(["", "", "", ""]);
    expect(event.parameters[0].value_string?.string).toBe("bob");
    expect(event.parameters[2].value_int64).toBe(2n ** 40n);
    expect(event.parameters[3].value_float).toBe(1.5);
    expect(get_formatted_event_string(event)).toBe(
      "networking:hello bob 4294967294 1099511627776 1.5"
    );
  });

  it("reads 2.0 files", () => {
    const order = "big";
    const file = Buffer.concat([
      encode_data_mine_header(make_header("2.0", order)),
      encode_datamine_event_record(make_record(), order),
    ]);
    const parsed = blf_read_datamine_file(file);
    expect(parsed?.header).toMatchObject({
      version: 2,
      version_major: 2,
      source_flag: 1,
      sessionid: "session_a",
    });
    expect(parsed?.events).toHaveLength(1);
  });

  it("reads 3.1 files with definitions and occurrences", () => {
    const order = "big";
    const record = make_record();
    const registry = new c_datamine_definition_registry();
    const state = new c_datamine_definition_file_state();
    const file = Buffer.concat([
      encode_data_mine_header({
        ...make_header("3.1", order),
        title: "app_name",
      }),
      ...state.encode_record_v3(record, registry, order),
      ...state.encode_record_v3(
        { ...record, event_index: 78 },
        registry,
        order
      ),
    ]);
    const parsed = blf_read_datamine_file(file);
    expect(parsed?.header).toMatchObject({
      version: 3,
      version_major: 3,
      version_minor: 1,
      sessionid: "session_a",
      build_number: -1,
      application_name: "app_name",
    });
    expect(parsed?.events).toHaveLength(2);
    const [first, second] = parsed?.events ?? [];
    expect(first.categories).toEqual(["networking", "hello"]);
    expect(first.header.event_name).toBe(record.event_name);
    expect(first.header.priority).toBe(3);
    expect([first.header.event_index, second.header.event_index]).toEqual([
      77, 78,
    ]);
    expect(first.parameters[0].value_string?.string).toBe("bob");
    expect(get_formatted_event_string(second)).toContain("bob");
  });
});

describe("own reader round trip", () => {
  const registry_record = make_record();

  for (const layout of k_data_mine_header_layouts) {
    for (const order of k_orders) {
      it(`reads back and re-encodes ${layout} (${order} endian)`, () => {
        const header = make_header(layout, order);
        const parts: Buffer[] = [encode_data_mine_header(header)];
        if (layout === "3.1") {
          const registry = new c_datamine_definition_registry({
            first_definition_id: 50,
          });
          const state = new c_datamine_definition_file_state();
          parts.push(
            ...state.encode_record_v3(registry_record, registry, order),
            ...state.encode_record_v3(
              { ...registry_record, event_index: 78 },
              registry,
              order
            )
          );
        } else {
          parts.push(
            encode_datamine_event_record(registry_record, order),
            encode_datamine_event_record(
              { ...registry_record, event_index: 78 },
              order
            )
          );
        }
        const bytes = Buffer.concat(parts);

        const file = read_datamine_file(bytes);
        expect(file.header.layout).toBe(layout);
        expect(file.header.byte_order).toBe(order);
        expect(file.header.sessionid).toBe("session_a");
        expect(file.header.title).toBe("title_d");
        expect(file.header.session_start_date).toBe(header.session_start_date);
        expect(file.truncated_at).toBeUndefined();

        const events = file.records.filter(
          (entry) => entry.kind !== "definition"
        );
        expect(events).toHaveLength(2);
        expect(events[0].record.event_name).toBe(registry_record.event_name);
        expect(encode_datamine_file(file).equals(bytes)).toBe(true);
      });
    }
  }
});
