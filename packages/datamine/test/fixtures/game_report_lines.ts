// The line and banner shapes of the games' own report files. The package no longer writes
// them; the reader still has to, so the tests build them here.
import { csnzprintf } from "../../src/blam/cseries/cseries_printf.ts";
import { system_get_date_and_time } from "../../src/blam/cseries/cseries_time.ts";
import {
  event_level_name,
  k_event_level_severity_strings,
} from "../../src/blam/cseries/event_levels.ts";
import type { s_event_log_line } from "../../src/blam/cseries/event_log_format.ts";
import { k_error_message_buffer_maximum_size } from "../../src/blam/cseries/event_spam.ts";

const k_line_maximum_length = k_error_message_buffer_maximum_size - 1;
const k_format_buffer_size = 256;
const k_halo_style_rule_length = 92;
const k_destiny_style_rule_length = 80;

// "%s %07d %s %s %s %s %s": date, event index, game time and frame, netbuf columns, severity,
// text, context. An empty netbuf leaves a double space and an empty context a trailing one.
export function halo_style_line(line: s_event_log_line): string {
  const frame_index = line.frame_index ?? 0;
  const game_time_and_frame_index =
    line.game_time === undefined
      ? csnzprintf(k_format_buffer_size, "        f%07d", [frame_index])
      : csnzprintf(k_format_buffer_size, "g%06d f%07d", [
          line.game_time,
          frame_index,
        ]);
  const content = csnzprintf(
    k_error_message_buffer_maximum_size,
    "%s %07d %s %s %s %s %s",
    [
      system_get_date_and_time(line.date, "short"),
      line.event_index,
      game_time_and_frame_index,
      line.custom_prefix ?? "",
      k_event_level_severity_strings[line.level],
      line.text,
      line.context,
    ]
  );
  return `${content.slice(0, k_line_maximum_length)}\r\n`;
}

export function halo_style_banner(version: string): string {
  const rule = "=".repeat(k_halo_style_rule_length);
  return `\r\n\r\n${rule}\r\n${version}\r\n${rule}\r\n\r\n\r\n`;
}

// "%s g%08d %08X %-8s %s": date, game time, thread id, lower case level, text.
export function destiny_style_line(line: s_event_log_line): string {
  const content = csnzprintf(
    k_error_message_buffer_maximum_size,
    "%s g%08d %08X %-8s %s",
    [
      system_get_date_and_time(line.date, "long"),
      line.game_time ?? 0,
      line.thread_id,
      event_level_name(line.level),
      line.text,
    ]
  );
  return `${content.slice(0, k_line_maximum_length)}\r\n`;
}

export function destiny_style_banner(version: string): string {
  const rule = "=".repeat(k_destiny_style_rule_length);
  return `${rule}\r\n    ${version}\r\n${rule}\r\n\r\n`;
}
