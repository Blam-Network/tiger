import type { t_text_encoding } from "./blam/cseries/cseries_strings.ts";
import {
  data_mine_byte_order_from_marker,
  data_mine_header_layout_has_minor,
  data_mine_header_layout_has_source_flag,
  e_datamine_record_kind_v3,
  encode_data_mine_header,
  encode_datamine_definition_v3,
  encode_datamine_event_record,
  encode_datamine_occurrence_v3,
  k_data_mine_build_string_length,
  k_data_mine_build_string_v3_length,
  k_data_mine_header_layout_sizes,
  k_data_mine_sessionid_length,
  k_data_mine_systemid_length,
  k_data_mine_title_length,
  k_data_mine_v3_alignment_padding,
  k_data_mine_v3_tail_padding,
  k_datamine_occurrence_v3_prefix_size,
  type s_data_mine_header,
  type s_datamine_definition_parameter,
  type s_datamine_definition_v3,
  type t_data_mine_header_layout,
} from "./blam/data_mining/data_mine_formats.ts";
import {
  e_datamine_parameter_type,
  k_datamine_categories_maximum_count,
  k_datamine_category_name_length,
  k_datamine_event_name_length,
  k_datamine_map_name_length,
  k_datamine_parameter_name_length,
  k_datamine_parameter_signature_length,
  type s_datamine_parameter,
  type s_datamine_record,
} from "./blam/data_mining/data_mining.ts";
import { c_byte_reader, type t_byte_order } from "./byte_writer.ts";
import { DatamineError } from "./datamine_error.ts";
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
  const little = byte_order === "little";
  const view = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const major = little ? view.readUInt16LE(2) : view.readUInt16BE(2);
  const word = little ? view.readUInt16LE(4) : view.readUInt16BE(4);

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
  const reader = new c_byte_reader(buffer, byte_order);
  reader.u16();
  const version_major = reader.u16();
  const version_minor = data_mine_header_layout_has_minor(layout)
    ? reader.u16()
    : 0;
  const sessionid = reader.fixed_string(k_data_mine_sessionid_length, encoding);

  if (layout === "3.1") {
    const build_string = reader.fixed_string(
      k_data_mine_build_string_v3_length,
      encoding
    );
    reader.skip(k_data_mine_v3_alignment_padding);
    const session_start_date = reader.u64();
    const build_number = reader.i32();
    const systemid = reader.fixed_string(k_data_mine_systemid_length, encoding);
    const title = reader.fixed_string(k_data_mine_title_length, encoding);
    reader.skip(k_data_mine_v3_tail_padding);
    return {
      layout,
      byte_order,
      version_major,
      version_minor,
      sessionid,
      build_string,
      session_start_date,
      build_number,
      systemid,
      title,
    };
  }

  const build_string = reader.fixed_string(
    k_data_mine_build_string_length,
    encoding
  );

  const build_number = reader.i32();
  const systemid = reader.fixed_string(k_data_mine_systemid_length, encoding);
  const title = reader.fixed_string(k_data_mine_title_length, encoding);
  const session_start_date = reader.u64();
  const header: s_data_mine_header = {
    layout,
    byte_order,
    version_major,
    version_minor,
    sessionid,
    build_string,
    build_number,
    systemid,
    title,
    session_start_date,
  };
  if (data_mine_header_layout_has_source_flag(layout)) {
    header.source_flag = reader.u8();
  }
  return header;
}

function read_parameter_type(reader: c_byte_reader): e_datamine_parameter_type {
  const type = reader.u32();
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
  reader: c_byte_reader,
  type: e_datamine_parameter_type,
  encoding: t_text_encoding
): number | bigint | string {
  switch (type) {
    case e_datamine_parameter_type.long:
      return reader.i32();
    case e_datamine_parameter_type.int64:
      return reader.i64();
    case e_datamine_parameter_type.float:
      return reader.f32();
    default: {
      const length = reader.u32();
      return reader.bytes(length).toString(encoding);
    }
  }
}

function read_categories(
  reader: c_byte_reader,
  count: number,
  encoding: t_text_encoding
): string[] {
  if (count > k_datamine_categories_maximum_count) {
    throw new DatamineError(`datamine record has ${count} categories`);
  }
  const categories: string[] = [];
  for (let index = 0; index < count; index++) {
    categories.push(
      reader.fixed_string(k_datamine_category_name_length, encoding)
    );
  }
  return categories;
}

function read_event_record(
  record: Buffer,
  byte_order: t_byte_order,
  encoding: t_text_encoding
): s_datamine_record {
  const reader = new c_byte_reader(record, byte_order, 4);
  const event_name = reader.fixed_string(
    k_datamine_event_name_length,
    encoding
  );
  const parameter_signature = reader.fixed_string(
    k_datamine_parameter_signature_length,
    encoding
  );
  const priority = reader.i32();
  const event_index = reader.i32();
  const game_instance = reader.u64();
  const map = reader.fixed_string(k_datamine_map_name_length, encoding);
  const event_date = reader.u64();
  const categories = read_categories(reader, reader.i32(), encoding);

  const parameter_count = reader.i32();
  const parameters: s_datamine_parameter[] = [];
  for (let index = 0; index < parameter_count; index++) {
    const name = reader.fixed_string(
      k_datamine_parameter_name_length,
      encoding
    );
    const type = read_parameter_type(reader);
    parameters.push({
      name,
      type,
      value: read_parameter_value(reader, type, encoding),
    });
  }

  return {
    priority,
    event_name,
    parameter_signature,
    event_index,
    game_info: { game_instance, map },
    event_date,
    categories,
    parameters,
  };
}

function read_definition_record(
  record: Buffer,
  byte_order: t_byte_order,
  encoding: t_text_encoding
): s_datamine_definition_v3 {
  const reader = new c_byte_reader(record, byte_order, 5);
  const priority = reader.u8();
  const event_name = reader.fixed_string(
    k_datamine_event_name_length,
    encoding
  );
  const parameter_signature = reader.fixed_string(
    k_datamine_parameter_signature_length,
    encoding
  );
  const definition_id = reader.u32();
  const categories = read_categories(reader, reader.u32(), encoding);

  const parameter_count = reader.u32();
  const parameters: s_datamine_definition_parameter[] = [];
  for (let index = 0; index < parameter_count; index++) {
    const name = reader.fixed_string(
      k_datamine_parameter_name_length,
      encoding
    );
    parameters.push({ name, type: read_parameter_type(reader) });
  }

  return {
    priority,
    event_name,
    parameter_signature,
    definition_id,
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
  const reader = new c_byte_reader(record, byte_order, 5);
  const event_index = reader.u32();
  const definition_id = reader.u32();
  const event_date = reader.u64();

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

  const little = byte_order === "little";
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
    const total_size = little
      ? view.readUInt32LE(offset)
      : view.readUInt32BE(offset);
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
      if (!(error instanceof DatamineError)) {
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
  const encoded = encode_datamine_occurrence_v3(
    {
      event_index: entry.record.event_index,
      definition_id: entry.definition_id,
      event_date: entry.record.event_date,
      values: entry.unresolved_values ? [] : entry.record.parameters,
    },
    byte_order,
    encoding
  );
  if (!entry.unresolved_values) {
    return encoded;
  }
  const result = Buffer.concat([encoded, entry.unresolved_values]);
  if (byte_order === "little") {
    result.writeUInt32LE(result.length, 0);
  } else {
    result.writeUInt32BE(result.length, 0);
  }
  return result;
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
