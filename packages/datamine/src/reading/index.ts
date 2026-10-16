// The part of the package that runs in a browser: it reads log text and datamine files, writes
// log lines and touches neither the file system nor the network. Datamine files are read with
// Buffer, which a browser build has to provide.

export type { t_printf_argument } from "../blam/cseries/cseries_printf.ts";
export { csnzprintf } from "../blam/cseries/cseries_printf.ts";
export type { t_text_encoding } from "../blam/cseries/cseries_strings.ts";
export type { t_date_style } from "../blam/cseries/cseries_time.ts";
export {
  date_from_filetime,
  system_get_date_and_time,
} from "../blam/cseries/cseries_time.ts";
export type { t_event_level_threshold } from "../blam/cseries/event_levels.ts";
export {
  e_event_level,
  event_level_from_name,
  event_level_name,
  k_event_level_count,
  k_event_level_names,
  k_event_level_none,
  k_event_level_severity_strings,
} from "../blam/cseries/event_levels.ts";
export type {
  s_event_console_line,
  s_event_line_options,
  s_event_log_line,
} from "../blam/cseries/event_log_format.ts";
export {
  build_banner,
  event_line_columns_format,
  event_line_columns_parse,
  event_line_options_resolve,
  format_console_line,
  format_event_for_log,
  k_event_banner_columns_prefix,
  k_event_banner_rule_length,
  k_event_line_options_default,
} from "../blam/cseries/event_log_format.ts";
export type {
  s_data_mine_header,
  t_data_mine_header_layout,
} from "../blam/data_mining/data_mine_formats.ts";
export {
  k_data_mine_header_layout_sizes,
  k_data_mine_header_layouts,
} from "../blam/data_mining/data_mine_formats.ts";
export type {
  s_datamine_parameter,
  s_datamine_record,
} from "../blam/data_mining/data_mining.ts";
export {
  e_datamine_parameter_type,
  k_datamine_parameter_type_names,
} from "../blam/data_mining/data_mining.ts";
export type { t_byte_order } from "../byte_writer.ts";
export type {
  s_datamine_file,
  s_datamine_file_definition,
  s_datamine_file_event,
  s_datamine_file_occurrence,
  s_datamine_file_record,
  s_datamine_read_options,
} from "../data_mine_reader.ts";
export {
  read_datamine_file,
  read_datamine_upload,
} from "../data_mine_reader.ts";
export { DatamineError } from "../datamine_error.ts";
export type {
  s_events_server_entry,
  s_events_server_hello,
  s_events_server_parameter,
  s_events_server_session,
} from "../server/events_server_protocol.ts";
export {
  datamine_record_format_text,
  log_entries_from_datamine,
  log_header_from_datamine,
} from "./log_datamine.ts";
export type {
  s_log_category_count,
  s_log_category_split,
  s_log_datamine_header,
  s_log_entry,
  s_log_entry_parameter,
  s_log_entry_session,
  s_log_report_folder,
  s_log_session_info,
  t_log_entry_kind,
  t_log_source_format,
  t_log_text_format,
} from "./log_entry.ts";
export {
  k_log_source_format_names,
  log_category_split,
  log_level_from_text,
  log_level_name,
} from "./log_entry.ts";
export type { s_log_session_extra } from "./log_session.ts";
export { log_session_info_build, report_folder_parse } from "./log_session.ts";
export {
  c_log_text_parser,
  log_detect_format,
  log_detect_text_format,
} from "./log_text_parser.ts";
