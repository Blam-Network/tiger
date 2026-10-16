// The app's one debug session: connection, targets, the selected thread and
// frame, breakpoints, open sources and the console. Components read it with
// useSession(select) and call its methods.
import { invoke } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";
import { type ConnectionState, DapClient } from "./dap";
import type {
  Bundle,
  DapBreakpoint,
  DapSource,
  DapStackFrame,
  EvaluateResult,
  ConsoleCommand,
  IncidentKind,
  StoppedBody,
  TigerActivity,
  TigerHit,
  TigerPlayer,
  TigerServer,
  TigerSlice,
  TigerSentEntry,
  TigerTarget,
  TigerTraceEntry,
} from "./protocol";

export interface SourceBreakpoint {
  condition?: string;
  hitCondition?: string;
  line: number;
  logMessage?: string;
}

export interface BreakpointView extends SourceBreakpoint {
  message?: string;
  resolvedLine?: number;
  verified?: boolean;
}

// Where a breakpoint shows: the line the server landed it on, once it has.
export const shownLine = (bp: BreakpointView) =>
  bp.verified && bp.resolvedLine ? bp.resolvedLine : bp.line;

export type ConsoleLine = { id: number } & (
  | { kind: "trace"; entry: TigerTraceEntry }
  | { kind: "hit"; hit: TigerHit }
  | { kind: "input"; text: string }
  | { kind: "result"; epoch: number; text: string; variablesReference: number }
  | { kind: "error"; text: string }
);

export interface Toast {
  error: boolean;
  id: number;
  text: string;
}

export type WatchResult = EvaluateResult | { error: string };

export interface State {
  activity: TigerActivity | undefined;
  activeTab: string | undefined;
  address: string;
  breakpoints: Record<string, BreakpointView[]>;
  // The selected target's bundles, shared by the Bundles tab and Squads.
  bundles: Bundle[];
  commands: ConsoleCommand[];
  connection: ConnectionState;
  console: ConsoleLine[];
  contents: Record<string, string>;
  // Bumped on every stopped/continued: frame ids and variable references
  // from before are gone.
  epoch: number;
  frames: DapStackFrame[];
  // The player whose activity the target selector follows.
  following: string | undefined;
  incidentKinds: IncidentKind[];
  lastStop: StoppedBody | undefined;
  openTabs: string[];
  players: TigerPlayer[];
  reveal: { line: number; nonce: number; path: string } | undefined;
  selectedFrameId: number | undefined;
  selectedThreadId: number | undefined;
  sent: TigerSentEntry[];
  server: TigerServer | undefined;
  sources: DapSource[];
  targetId: string | undefined;
  targets: TigerTarget[];
  toasts: Toast[];
  watches: string[];
  watchResults: Record<string, WatchResult>;
}

const CONSOLE_KEEP = 5000;
const SENT_KEEP = 2000;
const POLL_MS = 1000;
const PLAYERS_POLL_MS = 2000;
const STORE = {
  address: "bsdbg.address",
  breakpoints: "bsdbg.breakpoints",
  following: "bsdbg.following",
  watches: "bsdbg.watches",
};

function load<T>(key: string, fallback: T): T {
  try {
    const text = localStorage.getItem(key);
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: settings just don't stick
  }
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

class Session {
  readonly client = new DapClient();
  private listeners = new Set<() => void>();
  private nextId = 1;
  private polling = false;
  // Slices per target, from the data service; they do not change while it lives.
  private slicesByTarget = new Map<string, Promise<TigerSlice[]>>();
  state: State = {
    activity: undefined,
    activeTab: undefined,
    // ?address=host:port overrides the saved address for this window.
    address:
      new URLSearchParams(location.search).get("address") ??
      load(STORE.address, "127.0.0.1:8099"),
    breakpoints: load(STORE.breakpoints, {}),
    bundles: [],
    commands: [],
    connection: "disconnected",
    console: [],
    contents: {},
    epoch: 0,
    frames: [],
    following: load<string | null>(STORE.following, null) ?? undefined,
    incidentKinds: [],
    lastStop: undefined,
    openTabs: [],
    players: [],
    reveal: undefined,
    selectedFrameId: undefined,
    selectedThreadId: undefined,
    sent: [],
    server: undefined,
    sources: [],
    targetId: undefined,
    targets: [],
    toasts: [],
    watches: load(STORE.watches, []),
    watchResults: {},
  };

  constructor() {
    this.client.onState = (connection) => this.set({ connection });
    this.client.onOpen = () => void this.opened();
    this.client.onEvent = (event, body) => this.event(event, body);
    setInterval(() => void this.poll(), POLL_MS);
    setInterval(() => void this.refreshPlayers(), PLAYERS_POLL_MS);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<State>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener();
    }
  }

  get target(): TigerTarget | undefined {
    return this.state.targets.find((t) => t.id === this.state.targetId);
  }

  private request<T = Record<string, unknown>>(
    command: string,
    args: Record<string, unknown> = {}
  ): Promise<T> {
    return this.client.request<T>(command, args);
  }

  // Runs a request for its side effect; a failure becomes a toast.
  private async act(
    command: string,
    args: Record<string, unknown> = {}
  ): Promise<Record<string, unknown> | undefined> {
    try {
      return await this.request(command, args);
    } catch (error) {
      this.toast(`${command}: ${errorText(error)}`, true);
      return undefined;
    }
  }

  setAddress(address: string): void {
    save(STORE.address, address);
    this.set({ address });
  }

  connect(): void {
    this.client.connect(this.state.address.trim());
  }

  disconnect(): void {
    this.client.disconnect();
    this.set({
      activity: undefined,
      players: [],
      frames: [],
      selectedFrameId: undefined,
      targets: [],
    });
  }

  private async opened(): Promise<void> {
    try {
      await this.request("initialize", {
        adapterID: "bullshcript-debugger",
        clientID: "bullshcript-debugger",
        linesStartAt1: true,
      });
      await this.request("attach");
      await this.subscribeStreams();
      const { kinds } = await this.request<{ kinds: IncidentKind[] }>(
        "tiger/incidentKinds"
      );
      this.set({ incidentKinds: kinds });
      // Older servers lack these; the app works without them.
      try {
        const { commands } = await this.request<{ commands: ConsoleCommand[] }>(
          "tiger/commands"
        );
        this.set({ commands });
      } catch {
        this.set({ commands: [] });
      }
      void this.refreshPlayers();
      this.slicesByTarget.clear();
      try {
        this.set({ server: await this.request<TigerServer>("tiger/server") });
      } catch {
        this.set({ server: undefined });
      }
      await this.resendBreakpoints();
      await this.refreshTargets();
      await this.refreshSources();
      // Open tabs may be stale after a server restart.
      this.set({ contents: {} });
      for (const path of this.state.openTabs) {
        void this.loadContent(path);
      }
    } catch (error) {
      this.toast(`connect: ${errorText(error)}`, true);
    }
  }

  private subscribeStreams(): Promise<unknown> {
    return this.request("tiger/subscribe", { sent: true, trace: true });
  }

  private event(event: string, body: unknown): void {
    switch (event) {
      case "stopped": {
        const stop = body as StoppedBody;
        this.set({
          epoch: this.state.epoch + 1,
          frames: [],
          lastStop: stop,
          selectedFrameId: undefined,
        });
        // A breakpoint or step: show that thread. A pause keeps the selection.
        if (stop.reason !== "pause" && stop.threadId !== undefined) {
          void this.selectThread(stop.threadId, true);
        } else {
          void this.fetchStack();
        }
        void this.refreshTargets();
        void this.refreshActivity();
        return;
      }
      case "continued":
        this.set({
          epoch: this.state.epoch + 1,
          frames: [],
          lastStop: undefined,
          selectedFrameId: undefined,
        });
        void this.refreshTargets();
        void this.refreshActivity().then(() => this.fetchStack());
        return;
      case "thread":
        void this.refreshActivity();
        return;
      case "tiger/targets":
        this.slicesByTarget.clear();
        this.applyTargets((body as { targets: TigerTarget[] }).targets);
        // New scripts may verify breakpoints that had nowhere to land.
        void this.resendBreakpoints();
        void this.refreshSources();
        return;
      case "tiger/trace":
        this.appendConsole([
          { id: this.nextId++, kind: "trace", entry: body as TigerTraceEntry },
        ]);
        return;
      case "tiger/hit":
        this.appendConsole([
          { id: this.nextId++, kind: "hit", hit: body as TigerHit },
        ]);
        return;
      case "tiger/sent": {
        const sent = [...this.state.sent, body as TigerSentEntry];
        this.set({ sent: sent.slice(-SENT_KEEP) });
        return;
      }
      default:
        return;
    }
  }

  private appendConsole(lines: ConsoleLine[]): void {
    const all = [...this.state.console, ...lines];
    this.set({ console: all.slice(-CONSOLE_KEEP) });
  }

  clearConsole(): void {
    this.set({ console: [] });
  }

  clearSent(): void {
    this.set({ sent: [] });
  }

  private applyTargets(targets: TigerTarget[]): void {
    const keep = targets.some((t) => t.id === this.state.targetId);
    this.set({ targets });
    if (this.followTarget()) {
      return;
    }
    if (!keep) {
      void this.selectTarget(targets[0]?.id);
    }
  }

  async refreshPlayers(): Promise<void> {
    if (!this.client.connected) {
      return;
    }
    try {
      const { players } = await this.request<{ players: TigerPlayer[] }>(
        "tiger/players"
      );
      this.set({ players: players ?? [] });
    } catch {
      // the server answers no tiger/players
      this.set({ players: [] });
    }
    this.followTarget();
  }

  // Moves the target selector to the followed player's activity. True when
  // it is (now) there.
  private followTarget(): boolean {
    const player = this.state.players.find((p) => p.id === this.state.following);
    const targetId = player?.targetId;
    if (!(targetId && this.state.targets.some((t) => t.id === targetId))) {
      return false;
    }
    if (targetId !== this.state.targetId) {
      void this.selectTarget(targetId);
    }
    return true;
  }

  follow(playerId: string | undefined): void {
    save(STORE.following, playerId ?? null);
    this.set({ following: playerId });
    this.followTarget();
  }

  // /teleport is the server's console command, run in the player's activity.
  async teleport(player: TigerPlayer, args: string): Promise<void> {
    await this.serverCommand(`/teleport ${args}`.trim(), player.targetId, "teleport sent");
  }

  // Drops the activity host connections of a target, so its players go back
  // to orbit (the server's /kick).
  async kick(targetId: string | undefined): Promise<void> {
    if (targetId === undefined) {
      this.toast("kick: no activity", true);
      return;
    }
    await this.serverCommand("/kick", targetId, "kicked to orbit");
  }

  // A console command run on the user's behalf, echoed in the console.
  private async serverCommand(
    line: string,
    targetId: string | undefined,
    fallback: string
  ): Promise<void> {
    this.appendConsole([{ id: this.nextId++, kind: "input", text: line }]);
    try {
      const { result } = await this.request<EvaluateResult>("evaluate", {
        expression: line,
        targetId,
      });
      this.appendConsole([
        { epoch: this.state.epoch, id: this.nextId++, kind: "result", text: result, variablesReference: 0 },
      ]);
      this.toast(result || fallback);
    } catch (error) {
      this.appendConsole([{ id: this.nextId++, kind: "error", text: errorText(error) }]);
      this.toast(`${line}: ${errorText(error)}`, true);
    }
  }

  // The data service: Tauri runs its own; a browser has the dev server's /data.
  private dataUrl: Promise<string> | undefined;
  private dataService(): Promise<string> {
    if (!this.dataUrl) {
      this.dataUrl =
        "__TAURI_INTERNALS__" in window
          ? invoke<string | null>("data_service_url").then((url) => {
              if (!url) {
                throw new Error("the data service did not start");
              }
              return url;
            })
          : Promise.resolve("/data");
      this.dataUrl.catch(() => {
        this.dataUrl = undefined;
      });
    }
    return this.dataUrl;
  }

  // A target's slices, read from the packages (its meta.scenario and the
  // server's build and paths).
  slices(targetId: string): Promise<TigerSlice[]> {
    let slices = this.slicesByTarget.get(targetId);
    if (!slices) {
      slices = this.readSlices(targetId);
      // a failure is not kept: the next menu asks again
      slices.catch(() => this.slicesByTarget.delete(targetId));
      this.slicesByTarget.set(targetId, slices);
    }
    return slices;
  }

  private async readSlices(targetId: string): Promise<TigerSlice[]> {
    const scenario = this.state.targets.find((t) => t.id === targetId)?.meta?.scenario;
    const server = this.state.server;
    if (!scenario) {
      throw new Error("the target has no scenario");
    }
    if (!server?.packagesDir) {
      throw new Error("the server gave no packages folder");
    }
    const query = new URLSearchParams({
      build: server.build,
      dictionary: server.dictionaryDir ?? "",
      packages: server.packagesDir,
      scenario,
    });
    const response = await fetch(`${await this.dataService()}/slices?${query}`);
    const body = (await response.json()) as { error?: string; slices?: TigerSlice[] };
    if (!response.ok || body.error) {
      throw new Error(body.error ?? `data service: ${response.status}`);
    }
    return body.slices ?? [];
  }

  async activatePhase(index: number): Promise<void> {
    const body = await this.act("tiger/activatePhase", {
      phase: index,
      targetId: this.state.targetId,
    });
    if (body) {
      this.toast(String(body.result ?? "phase started"));
    }
    await this.refreshActivity();
  }

  async refreshTargets(): Promise<void> {
    try {
      const { targets } = await this.request<{ targets: TigerTarget[] }>(
        "tiger/targets"
      );
      this.applyTargets(targets);
    } catch {
      // disconnected; the next connect refreshes
    }
  }

  async selectTarget(targetId: string | undefined): Promise<void> {
    this.set({
      activity: undefined,
      bundles: [],
      frames: [],
      selectedFrameId: undefined,
      selectedThreadId: undefined,
      targetId,
    });
    if (!targetId) {
      return;
    }
    try {
      const { entries } = await this.request<{ entries: TigerTraceEntry[] }>(
        "tiger/trace",
        { targetId }
      );
      // The backlog replaces what the console had for this target.
      const others = this.state.console.filter(
        (line) => line.kind !== "trace" || line.entry.targetId !== targetId
      );
      const backlog: ConsoleLine[] = entries.map((entry) => ({
        entry,
        id: this.nextId++,
        kind: "trace",
      }));
      const seen = new Set(entries.map((e) => e.seq));
      const kept = others.filter(
        (line) => line.kind !== "trace" || !seen.has(line.entry.seq)
      );
      this.set({ console: [...backlog, ...kept].slice(-CONSOLE_KEEP) });
    } catch (error) {
      this.toast(`trace: ${errorText(error)}`, true);
    }
    await this.refreshActivity();
  }

  async refreshActivity(): Promise<void> {
    const targetId = this.state.targetId;
    if (!(targetId && this.client.connected)) {
      return;
    }
    let activity: TigerActivity;
    try {
      activity = await this.request<TigerActivity>("tiger/activity", {
        targetId,
      });
    } catch {
      return;
    }
    if (targetId !== this.state.targetId) {
      return;
    }
    const before = this.state.activity?.threads.find(
      (t) => t.id === this.state.selectedThreadId
    );
    this.set({ activity });
    const selected = this.state.selectedThreadId;
    if (selected === undefined) {
      return;
    }
    const now = activity.threads.find((t) => t.id === selected);
    if (!now) {
      this.set({ frames: [], selectedFrameId: undefined, selectedThreadId: undefined });
      return;
    }
    // The selected thread moved on: its old frames say where it was.
    if (
      !before ||
      before.line !== now.line ||
      before.state !== now.state ||
      before.path !== now.path
    ) {
      await this.fetchStack();
    }
  }

  private async poll(): Promise<void> {
    if (this.polling || !this.client.connected) {
      return;
    }
    this.polling = true;
    try {
      await this.refreshTargets();
      if (this.target && !this.target.paused) {
        await this.refreshActivity();
      }
    } finally {
      this.polling = false;
    }
  }

  async refreshSources(): Promise<void> {
    try {
      const { sources } = await this.request<{ sources: DapSource[] }>(
        "loadedSources"
      );
      this.set({ sources });
    } catch {
      // keep the old list
    }
  }

  async selectThread(threadId: number, reveal = true): Promise<void> {
    this.set({ selectedThreadId: threadId });
    await this.fetchStack();
    const top = this.state.frames[0];
    if (reveal && top?.source) {
      void this.openSource(top.source.path, top.line);
    }
  }

  async fetchStack(): Promise<void> {
    const threadId = this.state.selectedThreadId;
    if (threadId === undefined || !this.client.connected) {
      this.set({ frames: [], selectedFrameId: undefined });
      return;
    }
    try {
      const { stackFrames } = await this.request<{
        stackFrames: DapStackFrame[];
      }>("stackTrace", { threadId });
      if (threadId !== this.state.selectedThreadId) {
        return;
      }
      this.set({ frames: stackFrames, selectedFrameId: stackFrames[0]?.id });
    } catch {
      this.set({ frames: [], selectedFrameId: undefined });
    }
    void this.evaluateWatches();
  }

  selectFrame(frameId: number): void {
    this.set({ selectedFrameId: frameId });
    const frame = this.state.frames.find((f) => f.id === frameId);
    if (frame?.source) {
      void this.openSource(frame.source.path, frame.line);
    }
    void this.evaluateWatches();
  }

  continue(): void {
    void this.act("continue", { targetId: this.state.targetId });
  }

  pause(): void {
    void this.act("pause", { targetId: this.state.targetId });
  }

  step(kind: "next" | "stepIn" | "stepOut", threadId?: number): void {
    const id =
      threadId ?? this.state.selectedThreadId ?? this.state.lastStop?.threadId;
    if (id === undefined) {
      this.toast("select a thread to step", true);
      return;
    }
    void this.act(kind, { threadId: id });
  }

  stepTick(): void {
    void this.act("tiger/stepTick", { targetId: this.state.targetId }).then(
      () => this.refreshActivity()
    );
  }

  async threadCommand(
    command: "tiger/kill" | "tiger/restart" | "tiger/wake",
    threadId: number
  ): Promise<void> {
    const body = await this.act(command, { threadId });
    if (body) {
      await this.refreshActivity();
    }
  }

  async openSource(path: string, line?: number): Promise<void> {
    const openTabs = this.state.openTabs.includes(path)
      ? this.state.openTabs
      : [...this.state.openTabs, path];
    this.set({
      activeTab: path,
      openTabs,
      reveal: line ? { line, nonce: this.nextId++, path } : this.state.reveal,
    });
    if (this.state.contents[path] === undefined) {
      await this.loadContent(path);
    }
  }

  private async loadContent(path: string): Promise<void> {
    try {
      const { content } = await this.request<{ content: string }>("source", {
        source: { path },
      });
      this.set({ contents: { ...this.state.contents, [path]: content } });
    } catch (error) {
      this.set({
        contents: {
          ...this.state.contents,
          [path]: `# ${path}: ${errorText(error)}\n`,
        },
      });
    }
  }

  setActiveTab(path: string): void {
    this.set({ activeTab: path });
  }

  closeTab(path: string): void {
    const openTabs = this.state.openTabs.filter((p) => p !== path);
    const activeTab =
      this.state.activeTab === path ? openTabs.at(-1) : this.state.activeTab;
    this.set({ activeTab, openTabs });
  }

  breakpointAt(path: string, line: number): BreakpointView | undefined {
    return (this.state.breakpoints[path] ?? []).find(
      (bp) => shownLine(bp) === line || bp.line === line
    );
  }

  toggleBreakpoint(path: string, line: number): void {
    if (this.breakpointAt(path, line)) {
      this.removeBreakpoint(path, line);
    } else {
      this.setBreakpoint(path, { line });
    }
  }

  // Adds or replaces the breakpoint on that line.
  setBreakpoint(path: string, spec: SourceBreakpoint): void {
    const existing = this.breakpointAt(path, spec.line);
    const list = (this.state.breakpoints[path] ?? []).filter(
      (bp) => bp !== existing
    );
    list.push({ ...spec, line: existing?.line ?? spec.line });
    this.writeBreakpoints(path, list);
  }

  removeBreakpoint(path: string, line: number): void {
    const existing = this.breakpointAt(path, line);
    const list = (this.state.breakpoints[path] ?? []).filter(
      (bp) => bp !== existing
    );
    this.writeBreakpoints(path, list);
  }

  private writeBreakpoints(path: string, list: BreakpointView[]): void {
    const breakpoints = { ...this.state.breakpoints };
    if (list.length === 0) {
      delete breakpoints[path];
    } else {
      breakpoints[path] = list;
    }
    this.set({ breakpoints });
    this.persistBreakpoints();
    void this.sendBreakpoints(path);
  }

  private persistBreakpoints(): void {
    const plain: Record<string, SourceBreakpoint[]> = {};
    for (const [path, list] of Object.entries(this.state.breakpoints)) {
      plain[path] = list.map(({ condition, hitCondition, line, logMessage }) => ({
        condition,
        hitCondition,
        line,
        logMessage,
      }));
    }
    save(STORE.breakpoints, plain);
  }

  private async sendBreakpoints(path: string): Promise<void> {
    if (!this.client.connected) {
      return;
    }
    const list = this.state.breakpoints[path] ?? [];
    try {
      const { breakpoints } = await this.request<{
        breakpoints: DapBreakpoint[];
      }>("setBreakpoints", {
        breakpoints: list.map(({ condition, hitCondition, line, logMessage }) => ({
          condition,
          hitCondition,
          line,
          logMessage,
        })),
        source: { name: path.split("/").at(-1), path },
      });
      // The list may have changed while the request was out.
      if (this.state.breakpoints[path] !== list) {
        return;
      }
      const verified = list.map((bp, i) => ({
        ...bp,
        message: breakpoints[i]?.message,
        resolvedLine: breakpoints[i]?.line,
        verified: breakpoints[i]?.verified ?? false,
      }));
      this.set({ breakpoints: { ...this.state.breakpoints, [path]: verified } });
    } catch (error) {
      this.toast(`breakpoints: ${errorText(error)}`, true);
    }
  }

  private async resendBreakpoints(): Promise<void> {
    await Promise.all(
      Object.keys(this.state.breakpoints).map((path) =>
        this.sendBreakpoints(path)
      )
    );
  }

  async repl(expression: string): Promise<void> {
    const epoch = this.state.epoch;
    this.appendConsole([{ id: this.nextId++, kind: "input", text: expression }]);
    try {
      const body = await this.request<EvaluateResult>("evaluate", {
        context: "repl",
        expression,
        frameId: this.state.selectedFrameId,
        targetId: this.state.targetId,
      });
      this.appendConsole([
        {
          epoch,
          id: this.nextId++,
          kind: "result",
          text: body.result,
          variablesReference: body.variablesReference,
        },
      ]);
    } catch (error) {
      this.appendConsole([
        { id: this.nextId++, kind: "error", text: errorText(error) },
      ]);
    }
    if (expression.trim().startsWith("/")) {
      void this.refreshActivity();
    }
  }

  // A hover's evaluation: undefined when there's nothing to evaluate in.
  async hover(expression: string): Promise<EvaluateResult | undefined> {
    if (this.state.selectedFrameId === undefined) {
      return undefined;
    }
    try {
      return await this.request<EvaluateResult>("evaluate", {
        context: "hover",
        expression,
        frameId: this.state.selectedFrameId,
      });
    } catch {
      return undefined;
    }
  }

  addWatch(expression: string): void {
    const text = expression.trim();
    if (!text || this.state.watches.includes(text)) {
      return;
    }
    const watches = [...this.state.watches, text];
    save(STORE.watches, watches);
    this.set({ watches });
    void this.evaluateWatches();
  }

  removeWatch(expression: string): void {
    const watches = this.state.watches.filter((w) => w !== expression);
    save(STORE.watches, watches);
    this.set({ watches });
  }

  async evaluateWatches(): Promise<void> {
    if (!this.client.connected || this.state.targetId === undefined) {
      return;
    }
    const results: Record<string, WatchResult> = {};
    await Promise.all(
      this.state.watches.map(async (expression) => {
        try {
          results[expression] = await this.request<EvaluateResult>("evaluate", {
            context: "watch",
            expression,
            frameId: this.state.selectedFrameId,
            targetId: this.state.targetId,
          });
        } catch (error) {
          results[expression] = { error: errorText(error) };
        }
      })
    );
    this.set({ watchResults: results });
  }

  async rowAction(
    bundle: string,
    typeId: number,
    typeIndex: number,
    action: string,
    args: unknown[]
  ): Promise<void> {
    try {
      const { result } = await this.request<{ result: string }>(
        "tiger/rowAction",
        { action, args, bundle, targetId: this.state.targetId, typeId, typeIndex }
      );
      this.toast(`${action}: ${result || "done"}`);
    } catch (error) {
      this.toast(`${action}: ${errorText(error)}`, true);
    }
  }

  async incident(kind: string, params: Record<string, unknown>): Promise<void> {
    const body = await this.act("tiger/incident", {
      kind,
      params,
      targetId: this.state.targetId,
    });
    if (body) {
      this.toast(`sent ${kind}`);
    }
  }

  async refreshBundles(): Promise<void> {
    const targetId = this.state.targetId;
    if (!targetId) {
      this.set({ bundles: [] });
      return;
    }
    try {
      const body = await this.request<{ bundles: Bundle[] }>("tiger/bundles", { targetId });
      if (targetId === this.state.targetId) {
        this.set({ bundles: body.bundles });
      }
    } catch (error) {
      this.toast(`bundles: ${errorText(error)}`, true);
    }
  }

  // For panels that fetch their own data (world, variables).
  call<T = Record<string, unknown>>(
    command: string,
    args: Record<string, unknown> = {}
  ): Promise<T> {
    return this.request<T>(command, args);
  }

  toast(text: string, error = false): void {
    const id = this.nextId++;
    this.set({ toasts: [...this.state.toasts, { error, id, text }] });
    setTimeout(
      () => this.set({ toasts: this.state.toasts.filter((t) => t.id !== id) }),
      error ? 6000 : 3000
    );
  }
}

export const session = new Session();

export function useSession<T>(select: (state: State) => T): T {
  return useSyncExternalStore(session.subscribe, () => select(session.state));
}
