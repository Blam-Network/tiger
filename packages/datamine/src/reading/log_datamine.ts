// Datamine files as log entries: one per event or occurrence record, in file order.

import {
  csnzprintf,
  type t_printf_argument,
} from "../blam/cseries/cseries_printf.ts";
import {
  date_from_filetime,
  system_get_date_and_time,
  type t_date_style,
} from "../blam/cseries/cseries_time.ts";
import {
  e_event_level,
  event_level_name,
} from "../blam/cseries/event_levels.ts";
import { k_event_log_line_maximum_length } from "../blam/cseries/event_log_format.ts";
import type { s_data_mine_header } from "../blam/data_mining/data_mine_formats.ts";
import type { s_datamine_record } from "../blam/data_mining/data_mining.ts";
import type {
  s_datamine_file,
  s_datamine_file_record,
} from "../data_mine_reader.ts";
import {
  log_category_split,
  type s_log_datamine_header,
  type s_log_entry,
} from "./log_entry.ts";

// The log line buffer holds 2048 characters, which is what the game formats these into.
const k_format_text_size = k_event_log_line_maximum_length + 1;

// Bungie's tools print the event name with the parameters the event was raised with, in
// order. Named parameters are the fixed ones the bridge adds (session ids, context), which
// the name has no specifier for. A format that doesn't fit its parameters is printed as far
// as it goes, and one the printf can't take is printed as it is.
export function datamine_record_format_text(record: s_datamine_record): string {
  const args: t_printf_argument[] = [];
  for (const parameter of record.parameters) {
    if (parameter.name.length === 0) {
      args.push(parameter.value);
    }
  }
  try {
    return csnzprintf(k_format_text_size, record.event_name, args);
  } catch {
    return record.event_name;
  }
}

export function log_header_from_datamine(
  header: s_data_mine_header
): s_log_datamine_header {
  const result: s_log_datamine_header = {
    layout: header.layout,
    byte_order: header.byte_order,
    sessionid: header.sessionid,
    build_string: header.build_string,
    build_number: header.build_number,
    systemid: header.systemid,
    title: header.title,
  };
  if (header.session_start_date !== 0n) {
    result.session_start_date = date_from_filetime(header.session_start_date);
  }
  return result;
}

function entry_from_record(
  record: s_datamine_record,
  ordinal: number,
  date_style: t_date_style,
  definition_id: number | undefined
): s_log_entry {
  const text = datamine_record_format_text(record);
  const split = log_category_split(text);
  const categories =
    record.categories.length > 0 ? [...record.categories] : split.categories;

  const entry: s_log_entry = {
    ordinal,
    date_text: "",
    event_index: record.event_index,
    level_text: `Unknown (${record.priority})`,
    category_path: categories.join(":"),
    categories,
    message: split.message,
    text,
    parameters: record.parameters.map((parameter) => ({
      name: parameter.name,
      type: parameter.type,
      value: parameter.value,
    })),
  };
  if (
    record.priority >= e_event_level.verbose &&
    record.priority <= e_event_level.critical
  ) {
    entry.level = record.priority as e_event_level;
    entry.level_text = event_level_name(entry.level);
  }
  if (record.event_date !== 0n) {
    entry.date = date_from_filetime(record.event_date);
    entry.date_text = system_get_date_and_time(entry.date, date_style);
  }
  if (definition_id !== undefined) {
    entry.definition_id = definition_id;
  }
  const context = record.parameters.find(
    (parameter) => parameter.name === "context"
  );
  if (typeof context?.value === "string" && context.value.length > 0) {
    entry.context = context.value;
  }
  return entry;
}

function entry_from_unresolved(
  record: s_datamine_record,
  ordinal: number,
  date_style: t_date_style,
  definition_id: number
): s_log_entry {
  const text = `(no definition for id ${definition_id})`;
  const entry: s_log_entry = {
    ordinal,
    date_text: "",
    event_index: record.event_index,
    definition_id,
    level_text: "",
    category_path: "",
    categories: [],
    message: text,
    text,
  };
  if (record.event_date !== 0n) {
    entry.date = date_from_filetime(record.event_date);
    entry.date_text = system_get_date_and_time(entry.date, date_style);
  }
  return entry;
}

export function log_entries_from_datamine(
  file: s_datamine_file
): s_log_entry[] {
  const date_style = file.header.layout === "3.1" ? "long" : "short";
  const session: s_log_entry = {
    kind: "session",
    session: {
      number: 1,
      version: file.header.build_string,
      session_id: file.header.sessionid,
    },
    ordinal: 0,
    date_text: "",
    level_text: "",
    category_path: "",
    categories: [],
    message: file.header.build_string,
    text: file.header.build_string,
  };
  if (file.header.session_start_date !== 0n) {
    session.date = date_from_filetime(file.header.session_start_date);
    session.date_text = system_get_date_and_time(session.date, date_style);
  }
  const entries: s_log_entry[] = [session];
  for (const item of file.records as s_datamine_file_record[]) {
    if (item.kind === "event") {
      entries.push(
        entry_from_record(item.record, entries.length, date_style, undefined)
      );
    } else if (item.kind === "occurrence") {
      entries.push(
        item.unresolved_values
          ? entry_from_unresolved(
              item.record,
              entries.length,
              date_style,
              item.definition_id
            )
          : entry_from_record(
              item.record,
              entries.length,
              date_style,
              item.definition_id
            )
      );
    }
  }
  return entries;
}
