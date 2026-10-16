import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { join } from "node:path";
import {
  data_mine_config_resolve,
  k_data_mine_file_extension,
  k_untracked_build_number,
  type s_data_mine_config,
  type s_data_mine_config_options,
} from "../../config/data_mine_options.ts";
import {
  c_datamine_definition_file_state,
  c_datamine_definition_registry,
} from "../../data_mine_definitions.ts";
import { DatamineError } from "../../datamine_error.ts";
import { datamine_globals_get } from "../../datamine_globals.ts";
import {
  http_transport_select,
  type s_http_endpoint,
  type t_http_transport,
  type t_http_version,
} from "../../transport/http_transport.ts";
import { event } from "../cseries/cseries_events.ts";
import {
  filetime_from_date,
  k_system_clock,
  type s_clock,
} from "../cseries/cseries_time.ts";
import {
  event_remote_bridge_install,
  event_remote_bridge_remove,
  type s_event_bridge_providers,
} from "../cseries/event_data_mine_bridge.ts";
import { e_event_level } from "../cseries/event_levels.ts";
import {
  netdebug_build_sessionid,
  netdebug_default_system_id,
} from "../networking/tools/network_debug_dump.ts";
import { c_network_webstats } from "../networking/tools/network_webstats.ts";
import {
  encode_data_mine_header,
  encode_datamine_event_record,
} from "./data_mine_formats.ts";
import {
  c_datamine,
  data_mining_configure,
  type s_datamine_game_info,
  type s_datamine_record,
} from "./data_mining.ts";

// Writes are coalesced in memory and go to disk when the buffer fills, every second, and on rotation.
const k_data_mine_buffer_size = 0x1_00_00;
const k_data_mine_buffer_flush_milliseconds = 1000;
// A rotation slower than this is reported, as Bungie does.
const k_data_mine_slow_rotation_milliseconds = 100;
const k_data_mine_rand_mask = 0x7f_ff;

export interface s_data_mine_initialize_options
  extends s_data_mine_config_options {
  clock?: s_clock;
  // Off until a consumer turns it on, as in Bungie's builds.
  enabled?: boolean;
  endpoint?: s_http_endpoint;
  game_info?: () => s_datamine_game_info;
  // The request writer for uploads: "1.0" writes the exact bytes the games send, "1.1" goes
  // through fetch. The layout picks one when this is left out.
  http_version?: t_http_version;
  // Flush the buffer synchronously when the process exits.
  install_exit_flush?: boolean;
  // Squad, target and group session for the events bridge; zeros when left out.
  network_session_ids?: s_event_bridge_providers["network_session_ids"];
  // 15 bit random numbers for file names; Math.random based by default.
  rand?: () => number;
  root: string;
  rotate_bytes?: number;
  rotate_interval_ms?: number;
  session_id?: string;
  system_id?: string;
  transport?: t_http_transport;
  upload_interval_ms?: number;
}

export interface s_data_mine_upload_options {
  signal?: AbortSignal;
}

export interface s_data_mine_upload_result {
  deleted_empty: number;
  failed: number;
  uploaded: number;
}

function upload_result_empty(): s_data_mine_upload_result {
  return { uploaded: 0, failed: 0, deleted_empty: 0 };
}

interface s_data_mine_globals {
  buffer: Buffer;
  buffer_length: number;
  clock: s_clock;
  config: s_data_mine_config;
  current_file: string | undefined;
  directory: string;
  enabled: boolean;
  endpoint: s_http_endpoint | undefined;
  exit_handler: (() => void) | undefined;
  fd: number | undefined;
  file_bytes: number;
  file_records: number;
  file_state: c_datamine_definition_file_state;
  flush_timer: NodeJS.Timeout | undefined;
  initialized: boolean;
  rand: () => number;
  registry: c_datamine_definition_registry;
  rotate_bytes: number | undefined;
  rotate_timer: NodeJS.Timeout | undefined;
  session_id: string;
  session_start_date: bigint;
  system_id: string;
  transport: t_http_transport | undefined;
  upload_promise: Promise<s_data_mine_upload_result> | undefined;
  upload_timer: NodeJS.Timeout | undefined;
  webstats: c_network_webstats;
}

function rand_default(): number {
  return Math.floor(Math.random() * (k_data_mine_rand_mask + 1));
}

// The datamine's own reports are events, as in Bungie's code. The text is already formatted.
function data_mine_event(level: number, text: string): void {
  event(level as e_event_level, text.replaceAll("%", "%%"));
}

function globals_create(): s_data_mine_globals {
  return {
    initialized: false,
    enabled: false,
    config: data_mine_config_resolve({}),
    clock: k_system_clock,
    rand: rand_default,
    directory: "",
    session_id: "",
    system_id: "",
    session_start_date: 0n,
    endpoint: undefined,
    transport: undefined,
    rotate_bytes: undefined,
    registry: new c_datamine_definition_registry(),
    file_state: new c_datamine_definition_file_state(),
    fd: undefined,
    current_file: undefined,
    file_bytes: 0,
    file_records: 0,
    buffer: Buffer.alloc(k_data_mine_buffer_size),
    buffer_length: 0,
    flush_timer: undefined,
    rotate_timer: undefined,
    upload_timer: undefined,
    exit_handler: undefined,
    upload_promise: undefined,
    webstats: new c_network_webstats(),
  };
}

function globals(): s_data_mine_globals {
  return datamine_globals_get("data_mine", globals_create);
}

function write_error_report(state: s_data_mine_globals, error: unknown): void {
  data_mine_event(
    e_event_level.error,
    `datamine: failed to write '${state.current_file}': ${(error as Error).message}`
  );
}

// Pushes the buffered bytes to the file. Errors are reported and the bytes dropped.
function buffer_flush(state: s_data_mine_globals): void {
  if (state.fd === undefined || state.buffer_length === 0) {
    return;
  }
  const length = state.buffer_length;
  state.buffer_length = 0;
  try {
    let offset = 0;
    while (offset < length) {
      offset += writeSync(state.fd, state.buffer, offset, length - offset);
    }
  } catch (error) {
    write_error_report(state, error);
  }
}

function buffer_write(state: s_data_mine_globals, bytes: Buffer): void {
  state.file_bytes += bytes.length;
  if (bytes.length > state.buffer.length - state.buffer_length) {
    buffer_flush(state);
  }
  if (bytes.length >= state.buffer.length) {
    // Too big to coalesce; put it straight through.
    state.buffer_length = 0;
    try {
      writeSync(state.fd as number, bytes);
    } catch (error) {
      write_error_report(state, error);
    }
    return;
  }
  bytes.copy(state.buffer, state.buffer_length);
  state.buffer_length += bytes.length;
}

function header_write(state: s_data_mine_globals): void {
  const { config } = state;
  const extra = config.header_extra ?? {};
  buffer_write(
    state,
    encode_data_mine_header(
      {
        layout: config.layout,
        byte_order: config.byte_order,
        sessionid: state.session_id,
        build_string: config.build_string,
        build_number: config.build_number,
        systemid: state.system_id,
        title: config.title,
        session_start_date: state.session_start_date,
        ...extra,
      },
      config.text_encoding
    )
  );
}

function file_path_pick(state: s_data_mine_globals): string {
  let path: string;
  do {
    path = join(state.directory, state.config.file_name(state.rand));
  } while (existsSync(path));
  return path;
}

// Opens a fresh file and writes the header. False when the file can't be created.
function file_open_next(state: s_data_mine_globals): boolean {
  const path = file_path_pick(state);
  try {
    mkdirSync(state.directory, { recursive: true });
    state.fd = openSync(path, "w");
  } catch (error) {
    state.fd = undefined;
    state.current_file = undefined;
    data_mine_event(
      e_event_level.error,
      `datamine: failed to create '${path}': ${(error as Error).message}`
    );
    return false;
  }
  state.current_file = path;
  state.file_bytes = 0;
  state.file_records = 0;
  state.file_state.reset();
  header_write(state);
  return true;
}

function file_close(state: s_data_mine_globals): void {
  if (state.fd === undefined) {
    return;
  }
  buffer_flush(state);
  try {
    closeSync(state.fd);
  } catch (error) {
    data_mine_event(
      e_event_level.error,
      `datamine: failed to close '${state.current_file}': ${(error as Error).message}`
    );
  }
  state.fd = undefined;
}

function timers_clear(state: s_data_mine_globals): void {
  clearInterval(state.flush_timer);
  clearInterval(state.rotate_timer);
  clearInterval(state.upload_timer);
  state.flush_timer = undefined;
  state.rotate_timer = undefined;
  state.upload_timer = undefined;
}

function timer_create(callback: () => void, interval: number): NodeJS.Timeout {
  const timer = setInterval(callback, interval);
  timer.unref();
  return timer;
}

function error_report(state: s_data_mine_globals, error: unknown): void {
  data_mine_event(
    e_event_level.error,
    `datamine: ${error instanceof Error ? error.message : String(error)}`
  );
}

export function data_mine_initialize(
  options: s_data_mine_initialize_options
): boolean {
  const state = globals();
  if (state.initialized) {
    throw new DatamineError("data_mine_initialize: already initialized");
  }

  const config = data_mine_config_resolve(options, options.http_version);
  const clock = options.clock ?? k_system_clock;
  const start = clock.now();
  const system_id = options.system_id ?? netdebug_default_system_id();

  state.config = config;
  state.clock = clock;
  state.rand = options.rand ?? rand_default;
  state.directory = join(options.root, config.directory);
  state.enabled = options.enabled ?? false;
  state.endpoint = options.endpoint;
  state.transport = options.transport;
  state.rotate_bytes = options.rotate_bytes;
  state.system_id = system_id;
  state.session_start_date = filetime_from_date(start);
  state.session_id =
    options.session_id ??
    netdebug_build_sessionid(
      start,
      system_id,
      config.behaviour.session_id_sequence ? 1 : undefined
    );
  state.registry = new c_datamine_definition_registry({
    first_definition_id: config.behaviour.first_definition_id,
    maximum_registered_events: config.behaviour.maximum_registered_events,
    on_error: (message) => data_mine_event(e_event_level.error, message),
  });
  state.buffer_length = 0;
  state.webstats = new c_network_webstats();
  state.upload_promise = undefined;

  if (!file_open_next(state)) {
    return false;
  }

  data_mining_configure({
    commit: data_mine_insert_record,
    on_error: (message) => data_mine_event(e_event_level.error, message),
    clock,
    event_index_start: config.behaviour.event_index_start,
    format: {
      signature_strip_trailing_separator:
        config.behaviour.signature_strip_trailing_separator,
      ...(options.args_mode ? { args_mode: options.args_mode } : {}),
    },
    ...(options.game_info ? { game_info: options.game_info } : {}),
  });

  state.initialized = true;
  event_remote_bridge_install({
    settings: config.bridge,
    providers: { network_session_ids: options.network_session_ids },
    enabled: data_mine_enabled,
  });
  state.flush_timer = timer_create(
    () => buffer_flush(state),
    k_data_mine_buffer_flush_milliseconds
  );
  if (options.rotate_interval_ms) {
    state.rotate_timer = timer_create(() => {
      // Nothing to gain from rotating a file that only holds its header.
      if (state.enabled && state.file_records > 0) {
        data_mine_flush();
      }
    }, options.rotate_interval_ms);
  }
  if (
    options.upload_interval_ms &&
    state.config.build_number !== k_untracked_build_number
  ) {
    state.upload_timer = timer_create(() => {
      data_mine_upload().catch((error: unknown) => error_report(state, error));
    }, options.upload_interval_ms);
  }
  if (options.install_exit_flush ?? true) {
    state.exit_handler = () => buffer_flush(state);
    process.on("exit", state.exit_handler);
  }
  return true;
}

// Flushes the tail so nothing is lost, which Bungie's dispose does not do. Does not upload.
export function data_mine_dispose(): void {
  const state = globals();
  timers_clear(state);
  if (state.exit_handler) {
    process.off("exit", state.exit_handler);
    state.exit_handler = undefined;
  }
  event_remote_bridge_remove();
  data_mining_configure({ commit: undefined, on_error: undefined });
  file_close(state);
  state.initialized = false;
}

export function data_mine_enable(setting: boolean): void {
  globals().enabled = setting;
}

export function data_mine_enabled(): boolean {
  const state = globals();
  return state.initialized && state.enabled;
}

// Where uploads go. Undefined turns uploading off.
export function data_mine_set_endpoint(
  endpoint: s_http_endpoint | undefined
): void {
  globals().endpoint = endpoint;
}

export function data_mine_session_id(): string {
  return globals().session_id;
}

export function data_mine_initialized(): boolean {
  return globals().initialized;
}

export function data_mine_system_id(): string {
  return globals().system_id;
}

export function data_mine_build_string(): string {
  return globals().config.build_string;
}

export function data_mine_current_file(): string | undefined {
  const state = globals();
  return state.initialized ? state.current_file : undefined;
}

export function data_mine_uploading_files(): boolean {
  return globals().upload_promise !== undefined;
}

// The commit hook for c_datamine, and the entry point for an events bridge.
export function data_mine_insert_record(record: s_datamine_record): void {
  const state = globals();
  if (!(state.initialized && state.enabled) || state.fd === undefined) {
    return;
  }

  const { config } = state;
  if (config.layout === "3.1") {
    for (const bytes of state.file_state.encode_record_v3(
      record,
      state.registry,
      config.byte_order
    )) {
      buffer_write(state, bytes);
    }
  } else {
    buffer_write(
      state,
      encode_datamine_event_record(
        record,
        config.byte_order,
        config.text_encoding
      )
    );
  }
  state.file_records++;

  if (
    state.rotate_bytes !== undefined &&
    state.file_bytes >= state.rotate_bytes
  ) {
    data_mine_flush();
  }
}

// The generic text record. Bungie's version drops the text; this one keeps it.
export function data_mine_insert(text: string): void {
  const datamine = new c_datamine(0, "generic text", ["test"]);
  datamine.add_string("text", text);
  datamine.commit();
}

// Closes the current file and starts the next one. This is the only rotation there is.
export function data_mine_flush(): void {
  const state = globals();
  if (!(state.initialized && state.enabled)) {
    return;
  }

  const start = state.clock.milliseconds();
  file_close(state);
  if (!file_open_next(state)) {
    state.initialized = false;
  }
  const elapsed = Math.round(state.clock.milliseconds() - start);
  if (elapsed > k_data_mine_slow_rotation_milliseconds) {
    data_mine_event(
      e_event_level.error,
      `datamine: data_min_flush took ${elapsed} msecs to rotate the datamine files`
    );
  }
}

function uploadable_files(state: s_data_mine_globals): string[] {
  try {
    return readdirSync(state.directory)
      .filter((name) => name.endsWith(k_data_mine_file_extension))
      .sort()
      .map((name) => join(state.directory, name));
  } catch {
    return [];
  }
}

function file_delete(state: s_data_mine_globals, path: string): boolean {
  try {
    unlinkSync(path);
    return true;
  } catch (error) {
    data_mine_event(
      e_event_level.warning,
      `datamine: failed to delete '${path}': ${(error as Error).message}`
    );
    return false;
  }
}

async function upload_files(
  state: s_data_mine_globals,
  options: s_data_mine_upload_options
): Promise<s_data_mine_upload_result> {
  const result = upload_result_empty();
  if (!state.endpoint) {
    throw new DatamineError("data_mine_upload: no upload endpoint configured");
  }
  if (state.config.build_number === k_untracked_build_number) {
    throw new DatamineError(
      "data_mine_upload: untracked builds (build number -1) can't upload datamine"
    );
  }
  const endpoint = state.endpoint;
  const transport = http_transport_select({
    transport: state.transport,
    http_version: state.config.upload.http_version,
  });

  // The file being written has to be closed before it can go; skip the rotation if it holds nothing.
  if (state.file_records > 0) {
    data_mine_flush();
  }

  for (const path of uploadable_files(state)) {
    if (path === state.current_file) {
      continue;
    }
    let size: number;
    try {
      size = statSync(path).size;
    } catch {
      continue;
    }
    if (size === 0) {
      if (file_delete(state, path)) {
        result.deleted_empty++;
      }
      continue;
    }

    const accepted = await state.webstats.submit_file(path, {
      upload: state.config.upload,
      endpoint,
      transport,
      clock: state.clock,
      on_event: data_mine_event,
      signal: options.signal,
    });
    if (!accepted) {
      result.failed++;
      data_mine_event(
        e_event_level.warning,
        `datamine: failed to upload file '${path}', cancelling uploading.  will retry later.`
      );
      break;
    }
    data_mine_event(
      e_event_level.message,
      `datamine: file '${path}' uploaded successfully`
    );
    file_delete(state, path);
    result.uploaded++;
  }
  return result;
}

// Sends every finished file to the endpoint, deleting each one once it is accepted.
// Callers that arrive while an upload is running share its promise.
export function data_mine_upload(
  options: s_data_mine_upload_options = {}
): Promise<s_data_mine_upload_result> {
  const state = globals();
  if (state.upload_promise) {
    return state.upload_promise;
  }
  if (!data_mine_enabled()) {
    return Promise.resolve(upload_result_empty());
  }

  const promise = upload_files(state, options).finally(() => {
    if (state.upload_promise === promise) {
      state.upload_promise = undefined;
    }
  });
  state.upload_promise = promise;
  return promise;
}
