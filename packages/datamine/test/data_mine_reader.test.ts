import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  encode_data_mine_header,
  encode_datamine_definition_v3,
  encode_datamine_event_record,
  encode_datamine_occurrence_v3,
  k_data_mine_header_layout_sizes,
  type s_data_mine_header,
  type t_data_mine_header_layout,
} from "../src/blam/data_mining/data_mine_formats.ts";
import {
  e_datamine_parameter_type,
  type s_datamine_record,
} from "../src/blam/data_mining/data_mining.ts";
import type { t_byte_order } from "../src/byte_writer.ts";
import {
  data_mine_layout_detect,
  encode_datamine_file,
  read_datamine_file,
  read_datamine_upload,
  type s_datamine_file,
} from "../src/data_mine_reader.ts";
import { DatamineError } from "../src/datamine_error.ts";
import {
  zip_create_single_entry,
  zip_read_single_entry,
} from "../src/transport/zip_writer.ts";

const halo_data_dir = process.env.TIGER_HALO_DATA_DIR;
const reach_dir = process.env.TIGER_REACH_DATAMINE_DIR;
const destiny_dir = process.env.TIGER_DESTINY_DATAMINE_DIR;

function make_header(
  layout: t_data_mine_header_layout,
  byte_order: t_byte_order
): s_data_mine_header {
  return {
    layout,
    byte_order,
    sessionid: "session",
    build_string: "build",
    build_number: 1,
    systemid: "system",
    title: "title",
    session_start_date: 5n,
  };
}

function make_record(event_index: number): s_datamine_record {
  return {
    priority: 1,
    event_name: "a:b %d",
    parameter_signature: "%d",
    event_index,
    game_info: { game_instance: 0n, map: "" },
    event_date: 10n,
    categories: ["a"],
    parameters: [{ name: "", type: e_datamine_parameter_type.long, value: 3 }],
  };
}

// Reading must stop at the first record that isn't whole and re-encoding the rest must be exact.
function expect_exact_prefix(file: s_datamine_file, bytes: Buffer): void {
  const encoded = encode_datamine_file(file);
  expect(
    encoded.equals(bytes.subarray(0, file.truncated_at ?? bytes.length))
  ).toBe(true);
}

describe("data_mine_layout_detect", () => {
  it("tells the minor layouts from the plain ones by the word at 0x4", () => {
    const cases: [t_data_mine_header_layout, t_byte_order][] = [
      ["1.0", "little"],
      ["2.0", "big"],
      ["1.1", "little"],
      ["2.1", "big"],
      ["3.1", "big"],
    ];
    for (const [layout, byte_order] of cases) {
      const header = encode_data_mine_header(make_header(layout, byte_order));
      expect(data_mine_layout_detect(header)).toEqual({ layout, byte_order });
    }
  });

  it("rejects unknown markers and versions", () => {
    expect(() => data_mine_layout_detect(Buffer.alloc(16))).toThrow(
      DatamineError
    );
    const header = encode_data_mine_header(make_header("1.0", "big"));
    header.writeUInt16BE(9, 2);
    expect(() => data_mine_layout_detect(header)).toThrow(DatamineError);
  });
});

describe("read_datamine_file", () => {
  it("keeps the record sequence and stops at a truncated tail", () => {
    const order = "little";
    const whole = Buffer.concat([
      encode_data_mine_header(make_header("1.1", order)),
      encode_datamine_event_record(make_record(1), order),
      encode_datamine_event_record(make_record(2), order),
    ]);
    const cut = whole.subarray(0, whole.length - 10);
    const file = read_datamine_file(cut);
    expect(file.records).toHaveLength(1);
    expect(file.truncated_at).toBe(
      k_data_mine_header_layout_sizes["1.1"] +
        encode_datamine_event_record(make_record(1), order).length
    );
    expect_exact_prefix(file, cut);
  });

  it("stops at a record whose kind is unknown", () => {
    const order = "big";
    const bad = Buffer.alloc(40);
    bad.writeUInt32BE(40, 0);
    bad[4] = 9;
    const bytes = Buffer.concat([
      encode_data_mine_header(make_header("3.1", order)),
      bad,
    ]);
    const file = read_datamine_file(bytes);
    expect(file.records).toHaveLength(0);
    expect(file.truncated_at).toBe(k_data_mine_header_layout_sizes["3.1"]);
  });

  it("resolves v3 occurrences through their definition, in file order", () => {
    const order = "big";
    const definition = {
      definition_id: 61,
      priority: 2,
      event_name: "a:b %d %s",
      parameter_signature: "%d, %s, ",
      categories: ["a"],
      parameters: [
        { name: "", type: e_datamine_parameter_type.long },
        { name: "", type: e_datamine_parameter_type.string },
      ],
    };
    const bytes = Buffer.concat([
      encode_data_mine_header(make_header("3.1", order)),
      encode_datamine_definition_v3(definition, order),
      encode_datamine_occurrence_v3(
        {
          event_index: 4,
          definition_id: 61,
          event_date: 99n,
          values: [
            { type: e_datamine_parameter_type.long, value: 8 },
            { type: e_datamine_parameter_type.string, value: "text" },
          ],
        },
        order
      ),
    ]);
    const file = read_datamine_file(bytes);
    expect(file.records.map((entry) => entry.kind)).toEqual([
      "definition",
      "occurrence",
    ]);
    const occurrence = file.records[1];
    if (occurrence.kind !== "occurrence") {
      throw new Error("expected an occurrence");
    }
    expect(occurrence.definition_id).toBe(61);
    expect(occurrence.record).toMatchObject({
      event_name: "a:b %d %s",
      event_index: 4,
      event_date: 99n,
      categories: ["a"],
      parameters: [
        { type: e_datamine_parameter_type.long, value: 8 },
        { type: e_datamine_parameter_type.string, value: "text" },
      ],
    });
    expect_exact_prefix(file, bytes);
  });

  it("keeps occurrences with no definition as raw values", () => {
    const order = "big";
    const bytes = Buffer.concat([
      encode_data_mine_header(make_header("3.1", order)),
      encode_datamine_occurrence_v3(
        {
          event_index: 4,
          definition_id: 7,
          event_date: 99n,
          values: [{ type: e_datamine_parameter_type.long, value: 8 }],
        },
        order
      ),
    ]);
    const file = read_datamine_file(bytes);
    const entry = file.records[0];
    expect(entry.kind).toBe("occurrence");
    expect(
      entry.kind === "occurrence" && entry.unresolved_values
    ).toBeDefined();
    expect_exact_prefix(file, bytes);
  });

  it("honours a layout override", () => {
    const order = "big";
    const bytes = encode_data_mine_header(make_header("2.0", order));
    expect(read_datamine_file(bytes, { layout: "2.0" }).header.layout).toBe(
      "2.0"
    );
  });
});

describe("read_datamine_upload", () => {
  it("reads the single entry of an upload zip", async () => {
    const order = "little";
    const bytes = Buffer.concat([
      encode_data_mine_header(make_header("1.1", order)),
      encode_datamine_event_record(make_record(1), order),
    ]);
    const zip = await zip_create_single_entry("compressed.dat", bytes, {
      level: 3,
    });
    const file = read_datamine_upload(zip);
    expect(file.records).toHaveLength(1);
    expect(encode_datamine_file(file).equals(bytes)).toBe(true);
  });
});

describe.skipIf(!halo_data_dir)("halo golden files", () => {
  it("decodes the upload zip and re-encodes it byte for byte", () => {
    const zip = readFileSync(join(halo_data_dir as string, "upload_temp.zip"));
    const bytes = zip_read_single_entry(zip).data;
    const file = read_datamine_upload(zip);

    expect(file.header.layout).toBe("1.1");
    expect(file.header.byte_order).toBe("little");
    expect(file.truncated_at).toBeUndefined();
    expect(file.records).toHaveLength(65);
    const indexes = file.records.map((entry) =>
      entry.kind === "event" ? entry.record.event_index : -1
    );
    expect(indexes).toEqual(Array.from({ length: 65 }, (_, i) => i + 1));
    expect(encode_datamine_file(file).equals(bytes)).toBe(true);
  });

  it("decodes a datamine file and re-encodes it byte for byte", () => {
    const bytes = readFileSync(
      join(halo_data_dir as string, "datamine", "3dd2325633c20fed.datamine")
    );
    const file = read_datamine_file(bytes);
    expect(file.header.layout).toBe("1.1");
    expect(file.truncated_at).toBeUndefined();
    const first = file.records[0];
    expect(first.kind === "event" && first.record.event_index).toBe(66);
    expect(encode_datamine_file(file).equals(bytes)).toBe(true);
  });
});

describe.skipIf(!reach_dir)("reach golden files", () => {
  for (const name of [
    "0a5e7863435d345b.datamine",
    "09931c5e3ac73817.datamine",
  ]) {
    it(`decodes ${name} and re-encodes the readable part exactly`, () => {
      const bytes = readFileSync(join(reach_dir as string, name));
      const file = read_datamine_file(bytes);

      expect(file.header.layout).toBe("2.1");
      expect(file.header.byte_order).toBe("big");
      expect(file.header.version_major).toBe(2);
      expect(file.header.version_minor).toBe(1);
      expect(file.records.length).toBeGreaterThan(0);
      expect(file.records.every((entry) => entry.kind === "event")).toBe(true);
      expect_exact_prefix(file, bytes);
    });
  }
});

describe.skipIf(!destiny_dir)("destiny golden files", () => {
  it("decodes the smallest files and re-encodes them byte for byte", () => {
    const dir = destiny_dir as string;
    const names = readdirSync(dir)
      .filter((name) => statSync(join(dir, name)).size > 472)
      .sort((a, b) => statSync(join(dir, a)).size - statSync(join(dir, b)).size)
      .slice(0, 3);
    expect(names).toHaveLength(3);

    for (const name of names) {
      const bytes = readFileSync(join(dir, name));
      const file = read_datamine_file(bytes);

      expect(file.header.layout).toBe("3.1");
      expect(file.header.byte_order).toBe("big");
      expect(file.header.version_major).toBe(3);
      expect(file.header.version_minor).toBe(1);
      expect(file.truncated_at).toBeUndefined();
      expect(file.records.length).toBeGreaterThan(0);

      const defined = new Set<number>();
      for (const entry of file.records) {
        if (entry.kind === "definition") {
          defined.add(entry.definition.definition_id);
        } else if (entry.kind === "occurrence") {
          expect(defined.has(entry.definition_id)).toBe(true);
          expect(entry.unresolved_values).toBeUndefined();
        }
      }
      expect(encode_datamine_file(file).equals(bytes)).toBe(true);
    }
  });
});
