// The shapes the bullshcript debugger sends (bullshcript/src/debug/protocol.ts
// and world.ts), only the fields this app reads.

export interface DapSource {
  // loadedSources: a running activity has it loaded.
  active?: boolean;
  name: string;
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

export interface DapBreakpoint {
  id: number;
  line?: number;
  message?: string;
  verified: boolean;
}

export interface EvaluateResult {
  result: string;
  type?: string;
  variablesReference: number;
}

export interface StoppedBody {
  allThreadsStopped?: boolean;
  description?: string;
  hitBreakpointIds?: number[];
  reason: string;
  threadId?: number;
}

export interface TigerTarget {
  id: string;
  label: string;
  // the embedder's: activity name, scenario_client tag (8 hex digits)
  meta?: { activity?: string; scenario?: string };
  paused: boolean;
  phase: string | undefined;
  stopReason: string | undefined;
  ticks: number;
  time: number;
}

export interface TigerThread {
  bundle: string | undefined;
  id: number;
  line: number | undefined;
  name: string;
  owner: string | undefined;
  path: string | undefined;
  state: string;
  stoppedHere: boolean;
  waitingOn: string | undefined;
  // "private", "public", "activity" (a mission phase's) or "unknown"
  world?: string;
}

export interface HostSnapshot {
  activeBundles?: string[];
  encounters: {
    budget: number;
    cost: number;
    kind: string;
    name: string;
    owner: string;
    state: string;
    wait: number;
  }[];
  phase: string | undefined;
  phases: string[];
  recentCalls: string[];
  ticks: number;
  time: number;
}

export interface TigerActivity {
  snapshot: HostSnapshot;
  threads: TigerThread[];
}

export interface TigerTraceEntry {
  line: number | undefined;
  path: string | undefined;
  seq: number;
  targetId: string;
  text: string;
  thread: string | undefined;
  tick: number;
}

export interface TigerSentEntry {
  change: unknown;
  key: string;
  seq: number;
  targetId: string;
  thread: string | undefined;
  tick: number;
}

export interface TigerHit {
  frames: { line: number | undefined; name: string; path: string | undefined }[];
  line: number | undefined;
  locals: Record<string, string>;
  path: string | undefined;
  targetId: string;
  tick: number;
}

export interface ActionParam {
  hint?: string;
  name: string;
  type: "number" | "string";
}

export interface RowAction {
  kind: "instance" | "native" | "report";
  label: string;
  name: string;
  params?: ActionParam[];
}

export interface BundleRow {
  actions: RowAction[];
  bound: string[];
  childScript?: string;
  importIdent?: string;
  name: string | undefined;
  nameHash: string;
  sense: Record<string, unknown>;
  state: unknown;
  type: string;
  typeId: number;
  typeIndex: number;
}

export interface Bundle {
  active: boolean | undefined;
  // bubble.state names it loads in, from the embedder
  bubbles?: string[];
  bundle: string;
  rows: BundleRow[];
  tag: string;
  world?: string;
}

export interface IncidentKind {
  label: string;
  name: string;
  params: ActionParam[];
}

// tiger/players: answered by the embedding server, not bullshcript.
export interface TigerPlayer {
  account: string;
  activity: string | undefined;
  // "14.2": bubble.state
  bubble: string | undefined;
  character: string;
  id: string;
  level?: number;
  // the character's name
  name?: string;
  platform: string;
  powerLevel?: number;
  targetId: string | undefined;
}

export interface ConsoleCommand {
  usage: string;
  verb: string;
}

// The data service's /slices: every bubble state of an activity's scenario.
export interface TigerSlice {
  bubble: number;
  bundles?: { authoritative: string[]; global: string[]; private: string[] };
  // "14.1": bubble.state, what /teleport takes
  handle: string;
  // the phase's name when the dictionary knows phaseHash
  phase?: string;
  phaseHash?: string;
  public: boolean;
  // regionName, or the hash
  region: string;
  regionHash?: string;
  regionName?: string;
  // one per name, `default` first; name is the hash when the dictionary
  // lacks it, and either works for /teleport
  spawnPoints?: TigerSpawnPoint[];
  state: number;
}

export interface TigerSpawnPoint {
  // how many points share the name; the client picks among them
  count: number;
  hash: string;
  name: string;
  // the first one's
  position: [number, number, number];
}

// tiger/server: the embedder's build and where its data lives.
export interface TigerServer {
  build: string;
  buildLabel?: string;
  dictionaryDir?: string;
  game: string;
  packagesDir?: string;
  platform: string;
  scriptsDir?: string;
}
