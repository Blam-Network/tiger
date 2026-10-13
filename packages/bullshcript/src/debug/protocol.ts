// The wire: Debug Adapter Protocol messages as JSON, one per WebSocket frame,
// plus `tiger/*` requests and events for what DAP has no words for
// (activities, the world, the trace). Only the parts this debugger uses.

export interface DapRequest {
  arguments?: Record<string, unknown>;
  command: string;
  seq: number;
  type: "request";
}

export interface DapResponse {
  body?: unknown;
  command: string;
  message?: string;
  request_seq: number;
  seq: number;
  success: boolean;
  type: "response";
}

export interface DapEvent {
  body?: unknown;
  event: string;
  seq: number;
  type: "event";
}

export type DapMessage = DapEvent | DapRequest | DapResponse;

export interface DapSource {
  name: string;
  // The script's path in Fukugen Daihon, `es/cosmo/dome_c/enc_dome_c_m4.es`.
  path: string;
}

export interface DapStackFrame {
  column: number;
  id: number;
  line: number;
  name: string;
  source?: DapSource;
}

export interface DapScope {
  expensive: boolean;
  name: string;
  variablesReference: number;
}

export interface DapVariable {
  name: string;
  type?: string;
  value: string;
  variablesReference: number;
}

export interface DapSourceBreakpoint {
  condition?: string;
  hitCondition?: string;
  line: number;
  logMessage?: string;
}

export interface DapBreakpoint {
  id: number;
  line?: number;
  message?: string;
  source?: DapSource;
  verified: boolean;
}

export interface DapThread {
  id: number;
  name: string;
}

// tiger/targets: the script hosts the debugger can see.
export interface TigerTarget {
  id: string;
  label: string;
  // The embedder's: web-tiger-day0 gives { activity, scenario } (the
  // scenario_client tag, which a client reads slices from).
  meta: Record<string, unknown>;
  // A debugger all-stop holds the target's scripts and clock.
  paused: boolean;
  phase: string | undefined;
  stopReason: string | undefined;
  ticks: number;
  time: number;
}

// tiger/activity: a target's script threads and its host's own snapshot.
export interface TigerThread {
  bundle: string | undefined;
  id: number;
  line: number | undefined;
  name: string;
  owner: string | undefined;
  path: string | undefined;
  state: string;
  // Stopped by the debugger in the middle of its code.
  stoppedHere: boolean;
  waitingOn: string | undefined;
  // Which world runs it: "private", "public" (the embedder's word for its
  // bundle), "activity" (a mission phase's), "unknown".
  world: string;
}

// tiger/trace (event, and the request's entries): a note the scripts wrote.
export interface TigerTraceEntry {
  line: number | undefined;
  path: string | undefined;
  seq: number;
  targetId: string;
  text: string;
  thread: string | undefined;
  tick: number;
}

// tiger/sent (event, and tiger/world's history): a row change the scripts
// sent.
export interface TigerSentEntry {
  change: unknown;
  key: string;
  seq: number;
  targetId: string;
  thread: string | undefined;
  tick: number;
}

// tiger/hit (event): a breakpoint met where the thread cannot pause (a host
// call: a gate predicate, an import, an activate), with what it saw.
export interface TigerHit {
  frames: {
    line: number | undefined;
    name: string;
    path: string | undefined;
  }[];
  line: number | undefined;
  locals: Record<string, string>;
  path: string | undefined;
  targetId: string;
  tick: number;
}
