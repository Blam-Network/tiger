import { e_event_level } from "../../src/blam/cseries/event_levels.ts";
import type { s_event_log_line } from "../../src/blam/cseries/event_log_format.ts";
import type {
  s_log_entry,
  t_log_source_format,
} from "../../src/reading/log_entry.ts";
import { c_log_text_parser } from "../../src/reading/log_text_parser.ts";

export const k_line_date = new Date(2026, 9, 16, 0, 53, 27, 67);

export function make_log_line(
  overrides: Partial<s_event_log_line> = {}
): s_event_log_line {
  return {
    date: k_line_date,
    event_index: 61,
    level: e_event_level.message,
    category_path: "networking",
    text: "networking: request started",
    context: "",
    thread_id: 7,
    frame_index: 1,
    ...overrides,
  };
}

// Feeds the text to a parser in chunks, returning every row, the events and the session rows.
export function parse_log_text(
  text: string,
  format?: t_log_source_format,
  chunk_size = text.length || 1
): {
  all: s_log_entry[];
  entries: s_log_entry[];
  parser: c_log_text_parser;
  sessions: s_log_entry[];
} {
  const parser = new c_log_text_parser(format);
  const all: s_log_entry[] = [];
  for (let at = 0; at < text.length; at += chunk_size) {
    all.push(...parser.push(text.slice(at, at + chunk_size)));
  }
  all.push(...parser.finish());
  return {
    all,
    entries: all.filter((entry) => entry.kind !== "session"),
    parser,
    sessions: all.filter((entry) => entry.kind === "session"),
  };
}
