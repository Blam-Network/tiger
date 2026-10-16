// The JSON the live event server sends, shared with viewers. Types only, so the browser entry
// can export it without pulling in node.

// What GET <prefix>/info returns, and the first message of every event stream.
export interface s_events_server_hello {
  backlog_count: number;
  build_string?: string;
  entry_count: number;
  // The events name option, when one was given.
  name?: string;
  protocol: number;
  // New every time the capture starts. Entry indices only continue under the same run id, so
  // a viewer resumes with Last-Event-ID only when it matches.
  run_id: string;
  session_id?: string;
  session_number: number;
  started_ms: number;
  system_id?: string;
  version_string: string;
}

// One printf argument in datamine terms.
export interface s_events_server_parameter {
  // Empty for printf arguments.
  name: string;
  // e_datamine_parameter_type
  type: number;
  // Bigints are sent as strings.
  value: number | string;
}

// An `entry` message; its SSE id is the index.
export interface s_events_server_entry {
  category_path: string;
  context?: string;
  frame_index?: number;
  game_time?: number;
  // 0 based and global across the server's lifetime.
  index: number;
  // e_event_level, 0 to 5.
  level: number;
  parameters?: s_events_server_parameter[];
  session: number;
  // The full formatted event text.
  text: string;
  thread_id?: number;
  time_ms: number;
}

// A `session` message: sent whenever the event system is (re)initialized.
export interface s_events_server_session {
  number: number;
  session_id?: string;
  started_ms: number;
  version: string;
}
