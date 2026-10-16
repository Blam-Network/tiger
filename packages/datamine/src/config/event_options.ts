// The options events_initialize takes, with their defaults, and what they decide: which report
// files exist, which events each one takes and where it goes.
import { join } from "node:path";
import type { t_event_log_write_mode } from "../blam/cseries/cseries_event_logs.ts";
import type {
  s_events_providers,
  s_events_sinks,
  t_event_remote_log_handler,
} from "../blam/cseries/cseries_events.ts";
import type { t_text_encoding } from "../blam/cseries/cseries_strings.ts";
import { report_timestamp_build } from "../blam/cseries/cseries_time.ts";
import type { s_event_category_default_configuration } from "../blam/cseries/event_category_defaults.ts";
import {
  e_event_level,
  type t_event_level_threshold,
} from "../blam/cseries/event_levels.ts";
import {
  event_line_options_resolve,
  type s_event_line_options,
} from "../blam/cseries/event_log_format.ts";
import {
  e_event_response,
  type t_event_response_flags,
} from "../blam/cseries/event_response.ts";
import type { t_event_spam_mode } from "../blam/cseries/event_spam.ts";

export const k_event_reports_directory = "reports";
export const k_event_error_snapshot_directory = "error_snapshot";

export interface s_event_initial_levels {
  display: t_event_level_threshold;
  log: t_event_level_threshold;
  remote_log: t_event_level_threshold;
}

export interface s_events_initialize_options {
  // Keep appending to the report files, trimmed to trim_bytes. When false every file is
  // recreated the first time the process writes to it. Default true.
  append?: boolean;
  // Category table, applied in order. Default none.
  categories?: readonly s_event_category_default_configuration[];
  // debug_datamine.txt, the events that are sent to the datamine. Default false.
  datamine_log?: boolean;
  // Show local time when false. Default false.
  date_utc?: boolean;
  // debug.txt also takes the lines of categories that have no file of their own, where the
  // level alone decides when false. Default false.
  debug_log_includes_unfiled?: boolean;
  // debug_full.txt, every event that is logged. Default true.
  full_log?: boolean;
  // Default all error.
  initial_levels?: Partial<s_event_initial_levels>;
  // Flush the logs synchronously when the process exits. Default true.
  install_exit_flush?: boolean;
  // The columns of a log line, see s_event_line_options.
  line?: Partial<s_event_line_options>;
  // Shown in the live server's hello. Default none.
  name?: string;
  providers?: s_events_providers;
  // Called for events with the remote log bit; same as events_set_remote_log_handler.
  remote_log?: t_event_remote_log_handler;
  // Where the reports, error snapshots and thrown_away_events.txt go.
  root: string;
  // An extra debug.txt in the root, recreated on every start. Default false.
  root_debug_log?: boolean;
  // One folder per run, <root>/reports/<YYYYMMDD_HHMMSS>[_<session_suffix>]/, instead of
  // everything in <root>/reports/. Default false.
  separate_session_reports?: boolean;
  // Ends the folder name of a separate session report, e.g. "pc_web-tiger".
  session_suffix?: string;
  sinks?: s_events_sinks;
  // Default "console_only".
  spam_mode?: t_event_spam_mode;
  // Default "utf8".
  text_encoding?: t_text_encoding;
  // Append files are cut to their last trim_bytes bytes when first opened. Zero never trims.
  // Default 0.
  trim_bytes?: number;
  // debug_spam.txt, events that have no category. Default false.
  uncategorized_log?: boolean;
  // The banner's version line. Default "blamnet events".
  version_string?: string;
  // Write report files at all. Console, listeners and the live server work without them.
  // Default true.
  write_files?: boolean;
  write_mode?: t_event_log_write_mode;
}

// The options that decide what the files look like, with every default filled in.
export interface s_events_config {
  append: boolean;
  categories: readonly s_event_category_default_configuration[];
  datamine_log: boolean;
  date_utc: boolean;
  debug_log_includes_unfiled: boolean;
  full_log: boolean;
  initial_levels: s_event_initial_levels;
  line: s_event_line_options;
  name: string | undefined;
  root: string;
  root_debug_log: boolean;
  separate_session_reports: boolean;
  session_suffix: string | undefined;
  spam_mode: t_event_spam_mode;
  text_encoding: t_text_encoding;
  trim_bytes: number;
  uncategorized_log: boolean;
  version_string: string;
  write_files: boolean;
}

export const k_events_version_string_default = "blamnet events";

export function events_config_resolve(
  options: s_events_initialize_options
): s_events_config {
  return {
    root: options.root,
    name: options.name,
    version_string: options.version_string ?? k_events_version_string_default,
    categories: options.categories ?? [],
    initial_levels: {
      display: options.initial_levels?.display ?? e_event_level.error,
      log: options.initial_levels?.log ?? e_event_level.error,
      remote_log: options.initial_levels?.remote_log ?? e_event_level.error,
    },
    spam_mode: options.spam_mode ?? "console_only",
    text_encoding: options.text_encoding ?? "utf8",
    line: event_line_options_resolve(options.line),
    date_utc: options.date_utc ?? false,
    write_files: options.write_files ?? true,
    separate_session_reports: options.separate_session_reports ?? false,
    session_suffix: options.session_suffix,
    debug_log_includes_unfiled: options.debug_log_includes_unfiled ?? false,
    full_log: options.full_log ?? true,
    datamine_log: options.datamine_log ?? false,
    uncategorized_log: options.uncategorized_log ?? false,
    root_debug_log: options.root_debug_log ?? false,
    append: options.append ?? true,
    trim_bytes: options.trim_bytes ?? 0,
  };
}

// primary: log bit set and level at or above the global log level.
// primary_or_unfiled: like primary, but also anything whose category has no log file.
// full: log bit set.
// remote: remote log bit set.
// uncategorized: root category events with any response bit, lines without a category prefix.
export type t_event_log_route =
  | "primary"
  | "primary_or_unfiled"
  | "full"
  | "remote"
  | "uncategorized";

// What a route is shown about an event once it is known to be handled.
export interface s_routed_event {
  category_has_log: boolean;
  category_index: number;
  global_log_level: t_event_level_threshold;
  level: e_event_level;
  response: t_event_response_flags;
}

export function event_log_route_matches(
  route: t_event_log_route,
  event: s_routed_event
): boolean {
  const logged = (event.response & e_event_response.log) !== 0;
  switch (route) {
    case "primary":
      return logged && event.level >= event.global_log_level;
    case "primary_or_unfiled":
      return (
        logged &&
        (event.level >= event.global_log_level || !event.category_has_log)
      );
    case "full":
      return logged;
    case "remote":
      return (event.response & e_event_response.remote_log) !== 0;
    case "uncategorized":
      return event.category_index === 0 && event.response !== 0;
    default:
      return false;
  }
}

// A file the log set can write; category log files are just these without a route.
export interface s_event_log_file {
  append_to_file?: boolean;
  name: string;
  place_in_root?: boolean;
}

export interface s_event_log_definition extends s_event_log_file {
  route: t_event_log_route;
}

// The files every event is offered to, in the order they are registered.
export function event_log_definitions(
  config: s_events_config
): s_event_log_definition[] {
  if (!config.write_files) {
    return [];
  }
  const route: t_event_log_route = config.debug_log_includes_unfiled
    ? "primary_or_unfiled"
    : "primary";
  const definitions: s_event_log_definition[] = [];
  if (config.root_debug_log) {
    definitions.push({ name: "debug.txt", place_in_root: true, route });
  }
  definitions.push({
    name: "debug.txt",
    append_to_file: config.append,
    route,
  });
  if (config.full_log) {
    definitions.push({
      name: "debug_full.txt",
      append_to_file: config.append,
      route: "full",
    });
  }
  if (config.datamine_log) {
    definitions.push({
      name: "debug_datamine.txt",
      append_to_file: config.append,
      route: "remote",
    });
  }
  if (config.uncategorized_log) {
    definitions.push({
      name: "debug_spam.txt",
      append_to_file: config.append,
      route: "uncategorized",
    });
  }
  return definitions;
}

// <YYYYMMDD_HHMMSS>[_<session_suffix>]
export function event_log_session_folder_name(
  config: s_events_config,
  session_started: Date
): string {
  const timestamp = report_timestamp_build(session_started, config.date_utc);
  return config.session_suffix
    ? `${timestamp}_${config.session_suffix}`
    : timestamp;
}

export function event_log_directory(
  config: s_events_config,
  file: s_event_log_file,
  session_started: Date
): string {
  if (file.place_in_root) {
    return config.root;
  }
  const reports = join(config.root, k_event_reports_directory);
  return config.separate_session_reports
    ? join(reports, event_log_session_folder_name(config, session_started))
    : reports;
}

export function event_log_snapshot_directory(config: s_events_config): string {
  return join(config.root, k_event_error_snapshot_directory);
}
