// Event log files. Each log is opened on demand, kept open, recreated or trimmed on its first
// open of the process, and gets the banner before its first line. Logs that resolve to one
// file are one log, so a line is never written to a file twice. The files need node:fs; with
// write_files off nothing here touches it, so the set also runs in a browser.
import {
  event_log_definitions,
  event_log_directory,
  event_log_snapshot_directory,
  type s_event_log_file,
  type s_events_config,
} from "../../config/event_options.ts";
import { node_builtin_required } from "../../platform/node_builtins.ts";
import { text_encode } from "../../platform/text.ts";
import type { s_clock } from "./cseries_time.ts";
import { build_banner } from "./event_log_format.ts";

// "immediate": every line is written as it arrives. "cached": lines are buffered per file and
// written in batches.
export type t_event_log_write_mode = "immediate" | "cached";

export const k_event_log_cache_flush_bytes = 32_768;
export const k_event_log_cache_flush_interval_ms = 1000;

export const k_thrown_away_events_log_file_name = "thrown_away_events.txt";

const k_line_ending = "\r\n";

export interface s_event_log_set_options {
  clock: s_clock;
  config: s_events_config;
  write_mode: t_event_log_write_mode;
}

interface s_event_log_io {
  fs: typeof import("node:fs");
  path: typeof import("node:path");
}

interface s_event_log_state {
  banner_written: boolean;
  failed: boolean;
  fd: number | undefined;
  file: s_event_log_file;
  opened_at_least_once: boolean;
  path: string;
  pending: string[];
}

// file_trim: keep the last `bytes` bytes. It cuts wherever the byte falls.
function file_trim_to_tail(
  fs: typeof import("node:fs"),
  path: string,
  bytes: number
): void {
  const size = fs.statSync(path).size;
  if (size <= bytes) {
    return;
  }
  const tail = new Uint8Array(bytes);
  const fd = fs.openSync(path, "r");
  try {
    fs.readSync(fd, tail, 0, bytes, size - bytes);
  } finally {
    fs.closeSync(fd);
  }
  fs.writeFileSync(path, tail);
}

export class c_event_log_set {
  private readonly m_options: s_event_log_set_options;
  // Undefined when write_files is off.
  private readonly m_io: s_event_log_io | undefined;
  private readonly m_session_started: Date;
  private readonly m_banner: string;
  private readonly m_logs = new Map<string, s_event_log_state>();
  private readonly m_paths = new Map<string, string>();
  private m_pending_bytes = 0;
  private m_timer: ReturnType<typeof setInterval> | undefined;

  constructor(options: s_event_log_set_options) {
    this.m_options = options;
    if (options.config.write_files) {
      this.m_io = {
        fs: node_builtin_required("node:fs", "write_files"),
        path: node_builtin_required("node:path", "write_files"),
      };
    }
    this.m_session_started = options.clock.now();
    this.m_banner = build_banner(options.config.version_string);
    // Register the primary logs in order, so the first one to reach a file decides how it is
    // opened.
    for (const definition of event_log_definitions(options.config)) {
      this.log_state(definition);
    }
  }

  get session_started(): Date {
    return this.m_session_started;
  }

  // Absolute path of a log file for this layout.
  path_of(file: s_event_log_file): string {
    const key = [file.name, file.place_in_root ? 1 : 0].join("\0");
    let path = this.m_paths.get(key);
    if (path === undefined) {
      const { join, resolve } = node_builtin_required<
        typeof import("node:path")
      >("node:path", "event log paths");
      path = resolve(
        join(
          event_log_directory(
            this.m_options.config,
            file,
            this.m_session_started
          ),
          file.name
        )
      );
      this.m_paths.set(key, path);
    }
    return path;
  }

  // Writes text to every file once, however many of them resolve to one path.
  write(files: readonly s_event_log_file[], text: string): void {
    const written = new Set<string>();
    if (!this.m_io) {
      return;
    }
    for (const file of files) {
      const state = this.log_state(file);
      if (written.has(state.path)) {
        continue;
      }
      written.add(state.path);
      this.write_state(state, text);
    }
  }

  // thrown_away_events.txt sits in the root. True when the line was written.
  write_thrown_away(text: string): boolean {
    const io = this.m_io;
    if (!io) {
      return false;
    }
    try {
      const path = io.path.join(
        this.m_options.config.root,
        k_thrown_away_events_log_file_name
      );
      io.fs.mkdirSync(io.path.dirname(path), { recursive: true });
      io.fs.appendFileSync(
        path,
        text_encode(
          text.endsWith(k_line_ending) ? text : text + k_line_ending,
          this.m_options.config.text_encoding
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  flush(): void {
    for (const state of this.m_logs.values()) {
      this.flush_state(state);
    }
    this.m_pending_bytes = 0;
  }

  // Flushes and closes every file. They reopen in append mode if written to again.
  close(): void {
    this.flush();
    for (const state of this.m_logs.values()) {
      if (state.fd !== undefined) {
        try {
          this.m_io?.fs.closeSync(state.fd);
        } catch {
          // Nothing left to do for a handle that will not close.
        }
        state.fd = undefined;
      }
    }
    if (this.m_timer !== undefined) {
      clearInterval(this.m_timer);
      this.m_timer = undefined;
    }
  }

  // Copies every log and thrown_away_events.txt into the error snapshot directory, emptying
  // it first. Returns the copies.
  snapshot(): string[] {
    this.close();
    const io = this.m_io;
    if (!io) {
      return [];
    }
    const { fs, path } = io;
    const snapshot_directory = event_log_snapshot_directory(
      this.m_options.config
    );
    const copies: string[] = [];
    try {
      fs.rmSync(snapshot_directory, { recursive: true, force: true });
      fs.mkdirSync(snapshot_directory, { recursive: true });
    } catch {
      return copies;
    }

    const sources = [...this.m_logs.keys()];
    sources.push(
      path.join(this.m_options.config.root, k_thrown_away_events_log_file_name)
    );
    const used_names = new Set<string>();
    for (const source of sources) {
      if (!fs.existsSync(source)) {
        continue;
      }
      // Logs from different folders can share a name, so a clash gets its folder prefixed.
      let name = path.basename(source);
      if (used_names.has(name)) {
        name = `${path.basename(path.dirname(source))}_${name}`;
      }
      used_names.add(name);
      const destination = path.join(snapshot_directory, name);
      try {
        fs.copyFileSync(source, destination);
        copies.push(destination);
      } catch {
        // A file that cannot be copied is skipped, like the original.
      }
    }
    return copies;
  }

  private log_state(file: s_event_log_file): s_event_log_state {
    const path = this.path_of(file);
    let state = this.m_logs.get(path);
    if (state === undefined) {
      state = {
        path,
        file,
        fd: undefined,
        failed: false,
        opened_at_least_once: false,
        banner_written: false,
        pending: [],
      };
      this.m_logs.set(path, state);
    }
    return state;
  }

  // File opening as the original does it: a log that is not append is recreated on its first
  // open, a missing one is created, and append files are trimmed to trim_bytes.
  private open(state: s_event_log_state): boolean {
    if (state.fd !== undefined) {
      return true;
    }
    const io = this.m_io;
    if (state.failed || !io) {
      return false;
    }
    const { fs } = io;
    try {
      fs.mkdirSync(io.path.dirname(state.path), { recursive: true });
      let flags = "a";
      if (!state.opened_at_least_once) {
        const recreate = !(
          fs.existsSync(state.path) && state.file.append_to_file
        );
        if (recreate) {
          flags = "w";
        } else if (this.m_options.config.trim_bytes > 0) {
          file_trim_to_tail(fs, state.path, this.m_options.config.trim_bytes);
        }
      }
      state.fd = fs.openSync(state.path, flags);
      state.opened_at_least_once = true;
      return true;
    } catch {
      // A log that cannot be opened is not tried again.
      state.failed = true;
      return false;
    }
  }

  private write_state(state: s_event_log_state, text: string): void {
    if (!this.open(state)) {
      return;
    }
    let data = text;
    if (!state.banner_written) {
      state.banner_written = true;
      data = this.m_banner + text;
    }
    if (this.m_options.write_mode === "immediate") {
      this.write_data(state, data);
      return;
    }
    state.pending.push(data);
    this.m_pending_bytes += data.length;
    if (this.m_pending_bytes >= k_event_log_cache_flush_bytes) {
      this.flush();
    } else if (this.m_timer === undefined) {
      this.m_timer = setInterval(
        () => this.flush(),
        k_event_log_cache_flush_interval_ms
      );
      this.m_timer.unref();
    }
  }

  private flush_state(state: s_event_log_state): void {
    if (state.pending.length === 0) {
      return;
    }
    const data = state.pending.join("");
    state.pending = [];
    this.write_data(state, data);
  }

  private write_data(state: s_event_log_state, data: string): void {
    if (state.fd === undefined || !this.m_io) {
      return;
    }
    try {
      this.m_io.fs.writeSync(
        state.fd,
        text_encode(data, this.m_options.config.text_encoding)
      );
    } catch {
      state.failed = true;
    }
  }
}
