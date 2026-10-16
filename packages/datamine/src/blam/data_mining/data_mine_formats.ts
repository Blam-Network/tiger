import { c_byte_writer, type t_byte_order } from "../../byte_writer.ts";
import { DatamineError } from "../../datamine_error.ts";
import type { t_text_encoding } from "../cseries/cseries_strings.ts";
import {
  e_datamine_parameter_type,
  k_datamine_category_name_length,
  k_datamine_event_name_length,
  k_datamine_map_name_length,
  k_datamine_parameter_name_length,
  k_datamine_parameter_signature_length,
  type s_datamine_record,
} from "./data_mining.ts";

// Named after the header's own version fields, "major.minor". 1.0 and 1.1 are Halo 3, 2.0 and
// 2.1 are Halo: Reach, 3.1 is Destiny. The x.1 layouts add a minor version word, 2.x adds a
// source flag byte.
export type t_data_mine_header_layout = "1.0" | "1.1" | "2.0" | "2.1" | "3.1";

export const k_data_mine_header_layouts: readonly t_data_mine_header_layout[] =
  ["1.0", "1.1", "2.0", "2.1", "3.1"];

export const k_data_mine_header_layout_sizes: Record<
  t_data_mine_header_layout,
  number
> = {
  "1.0": 368,
  "1.1": 370,
  "2.0": 369,
  "2.1": 371,
  "3.1": 472,
};

export const k_data_mine_byte_order_marker = 0xff_fe;

// Starting capacity of the record writers. They grow, these only avoid early reallocation.
const k_event_record_writer_capacity = 1536;
const k_definition_record_writer_capacity = 1280;
const k_occurrence_record_writer_capacity = 128;

export const k_data_mine_sessionid_length = 128;
export const k_data_mine_build_string_length = 32;
export const k_data_mine_systemid_length = 160;
export const k_data_mine_title_length = 32;
// v3_1 widened the build string; the u64 after it is aligned to 8.
export const k_data_mine_build_string_v3_length = 128;
export const k_data_mine_v3_alignment_padding = 2;
// The v3_1 header struct is padded out to a multiple of 8.
export const k_data_mine_v3_tail_padding = 4;

// The version fields each layout writes when the header doesn't say.
const k_layout_versions: Record<
  t_data_mine_header_layout,
  { major: number; minor: number }
> = {
  "1.0": { major: 1, minor: 0 },
  "1.1": { major: 1, minor: 1 },
  "2.0": { major: 2, minor: 0 },
  "2.1": { major: 2, minor: 1 },
  "3.1": { major: 3, minor: 1 },
};

export function data_mine_header_layout_has_minor(
  layout: t_data_mine_header_layout
): boolean {
  return layout !== "1.0" && layout !== "2.0";
}

export function data_mine_header_layout_has_source_flag(
  layout: t_data_mine_header_layout
): boolean {
  return layout === "2.0" || layout === "2.1";
}

export interface s_data_mine_header {
  build_number: number;
  build_string: string;
  byte_order: t_byte_order;
  layout: t_data_mine_header_layout;
  session_start_date: bigint;
  sessionid: string;
  // v2 and v2_1
  source_flag?: number;
  systemid: string;
  // The application name in v3_1.
  title: string;
  version_major?: number;
  version_minor?: number;
}

export function encode_data_mine_header(
  header: s_data_mine_header,
  encoding: t_text_encoding = "utf8"
): Buffer {
  const layout = header.layout;
  const versions = k_layout_versions[layout];
  const writer = new c_byte_writer(
    header.byte_order,
    k_data_mine_header_layout_sizes[layout]
  );

  writer.u16(k_data_mine_byte_order_marker);
  writer.u16(header.version_major ?? versions.major);
  if (data_mine_header_layout_has_minor(layout)) {
    writer.u16(header.version_minor ?? versions.minor);
  }
  writer.fixed_string(header.sessionid, k_data_mine_sessionid_length, encoding);

  if (layout === "3.1") {
    writer.fixed_string(
      header.build_string,
      k_data_mine_build_string_v3_length,
      encoding
    );
    writer.zero(k_data_mine_v3_alignment_padding);
    writer.u64(header.session_start_date);
    writer.i32(header.build_number);
    writer.fixed_string(header.systemid, k_data_mine_systemid_length, encoding);
    writer.fixed_string(header.title, k_data_mine_title_length, encoding);
    writer.zero(k_data_mine_v3_tail_padding);
  } else {
    writer.fixed_string(
      header.build_string,
      k_data_mine_build_string_length,
      encoding
    );
    writer.i32(header.build_number);
    writer.fixed_string(header.systemid, k_data_mine_systemid_length, encoding);
    writer.fixed_string(header.title, k_data_mine_title_length, encoding);
    writer.u64(header.session_start_date);
    if (data_mine_header_layout_has_source_flag(layout)) {
      writer.u8(header.source_flag ?? 0);
    }
  }

  return writer.finish();
}

export function encode_datamine_parameter_value(
  writer: c_byte_writer,
  type: e_datamine_parameter_type,
  value: number | bigint | string,
  encoding: t_text_encoding = "utf8"
): void {
  switch (type) {
    case e_datamine_parameter_type.long:
      writer.i32(Number(value));
      break;
    case e_datamine_parameter_type.int64:
      writer.i64(BigInt(value));
      break;
    case e_datamine_parameter_type.float:
      writer.f32(Number(value));
      break;
    case e_datamine_parameter_type.string: {
      // Length prefix plus the bytes, no terminator.
      const bytes = Buffer.from(String(value), encoding);
      writer.u32(bytes.length);
      writer.bytes(bytes);
      break;
    }
    default:
      throw new DatamineError(`unknown datamine parameter type ${type}`);
  }
}

// Records for the v1, v1_1, v2 and v2_1 files. total_size covers the whole record.
export function encode_datamine_event_record(
  record: s_datamine_record,
  byte_order: t_byte_order,
  encoding: t_text_encoding = "utf8"
): Buffer {
  const writer = new c_byte_writer(byte_order, k_event_record_writer_capacity);
  writer.u32(0);
  writer.fixed_string(
    record.event_name,
    k_datamine_event_name_length,
    encoding
  );
  writer.fixed_string(
    record.parameter_signature,
    k_datamine_parameter_signature_length,
    encoding
  );
  writer.i32(record.priority);
  writer.i32(record.event_index);
  writer.u64(record.game_info.game_instance);
  writer.fixed_string(
    record.game_info.map,
    k_datamine_map_name_length,
    encoding
  );
  writer.u64(record.event_date);

  writer.i32(record.categories.length);
  for (const category of record.categories) {
    writer.fixed_string(category, k_datamine_category_name_length, encoding);
  }

  writer.i32(record.parameters.length);
  for (const parameter of record.parameters) {
    writer.fixed_string(
      parameter.name,
      k_datamine_parameter_name_length,
      encoding
    );
    writer.u32(parameter.type);
    encode_datamine_parameter_value(
      writer,
      parameter.type,
      parameter.value,
      encoding
    );
  }

  writer.patch_u32(0, writer.offset);
  return writer.finish();
}

export const e_datamine_record_kind_v3 = {
  definition: 1,
  occurrence: 2,
} as const;

export interface s_datamine_definition_parameter {
  name: string;
  type: e_datamine_parameter_type;
}

// A registered event. Written once per file, ahead of the first occurrence that uses it.
export interface s_datamine_definition_v3 {
  categories: string[];
  definition_id: number;
  event_name: string;
  parameter_signature: string;
  parameters: s_datamine_definition_parameter[];
  priority: number;
}

export interface s_datamine_value {
  type: e_datamine_parameter_type;
  value: number | bigint | string;
}

// Values only, in the order the definition lists its parameters.
export interface s_datamine_occurrence_v3 {
  definition_id: number;
  event_date: bigint;
  event_index: number;
  values: readonly s_datamine_value[];
}

export function encode_datamine_definition_v3(
  definition: s_datamine_definition_v3,
  byte_order: t_byte_order,
  encoding: t_text_encoding = "utf8"
): Buffer {
  const writer = new c_byte_writer(
    byte_order,
    k_definition_record_writer_capacity
  );
  writer.u32(0);
  writer.u8(e_datamine_record_kind_v3.definition);
  writer.u8(definition.priority);
  writer.fixed_string(
    definition.event_name,
    k_datamine_event_name_length,
    encoding
  );
  writer.fixed_string(
    definition.parameter_signature,
    k_datamine_parameter_signature_length,
    encoding
  );
  writer.u32(definition.definition_id);

  writer.u32(definition.categories.length);
  for (const category of definition.categories) {
    writer.fixed_string(category, k_datamine_category_name_length, encoding);
  }

  writer.u32(definition.parameters.length);
  for (const parameter of definition.parameters) {
    writer.fixed_string(
      parameter.name,
      k_datamine_parameter_name_length,
      encoding
    );
    writer.u32(parameter.type);
  }

  writer.patch_u32(0, writer.offset);
  return writer.finish();
}

// size, kind, event_index, definition_id and the FILETIME precede the values.
export const k_datamine_occurrence_v3_prefix_size = 21;

export function encode_datamine_occurrence_v3(
  occurrence: s_datamine_occurrence_v3,
  byte_order: t_byte_order,
  encoding: t_text_encoding = "utf8"
): Buffer {
  const writer = new c_byte_writer(
    byte_order,
    k_occurrence_record_writer_capacity
  );
  writer.u32(0);
  writer.u8(e_datamine_record_kind_v3.occurrence);
  writer.u32(occurrence.event_index);
  writer.u32(occurrence.definition_id);
  writer.u64(occurrence.event_date);
  for (const value of occurrence.values) {
    encode_datamine_parameter_value(writer, value.type, value.value, encoding);
  }
  writer.patch_u32(0, writer.offset);
  return writer.finish();
}

export function data_mine_byte_order_from_marker(
  first: number,
  second: number
): t_byte_order | undefined {
  // The marker 0xFFFE is stored in the file's own byte order.
  const high = k_data_mine_byte_order_marker >> 8;
  const low = k_data_mine_byte_order_marker & 0xff;
  if (first === high && second === low) {
    return "big";
  }
  if (first === low && second === high) {
    return "little";
  }
  return;
}
