// Reads the text logs: the ones this package writes, whose banner names their columns, the
// game's own report files and the datamine text exports. The parser is incremental, so a viewer
// can feed it chunks as they arrive.

import {
  event_line_columns_parse,
  k_event_banner_columns_prefix,
  type s_event_line_options,
} from "../blam/cseries/event_log_format.ts";
import { data_mine_byte_order_from_marker } from "../blam/data_mining/data_mine_formats.ts";
import { DatamineError } from "../datamine_error.ts";
import {
  log_category_split,
  log_level_from_text,
  type s_log_entry,
  type s_log_entry_session,
  type t_log_source_format,
  type t_log_text_format,
} from "./log_entry.ts";

// The Halo report files: "MM.DD.YY HH:MM:SS.mmm %07d <g%06d f%07d | 8 spaces f%07d> <38 netbuf columns or none> <severity> <text> <context>"
const k_halo_style_line_regex =
  /^(?<date>(?<month>\d{2})\.(?<day>\d{2})\.(?<year>\d{2}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})\.(?<milli>\d{3})) (?<index>\d{7,}) (?:g(?<game>\d{6,}) f| {8}f)(?<frame>\d{7,}) (?<prefix>|.{38}) (?<level>verbose|status |message|WARNING|-ERROR-|-FATAL-) (?<rest>.*)$/s;
const k_halo_style_start_regex =
  /^\d{2}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \d{7,} /;

// The Destiny report files: "MM/DD/YYYY HH:MM:SS.mmm g%08d %08X %-8s <text>"
const k_destiny_style_line_regex =
  /^(?<date>(?<month>\d{2})\/(?<day>\d{2})\/(?<year>\d{4}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})\.(?<milli>\d{3})) g(?<game>\d{8,}) (?<thread>[0-9A-Fa-f]{8}) (?<level>[a-z]+) (?<rest>.*)$/s;
const k_destiny_style_start_regex =
  /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}\.\d{3} g\d{8,} /;

// "MM.DD.YY HH:mm:ss.SSS %07d [<priority>] <message>", the priority being a level name or "Unknown (n)".
const k_datamine_text_line_regex =
  /^(?<date>(?<month>\d{2})\.(?<day>\d{2})\.(?<year>\d{2}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})\.(?<milli>\d{3})) (?<index>\d{7,})(?: (?<level>verbose|status|message|WARNING|-ERROR-|-CRITICAL-|-FATAL-|Unknown \(\d+\)))? (?<rest>.*)$/s;
// Same opening as a halo style line.
const k_datamine_text_start_regex = k_halo_style_start_regex;

// "[(type)description:(type)description]" at the end of a line.
const k_context_regex = /^(?<text>.*?) (?<context>\[\(.*\])$/s;
const k_banner_rule_regex = /^={20,}\s*$/;
// "columns: date=long,event_index,thread_id,level=lower,context"
const k_columns_line_regex = new RegExp(
  `^${k_event_banner_columns_prefix}\\s*(?<columns>.*?)\\s*$`
);
const k_datamine_banner_regex = /^blamnet datamine (?<version>.*)$/;
const k_line_break_regex = /\r?\n/;
const k_byte_order_mark = "﻿";

const k_destiny_style_banner_rule_length = 80;
const k_halo_style_banner_rule_length = 92;
const k_destiny_style_level_column_width = 8;
// Lines held back while the format is still unknown.
const k_detect_held_maximum_lines = 256;

interface s_line_start {
  date: Date;
  date_text: string;
  fields: Partial<s_log_entry>;
  level_text: string;
  rest: string;
}

function date_from_groups(
  groups: Record<string, string>,
  full_year: boolean
): Date {
  const year = Number.parseInt(groups.year, 10);
  return new Date(
    full_year ? year : 2000 + year,
    Number.parseInt(groups.month, 10) - 1,
    Number.parseInt(groups.day, 10),
    Number.parseInt(groups.hour, 10),
    Number.parseInt(groups.minute, 10),
    Number.parseInt(groups.second, 10),
    Number.parseInt(groups.milli, 10)
  );
}

// What the lines of a banner-announced log look like for one set of columns. The level is
// the last column, so the rest of the line is the text and, when the column is on, the context.
interface s_event_log_grammar {
  columns: s_event_line_options;
  line: RegExp;
  start: RegExp;
}

const k_date_short_source = String.raw`(?<date>(?<month>\d{2})\.(?<day>\d{2})\.(?<year>\d{2}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})\.(?<milli>\d{3}))`;
const k_date_long_source = String.raw`(?<date>(?<month>\d{2})/(?<day>\d{2})/(?<year>\d{4}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})\.(?<milli>\d{3}))`;
// One of the three session clocks of a netbuf column, or twelve spaces.
const k_netbuf_clock_source = String.raw`(?:\d{2}:\d{2}:\d{2}\.\d{3}| {12})`;
const k_netbuf_source = `(?: (?<prefix>${k_netbuf_clock_source} ${k_netbuf_clock_source} ${k_netbuf_clock_source}))?`;
const k_level_upper_source =
  " (?<level>verbose|status |message|WARNING|-ERROR-|-FATAL-) (?<rest>.*)";
const k_level_lower_source =
  " (?<level>verbose|status|message|warning|error|critical) (?<rest>.*)";

const g_event_log_grammars = new Map<string, s_event_log_grammar>();

function event_log_grammar(columns: s_event_line_options): s_event_log_grammar {
  const key = JSON.stringify(columns);
  let grammar = g_event_log_grammars.get(key);
  if (!grammar) {
    const fixed = [
      columns.date === "short" ? k_date_short_source : k_date_long_source,
    ];
    if (columns.event_index) {
      fixed.push(String.raw` (?<index>\d{7,})`);
    }
    if (columns.game_time) {
      fixed.push(String.raw` g(?<game>\d{8,})(?: f(?<frame>\d{7,}))?`);
    }
    if (columns.thread_id) {
      fixed.push(" (?<thread>[0-9A-Fa-f]{8})");
    }
    const level =
      columns.level === "upper" ? k_level_upper_source : k_level_lower_source;
    grammar = {
      columns,
      start: new RegExp(`^${fixed.join("")}(?: |$)`),
      line: new RegExp(`^${fixed.join("")}${k_netbuf_source}${level}$`, "s"),
    };
    g_event_log_grammars.set(key, grammar);
  }
  return grammar;
}

// A halo style line also fits the datamine text pattern, so the tighter formats go first. A
// "columns:" line gives away a log this package wrote, whose lines have no fixed shape.
function log_detect_line(line: string): t_log_text_format | undefined {
  if (k_datamine_banner_regex.test(line)) {
    return "datamine_text";
  }
  if (k_columns_line_regex.test(line)) {
    return "event_log";
  }
  if (k_destiny_style_line_regex.test(line)) {
    return "destiny_style_log";
  }
  if (k_halo_style_line_regex.test(line)) {
    return "halo_style_log";
  }
  if (k_datamine_text_line_regex.test(line)) {
    return "datamine_text";
  }
}

// Banner only: the rules are 80 wide in Destiny's files and 92 in Halo's.
function log_detect_banner_rule(
  lines: readonly string[]
): t_log_text_format | undefined {
  for (const line of lines) {
    if (k_banner_rule_regex.test(line)) {
      const length = line.trimEnd().length;
      if (length === k_destiny_style_banner_rule_length) {
        return "destiny_style_log";
      }
      if (length === k_halo_style_banner_rule_length) {
        return "halo_style_log";
      }
      return;
    }
  }
}

// Looks for the datamine banner or the first line that fits a format, skipping what doesn't
// (a head cut mid-line starts with garbage). Falls back to the width of the banner rule.
export function log_detect_text_format(
  head: string
): t_log_text_format | undefined {
  const lines = head.replace(k_byte_order_mark, "").split(k_line_break_regex);
  for (const line of lines) {
    const format = log_detect_line(line);
    if (format) {
      return format;
    }
  }
  return log_detect_banner_rule(lines);
}

const k_datamine_extension_regex = /\.datamine$/i;
const k_upload_entry_name = "compressed.dat";
const k_datamine_major_version_maximum = 3;

function bytes_have_zip_signature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

// The marker 0xFFFE is stored in the file's own byte order, then comes the major version. A
// UTF-16 text file opens with the same two bytes, but its next unit is a character rather
// than 1 to 3.
function bytes_have_datamine_marker(bytes: Uint8Array): boolean {
  if (bytes.length < 2) {
    return false;
  }
  const byte_order = data_mine_byte_order_from_marker(bytes[0], bytes[1]);
  if (!byte_order) {
    return false;
  }
  if (bytes.length < 4) {
    return true;
  }
  const major =
    byte_order === "little"
      ? bytes[2] | (bytes[3] << 8)
      : (bytes[2] << 8) | bytes[3];
  return major >= 1 && major <= k_datamine_major_version_maximum;
}

function bytes_contain_text(bytes: Uint8Array, text: string): boolean {
  const first = text.charCodeAt(0);
  for (
    let start = bytes.indexOf(first);
    start >= 0;
    start = bytes.indexOf(first, start + 1)
  ) {
    let matched = true;
    for (let offset = 1; offset < text.length; offset++) {
      if (bytes[start + offset] !== text.charCodeAt(offset)) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }
  return false;
}

// Tells the five formats apart from the file name and the first bytes of the file. 64 KiB is
// plenty for text; a zip only needs its first local header.
export function log_detect_format(
  file_name: string,
  head: Uint8Array
): t_log_source_format | undefined {
  if (bytes_have_datamine_marker(head)) {
    return "datamine_binary";
  }
  if (
    bytes_have_zip_signature(head) &&
    bytes_contain_text(head, k_upload_entry_name)
  ) {
    return "datamine_upload";
  }
  const text_format = log_detect_text_format(
    new TextDecoder("utf-8").decode(head)
  );
  if (text_format) {
    return text_format;
  }
  if (k_datamine_extension_regex.test(file_name)) {
    return "datamine_binary";
  }
}

function line_start_halo_style(line: string): s_line_start | undefined {
  const groups = k_halo_style_line_regex.exec(line)?.groups;
  if (!groups) {
    return;
  }
  const fields: Partial<s_log_entry> = {
    event_index: Number.parseInt(groups.index, 10),
    frame_index: Number.parseInt(groups.frame, 10),
  };
  if (groups.game !== undefined) {
    fields.game_time = Number.parseInt(groups.game, 10);
  }
  if (groups.prefix.trim().length > 0) {
    fields.custom_prefix = groups.prefix;
  }
  return {
    date: date_from_groups(groups, false),
    date_text: groups.date,
    level_text: groups.level.trim(),
    rest: groups.rest,
    fields,
  };
}

function line_start_destiny_style(line: string): s_line_start | undefined {
  const groups = k_destiny_style_line_regex.exec(line)?.groups;
  if (!groups) {
    return;
  }
  // The level is padded to a column before the one separating space.
  let rest = groups.rest;
  let padding = k_destiny_style_level_column_width - groups.level.length;
  while (padding > 0 && rest.startsWith(" ")) {
    rest = rest.slice(1);
    padding--;
  }
  return {
    date: date_from_groups(groups, true),
    date_text: groups.date,
    level_text: groups.level,
    rest,
    fields: {
      game_time: Number.parseInt(groups.game, 10),
      thread_id: Number.parseInt(groups.thread, 16),
    },
  };
}

function line_start_datamine_text(line: string): s_line_start | undefined {
  const groups = k_datamine_text_line_regex.exec(line)?.groups;
  if (!groups) {
    return;
  }
  const level_text = groups.level ?? "";
  let rest = groups.rest;
  // The exporter's priority table has "status " with a trailing space.
  if (level_text === "status" && rest.startsWith(" ")) {
    rest = rest.slice(1);
  }
  return {
    date: date_from_groups(groups, false),
    date_text: groups.date,
    level_text,
    rest,
    fields: { event_index: Number.parseInt(groups.index, 10) },
  };
}

function line_start_event_log(
  line: string,
  grammar: s_event_log_grammar
): s_line_start | undefined {
  const groups = grammar.line.exec(line)?.groups;
  if (!groups) {
    return;
  }
  const fields: Partial<s_log_entry> = {};
  if (groups.index !== undefined) {
    fields.event_index = Number.parseInt(groups.index, 10);
  }
  if (groups.game !== undefined) {
    fields.game_time = Number.parseInt(groups.game, 10);
  }
  if (groups.frame !== undefined) {
    fields.frame_index = Number.parseInt(groups.frame, 10);
  }
  if (groups.thread !== undefined) {
    fields.thread_id = Number.parseInt(groups.thread, 16);
  }
  if (groups.prefix !== undefined) {
    fields.custom_prefix = groups.prefix;
  }
  // The level is padded to a column before the one separating space.
  let rest = groups.rest;
  if (grammar.columns.level === "lower") {
    let padding = k_destiny_style_level_column_width - groups.level.length;
    while (padding > 0 && rest.startsWith(" ")) {
      rest = rest.slice(1);
      padding--;
    }
  }
  return {
    date: date_from_groups(groups, grammar.columns.date === "long"),
    date_text: groups.date,
    level_text: groups.level.trim(),
    rest,
    fields,
  };
}

// An entry waits here until the next one starts, because its text can go on for more lines.
interface s_pending_entry {
  continuation: string[];
  date: Date | undefined;
  date_text: string;
  fields: Partial<s_log_entry>;
  first_text: string;
  level_text: string;
  line: number;
  raw: string[];
}

export class c_log_text_parser {
  private m_format: t_log_text_format | undefined;
  // The columns the latest banner named, for event_log.
  private m_grammar: s_event_log_grammar | undefined;
  private m_banner_version: string | undefined;
  private m_partial = "";
  private m_line_number = 0;
  private m_ordinal = 0;
  private m_pending: s_pending_entry | undefined;
  // Blank lines can be part of a multi-line text, so they wait for what follows them.
  private m_blank_lines: string[] = [];
  private m_in_banner = false;
  private m_banner_lines: string[] = [];
  private m_banner_line = 0;
  private m_session_count = 0;
  private m_started = false;
  private m_finished = false;
  private m_detect_held: { line: string; number: number }[] = [];

  // columns: for event_log, the columns of lines that come with no banner of their own before
  // them, such as a single entry read out of the middle of a file.
  constructor(
    format?: t_log_source_format,
    options: { columns?: s_event_line_options } = {}
  ) {
    if (
      format !== undefined &&
      format !== "event_log" &&
      format !== "halo_style_log" &&
      format !== "destiny_style_log" &&
      format !== "datamine_text"
    ) {
      throw new DatamineError(`${format} is not a text log format`);
    }
    this.m_format = format;
    if (options.columns) {
      this.m_grammar = event_log_grammar(options.columns);
    }
  }

  // The columns lines are read with right now, for event_log.
  get columns(): s_event_line_options | undefined {
    return this.m_grammar?.columns;
  }

  // Undefined until a banner or a log line gives it away, when none was passed in.
  get format(): t_log_text_format | undefined {
    return this.m_format;
  }

  // The version line of the first banner.
  get banner_version(): string | undefined {
    return this.m_banner_version;
  }

  // Parses the complete lines of the chunk and keeps a partial last line for the next call.
  // A line that doesn't start with a timestamp continues the entry before it, so an entry is
  // only returned once the next entry or a banner starts, or on finish().
  push(chunk: string): s_log_entry[] {
    if (this.m_finished) {
      throw new DatamineError("the log text parser is finished");
    }
    let text = this.m_partial + chunk;
    if (!this.m_started && text.length > 0) {
      this.m_started = true;
      if (text.startsWith(k_byte_order_mark)) {
        text = text.slice(1);
      }
    }
    const lines = text.split("\n");
    this.m_partial = lines.pop() ?? "";
    const entries: s_log_entry[] = [];
    for (const line of lines) {
      this.line_accept(line, entries);
    }
    return entries;
  }

  // Parses the partial last line and returns the entry that was still waiting.
  finish(): s_log_entry[] {
    const entries: s_log_entry[] = [];
    if (this.m_finished) {
      return entries;
    }
    this.m_finished = true;
    if (this.m_partial.length > 0) {
      const line = this.m_partial;
      this.m_partial = "";
      this.line_accept(line, entries);
    }
    if (!this.m_format) {
      this.m_format = log_detect_banner_rule(
        this.m_detect_held.map((held) => held.line)
      );
      this.detect_replay(entries);
    }
    if (this.m_in_banner) {
      this.session_emit(entries);
    }
    this.entry_flush(entries);
    return entries;
  }

  private line_accept(raw_line: string, entries: s_log_entry[]): void {
    const line = raw_line.endsWith("\r") ? raw_line.slice(0, -1) : raw_line;
    this.m_line_number++;
    if (this.m_format) {
      this.line_handle(line, this.m_line_number, entries);
      return;
    }
    // No format yet: hold the lines until a banner or a log line gives it away.
    this.m_detect_held.push({ line, number: this.m_line_number });
    if (this.m_detect_held.length > k_detect_held_maximum_lines) {
      this.m_detect_held.shift();
    }
    this.m_format = log_detect_line(line);
    if (this.m_format) {
      this.detect_replay(entries);
    }
  }

  private detect_replay(entries: s_log_entry[]): void {
    const held = this.m_detect_held;
    this.m_detect_held = [];
    if (!this.m_format) {
      return;
    }
    for (const { line, number } of held) {
      this.line_handle(line, number, entries);
    }
  }

  private line_is_start(line: string): boolean {
    switch (this.m_format) {
      case "event_log":
        return this.m_grammar?.start.test(line) ?? false;
      case "halo_style_log":
        return k_halo_style_start_regex.test(line);
      case "destiny_style_log":
        return k_destiny_style_start_regex.test(line);
      default:
        return k_datamine_text_start_regex.test(line);
    }
  }

  private line_handle(
    line: string,
    number: number,
    entries: s_log_entry[]
  ): void {
    if (this.banner_line_handle(line, number, entries)) {
      return;
    }
    if (this.line_is_start(line)) {
      this.entry_flush(entries);
      this.entry_start(line, number);
      return;
    }
    if (line.trim().length === 0) {
      if (this.m_pending) {
        this.m_blank_lines.push(line);
      }
      return;
    }
    // Before the first entry this is the cut-off tail of a trimmed file.
    if (this.m_pending) {
      this.m_pending.continuation.push(...this.m_blank_lines, line);
      this.m_pending.raw.push(...this.m_blank_lines, line);
      this.m_blank_lines = [];
    }
  }

  // Files that are appended to get a banner per run, and a banner ends the entry before it.
  // Returns true when the line was part of one.
  private banner_line_handle(
    line: string,
    number: number,
    entries: s_log_entry[]
  ): boolean {
    if (k_banner_rule_regex.test(line)) {
      this.entry_flush(entries);
      if (this.m_in_banner) {
        this.m_banner_lines.push(line);
        this.session_emit(entries);
      } else {
        this.m_in_banner = true;
        this.m_banner_lines = [line];
        this.m_banner_line = number;
      }
      return true;
    }
    if (!this.m_in_banner) {
      return false;
    }
    if (this.line_is_start(line)) {
      // A banner that never closed.
      this.session_emit(entries);
      return false;
    }
    this.m_banner_lines.push(line);
    return true;
  }

  private session_emit(entries: s_log_entry[]): void {
    const lines = this.m_banner_lines;
    this.m_in_banner = false;
    this.m_banner_lines = [];
    const first = lines.slice(1).find((line) => line.trim().length > 0);
    const version_line = first?.trim() ?? "";
    const version =
      k_datamine_banner_regex.exec(version_line)?.groups?.version.trim() ??
      version_line;
    if (this.m_format === "event_log") {
      this.columns_accept(lines);
    }
    if (this.m_banner_version === undefined && version.length > 0) {
      this.m_banner_version = version;
    }
    this.m_session_count++;
    const session: s_log_entry_session = {
      number: this.m_session_count,
      version,
    };
    if (this.m_format === "event_log" && this.m_grammar) {
      session.columns = this.m_grammar.columns;
    }
    entries.push({
      kind: "session",
      session,
      ordinal: this.m_ordinal++,
      line: this.m_banner_line,
      date_text: "",
      level_text: "",
      category_path: "",
      categories: [],
      message: version,
      text: version,
      raw: lines.join("\n"),
    });
  }

  // The banner's "columns:" line sets the line grammar until the next banner says otherwise.
  private columns_accept(banner_lines: readonly string[]): void {
    for (const line of banner_lines) {
      const text = k_columns_line_regex.exec(line.trim())?.groups?.columns;
      const columns =
        text === undefined ? undefined : event_line_columns_parse(text);
      if (columns) {
        this.m_grammar = event_log_grammar(columns);
        return;
      }
    }
  }

  private entry_start(line: string, number: number): void {
    let start: s_line_start | undefined;
    switch (this.m_format) {
      case "event_log":
        start = this.m_grammar
          ? line_start_event_log(line, this.m_grammar)
          : undefined;
        break;
      case "halo_style_log":
        start = line_start_halo_style(line);
        break;
      case "destiny_style_log":
        start = line_start_destiny_style(line);
        break;
      default:
        start = line_start_datamine_text(line);
    }
    if (start) {
      this.m_pending = {
        continuation: [],
        date: start.date,
        date_text: start.date_text,
        fields: start.fields,
        first_text: start.rest,
        level_text: start.level_text,
        line: number,
        raw: [line],
      };
      return;
    }
    // Opens with a timestamp but the rest isn't understood: the date is the first two words.
    const second_space = line.indexOf(" ", line.indexOf(" ") + 1);
    this.m_pending = {
      continuation: [],
      date: undefined,
      date_text: second_space < 0 ? line : line.slice(0, second_space),
      fields: {},
      first_text: second_space < 0 ? "" : line.slice(second_space + 1),
      level_text: "",
      line: number,
      raw: [line],
    };
  }

  private entry_flush(entries: s_log_entry[]): void {
    const pending = this.m_pending;
    this.m_pending = undefined;
    this.m_blank_lines = [];
    if (!pending) {
      return;
    }
    let text = [pending.first_text, ...pending.continuation].join("\n");
    let context: string | undefined;
    const halo_style = this.m_format === "halo_style_log";
    if (halo_style || this.m_grammar?.columns.context) {
      // A halo style line is "text context" and keeps the space when there is no context.
      if (halo_style && text.endsWith(" ")) {
        text = text.slice(0, -1);
      }
      const match = k_context_regex.exec(text)?.groups;
      if (match) {
        text = match.text;
        context = match.context;
      }
    }
    const split = log_category_split(text);
    const entry: s_log_entry = {
      ordinal: this.m_ordinal++,
      line: pending.line,
      date_text: pending.date_text,
      level_text: pending.level_text,
      category_path: split.category_path,
      categories: split.categories,
      message: split.message,
      text,
      raw: pending.raw.join("\n"),
      ...pending.fields,
    };
    if (pending.date && !Number.isNaN(pending.date.getTime())) {
      entry.date = pending.date;
    }
    const level = log_level_from_text(pending.level_text);
    if (level !== undefined) {
      entry.level = level;
    }
    if (context !== undefined) {
      entry.context = context;
    }
    entries.push(entry);
  }
}
