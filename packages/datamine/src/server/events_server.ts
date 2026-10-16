// Live event server: events that produced output are kept in a ring buffer and streamed to
// viewers over Server-Sent Events. Routes under the path prefix:
//   GET <prefix>/info    the hello as JSON
//   GET <prefix>/events  text/event-stream: hello, backlog entries, then live entries
// The capture state is shared by the standalone server and any embedded handlers, and lives in
// the datamine globals, so it doesn't matter whether events_initialize ran first.

import { randomBytes } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import {
  events_capture_add,
  events_session_current,
  events_session_listener_add,
  type s_event_capture_record,
  type s_events_session_info,
} from "../blam/cseries/cseries_events.ts";
import { e_event_level } from "../blam/cseries/event_levels.ts";
import {
  data_mine_build_string,
  data_mine_initialized,
  data_mine_session_id,
  data_mine_system_id,
} from "../blam/data_mining/data_mine_management.ts";
import { c_datamine } from "../blam/data_mining/data_mining.ts";
import { DatamineError } from "../datamine_error.ts";
import { datamine_globals_get } from "../datamine_globals.ts";
import type {
  s_events_server_entry,
  s_events_server_hello,
  s_events_server_parameter,
  s_events_server_session,
} from "./events_server_protocol.ts";

export const k_events_server_protocol_version = 1;
export const k_events_server_default_path_prefix = "/datamine";
export const k_events_server_default_backlog = 10_000;
export const k_events_server_heartbeat_milliseconds = 15_000;
// A client with this much unsent data that won't drain is dropped.
export const k_events_server_client_buffer_limit = 4 * 1024 * 1024;
// Sessions remembered, for the dividers in a backlog.
const k_session_history_maximum = 64;

const k_trailing_slashes_regex = /\/+$/;

export interface s_events_server_options {
  // Ring buffer entries kept. Fixed when the capture state is first created.
  backlog?: number;
  // Bytes a client may have queued before it is dropped.
  client_buffer_limit?: number;
  // Milliseconds between `: ping` comments.
  heartbeat_ms?: number;
  host?: string;
  // Events below this level are not captured.
  minimum_level?: e_event_level;
  path_prefix?: string;
  // 0 picks a free port.
  port?: number;
}

export interface s_events_server_address {
  host: string;
  port: number;
  url: string;
}

export type t_events_server_handler = (
  req: IncomingMessage,
  res: ServerResponse,
  next?: (error?: unknown) => void
) => boolean;

// The part of a response a client needs, so the drop logic can be tested without a socket.
export interface s_events_server_stream {
  destroy(): void;
  end(): void;
  readonly writableLength: number;
  readonly writableNeedDrain: boolean;
  write(chunk: string): boolean;
}

export class c_events_server_client {
  private m_closed = false;
  private readonly m_stream: s_events_server_stream;
  private readonly m_buffer_limit: number;
  private readonly m_on_close: (client: c_events_server_client) => void;

  constructor(
    stream: s_events_server_stream,
    buffer_limit: number,
    on_close: (client: c_events_server_client) => void
  ) {
    this.m_stream = stream;
    this.m_buffer_limit = buffer_limit;
    this.m_on_close = on_close;
  }

  get closed(): boolean {
    return this.m_closed;
  }

  // Never throws and never waits. A client that stays backed up past the limit is cut off.
  send(message: string): void {
    if (this.m_closed) {
      return;
    }
    try {
      this.m_stream.write(message);
    } catch {
      this.drop();
      return;
    }
    if (
      this.m_stream.writableNeedDrain &&
      this.m_stream.writableLength > this.m_buffer_limit
    ) {
      this.drop();
    }
  }

  // Cuts the client off without flushing.
  drop(): void {
    if (this.close()) {
      try {
        this.m_stream.destroy();
      } catch {
        // already gone
      }
    }
  }

  // The peer went away on its own.
  disconnected(): void {
    this.close();
  }

  // Finishes the response politely.
  end(): void {
    if (this.close()) {
      try {
        this.m_stream.end();
      } catch {
        // already gone
      }
    }
  }

  private close(): boolean {
    if (this.m_closed) {
      return false;
    }
    this.m_closed = true;
    this.m_on_close(this);
    return true;
  }
}

interface s_buffered_entry {
  json: string;
  session: number;
}

interface s_events_server_state {
  backlog: number;
  buffer: (s_buffered_entry | undefined)[];
  buffer_limit: number;
  clients: Set<c_events_server_client>;
  heartbeat: NodeJS.Timeout | undefined;
  minimum_level: e_event_level;
  // Index the next entry gets, which is also how many were ever captured.
  next_index: number;
  removers: (() => void)[];
  run_id: string;
  server: Server | undefined;
  sessions: s_events_server_session[];
}

interface s_events_server_globals {
  state: s_events_server_state | undefined;
}

function events_server_globals(): s_events_server_globals {
  return datamine_globals_get<s_events_server_globals>("events_server", () => ({
    state: undefined,
  }));
}

function events_server_state(): s_events_server_state | undefined {
  return events_server_globals().state;
}

// ---------- messages

function sse_message(name: string, data: string, id?: number): string {
  return `${id === undefined ? "" : `id: ${id}\n`}event: ${name}\ndata: ${data}\n\n`;
}

function parameter_value(value: number | bigint | string): number | string {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return typeof value === "number" && !Number.isFinite(value)
    ? String(value)
    : value;
}

function entry_parameters(
  record: s_event_capture_record
): s_events_server_parameter[] {
  if (record.args.length === 0) {
    return [];
  }
  return c_datamine
    .parameters_from_args(record.format, record.args)
    .map((parameter) => ({
      name: parameter.name,
      type: parameter.type,
      value: parameter_value(parameter.value),
    }));
}

function entry_build(
  index: number,
  record: s_event_capture_record
): s_events_server_entry {
  const entry: s_events_server_entry = {
    index,
    time_ms: record.time_ms,
    level: record.level,
    category_path: record.category_path,
    text: record.text,
    thread_id: record.thread_id,
    session: record.session,
  };
  if (record.context.length > 0) {
    entry.context = record.context;
  }
  if (record.game_time !== undefined) {
    entry.game_time = record.game_time;
  }
  if (record.frame_index !== undefined) {
    entry.frame_index = record.frame_index;
  }
  const parameters = entry_parameters(record);
  if (parameters.length > 0) {
    entry.parameters = parameters;
  }
  return entry;
}

function datamine_session_id(): string | undefined {
  if (!data_mine_initialized()) {
    return;
  }
  const id = data_mine_session_id();
  return id.length > 0 ? id : undefined;
}

function session_message_data(
  session: s_events_session_info
): s_events_server_session {
  const data: s_events_server_session = {
    number: session.number,
    version: session.version_string,
    started_ms: session.started_ms,
  };
  const session_id = datamine_session_id();
  if (session_id !== undefined) {
    data.session_id = session_id;
  }
  return data;
}

function hello_build(state: s_events_server_state): s_events_server_hello {
  const session = events_session_current();
  const hello: s_events_server_hello = {
    protocol: k_events_server_protocol_version,
    run_id: state.run_id,
    version_string: session?.version_string ?? "",
    started_ms: session?.started_ms ?? 0,
    session_number: session?.number ?? 0,
    backlog_count: Math.min(state.next_index, state.backlog),
    entry_count: state.next_index,
  };
  if (data_mine_initialized()) {
    const session_id = datamine_session_id();
    if (session_id !== undefined) {
      hello.session_id = session_id;
    }
    const system_id = data_mine_system_id();
    if (system_id.length > 0) {
      hello.system_id = system_id;
    }
    const build_string = data_mine_build_string();
    if (build_string.length > 0) {
      hello.build_string = build_string;
    }
  }
  if (session?.name !== undefined) {
    hello.name = session.name;
  }
  return hello;
}

// ---------- capture

function capture_entry(
  state: s_events_server_state,
  record: s_event_capture_record
): void {
  if (record.level < state.minimum_level) {
    return;
  }
  const index = state.next_index++;
  const json = JSON.stringify(entry_build(index, record));
  state.buffer[index % state.backlog] = { json, session: record.session };
  if (state.clients.size > 0) {
    const message = sse_message("entry", json, index);
    for (const client of [...state.clients]) {
      client.send(message);
    }
  }
}

function capture_session(
  state: s_events_server_state,
  session: s_events_session_info
): void {
  const data = session_message_data(session);
  state.sessions.push(data);
  if (state.sessions.length > k_session_history_maximum) {
    state.sessions.shift();
  }
  const message = sse_message("session", JSON.stringify(data));
  for (const client of [...state.clients]) {
    client.send(message);
  }
}

function capture_ensure(
  options: s_events_server_options
): s_events_server_state {
  const globals = events_server_globals();
  const existing = globals.state;
  if (existing) {
    if (options.minimum_level !== undefined) {
      existing.minimum_level = options.minimum_level;
    }
    if (options.client_buffer_limit !== undefined) {
      existing.buffer_limit = options.client_buffer_limit;
    }
    return existing;
  }

  const backlog = Math.max(
    1,
    Math.floor(options.backlog ?? k_events_server_default_backlog)
  );
  const state: s_events_server_state = {
    backlog,
    buffer: new Array(backlog).fill(undefined),
    buffer_limit:
      options.client_buffer_limit ?? k_events_server_client_buffer_limit,
    clients: new Set(),
    heartbeat: undefined,
    minimum_level: options.minimum_level ?? e_event_level.verbose,
    next_index: 0,
    removers: [],
    run_id: randomBytes(8).toString("hex"),
    server: undefined,
    sessions: [],
  };
  const current = events_session_current();
  if (current) {
    state.sessions.push(session_message_data(current));
  }
  state.removers.push(
    events_capture_add((record) => capture_entry(state, record)),
    events_session_listener_add((session) => capture_session(state, session))
  );
  state.heartbeat = setInterval(() => {
    for (const client of [...state.clients]) {
      client.send(": ping\n\n");
    }
  }, options.heartbeat_ms ?? k_events_server_heartbeat_milliseconds);
  state.heartbeat.unref();
  globals.state = state;
  return state;
}

function capture_dispose(state: s_events_server_state): void {
  for (const remove of state.removers) {
    remove();
  }
  state.removers = [];
  if (state.heartbeat) {
    clearInterval(state.heartbeat);
    state.heartbeat = undefined;
  }
  for (const client of [...state.clients]) {
    client.end();
  }
  state.clients.clear();
  const globals = events_server_globals();
  if (globals.state === state) {
    globals.state = undefined;
  }
}

// ---------- requests

const k_cors_headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Last-Event-ID, Content-Type",
} as const;

function path_prefix_normalize(prefix: string | undefined): string {
  let value = (prefix ?? k_events_server_default_path_prefix).trim();
  if (value.length > 0 && !value.startsWith("/")) {
    value = `/${value}`;
  }
  return value.replace(k_trailing_slashes_regex, "");
}

function respond_json(
  res: ServerResponse,
  status: number,
  body: unknown
): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    ...k_cors_headers,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store",
  });
  res.end(text);
}

function backlog_count_parse(value: string | null): number | undefined {
  if (value === null || value.length === 0) {
    return;
  }
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : undefined;
}

function last_event_id_parse(
  header: string | string[] | undefined
): number | undefined {
  const value = Array.isArray(header) ? header[0] : header;
  if (value === undefined || value.trim().length === 0) {
    return;
  }
  const id = Number(value);
  return Number.isInteger(id) && id >= 0 ? id : undefined;
}

// Sends the hello, the entries that are still buffered with a session message wherever the
// session changes, and the current session if no entry has shown it yet. The stream is live
// after that.
function stream_open(
  state: s_events_server_state,
  client: c_events_server_client,
  backlog: number | undefined,
  last_event_id: number | undefined
): void {
  client.send(sse_message("hello", JSON.stringify(hello_build(state))));

  const oldest = Math.max(0, state.next_index - state.backlog);
  let first = oldest;
  let session_sent: number | undefined;
  if (last_event_id !== undefined && last_event_id < state.next_index) {
    // The viewer already has everything up to that id; a session change after it is still news.
    first = Math.max(oldest, last_event_id + 1);
    session_sent = state.buffer[last_event_id % state.backlog]?.session;
  } else if (backlog !== undefined) {
    first = Math.max(oldest, state.next_index - backlog);
  }

  const session_send = (number: number): void => {
    const data = state.sessions.find((session) => session.number === number);
    if (data) {
      client.send(sse_message("session", JSON.stringify(data)));
    }
    session_sent = number;
  };
  for (let index = first; index < state.next_index; index++) {
    const entry = state.buffer[index % state.backlog];
    if (!entry) {
      continue;
    }
    if (entry.session !== session_sent) {
      session_send(entry.session);
    }
    client.send(sse_message("entry", entry.json, index));
  }
  const current = events_session_current();
  if (current && current.number !== session_sent) {
    session_send(current.number);
  }
}

function stream_handle(
  state: s_events_server_state,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
): void {
  const backlog = backlog_count_parse(url.searchParams.get("backlog"));
  const last_event_id = last_event_id_parse(req.headers["last-event-id"]);

  res.writeHead(200, {
    ...k_cors_headers,
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  req.socket.setNoDelay(true);
  req.socket.setTimeout(0);
  res.flushHeaders();

  const client = new c_events_server_client(res, state.buffer_limit, (done) => {
    state.clients.delete(done);
  });
  state.clients.add(client);
  res.on("close", () => client.disconnected());
  res.on("error", () => client.drop());
  try {
    stream_open(state, client, backlog, last_event_id);
  } catch {
    client.drop();
  }
}

function request_url(req: IncomingMessage): URL {
  try {
    return new URL(req.url ?? "/", "http://localhost");
  } catch {
    return new URL("http://localhost/");
  }
}

// Answers the two routes. Anything else goes to next(), or to a 404 when this is the whole
// server, or is left alone for the caller.
function handler_create(
  prefix: string,
  standalone: boolean
): t_events_server_handler {
  const info_path = `${prefix}/info`;
  const events_path = `${prefix}/events`;
  return (req, res, next) => {
    const url = request_url(req);
    const { pathname } = url;
    if (pathname !== info_path && pathname !== events_path) {
      if (next) {
        next();
      } else if (standalone) {
        respond_json(res, 404, { error: "not found" });
      }
      return false;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...k_cors_headers,
        "Access-Control-Max-Age": 86_400,
      });
      res.end();
      return true;
    }
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET, OPTIONS");
      respond_json(res, 405, { error: "method not allowed" });
      return true;
    }
    const state = events_server_state();
    if (!state) {
      respond_json(res, 503, { error: "the events server has stopped" });
      return true;
    }
    try {
      if (pathname === info_path) {
        respond_json(res, 200, hello_build(state));
      } else {
        stream_handle(state, req, res, url);
      }
    } catch {
      if (res.headersSent) {
        res.destroy();
      } else {
        respond_json(res, 500, { error: "internal error" });
      }
    }
    return true;
  };
}

// ---------- public api

function address_build(host: string, port: number): s_events_server_address {
  const url_host = host.includes(":") ? `[${host}]` : host;
  return { host, port, url: `http://${url_host}:${port}` };
}

// A request handler for an existing node http or express server. It answers only its routes
// and calls next() otherwise; without next it returns false and leaves the response alone.
// Starts capturing events if nothing is yet.
export function events_server_handler(
  options: s_events_server_options = {}
): t_events_server_handler {
  capture_ensure(options);
  return handler_create(path_prefix_normalize(options.path_prefix), false);
}

// Starts a standalone http server and returns where it listens.
export async function events_server_start(
  options: s_events_server_options = {}
): Promise<s_events_server_address> {
  if (events_server_state()?.server) {
    throw new DatamineError("the events server is already running");
  }
  const was_capturing = events_server_state() !== undefined;
  const state = capture_ensure(options);
  const handler = handler_create(
    path_prefix_normalize(options.path_prefix),
    true
  );
  const server = createServer((req, res) => {
    handler(req, res);
  });
  const host = options.host ?? "127.0.0.1";
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(options.port ?? 0, host, () => {
        server.off("error", reject);
        resolve();
      });
    });
  } catch (error) {
    // Nothing is serving, so don't leave the capture running either.
    if (!was_capturing) {
      capture_dispose(state);
    }
    throw error;
  }
  // Late socket errors must not take the process down.
  server.on("error", () => undefined);
  state.server = server;
  return address_build(host, (server.address() as AddressInfo).port);
}

// Closes every client and the standalone server, and forgets the buffered entries.
export async function events_server_stop(): Promise<void> {
  const state = events_server_state();
  if (!state) {
    return;
  }
  const { server } = state;
  state.server = undefined;
  capture_dispose(state);
  if (!server) {
    return;
  }
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections();
  });
}

export function events_server_running(): boolean {
  return events_server_state()?.server?.listening === true;
}

export function events_server_address(): s_events_server_address | undefined {
  const server = events_server_state()?.server;
  const address = server?.address();
  if (!(server?.listening && address) || typeof address === "string") {
    return;
  }
  return address_build(address.address, address.port);
}
