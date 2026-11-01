import { c } from "@craftycodie/cstruct";
import { DatamineError } from "../../datamine_error.ts";
import { c_struct_writer, type t_byte_order } from "../../struct_io.ts";
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

// A Bungie char[size]: csstrnzcpy always keeps the NUL, so size - 1 bytes of text fit.
function fixed_string(size: number, encoding: t_text_encoding) {
  return c.string(size - 1, encoding).padAfter(1);
}

const k_marker = c.MagicNumber(k_data_mine_byte_order_marker, c.u16());

function data_mine_schemas_build(encoding: t_text_encoding) {
  const header_body = {
    sessionid: fixed_string(k_data_mine_sessionid_length, encoding),
    build_string: fixed_string(k_data_mine_build_string_length, encoding),
    build_number: c.i32(),
    systemid: fixed_string(k_data_mine_systemid_length, encoding),
    title: fixed_string(k_data_mine_title_length, encoding),
    session_start_date: c.u64(),
  };
  const event_name = fixed_string(k_datamine_event_name_length, encoding);
  const parameter_signature = fixed_string(
    k_datamine_parameter_signature_length,
    encoding
  );

  return {
    headers: {
      "1.0": c.struct({
        marker: k_marker,
        version_major: c.u16(),
        ...header_body,
      }),
      "1.1": c.struct({
        marker: k_marker,
        version_major: c.u16(),
        version_minor: c.u16(),
        ...header_body,
      }),
      "2.0": c.struct({
        marker: k_marker,
        version_major: c.u16(),
        ...header_body,
        source_flag: c.u8(),
      }),
      "2.1": c.struct({
        marker: k_marker,
        version_major: c.u16(),
        version_minor: c.u16(),
        ...header_body,
        source_flag: c.u8(),
      }),
      "3.1": c.struct({
        marker: k_marker,
        version_major: c.u16(),
        version_minor: c.u16(),
        sessionid: fixed_string(k_data_mine_sessionid_length, encoding),
        build_string: fixed_string(
          k_data_mine_build_string_v3_length,
          encoding
        ),
        alignment: c.pad(k_data_mine_v3_alignment_padding),
        session_start_date: c.u64(),
        build_number: c.i32(),
        systemid: fixed_string(k_data_mine_systemid_length, encoding),
        title: fixed_string(k_data_mine_title_length, encoding),
        tail: c.pad(k_data_mine_v3_tail_padding),
      }),
    },
    // v1, v1_1, v2 and v2_1 records, up to the category count.
    event_record: c.struct({
      size: c.u32(),
      event_name,
      parameter_signature,
      priority: c.i32(),
      event_index: c.i32(),
      game_instance: c.u64(),
      map: fixed_string(k_datamine_map_name_length, encoding),
      event_date: c.u64(),
    }),
    // v3_1 definition records, up to the category count.
    definition_record: c.struct({
      size: c.u32(),
      kind: c.u8(),
      priority: c.u8(),
      event_name,
      parameter_signature,
      definition_id: c.u32(),
    }),
    category: c.struct({
      name: fixed_string(k_datamine_category_name_length, encoding),
    }),
    parameter: c.struct({
      name: fixed_string(k_datamine_parameter_name_length, encoding),
      type: c.u32(),
    }),
  };
}

type t_data_mine_schemas = ReturnType<typeof data_mine_schemas_build>;

const k_data_mine_schemas = new Map<t_text_encoding, t_data_mine_schemas>();

// The text fields take the file's encoding, so each encoding gets its own schemas.
export function data_mine_schemas(
  encoding: t_text_encoding
): t_data_mine_schemas {
  let schemas = k_data_mine_schemas.get(encoding);
  if (!schemas) {
    schemas = data_mine_schemas_build(encoding);
    k_data_mine_schemas.set(encoding, schemas);
  }
  return schemas;
}

// The first three words: enough to tell the layouts apart.
export const s_data_mine_header_prefix = c.struct({
  marker: c.u16(),
  version_major: c.u16(),
  word: c.u16(),
});

export const s_datamine_record_size = c.struct({ size: c.u32() });

// The v1 records count with signed ints, the v3_1 records with unsigned ones.
export const s_datamine_count_i32 = c.struct({ count: c.i32() });
export const s_datamine_count_u32 = c.struct({ count: c.u32() });

export const s_datamine_occurrence_v3_prefix = c.struct({
  size: c.u32(),
  kind: c.u8(),
  event_index: c.u32(),
  definition_id: c.u32(),
  // FILETIME
  event_date: c.u64(),
});

export const k_datamine_occurrence_v3_prefix_size =
  s_datamine_occurrence_v3_prefix.size;

export const s_datamine_value_long = c.struct({ value: c.i32() });
export const s_datamine_value_int64 = c.struct({ value: c.i64() });
export const s_datamine_value_float = c.struct({ value: c.f32() });
// A string value is this length, then the bytes with no terminator.
export const s_datamine_value_string_length = c.struct({ length: c.u32() });

export function encode_data_mine_header(
  header: s_data_mine_header,
  encoding: t_text_encoding = "utf8"
): Buffer {
  const layout = header.layout;
  const versions = k_layout_versions[layout];
  // Each layout's schema takes the fields it has and ignores the rest.
  const fields = {
    ...header,
    version_major: header.version_major ?? versions.major,
    version_minor: header.version_minor ?? versions.minor,
    source_flag: header.source_flag ?? 0,
  };
  const writer = new c_struct_writer(header.byte_order);
  writer.write(data_mine_schemas(encoding).headers[layout], fields);
  return writer.finish();
}

function encode_datamine_parameter_value(
  writer: c_struct_writer,
  type: e_datamine_parameter_type,
  value: number | bigint | string,
  encoding: t_text_encoding
): void {
  switch (type) {
    case e_datamine_parameter_type.long:
      writer.write(s_datamine_value_long, { value: Number(value) });
      break;
    case e_datamine_parameter_type.int64:
      writer.write(s_datamine_value_int64, { value: BigInt(value) });
      break;
    case e_datamine_parameter_type.float:
      writer.write(s_datamine_value_float, { value: Number(value) });
      break;
    case e_datamine_parameter_type.string: {
      const bytes = Buffer.from(String(value), encoding);
      writer.write(s_datamine_value_string_length, { length: bytes.length });
      writer.bytes(bytes);
      break;
    }
    default:
      throw new DatamineError(`unknown datamine parameter type ${type}`);
  }
}

// Every record leads with its own size, so that is filled in last.
function finish_record(
  writer: c_struct_writer,
  byte_order: t_byte_order
): Buffer {
  const record = writer.finish();
  s_datamine_record_size.write(
    { size: record.length },
    { into: record, endian: byte_order }
  );
  return record;
}

// Records for the v1, v1_1, v2 and v2_1 files.
export function encode_datamine_event_record(
  record: s_datamine_record,
  byte_order: t_byte_order,
  encoding: t_text_encoding = "utf8"
): Buffer {
  const schemas = data_mine_schemas(encoding);
  const writer = new c_struct_writer(byte_order);
  writer.write(schemas.event_record, {
    size: 0,
    event_name: record.event_name,
    parameter_signature: record.parameter_signature,
    priority: record.priority,
    event_index: record.event_index,
    game_instance: record.game_info.game_instance,
    map: record.game_info.map,
    event_date: record.event_date,
  });

  writer.write(s_datamine_count_i32, { count: record.categories.length });
  for (const category of record.categories) {
    writer.write(schemas.category, { name: category });
  }

  writer.write(s_datamine_count_i32, { count: record.parameters.length });
  for (const parameter of record.parameters) {
    writer.write(schemas.parameter, parameter);
    encode_datamine_parameter_value(
      writer,
      parameter.type,
      parameter.value,
      encoding
    );
  }

  return finish_record(writer, byte_order);
}

export function encode_datamine_definition_v3(
  definition: s_datamine_definition_v3,
  byte_order: t_byte_order,
  encoding: t_text_encoding = "utf8"
): Buffer {
  const schemas = data_mine_schemas(encoding);
  const writer = new c_struct_writer(byte_order);
  writer.write(schemas.definition_record, {
    size: 0,
    kind: e_datamine_record_kind_v3.definition,
    priority: definition.priority,
    event_name: definition.event_name,
    parameter_signature: definition.parameter_signature,
    definition_id: definition.definition_id,
  });

  writer.write(s_datamine_count_u32, { count: definition.categories.length });
  for (const category of definition.categories) {
    writer.write(schemas.category, { name: category });
  }

  writer.write(s_datamine_count_u32, { count: definition.parameters.length });
  for (const parameter of definition.parameters) {
    writer.write(schemas.parameter, parameter);
  }

  return finish_record(writer, byte_order);
}

export function encode_datamine_occurrence_v3(
  occurrence: s_datamine_occurrence_v3,
  byte_order: t_byte_order,
  encoding: t_text_encoding = "utf8",
  // Value bytes copied as they are, after any encoded values.
  raw_values?: Uint8Array
): Buffer {
  const writer = new c_struct_writer(byte_order);
  writer.write(s_datamine_occurrence_v3_prefix, {
    size: 0,
    kind: e_datamine_record_kind_v3.occurrence,
    event_index: occurrence.event_index,
    definition_id: occurrence.definition_id,
    event_date: occurrence.event_date,
  });
  for (const value of occurrence.values) {
    encode_datamine_parameter_value(writer, value.type, value.value, encoding);
  }
  if (raw_values) {
    writer.bytes(raw_values);
  }
  return finish_record(writer, byte_order);
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
