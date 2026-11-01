import { CStructError } from "@craftycodie/cstruct";
import type { t_text_encoding } from "./blam/cseries/cseries_strings.ts";
import {
  data_mine_byte_order_from_marker,
  data_mine_schemas,
  e_datamine_record_kind_v3,
  encode_data_mine_header,
  encode_datamine_definition_v3,
  encode_datamine_event_record,
  encode_datamine_occurrence_v3,
  k_data_mine_header_layout_sizes,
  k_datamine_occurrence_v3_prefix_size,
  type s_data_mine_header,
  s_data_mine_header_prefix,
  s_datamine_count_i32,
  s_datamine_count_u32,
  type s_datamine_definition_parameter,
  type s_datamine_definition_v3,
  s_datamine_occurrence_v3_prefix,
  s_datamine_record_size,
  s_datamine_value_float,
  s_datamine_value_int64,
  s_datamine_value_long,
  s_datamine_value_string_length,
  type t_data_mine_header_layout,
} from "./blam/data_mining/data_mine_formats.ts";
import {
  e_datamine_parameter_type,
  k_datamine_categories_maximum_count,
  type s_datamine_parameter,
  type s_datamine_record,
} from "./blam/data_mining/data_mining.ts";
import { DatamineError } from "./datamine_error.ts";
import { c_struct_reader, type t_byte_order } from "./struct_io.ts";
import { zip_read_single_entry } from "./transport/zip_writer.ts";

export interface s_datamine_file_event {
  kind: "event";
  record: s_datamine_record;
}

export interface s_datamine_file_definition {
  definition: s_datamine_definition_v3;
  kind: "definition";
}

export interface s_datamine_file_occurrence {
  definition_id: number;
  kind: "occurrence";
  // Resolved through the definition. Name, signature and categories come from it.
  record: s_datamine_record;
  // The raw value bytes when the definition never appeared in the file.
  unresolved_values?: Buffer;
}

export type s_datamine_file_record =
  | s_datamine_file_event
  | s_datamine_file_definition
  | s_datamine_file_occurrence;

export interface s_datamine_file {
  encoding: t_text_encoding;
  header: s_data_mine_header;
  records: s_datamine_file_record[];
  // Offset of the first record that couldn't be read whole; undefined when the file parsed to its end.
  truncated_at?: number;
}

export interface s_datamine_read_options {
  encoding?: t_text_encoding;
  // Skips detection.
  layout?: t_data_mine_header_layout;
}

// A v1 record can't be smaller than its header plus the two counts.
const k_event_record_minimum_size = 1312 + 8;
const k_definition_record_minimum_size = 4 + 1 + 1 + 512 + 512 + 4 + 4 + 4;
const k_minor_version_limit = 0x1_00;

export function data_mine_layout_detect(buffer: Uint8Array): {
  byte_order: t_byte_order;
  layout: t_data_mine_header_layout;
} {
  if (buffer.length < 6) {
    throw new DatamineError("datamine file is too short for a header");
  }
  const byte_order = data_mine_byte_order_from_marker(buffer[0], buffer[1]);
  if (!byte_order) {
    throw new DatamineError(
      `datamine file has no byte order marker (starts ${buffer[0].toString(16)} ${buffer[1].toString(16)})`
    );
  }
  const { version_major: major, word } = s_data_mine_header_prefix.read(
    buffer,
    byte_order
  );

  if (major === 3) {
    return { byte_order, layout: "3.1" };
  }
  if (major === 1 || major === 2) {
    // Without a minor field the next bytes are already the session id text, which is never this small.
    const has_minor = word < k_minor_version_limit;
    if (major === 1) {
      return {
        byte_order,
        layout: has_minor ? "1.1" : "1.0",
      };
    }
    return {
      byte_order,
      layout: has_minor ? "2.1" : "2.0",
    };
  }
  throw new DatamineError(`unsupported datamine major version ${major}`);
}

function read_header(
  buffer: Buffer,
  layout: t_data_mine_header_layout,
  byte_order: t_byte_order,
  encoding: t_text_encoding
): s_data_mine_header {
  const size = k_data_mine_header_layout_sizes[layout];
  if (buffer.length < size) {
    throw new DatamineError(
      `datamine file is ${buffer.length} bytes, shorter than the ${size} byte ${layout} header`
    );
  }
  // Layouts without a minor version word read it as 0; only 2.x has a source flag.
  const {
    marker: _marker,
    ...fields
  }: { marker: number } & Omit<s_data_mine_header, "layout" | "byte_order"> =
    data_mine_schemas(encoding).headers[layout].read(buffer, byte_order);
  return { layout, byte_order, version_minor: 0, ...fields };
}

function check_parameter_type(type: number): e_datamine_parameter_type {
  if (
    type !== e_datamine_parameter_type.long &&
    type !== e_datamine_parameter_type.int64 &&
    type !== e_datamine_parameter_type.float &&
    type !== e_datamine_parameter_type.string
  ) {
    throw new DatamineError(`unknown datamine parameter type ${type}`);
  }
  return type;
}

function read_parameter_value(
  reader: c_struct_reader,
  type: e_datamine_parameter_type,
  encoding: t_text_encoding
): number | bigint | string {
  switch (type) {
    case e_datamine_parameter_type.long:
      return reader.read(s_datamine_value_long).value;
    case e_datamine_parameter_type.int64:
      return reader.read(s_datamine_value_int64).value;
    case e_datamine_parameter_type.float:
      return reader.read(s_datamine_value_float).value;
    default: {
      const { length } = reader.read(s_datamine_value_string_length);
      return reader.bytes(length).toString(encoding);
    }
  }
}

function read_categories(
  reader: c_struct_reader,
  count: number,
  encoding: t_text_encoding
): string[] {
  if (count > k_datamine_categories_maximum_count) {
    throw new DatamineError(`datamine record has ${count} categories`);
  }
  const schema = data_mine_schemas(encoding).category;
  const categories: string[] = [];
  for (let index = 0; index < count; index++) {
    categories.push(reader.read(schema).name);
  }
  return categories;
}

function read_event_record(
  record: Buffer,
  byte_order: t_byte_order,
  encoding: t_text_encoding
): s_datamine_record {
  const schemas = data_mine_schemas(encoding);
  const reader = new c_struct_reader(record, byte_order);
  const head = reader.read(schemas.event_record);
  const categories = read_categories(
    reader,
    reader.read(s_datamine_count_i32).count,
    encoding
  );

  const parameter_count = reader.read(s_datamine_count_i32).count;
  const parameters: s_datamine_parameter[] = [];
  for (let index = 0; index < parameter_count; index++) {
    const parameter = reader.read(schemas.parameter);
    const type = check_parameter_type(parameter.type);
    parameters.push({
      name: parameter.name,
      type,
      value: read_parameter_value(reader, type, encoding),
    });
  }

  return {
    priority: head.priority,
    event_name: head.event_name,
    parameter_signature: head.parameter_signature,
    event_index: head.event_index,
    game_info: { game_instance: head.game_instance, map: head.map },
    event_date: head.event_date,
    categories,
    parameters,
  };
}

function read_definition_record(
  record: Buffer,
  byte_order: t_byte_order,
  encoding: t_text_encoding
): s_datamine_definition_v3 {
  const schemas = data_mine_schemas(encoding);
  const reader = new c_struct_reader(record, byte_order);
  const head = reader.read(schemas.definition_record);
  const categories = read_categories(
    reader,
    reader.read(s_datamine_count_u32).count,
    encoding
  );

  const parameter_count = reader.read(s_datamine_count_u32).count;
  const parameters: s_datamine_definition_parameter[] = [];
  for (let index = 0; index < parameter_count; index++) {
    const parameter = reader.read(schemas.parameter);
    parameters.push({
      name: parameter.name,
      type: check_parameter_type(parameter.type),
    });
  }

  return {
    priority: head.priority,
    event_name: head.event_name,
    parameter_signature: head.parameter_signature,
    definition_id: head.definition_id,
    categories,
    parameters,
  };
}

function read_occurrence_record(
  record: Buffer,
  byte_order: t_byte_order,
  encoding: t_text_encoding,
  definitions: Map<number, s_datamine_definition_v3>
): s_datamine_file_occurrence {
  const reader = new c_struct_reader(record, byte_order);
  const { event_index, definition_id, event_date } = reader.read(
    s_datamine_occurrence_v3_prefix
  );

  const definition = definitions.get(definition_id);
  if (!definition) {
    return {
      kind: "occurrence",
      definition_id,
      unresolved_values: record.subarray(k_datamine_occurrence_v3_prefix_size),
      record: {
        priority: 0,
        event_name: "",
        parameter_signature: "",
        event_index,
        game_info: { game_instance: 0n, map: "" },
        event_date,
        categories: [],
        parameters: [],
      },
    };
  }

  const parameters: s_datamine_parameter[] = definition.parameters.map(
    (parameter) => ({
      name: parameter.name,
      type: parameter.type,
      value: read_parameter_value(reader, parameter.type, encoding),
    })
  );
  return {
    kind: "occurrence",
    definition_id,
    record: {
      priority: definition.priority,
      event_name: definition.event_name,
      parameter_signature: definition.parameter_signature,
      event_index,
      game_info: { game_instance: 0n, map: "" },
      event_date,
      categories: [...definition.categories],
      parameters,
    },
  };
}

export function read_datamine_file(
  buffer: Uint8Array,
  options: s_datamine_read_options = {}
): s_datamine_file {
  const encoding = options.encoding ?? "utf8";
  const view = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const detected = data_mine_layout_detect(view);
  const layout = options.layout ?? detected.layout;
  const byte_order = detected.byte_order;
  const header = read_header(view, layout, byte_order, encoding);

  const is_v3 = layout === "3.1";
  const minimum_size = is_v3
    ? k_definition_record_minimum_size
    : k_event_record_minimum_size;
  const definitions = new Map<number, s_datamine_definition_v3>();
  const records: s_datamine_file_record[] = [];
  let offset = k_data_mine_header_layout_sizes[layout];
  let truncated_at: number | undefined;

  while (offset < view.length) {
    // A short tail, a size that runs past the end, or a record that doesn't parse all stop the walk here.
    if (offset + 4 > view.length) {
      truncated_at = offset;
      break;
    }
    const total_size = s_datamine_record_size.read(view, {
      offset,
      endian: byte_order,
    }).size;
    const kind = is_v3
      ? view[offset + 4]
      : e_datamine_record_kind_v3.definition;
    const is_occurrence =
      is_v3 && kind === e_datamine_record_kind_v3.occurrence;
    const record_minimum_size = is_occurrence
      ? k_datamine_occurrence_v3_prefix_size
      : minimum_size;
    if (total_size < record_minimum_size || offset + total_size > view.length) {
      truncated_at = offset;
      break;
    }

    const record = view.subarray(offset, offset + total_size);
    try {
      if (!is_v3) {
        records.push({
          kind: "event",
          record: read_event_record(record, byte_order, encoding),
        });
      } else if (kind === e_datamine_record_kind_v3.definition) {
        const definition = read_definition_record(record, byte_order, encoding);
        definitions.set(definition.definition_id, definition);
        records.push({ kind: "definition", definition });
      } else if (is_occurrence) {
        records.push(
          read_occurrence_record(record, byte_order, encoding, definitions)
        );
      } else {
        truncated_at = offset;
        break;
      }
    } catch (error) {
      if (!(error instanceof DatamineError || error instanceof CStructError)) {
        throw error;
      }
      truncated_at = offset;
      break;
    }
    offset += total_size;
  }

  const file: s_datamine_file = { header, encoding, records };
  if (truncated_at !== undefined) {
    file.truncated_at = truncated_at;
  }
  return file;
}

function encode_occurrence(
  entry: s_datamine_file_occurrence,
  byte_order: t_byte_order,
  encoding: t_text_encoding
): Buffer {
  return encode_datamine_occurrence_v3(
    {
      event_index: entry.record.event_index,
      definition_id: entry.definition_id,
      event_date: entry.record.event_date,
      values: entry.unresolved_values ? [] : entry.record.parameters,
    },
    byte_order,
    encoding,
    entry.unresolved_values
  );
}

// Header plus records in their original order. Anything past truncated_at is not written.
export function encode_datamine_file(file: s_datamine_file): Buffer {
  const byte_order = file.header.byte_order;
  const parts: Buffer[] = [encode_data_mine_header(file.header, file.encoding)];
  for (const entry of file.records) {
    switch (entry.kind) {
      case "event":
        parts.push(
          encode_datamine_event_record(entry.record, byte_order, file.encoding)
        );
        break;
      case "definition":
        parts.push(
          encode_datamine_definition_v3(
            entry.definition,
            byte_order,
            file.encoding
          )
        );
        break;
      default:
        parts.push(encode_occurrence(entry, byte_order, file.encoding));
    }
  }
  return Buffer.concat(parts);
}

// The upload is a zip with a single entry holding the datamine file.
export function read_datamine_upload(
  zip: Uint8Array,
  options: s_datamine_read_options = {}
): s_datamine_file {
  return read_datamine_file(zip_read_single_entry(zip).data, options);
}
