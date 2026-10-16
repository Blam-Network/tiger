// Text formats for event logs and the console: the line formatters, the file banner, the
// per-session timestamp columns and the category dump. All of them are pure and return text
// with its CRLF already attached where the log expects it.

import { data_mine_layout_behaviour } from "../../config/data_mine_options.ts";
import type { t_data_mine_header_layout } from "../data_mining/data_mine_formats.ts";
import { csnzprintf } from "./cseries_printf.ts";
import { system_get_date_and_time } from "./cseries_time.ts";
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

// The layout events are written for when none is given, the same default as the datamine's.
export const k_event_layout_default: t_data_mine_header_layout = "3.1";

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

// "%s %07d %s %s %s %s %s": date, event index, game time and frame, netbuf columns, severity,
// text, context. Without a game time the column is eight spaces and the frame, an empty netbuf
// leaves a double space and an empty context a trailing one.
function format_halo_style_line(
  line: s_event_log_line,
  utc: boolean,
  maximum_length: number
): string {
  const frame_index = line.frame_index ?? 0;
  const game_time_and_frame_index =
    line.game_time === undefined
      ? csnzprintf(k_event_format_buffer_maximum_size, "        f%07d", [
          frame_index,
        ])
      : csnzprintf(k_event_format_buffer_maximum_size, "g%06d f%07d", [
          line.game_time,
          frame_index,
        ]);
  const index = csnzprintf(k_event_format_buffer_maximum_size, "%07d", [
    line.event_index,
  ]);
  const content = [
    system_get_date_and_time(line.date, "short", utc),
    index,
    game_time_and_frame_index,
    line.custom_prefix ?? "",
    event_level_text(line.level, "upper"),
    line.text,
    line.context,
  ].join(" ");
  return `${content.slice(0, maximum_length)}\r\n`;
}

// "%s g%08d %08X %-8s %s": date, game time, thread id, level padded to eight, text. There is no
// index, frame, netbuf or context column.
function format_destiny_style_line(
  line: s_event_log_line,
  utc: boolean,
  maximum_length: number
): string {
  const game_time = csnzprintf(k_event_format_buffer_maximum_size, "g%08d", [
    line.game_time ?? 0,
  ]);
  const thread_id = csnzprintf(k_event_format_buffer_maximum_size, "%08X", [
    line.thread_id,
  ]);
  const content = [
    system_get_date_and_time(line.date, "long", utc),
    game_time,
    thread_id,
    event_level_text(line.level, "lower"),
    line.text,
  ].join(" ");
  return `${content.slice(0, maximum_length)}\r\n`;
}

// The line of a log file, in the style the datamine layout decides: Halo's for every layout but
// "3.1", Destiny's for "3.1". The line is cut to maximum_length characters, what the 2048 byte
// event buffer holds by default, and then gets its line ending.
export function format_event_for_log(
  line: s_event_log_line,
  layout: t_data_mine_header_layout = k_event_layout_default,
  utc = false,
  maximum_length = k_event_log_line_maximum_length
): string {
  return data_mine_layout_behaviour(layout).line_style === "halo"
    ? format_halo_style_line(line, utc, maximum_length)
    : format_destiny_style_line(line, utc, maximum_length);
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

// "%s %s" with the level text of the layout's line style, and " (%s)" after the text with a context.
export function format_console_line(
  line: s_event_console_line,
  layout: t_data_mine_header_layout = k_event_layout_default
): string {
  const level = line.forced ? e_event_level.critical : line.level;
  const style = data_mine_layout_behaviour(layout).line_style;
  const text = `${event_level_text(level, style === "halo" ? "upper" : "lower")} ${line.text}`;
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

// Rule, version, rule, blank line.
export function build_banner(version: string): string {
  const rule = "=".repeat(k_event_banner_rule_length);
  return `${rule}\r\n${version}\r\n${rule}\r\n\r\n`;
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
