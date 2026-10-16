// The public events API: one event system per process, configured once with
// events_initialize and raised with event(level, "category:sub: format %d", ...args). Before
// initialization every call is a silent no-op.
import { threadId } from "node:worker_threads";
import {
  event_log_definitions,
  event_log_route_matches,
  events_config_resolve,
  type s_event_log_definition,
  type s_event_log_file,
  type s_events_config,
  type s_events_initialize_options,
  type s_routed_event,
} from "../../config/event_options.ts";
import { DatamineError } from "../../datamine_error.ts";
import { datamine_globals_get } from "../../datamine_globals.ts";
import { c_event_log_set } from "./cseries_event_logs.ts";
import { csnzprintf, type t_printf_argument } from "./cseries_printf.ts";
import { k_system_clock, type s_clock } from "./cseries_time.ts";
import {
  build_correct_category_name,
  c_event_category_table,
  event_category_dump_rows,
  event_parse_categories,
  event_query,
  k_event_category_none,
  type s_event_global_levels,
  type s_real_rgb_color,
  type t_event_category_property,
} from "./event_categories.ts";
import { event_context_get } from "./event_context.ts";
import {
  e_event_level,
  event_level_name,
  k_event_level_count,
  k_event_level_none,
  type t_event_level_threshold,
} from "./event_levels.ts";
import {
  build_networking_buffer_for_log,
  console_line_truncate,
  format_category_dump,
  format_console_line,
  format_event_for_log,
  k_event_console_line_maximum_length,
  k_event_log_line_maximum_length,
  type s_event_log_line,
} from "./event_log_format.ts";
import {
  e_event_response,
  event_response_test,
  type t_event_response_flags,
} from "./event_response.ts";
import {
  c_console_spam_limiter,
  c_event_spam_filter,
  k_error_message_buffer_maximum_size,
} from "./event_spam.ts";

export const k_maximum_event_listeners = 8;

const k_message_buffer_overflow_prefix = "[...too many errors to print...]\r\n";
// The category lookup cache is dropped when formats are being built dynamically.
const k_category_cache_maximum_size = 8192;

const k_color_white: s_real_rgb_color = { red: 1, green: 1, blue: 1 };
const k_color_red: s_real_rgb_color = { red: 1, green: 0, blue: 0 };

export interface s_events_sinks {
  debug_output?: (line: string) => void;
  debugger_break?: (text: string) => void;
  // The on-screen console; color is the category's display color.
  display?: (
    line: string,
    level: e_event_level,
    color: s_real_rgb_color
  ) => void;
  // A halt never exits the process, the sink decides what to do.
  halt?: (text: string) => void;
}

export interface s_events_providers {
  clock?: s_clock;
  frame_index?: () => number;
  // Undefined while no game is in progress.
  game_time?: () => number | undefined;
  // Per-session clocks in milliseconds for the netbuf columns.
  network_session_clocks?: () => readonly (number | undefined)[];
  // Worker thread id by default.
  thread_id?: () => number;
}

// What the datamine layer is handed for an event with the remote log bit set.
export interface s_event_remote_record {
  args: readonly t_printf_argument[];
  categories: readonly string[];
  category_path: string;
  // Remote form of the context stack.
  context: string;
  format: string;
  level: e_event_level;
  text: string;
}

export type t_event_remote_log_handler = (
  record: s_event_remote_record
) => void;

export interface s_event_listener_event {
  category_path: string;
  level: e_event_level;
  text: string;
}

export type t_event_listener = (event: s_event_listener_event) => void;

// Internal tap for the events server: every event that produced any output, with the
// pieces a listener does not get. Not exported from the package entry.
export interface s_event_capture_record {
  args: readonly t_printf_argument[];
  category_path: string;
  context: string;
  format: string;
  frame_index: number | undefined;
  game_time: number | undefined;
  level: e_event_level;
  // Number of the events_initialize run that raised it.
  session: number;
  text: string;
  thread_id: number;
  time_ms: number;
}

export type t_event_capture = (record: s_event_capture_record) => void;

// One events_initialize run.
export interface s_events_session_info {
  name: string | undefined;
  number: number;
  started_ms: number;
  version_string: string;
}

export type t_events_session_listener = (
  session: s_events_session_info
) => void;

interface s_events_state {
  category_cache: Map<string, number>;
  clock: s_clock;
  config: s_events_config;
  console_limiter: c_console_spam_limiter;
  debugger_break_level: t_event_level_threshold;
  disable_event_suppression: boolean;
  display_level: t_event_level_threshold;
  enable_events: boolean;
  enable_spam_suppression: boolean;
  event_index: number;
  exit_handler: (() => void) | undefined;
  listeners: ({ categories: string; listener: t_event_listener } | undefined)[];
  log_definitions: readonly s_event_log_definition[];
  log_level: t_event_level_threshold;
  logs: c_event_log_set;
  message_buffer: string;
  once_formats: Set<string>;
  options: s_events_initialize_options;
  providers: s_events_providers;
  recursion_lock: boolean;
  remote_log_level: t_event_level_threshold;
  sinks: s_events_sinks;
  spam: c_event_spam_filter;
  table: c_event_category_table;
}

interface s_events_globals {
  captures: Set<t_event_capture>;
  remote_log_handler: t_event_remote_log_handler | undefined;
  // The last run, kept after events_dispose.
  session: s_events_session_info | undefined;
  session_listeners: Set<t_events_session_listener>;
  state: s_events_state | undefined;
}

function events_globals(): s_events_globals {
  return datamine_globals_get<s_events_globals>("events", () => ({
    state: undefined,
    remote_log_handler: undefined,
    captures: new Set(),
    session: undefined,
    session_listeners: new Set(),
  }));
}

function events_state(): s_events_state | undefined {
  return events_globals().state;
}

// ---------- lifecycle

export function events_initialize(options: s_events_initialize_options): void {
  const globals = events_globals();
  if (globals.state) {
    throw new DatamineError("events are already initialized");
  }

  const config = events_config_resolve(options);
  const clock = options.providers?.clock ?? k_system_clock;
  const logs = new c_event_log_set({
    config,
    clock,
    write_mode: options.write_mode ?? "immediate",
  });
  const table = new c_event_category_table(
    config.categories,
    events_category_message
  );

  const state: s_events_state = {
    options,
    config,
    clock,
    providers: options.providers ?? {},
    sinks: options.sinks ?? {},
    table,
    logs,
    log_definitions: event_log_definitions(config),
    spam: new c_event_spam_filter(config.spam_mode),
    console_limiter: new c_console_spam_limiter(),
    enable_events: true,
    enable_spam_suppression: true,
    disable_event_suppression: false,
    display_level: config.initial_levels.display,
    log_level: config.initial_levels.log,
    remote_log_level: config.initial_levels.remote_log,
    debugger_break_level: k_event_level_none,
    event_index: 0,
    message_buffer: "",
    recursion_lock: false,
    category_cache: new Map(),
    once_formats: new Set(),
    listeners: new Array(k_maximum_event_listeners).fill(undefined),
    exit_handler: undefined,
  };

  if (options.install_exit_flush ?? true) {
    state.exit_handler = () => logs.flush();
    process.on("exit", state.exit_handler);
  }
  if (options.remote_log) {
    globals.remote_log_handler = options.remote_log;
  }
  globals.state = state;
  session_begin(globals, state);
}

function session_begin(globals: s_events_globals, state: s_events_state): void {
  const session: s_events_session_info = {
    number: (globals.session?.number ?? 0) + 1,
    name: state.config.name,
    version_string: state.config.version_string,
    started_ms: state.clock.now().getTime(),
  };
  globals.session = session;
  for (const listener of globals.session_listeners) {
    call_sink(state, "session listener", () => listener(session));
  }
}

export function events_dispose(): void {
  const globals = events_globals();
  const state = globals.state;
  if (!state) {
    return;
  }
  state.logs.close();
  if (state.exit_handler) {
    process.off("exit", state.exit_handler);
  }
  if (
    state.options.remote_log &&
    globals.remote_log_handler === state.options.remote_log
  ) {
    globals.remote_log_handler = undefined;
  }
  globals.state = undefined;
}

export function events_initialized(): boolean {
  return events_state() !== undefined;
}

// The datamine layer installs its bridge here; undefined removes it.
export function events_set_remote_log_handler(
  handler: t_event_remote_log_handler | undefined
): void {
  events_globals().remote_log_handler = handler;
}

export function events_remote_log_handler():
  | t_event_remote_log_handler
  | undefined {
  return events_globals().remote_log_handler;
}

// Taps every event that produced output, for the events server. Returns the remover. Lives
// across events_initialize and events_dispose.
export function events_capture_add(handler: t_event_capture): () => void {
  const { captures } = events_globals();
  captures.add(handler);
  return () => {
    captures.delete(handler);
  };
}

// Told whenever events_initialize runs. Returns the remover.
export function events_session_listener_add(
  listener: t_events_session_listener
): () => void {
  const { session_listeners } = events_globals();
  session_listeners.add(listener);
  return () => {
    session_listeners.delete(listener);
  };
}

export function events_session_current(): s_events_session_info | undefined {
  return events_globals().session;
}

export function events_enabled(enable: boolean): void {
  const state = events_state();
  if (!state) {
    return;
  }
  state.enable_events = enable;
  console_printf(state, `events now ${enable ? "enabled" : "disabled"}`);
}

export function events_disable_suppression(enable: boolean): void {
  const state = events_state();
  if (!state) {
    return;
  }
  state.disable_event_suppression = enable;
  // The wording is the original's, which reads backwards.
  console_printf(
    state,
    `event suppression now ${enable ? "enabled" : "disabled"}`
  );
}

export function events_spam_suppression_enable(enable: boolean): void {
  const state = events_state();
  if (!state) {
    return;
  }
  state.enable_spam_suppression = enable;
  console_printf(
    state,
    `event spam suppression now ${enable ? "enabled" : "disabled"}`
  );
}

// The text of the recent console lines, at most 2 KiB.
export function events_get(): string {
  return events_state()?.message_buffer ?? "";
}

export function events_clear(): void {
  const state = events_state();
  if (!state) {
    return;
  }
  state.logs.flush();
  state.message_buffer = "";
}

export function event_logs_flush(): void {
  events_state()?.logs.flush();
}

// Copies every log into the error snapshot directory. Returns the files written.
export function event_logs_snapshot(): string[] {
  return events_state()?.logs.snapshot() ?? [];
}

// ---------- levels and categories

// Script levels: 0 to 5 are the levels and 6 is none. The threshold -1 is accepted as none.
function event_level_from_hs_level(
  level: number
): t_event_level_threshold | undefined {
  if (
    !Number.isInteger(level) ||
    level < k_event_level_none ||
    level > k_event_level_count
  ) {
    return;
  }
  return level === k_event_level_count || level === k_event_level_none
    ? k_event_level_none
    : (level as e_event_level);
}

type t_global_level_key =
  | "debugger_break_level"
  | "display_level"
  | "log_level"
  | "remote_log_level";

function event_set_level_global(
  key: t_global_level_key,
  label: string,
  level: number
): void {
  const state = events_state();
  if (!state) {
    return;
  }
  const resolved = event_level_from_hs_level(level);
  if (resolved === undefined) {
    console_printf(state, `invalid ${label.replaceAll(" ", "_")} (${level})`);
    return;
  }
  state[key] = resolved;
  console_printf(state, `global ${label} set to ${event_level_name(resolved)}`);
}

export function event_set_display_level_global(level: number): void {
  event_set_level_global("display_level", "display level", level);
}

export function event_set_log_level_global(level: number): void {
  event_set_level_global("log_level", "log level", level);
}

export function event_set_remote_log_level_global(level: number): void {
  event_set_level_global("remote_log_level", "remote log level", level);
}

// Applies to every category that has no break level of its own.
export function event_set_debugger_break_level_global(level: number): void {
  event_set_level_global("debugger_break_level", "debugger break level", level);
}

function event_set_level_by_name(
  property: t_event_category_property,
  event_name: string,
  level: number
): void {
  const state = events_state();
  if (!state) {
    return;
  }
  const resolved = event_level_from_hs_level(level);
  if (resolved === undefined) {
    console_printf(state, `invalid ${property}_level (${level})`);
    return;
  }
  if (!state.table.set_property_by_name(event_name, property, resolved)) {
    return;
  }

  // The original lists every category it touched.
  const corrected = build_correct_category_name(event_name);
  const parsed = event_parse_categories(corrected);
  if (parsed.errors.length === 0 && !parsed.warning) {
    const start_index = state.table.find_category(corrected);
    if (start_index !== k_event_category_none) {
      for (const index of state.table.walk(start_index)) {
        console_printf(
          state,
          `set category: '${state.table.category_path(index)}'`
        );
      }
    }
  }
}

export function event_set_display_level_by_name(
  event_name: string,
  level: number
): void {
  event_set_level_by_name("display", event_name, level);
}

export function event_set_force_display_level_by_name(
  event_name: string,
  level: number
): void {
  event_set_level_by_name("force_display", event_name, level);
}

export function event_set_log_level_by_name(
  event_name: string,
  level: number
): void {
  event_set_level_by_name("log", event_name, level);
}

export function event_set_remote_log_level_by_name(
  event_name: string,
  level: number
): void {
  event_set_level_by_name("remote_log", event_name, level);
}

export function event_set_debugger_break_level_by_name(
  event_name: string,
  level: number
): void {
  event_set_level_by_name("debugger_break", event_name, level);
}

export function event_set_halt_level_by_name(
  event_name: string,
  level: number
): void {
  event_set_level_by_name("halt", event_name, level);
}

// Lists a category and everything below it. The name needs its trailing
// colon, as "networking:"; an empty name lists everything. Returns the dump text.
export function event_dump_categories(event_name = ""): string {
  const state = events_state();
  if (!state) {
    return "";
  }
  const rows = event_category_dump_rows(state.table, event_name);
  if (!rows) {
    event_internal(e_event_level.error, "category '%s' not found", [
      event_name,
    ]);
    return "";
  }
  event_internal(e_event_level.warning, "dumping categories:", []);
  const dump = format_category_dump(rows);
  for (const line of dump.split("\n")) {
    console_printf(state, line);
  }
  return dump;
}

// ---------- listeners

// Registers a listener for events in these categories and everything below them. Returns its
// slot, or -1 when events are not initialized or all slots are taken.
export function events_register_listener(
  categories: string,
  listener: t_event_listener
): number {
  const state = events_state();
  if (!state) {
    return -1;
  }
  const existing = state.listeners.findIndex(
    (slot) => slot?.listener === listener
  );
  if (existing >= 0) {
    return existing;
  }
  const index = state.listeners.indexOf(undefined);
  if (index < 0) {
    event_internal(
      e_event_level.warning,
      "couldn't register event listener",
      []
    );
    return -1;
  }
  state.listeners[index] = { categories, listener };
  state.table.set_listener_by_name(categories, index);
  return index;
}

export function events_unregister_listener(index: number): void {
  const state = events_state();
  if (!state?.listeners[index]) {
    return;
  }
  state.listeners[index] = undefined;
  // Only this slot's bit goes, the other listeners keep theirs.
  for (
    let category_index = 0;
    category_index < state.table.count;
    category_index++
  ) {
    const category = state.table.get(category_index);
    category.listener_mask = (category.listener_mask & ~(1 << index)) >>> 0;
  }
}

// ---------- raising events

export function event(
  level: e_event_level,
  format: string,
  ...args: t_printf_argument[]
): void {
  event_internal(level, format, args);
}

export function event_verbose(
  format: string,
  ...args: t_printf_argument[]
): void {
  event_internal(e_event_level.verbose, format, args);
}

export function event_status(
  format: string,
  ...args: t_printf_argument[]
): void {
  event_internal(e_event_level.status, format, args);
}

export function event_message(
  format: string,
  ...args: t_printf_argument[]
): void {
  event_internal(e_event_level.message, format, args);
}

export function event_warning(
  format: string,
  ...args: t_printf_argument[]
): void {
  event_internal(e_event_level.warning, format, args);
}

export function event_error(
  format: string,
  ...args: t_printf_argument[]
): void {
  event_internal(e_event_level.error, format, args);
}

export function event_critical(
  format: string,
  ...args: t_printf_argument[]
): void {
  event_internal(e_event_level.critical, format, args);
}

// Raises the event the first time this format string is seen.
export function event_once(
  level: e_event_level,
  format: string,
  ...args: t_printf_argument[]
): void {
  const state = events_state();
  if (!state || state.once_formats.has(format)) {
    return;
  }
  state.once_formats.add(format);
  event_internal(level, format, args);
}

// ---------- private code

function event_minimum_level(state: s_events_state): number {
  let minimum: number = state.table.minimum_level();
  for (const global_level of [
    state.display_level,
    state.log_level,
    state.remote_log_level,
    state.debugger_break_level,
  ]) {
    if (global_level !== k_event_level_none && global_level < minimum) {
      minimum = global_level;
    }
  }
  return minimum;
}

function event_internal(
  level: e_event_level,
  format: string,
  args: readonly t_printf_argument[]
): void {
  const state = events_state();
  if (!state || level < event_minimum_level(state)) {
    return;
  }

  // An event raised while one is being handled cannot go through the normal path.
  if (state.recursion_lock) {
    if (state.enable_events) {
      event_generate_handle_recursive(state, level, format, args);
    }
    return;
  }

  state.recursion_lock = true;
  try {
    if (state.enable_events) {
      event_generate(
        state,
        level,
        event_category_for_format(state, format),
        format,
        args
      );
    }
  } finally {
    state.recursion_lock = false;
  }
}

function event_category_for_format(
  state: s_events_state,
  format: string
): number {
  let category_index = state.category_cache.get(format);
  if (category_index === undefined) {
    category_index = state.table.category_index_from_format(format, true);
    if (category_index !== k_event_category_none) {
      if (state.category_cache.size >= k_category_cache_maximum_size) {
        state.category_cache.clear();
      }
      state.category_cache.set(format, category_index);
    }
  }
  return category_index;
}

// Parse failures and a full category table are raised the way the original does it.
function events_category_message(
  kind: "error" | "warning" | "console",
  text: string
): void {
  const state = events_state();
  if (!state) {
    return;
  }
  if (kind === "console") {
    console_printf(state, text);
  } else {
    event_internal(
      kind === "error" ? e_event_level.error : e_event_level.warning,
      "%s",
      [text]
    );
  }
}

function console_printf(state: s_events_state, text: string): void {
  state.sinks.display?.(text, e_event_level.message, k_color_white);
}

function call_sink(
  state: s_events_state,
  name: string,
  callback: () => void
): void {
  try {
    callback();
  } catch (error) {
    state.sinks.debug_output?.(
      `${name} threw: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// The text the debugger break and halt sinks get.
function critical_event_message(text: string): string {
  return csnzprintf(
    k_error_message_buffer_maximum_size,
    "critical event encountered: %s",
    [text]
  );
}

function event_global_levels(state: s_events_state): s_event_global_levels {
  return {
    display: state.display_level,
    log: state.log_level,
    remote_log: state.remote_log_level,
    debugger_break: state.debugger_break_level,
  };
}

function event_generate(
  state: s_events_state,
  level: e_event_level,
  category_index: number,
  format: string,
  args: readonly t_printf_argument[]
): void {
  let response = event_query(
    state.table,
    category_index,
    level,
    event_global_levels(state)
  );
  if (response === 0) {
    return;
  }

  const text = csnzprintf(k_error_message_buffer_maximum_size, format, args);

  if (
    state.enable_spam_suppression &&
    category_index !== k_event_category_none
  ) {
    response = state.spam.update(
      state.table.get(category_index),
      level,
      response,
      text,
      state.clock.milliseconds()
    );
    if (response === 0) {
      return;
    }
  }

  if (
    event_response_test(
      response,
      e_event_response.console | e_event_response.console_force
    )
  ) {
    event_generated_handle_console(
      state,
      level,
      category_index,
      text,
      event_response_test(response, e_event_response.console_force)
    );
  }
  event_generated_handle_log(state, level, category_index, text, response);
  if (event_response_test(response, e_event_response.remote_log)) {
    event_generated_handle_remote_log(
      state,
      level,
      format,
      args,
      text,
      category_index
    );
  }
  if (event_response_test(response, e_event_response.break_into_debugger)) {
    const message = critical_event_message(text);
    call_sink(state, "debugger_break sink", () =>
      state.sinks.debugger_break?.(message)
    );
  }
  if (event_response_test(response, e_event_response.halt)) {
    const message = critical_event_message(text);
    call_sink(state, "halt sink", () => state.sinks.halt?.(message));
  }
  event_generated_handle_listeners(state, level, category_index, text);
  event_generated_handle_captures(
    state,
    level,
    category_index,
    format,
    args,
    text
  );
  state.event_index++;
}

function event_generated_handle_captures(
  state: s_events_state,
  level: e_event_level,
  category_index: number,
  format: string,
  args: readonly t_printf_argument[],
  text: string
): void {
  const { captures, session } = events_globals();
  if (captures.size === 0) {
    return;
  }
  const record: s_event_capture_record = {
    level,
    category_path: event_category_path(state, category_index),
    format,
    args,
    text,
    context: event_context_get("log"),
    time_ms: state.clock.now().getTime(),
    thread_id: state.providers.thread_id?.() ?? threadId,
    game_time: state.providers.game_time?.(),
    frame_index: state.providers.frame_index?.(),
    session: session?.number ?? 0,
  };
  for (const capture of captures) {
    call_sink(state, "event capture", () => capture(record));
  }
}

function event_category_path(
  state: s_events_state,
  category_index: number
): string {
  return category_index === k_event_category_none
    ? ""
    : state.table.category_path(category_index);
}

function event_generated_handle_console(
  state: s_events_state,
  level: e_event_level,
  category_index: number,
  text: string,
  forced: boolean
): void {
  const shown_level = forced ? e_event_level.critical : level;
  const line = format_console_line(
    {
      level: shown_level,
      text,
      forced,
      context: event_context_get("console"),
    },
    state.config.layout
  );
  write_to_console(state, shown_level, category_index, line);
}

function write_to_console(
  state: s_events_state,
  level: e_event_level,
  category_index: number,
  line: string
): void {
  let suppress_console = false;
  if (state.enable_spam_suppression && level !== e_event_level.critical) {
    const result = state.console_limiter.update(state.clock.milliseconds());
    suppress_console = !result.print;
    if (result.notice !== undefined) {
      state.sinks.display?.(
        result.notice,
        e_event_level.message,
        k_color_white
      );
    }
  }

  state.sinks.debug_output?.(line);
  if (suppress_console) {
    return;
  }

  const shown = console_line_truncate(line);
  let color = k_color_white;
  if (level === e_event_level.critical) {
    color = k_color_red;
  } else if (category_index !== k_event_category_none) {
    color = state.table.get(category_index).display_color;
  }
  call_sink(state, "display sink", () =>
    state.sinks.display?.(shown, level, color)
  );
  // A line that fills the console limit loses the end of its line ending.
  const entry = `${shown}\r\n`;
  message_buffer_append(
    state,
    shown.length >= k_event_console_line_maximum_length
      ? entry.slice(0, k_event_console_line_maximum_length)
      : entry
  );
}

// events_get keeps the newest lines. When one will not fit, the oldest go and the buffer
// starts with a marker instead.
function message_buffer_append(state: s_events_state, entry: string): void {
  const size = state.message_buffer.length;
  if (size + entry.length >= k_error_message_buffer_maximum_size) {
    const prefix = k_message_buffer_overflow_prefix;
    const start = Math.max(
      Math.min(prefix.length + 1024 + entry.length, size - 1),
      0
    );
    const newline = state.message_buffer.indexOf("\n", start);
    const copy_index = newline < 0 ? size : newline + 1;
    state.message_buffer = prefix + state.message_buffer.slice(copy_index);
  }
  if (
    state.message_buffer.length + entry.length <
    k_error_message_buffer_maximum_size
  ) {
    state.message_buffer += entry;
  }
}

function event_log_line(
  state: s_events_state,
  level: e_event_level,
  category_index: number,
  text: string
): s_event_log_line {
  return {
    date: state.clock.now(),
    event_index: state.event_index,
    level,
    category_path: event_category_path(state, category_index),
    text,
    context: event_context_get("log"),
    game_time: state.providers.game_time?.(),
    frame_index: state.providers.frame_index?.(),
    thread_id: state.providers.thread_id?.() ?? threadId,
  };
}

function log_line_format(
  state: s_events_state,
  line: s_event_log_line
): string {
  return format_event_for_log(line, state.config.layout, state.config.date_utc);
}

function event_generated_handle_log(
  state: s_events_state,
  level: e_event_level,
  category_index: number,
  text: string,
  response: t_event_response_flags
): void {
  const line = event_log_line(state, level, category_index, text);
  const files: s_event_log_file[] = [];
  let category_has_log = false;

  if (category_index !== k_event_category_none) {
    const category = state.table.get(category_index);
    const { log_name } = category;
    category_has_log = log_name !== undefined && log_name.length > 0;
    if (log_name && event_response_test(response, e_event_response.log)) {
      const category_file: s_event_log_file = {
        name: log_name,
        append_to_file: state.config.append,
      };
      if (category.log_format === "netbuf") {
        // The category's own file also gets the session timestamps.
        const custom_prefix = build_networking_buffer_for_log(
          state.providers.network_session_clocks?.() ?? []
        );
        state.logs.write(
          [category_file],
          log_line_format(state, { ...line, custom_prefix })
        );
      } else {
        files.push(category_file);
      }
    }
  }

  const routed: s_routed_event = {
    level,
    response,
    category_index,
    category_has_log,
    global_log_level: state.log_level,
  };
  for (const definition of state.log_definitions) {
    if (event_log_route_matches(definition.route, routed)) {
      files.push(definition);
    }
  }
  if (files.length > 0) {
    state.logs.write(files, log_line_format(state, line));
  }
}

function event_generated_handle_remote_log(
  state: s_events_state,
  level: e_event_level,
  format: string,
  args: readonly t_printf_argument[],
  text: string,
  category_index: number
): void {
  const handler = events_globals().remote_log_handler;
  if (!handler) {
    return;
  }
  const record: s_event_remote_record = {
    level,
    format,
    args,
    text,
    category_path: event_category_path(state, category_index),
    categories: event_parse_categories(format).names,
    context: event_context_get("remote_log"),
  };
  call_sink(state, "remote log handler", () => handler(record));
}

// Every registered slot whose categories cover the event's, not just the leading ones.
function event_generated_handle_listeners(
  state: s_events_state,
  level: e_event_level,
  category_index: number,
  text: string
): void {
  if (category_index === k_event_category_none) {
    return;
  }
  const mask = state.table.get(category_index).listener_mask;
  const category_path = event_category_path(state, category_index);
  for (let index = 0; index < state.listeners.length; index++) {
    const slot = state.listeners[index];
    if (slot && (mask & (1 << index)) !== 0) {
      call_sink(state, "event listener", () =>
        slot.listener({ level, text, category_path })
      );
    }
  }
}

// Appends a marker to the text of a thrown away event, within the log line limit.
function event_text_mark(text: string, mark: string): string {
  return `${text}${mark}`.slice(0, k_event_log_line_maximum_length);
}

// An event raised while another is handled goes to thrown_away_events.txt and debug output
// only, marked with what it missed.
function event_generate_handle_recursive(
  state: s_events_state,
  level: e_event_level,
  format: string,
  args: readonly t_printf_argument[]
): void {
  const category_index =
    state.category_cache.get(format) ?? k_event_category_none;
  const response = event_query(
    state.table,
    category_index,
    level,
    event_global_levels(state)
  );
  if (response === 0) {
    return;
  }

  let text = csnzprintf(k_error_message_buffer_maximum_size, format, args);
  if (event_response_test(response, e_event_response.remote_log)) {
    text = event_text_mark(text, "(!datamined)");
  }
  if (event_response_test(response, e_event_response.log)) {
    text = event_text_mark(text, "(!logged)");
  }

  const line = log_line_format(
    state,
    event_log_line(state, level, category_index, text)
  );
  if (!state.logs.write_thrown_away(line)) {
    text = event_text_mark(text, "(!logged)");
  }
  call_sink(state, "debug_output sink", () => state.sinks.debug_output?.(text));
}
