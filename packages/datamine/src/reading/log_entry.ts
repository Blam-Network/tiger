// The model the log viewer reads: one entry per event, whatever file it came from, plus the
// facts about a file as a whole. Nothing here touches the file system, so it runs in a browser.

import {
  e_event_level,
  k_event_level_names,
} from "../blam/cseries/event_levels.ts";
import type { t_data_mine_header_layout } from "../blam/data_mining/data_mine_formats.ts";
import type { e_datamine_parameter_type } from "../blam/data_mining/data_mining.ts";
import type { t_byte_order } from "../byte_writer.ts";

// halo_style_log and destiny_style_log are the two line styles of the report files, the ones
// this package writes and the games' own.
export type t_log_source_format =
  | "halo_style_log"
  | "destiny_style_log"
  | "datamine_text"
  | "datamine_binary"
  | "datamine_upload";

// Display names, by format.
export const k_log_source_format_names: Record<t_log_source_format, string> = {
  halo_style_log: "Halo style event log",
  destiny_style_log: "Destiny style event log",
  datamine_text: "Datamine text export",
  datamine_binary: "Datamine file",
  datamine_upload: "Datamine upload (zip)",
};

// A session row stands for a banner (text logs) or a file header (datamine files). Logs that
// are appended to get one banner per run, so one file can hold several sessions.
export type t_log_entry_kind = "event" | "session";

export interface s_log_entry_session {
  // 1-based, in file order.
  number: number;
  // Datamine files only.
  session_id?: string;
  // The banner's version line, or the datamine build string.
  version: string;
}

// The formats that are lines of text, which c_log_text_parser can read.
export type t_log_text_format = Extract<
  t_log_source_format,
  "halo_style_log" | "destiny_style_log" | "datamine_text"
>;

export interface s_log_entry_parameter {
  name: string;
  type: e_datamine_parameter_type;
  value: number | bigint | string;
}

export interface s_log_entry {
  // "networking:session" for "networking:session: join failed".
  categories: string[];
  category_path: string;
  context?: string;
  // Netbuf columns, only on lines that carry any.
  custom_prefix?: string;
  date?: Date;
  // The date as the file wrote it.
  date_text: string;
  definition_id?: number;
  event_index?: number;
  frame_index?: number;
  game_time?: number;
  // Missing means an event.
  kind?: t_log_entry_kind;
  level?: e_event_level;
  // The severity as the file wrote it, "WARNING" or "error" or "Unknown (63)".
  level_text: string;
  // 1-based line the entry starts on, text formats only.
  line?: number;
  // Text after the category prefix.
  message: string;
  // 0-based position in the file.
  ordinal: number;
  parameters?: s_log_entry_parameter[];
  // The original line or lines, text formats only.
  raw?: string;
  session?: s_log_entry_session;
  // The full event text, category prefix included.
  text: string;
  thread_id?: number;
}

export interface s_log_datamine_header {
  build_number: number;
  build_string: string;
  byte_order: t_byte_order;
  layout: t_data_mine_header_layout;
  session_start_date?: Date;
  sessionid: string;
  systemid: string;
  title: string;
}

// <YYYYMMDD_HHMMSS>[_<suffix>], the folder a run's reports go in.
export interface s_log_report_folder {
  date: Date;
  suffix?: string;
}

export interface s_log_category_count {
  count: number;
  path: string;
}

export interface s_log_session_info {
  banner_version?: string;
  // Sorted by count, most first, then by path.
  categories: s_log_category_count[];
  counts_by_level: Record<string, number>;
  // Events only; session rows are counted in session_count.
  entry_count: number;
  file_name: string;
  first_date?: Date;
  format: t_log_source_format;
  header?: s_log_datamine_header;
  last_date?: Date;
  report_folder?: s_log_report_folder;
  session_count: number;
  session_id?: string;
  // Offset of the first datamine record that couldn't be read.
  truncated_at?: number;
}

export interface s_log_category_split {
  categories: string[];
  category_path: string;
  message: string;
}

// Segments are [A-Za-z0-9_-] closed by a colon, as event_parse_categories reads them.
const k_log_category_regex = /^([A-Za-z0-9_-]+):/;
const k_log_category_maximum_depth = 8;
const k_log_category_name_maximum_size = 64;

export function log_category_split(text: string): s_log_category_split {
  const categories: string[] = [];
  let position = 0;
  while (categories.length < k_log_category_maximum_depth) {
    const match = k_log_category_regex.exec(text.slice(position));
    if (!match || match[1].length >= k_log_category_name_maximum_size) {
      break;
    }
    categories.push(match[1].toLowerCase());
    position += match[0].length;
  }
  // The format is "category: text", so one space belongs to the prefix.
  const rest = text.slice(position);
  return {
    categories,
    category_path: categories.join(":"),
    message: rest.startsWith(" ") ? rest.slice(1) : rest,
  };
}

const k_log_severity_levels: Record<string, e_event_level> = {
  verbose: e_event_level.verbose,
  status: e_event_level.status,
  message: e_event_level.message,
  warning: e_event_level.warning,
  error: e_event_level.error,
  critical: e_event_level.critical,
  fatal: e_event_level.critical,
};

const k_log_severity_dashes_regex = /^-+|-+$/g;

// Reads the severity column of any of the formats: "WARNING", "-ERROR-", "status ", "critical".
export function log_level_from_text(text: string): e_event_level | undefined {
  return k_log_severity_levels[
    text.trim().replace(k_log_severity_dashes_regex, "").toLowerCase()
  ];
}

export function log_level_name(entry: s_log_entry): string {
  return entry.level === undefined
    ? entry.level_text
    : k_event_level_names[entry.level];
}
