// Text formats for event logs and the console: the line formatters, the file banner, the
// per-session timestamp columns and the category dump. All of them are pure and return text
// with its CRLF already attached where the log expects it.

import { csnzprintf } from "./cseries_printf.ts";
import { system_get_date_and_time, type t_date_style } from "./cseries_time.ts";
import type { s_event_category_dump_row } from "./event_categories.ts";
import {
  e_event_level,
  event_level_name,
  k_event_level_severity_strings,
} from "./event_levels.ts";
import { k_error_message_buffer_maximum_size } from "./event_spam.ts";

// A log line is cut to what the 2048 byte event buffer holds, then gets its line ending.
export const k_event_log_line_maximum_length =
  k_error_message_buffer_maximum_size - 1;

// The console keeps 1026 characters of a line for the terminal and the message buffer.
export const k_event_console_line_maximum_length = 1026;

// Sessions that get a timestamp column in networking lines.
export const k_network_maximum_sessions = 3;

// The text of one session column, "hh:mm:ss.mmm".
const k_network_timestamp_length = 12;
// Names are ours: room for the game time or session columns, both far shorter.
const k_event_format_buffer_maximum_size = 256;
// The lower case level column.
const k_event_level_column_width = 8;

export const k_event_banner_rule_length = 80;
export const k_event_banner_columns_prefix = "columns:";

export interface s_event_log_line {
  category_path: string;
  // Console form is a different string; this is the log form, "[(type)description:...]".
  context: string;
  // Netbuf columns, already formatted.
  custom_prefix?: string;
  date: Date;
  event_index: number;
  // Undefined when no provider knows it, which leaves the frame out of the game time column.
  frame_index?: number;
  // Undefined means no game in progress.
  game_time?: number;
  level: e_event_level;
  text: string;
  thread_id: number;
}

export interface s_event_console_line {
  // Console form of the context stack.
  context: string;
  // Forced display prints as critical, whatever the real level was.
  forced: boolean;
  level: e_event_level;
  text: string;
}

function event_level_text(
  level: e_event_level,
  style: "upper" | "lower"
): string {
  return style === "upper"
    ? (k_event_level_severity_strings[level] ?? "")
    : event_level_name(level).padEnd(k_event_level_column_width);
}

// The columns of a log line, in the order they are written: date, event index, game time (and
// frame), thread id, any netbuf columns, level, text, context.
export interface s_event_line_options {
  // Trailing "[(type)description:...]" when the event has a context.
  context: boolean;
  // short: MM.DD.YY HH:MM:SS.mmm, long: MM/DD/YYYY HH:MM:SS.mmm.
  date: t_date_style;
  // %07d
  event_index: boolean;
  // g%08d, then f%07d when the frame index is known.
  game_time: boolean;
  // upper: verbose, status, message, WARNING, -ERROR-, -FATAL-. lower: the level name padded
  // to eight characters.
  level: "upper" | "lower";
  // %08X
  thread_id: boolean;
}

export const k_event_line_options_default: s_event_line_options = {
  date: "long",
  event_index: true,
  game_time: false,
  thread_id: true,
  level: "lower",
  context: true,
};

export function event_line_options_resolve(
  options: Partial<s_event_line_options> = {}
): s_event_line_options {
  const defined = Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  );
  return { ...k_event_line_options_default, ...defined };
}

// The banner's column list, "date=long,event_index,thread_id,level=lower,context". Date and
// level always appear; the other columns only when they are on.
export function event_line_columns_format(
  options: s_event_line_options
): string {
  const columns = [`date=${options.date}`];
  if (options.event_index) {
    columns.push("event_index");
  }
  if (options.game_time) {
    columns.push("game_time");
  }
  if (options.thread_id) {
    columns.push("thread_id");
  }
  columns.push(`level=${options.level}`);
  if (options.context) {
    columns.push("context");
  }
  return columns.join(",");
}

// Reads a column list back. Columns that are not named are off; undefined when the date or
// level value is not one we know.
export function event_line_columns_parse(
  text: string
): s_event_line_options | undefined {
  const options: s_event_line_options = {
    date: "long",
    event_index: false,
    game_time: false,
    thread_id: false,
    level: "lower",
    context: false,
  };
  for (const column of text.split(",")) {
    const [name, value] = column.trim().split("=", 2);
    switch (name) {
      case "date":
        if (value !== "short" && value !== "long") {
          return;
        }
        options.date = value;
        break;
      case "level":
        if (value !== "upper" && value !== "lower") {
          return;
        }
        options.level = value;
        break;
      case "event_index":
      case "game_time":
      case "thread_id":
      case "context":
        options[name] = true;
        break;
      default:
        break;
    }
  }
  return options;
}

// "%s %07d g%08d f%07d %08X <netbuf> %s %s %s": date, event index, game time and frame, thread
// id, netbuf columns, level, text, context. Columns that are off are left out, and so is an
// empty context. Level text is "%-8s" lower and the seven character severity upper. The line is
// cut to maximum_length characters, what the 2048 byte event buffer holds by default.
export function format_event_for_log(
  line: s_event_log_line,
  options: s_event_line_options = k_event_line_options_default,
  utc = false,
  maximum_length = k_event_log_line_maximum_length
): string {
  const columns = [system_get_date_and_time(line.date, options.date, utc)];
  if (options.event_index) {
    columns.push(
      csnzprintf(k_event_format_buffer_maximum_size, "%07d", [line.event_index])
    );
  }
  if (options.game_time) {
    let game_time = csnzprintf(k_event_format_buffer_maximum_size, "g%08d", [
      line.game_time ?? 0,
    ]);
    if (line.frame_index !== undefined) {
      game_time += csnzprintf(k_event_format_buffer_maximum_size, " f%07d", [
        line.frame_index,
      ]);
    }
    columns.push(game_time);
  }
  if (options.thread_id) {
    columns.push(
      csnzprintf(k_event_format_buffer_maximum_size, "%08X", [line.thread_id])
    );
  }
  if (line.custom_prefix) {
    columns.push(line.custom_prefix);
  }
  columns.push(event_level_text(line.level, options.level));
  const content =
    options.context && line.context.length > 0
      ? `${columns.join(" ")} ${line.text} ${line.context}`
      : `${columns.join(" ")} ${line.text}`;
  return `${content.slice(0, maximum_length)}\r\n`;
}

// One "hh:mm:ss.mmm" column per session, or twelve spaces when the session has no clock,
// separated by single spaces. session_clocks are milliseconds.
export function build_networking_buffer_for_log(
  session_clocks: readonly (number | undefined)[]
): string {
  let buffer = "";
  for (
    let session_index = 0;
    session_index < k_network_maximum_sessions;
    session_index++
  ) {
    const separator =
      session_index === k_network_maximum_sessions - 1 ? "" : " ";
    const session_timestamp = session_clocks[session_index];
    if (session_timestamp === undefined) {
      buffer += " ".repeat(k_network_timestamp_length) + separator;
    } else {
      const session_sec = Math.trunc(session_timestamp / 1000);
      const session_msec = Math.trunc(session_timestamp) % 1000;
      const session_min = Math.trunc(session_sec / 60);
      const session_hour = Math.trunc(session_min / 60);
      buffer += csnzprintf(
        k_event_format_buffer_maximum_size,
        "%02d:%02d:%02d.%03d%s",
        [
          session_hour,
          session_min % 60,
          session_sec % 60,
          session_msec,
          separator,
        ]
      );
    }
  }
  return buffer;
}

// "%s %s" with the level text of the log line, and " (%s)" after the text with a context.
export function format_console_line(
  line: s_event_console_line,
  options: s_event_line_options = k_event_line_options_default
): string {
  const level = line.forced ? e_event_level.critical : line.level;
  const text = `${event_level_text(level, options.level)} ${line.text}`;
  return line.context.length > 0
    ? csnzprintf(k_error_message_buffer_maximum_size, "%s (%s)", [
        text,
        line.context,
      ])
    : csnzprintf(k_error_message_buffer_maximum_size, "%s", [text]);
}

// What the terminal and the message buffer get of a console line.
export function console_line_truncate(line: string): string {
  return line.slice(0, k_event_console_line_maximum_length);
}

// Rule, version, the column list, rule, blank line.
export function build_banner(
  version: string,
  options: s_event_line_options = k_event_line_options_default
): string {
  const rule = "=".repeat(k_event_banner_rule_length);
  return `${rule}\r\n${version}\r\n${k_event_banner_columns_prefix} ${event_line_columns_format(options)}\r\n${rule}\r\n\r\n`;
}

export const k_category_dump_header =
  "ID Parent Log Output     Force      Log        Debug      Datamine   Name";

// The row has six level columns but the header names five, so which is which is partly a
// guess: display, force display, log, debugger break, remote log, then halt. The "Log"
// number is probably an event log index; we have none, so it prints 0.
export function format_category_dump(
  rows: readonly s_event_category_dump_row[]
): string {
  const lines = rows.map((row) =>
    csnzprintf(
      k_error_message_buffer_maximum_size,
      "%04d %04d %03d [%-8s] [%-8s] [%-8s] [%-8s] [%-8s] [%-8s] %s",
      [
        row.index,
        row.parent_index,
        0,
        event_level_name(row.display_level),
        event_level_name(row.force_display_level),
        event_level_name(row.log_level),
        event_level_name(row.debugger_break_level),
        event_level_name(row.remote_log_level),
        event_level_name(row.halt_level),
        row.path,
      ]
    )
  );
  return [k_category_dump_header, ...lines].join("\n");
}
