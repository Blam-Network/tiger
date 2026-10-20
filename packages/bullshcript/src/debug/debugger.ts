// The script debugger: attaches to script hosts (a live activity, a replay, a
// test), and owns breakpoints, stepping, the all-stop and what the clients
// see. Transport-free: a client is anything with a send() for DAP messages.
//
// Pausing. A breakpoint stops a coroutine before the instruction at it
// (LuaState.debugHook) and gates it, then stops its whole target: no other
// thread is resumed and the host's clock holds (LuaScheduler.paused). The game
// stays connected; only the scripts stand still. A thread inside a host call
// (a gate predicate, an import, an activate) cannot be suspended, so a
// breakpoint met there reports what it saw (tiger/hit) and carries on.

import type { Method } from "../hks/bytecode/proto.ts";
import {
  gateUntilPredicate,
  type LuaScriptThread,
  type LuaThreadGate,
} from "../hks/scheduler/scheduler.ts";
import type {
  ActivationRecord,
  LuaDebugHook,
  LuaThread,
} from "../hks/vm/interpreter.ts";
import { isTruthy, LuaTable, luaToString } from "../hks/vm/values.ts";
import type { EncounterScriptHost } from "../host/activity/encounter_host.ts";
import { jumpToPhase } from "../host/schedule/phase_reset.ts";
import { restartThread } from "../host/schedule/scheduling_threads.ts";
import type { ItemChange } from "../host/state/items.ts";
import { evaluate } from "./evaluate.ts";
import { activeLocals, Inspector, instanceLabel } from "./inspect.ts";
import type {
  DapBreakpoint,
  DapSourceBreakpoint,
  DapStackFrame,
  TigerHit,
  TigerSentEntry,
  TigerTarget,
  TigerThread,
  TigerTraceEntry,
} from "./protocol.ts";
import { SourceIndex } from "./sources.ts";
import {
  type BundleView,
  bundlesView,
  INCIDENT_KINDS,
  type IncidentKind,
  runRowAction,
  sendIncident,
} from "./world.ts";

// Trace and sent entries kept per target for a client that connects late.
const TRACE_KEEP = 2000;
const PHASE_INDEX = /^\d+$/;
const BUILT_IN_COMMANDS: readonly { usage: string; verb: string }[] = [
  { verb: "pause", usage: "" },
  { verb: "continue", usage: "" },
  { verb: "tick", usage: "" },
  { verb: "threads", usage: "" },
  { verb: "wake", usage: "<thread>" },
  { verb: "kill", usage: "<thread>" },
  { verb: "restart", usage: "<thread>" },
  {
    verb: "incident",
    usage: `<${INCIDENT_KINDS.map((k) => k.name).join("|")}> key=value ...`,
  },
  { verb: "row", usage: "<bundle> t<type>#<index> <action> [args]" },
  { verb: "phase", usage: "[<name>|<index>]" },
];
const HIT_CONDITION = /^(>=|>|==|%)?\s*(\d+)$/;
const LOG_EXPRESSION = /\{([^}]+)\}/g;
const COMMAND_SLASH = /^\//;
const WHITESPACE = /\s+/;
const ROW_ITEM = /^t(\d+)#(\d+)$/;
const SENT_KEEP = 1000;
const SENT_PER_ROW_KEEP = 20;

export interface ScriptDebuggerOptions {
  // Every script the embedder can run, loaded or not, so breakpoints can be
  // set before an activity starts.
  sourcePaths?: () => readonly string[];
  // A script's text by its path, for the client's editor.
  sourceText?: (path: string) => string | undefined;
}

// A console command the embedder adds: what the game server can do that a
// script host cannot (move players, say). It returns what to print.
export interface DebuggerCommand {
  run(args: readonly string[], targetId: string): string;
  usage: string;
}

// What the embedder knows of a bundle that the scripts do not: which world
// (host) builds it, and the bubbles it loads in.
export interface BundleInfo {
  bubbles?: readonly string[];
  world?: string;
}

export interface AttachOptions {
  bundleInfo?: (bundle: number) => BundleInfo | undefined;
  // What the embedder says the target is (its activity, the scenario it
  // runs), passed through to clients as is.
  meta?: Record<string, unknown>;
  // A source path's stand-in lines (CompiledBsFile.standInLines): a chunk's
  // line numbers leave them out, so the file's lines are put back through
  // them. Paths it does not know have none.
  standInLines?: (path: string) => readonly number[] | undefined;
}

export interface DebugEventSink {
  event(event: string, body: unknown): void;
}

interface Breakpoint {
  condition?: string;
  hitCondition?: string;
  hits: number;
  id: number;
  // the line asked for, and the line it landed on
  line: number;
  logMessage?: string;
  path: string;
  resolvedLine: number | undefined;
}

type StepKind = "in" | "out" | "over";

interface Step {
  depth: number;
  kind: StepKind;
  line: number | undefined;
  thread: LuaThread;
}

interface Target {
  readonly bundleInfo: (bundle: number) => BundleInfo | undefined;
  readonly debugHook: LuaDebugHook;
  readonly host: EncounterScriptHost;
  // the last hit reported per breakpoint in a host call, by tick
  readonly hostCallHits: Map<number, number>;
  readonly id: string;
  readonly label: string;
  readonly meta: Record<string, unknown>;
  readonly sent: TigerSentEntry[];
  readonly sentByRow: Map<string, TigerSentEntry[]>;
  readonly sources: SourceIndex;
  step: Step | undefined;
  // Threads the debugger stopped mid-code, gated until a continue.
  readonly stoppedThreads: Set<LuaScriptThread>;
  stopReason: string | undefined;
  readonly trace: TigerTraceEntry[];
  readonly unlisten: () => void;
}

interface FrameRef {
  frame: ActivationRecord;
  pc: number;
  target: Target;
}

const STOPPED_GATE: LuaThreadGate = gateUntilPredicate(
  "stopped (debugger)",
  () => false
);

// A key a row change is filed under.
function changeKey(change: ItemChange): string {
  const { item } = change;
  return `${(item.bundle >>> 0).toString(16).padStart(8, "0")}:t${item.typeId}#${item.typeIndex}`;
}

function hitConditionMet(condition: string | undefined, hits: number): boolean {
  if (!condition) {
    return true;
  }
  const match = condition.trim().match(HIT_CONDITION);
  if (!match) {
    return true;
  }
  const n = Number(match[2]);
  switch (match[1]) {
    case ">":
      return hits > n;
    case "==":
      return hits === n;
    case "%":
      return n > 0 && hits % n === 0;
    default:
      return hits >= n;
  }
}

export class ScriptDebugger {
  readonly inspector = new Inspector();
  private readonly options: ScriptDebuggerOptions;
  private readonly targets = new Map<string, Target>();
  private readonly sinks = new Set<DebugEventSink>();
  // Console commands the embedder adds (a server's teleport), by verb.
  private readonly extraCommands = new Map<string, DebuggerCommand>();
  private readonly changeListeners = new Set<(targetId: string) => void>();
  // DAP requests the embedder answers (tiger/players), by command.
  private readonly extraRequests = new Map<
    string,
    (args: Record<string, unknown>) => unknown
  >();
  // Every breakpoint, by path, as the client last set them.
  private readonly breakpoints = new Map<string, Breakpoint[]>();
  // Where they landed: per prototype, pc -> breakpoint.
  private breakAt = new WeakMap<Method, Map<number, Breakpoint>>();
  private nextBreakpointId = 1;
  private nextThreadId = 1;
  private readonly threadIds = new WeakMap<LuaScriptThread, number>();
  private readonly threadsById = new Map<
    number,
    { script: LuaScriptThread; target: Target }
  >();
  private nextFrameId = 1;
  private readonly frames = new Map<number, FrameRef>();
  private seq = 0;
  // Set while the debugger itself runs Lua, so its own expressions never stop.
  private evaluating = false;
  // Where a note the debugger writes itself (a logpoint) comes from.
  private noteAt:
    | { line: number | undefined; path: string | undefined }
    | undefined;

  constructor(options: ScriptDebuggerOptions = {}) {
    this.options = options;
  }

  // ---- clients -------------------------------------------------------------

  // The last client leaving takes its breakpoints and stops with it: a live
  // activity must not stay frozen with nobody to continue it.
  addSink(sink: DebugEventSink): () => void {
    this.sinks.add(sink);
    return () => {
      if (!this.sinks.delete(sink) || this.sinks.size > 0) {
        return;
      }
      this.breakpoints.clear();
      this.resolveAll();
      for (const target of this.targets.values()) {
        target.step = undefined;
        this.updateHook(target);
        if (target.host.scheduler.paused) {
          this.resumeTarget(target);
        }
      }
    };
  }

  private emit(event: string, body: unknown): void {
    for (const sink of this.sinks) {
      sink.event(event, body);
    }
  }

  // ---- targets ------------------------------------------------------------

  attach(
    id: string,
    label: string,
    host: EncounterScriptHost,
    options: AttachOptions = {}
  ): void {
    this.detach(id);
    const sources = new SourceIndex(options.standInLines);
    for (const chunk of host.allChunks) {
      sources.addChunk(chunk);
    }
    const target: Target = {
      meta: options.meta ?? {},
      bundleInfo: options.bundleInfo ?? (() => undefined),
      debugHook: {
        beforeInstruction: (thread, frame) =>
          this.beforeInstruction(target, thread, frame),
      },
      host,
      id,
      label,
      hostCallHits: new Map(),
      sent: [],
      sentByRow: new Map(),
      sources,
      stoppedThreads: new Set(),
      stopReason: undefined,
      step: undefined,
      trace: [],
      unlisten: () => undefined,
    };
    const onNote = (text: string) => this.noteFrom(target, text);
    const onSent = (change: ItemChange) => this.sentFrom(target, change);
    host.noteListeners.add(onNote);
    host.sentListeners.add(onSent);
    (target as { unlisten: () => void }).unlisten = () => {
      host.noteListeners.delete(onNote);
      host.sentListeners.delete(onSent);
    };
    this.targets.set(id, target);
    this.resolveAll();
    this.updateHook(target);
    this.emit("tiger/targets", { targets: this.targetList() });
  }

  detach(id: string): void {
    const target = this.targets.get(id);
    if (!target) {
      return;
    }
    target.unlisten();
    target.host.vm.debugHook = undefined;
    target.host.scheduler.paused = false;
    // threads it stopped go on at the next tick
    for (const script of target.stoppedThreads) {
      target.host.scheduler.wake(script);
    }
    this.targets.delete(id);
    for (const [threadId, entry] of this.threadsById) {
      if (entry.target === target) {
        this.threadsById.delete(threadId);
      }
    }
    this.emit("tiger/targets", { targets: this.targetList() });
  }

  targetList(): TigerTarget[] {
    return [...this.targets.values()].map((target) => ({
      id: target.id,
      label: target.label,
      meta: target.meta,
      paused: target.host.scheduler.paused,
      phase: target.host.debugSnapshot().phase,
      stopReason: target.stopReason,
      ticks: target.host.ticks,
      time: target.host.now,
    }));
  }

  private target(id: unknown): Target {
    const target =
      typeof id === "string"
        ? this.targets.get(id)
        : this.targets.values().next().value;
    if (!target) {
      throw new Error(`no target ${String(id)}`);
    }
    return target;
  }

  // Names closures from what the instances hold now (instances are built as
  // bundles come live).
  private refreshNames(target: Target): void {
    for (const instance of target.host.instances.values()) {
      target.sources.nameFrom(instance);
    }
    for (const script of target.host.scheduler.threads) {
      const owner = target.host.threadOwners.get(script);
      if (owner) {
        target.sources.nameFrom(owner);
      }
    }
  }

  // ---- trace and sent -------------------------------------------------------

  // Where the scripts are when a note is written: the running thread, and the
  // innermost Lua frame of the innermost resume.
  private whereNow(target: Target): {
    line: number | undefined;
    path: string | undefined;
    thread: string | undefined;
  } {
    const thread = target.host.vm.resuming.at(-1);
    const frame = thread?.debugFrames().at(-1);
    const prototype = frame?.closure.prototype;
    const path = prototype ? target.sources.pathOf(prototype) : undefined;
    return {
      line: prototype
        ? target.sources.fileLine(path, prototype.lineInfo[frame.currentPc])
        : undefined,
      path,
      thread: target.host.scheduler.current?.name,
    };
  }

  private noteFrom(target: Target, text: string): void {
    this.seq += 1;
    const entry: TigerTraceEntry = {
      ...this.whereNow(target),
      ...this.noteAt,
      seq: this.seq,
      targetId: target.id,
      text,
      tick: target.host.ticks,
    };
    target.trace.push(entry);
    if (target.trace.length > TRACE_KEEP) {
      target.trace.splice(0, target.trace.length - TRACE_KEEP);
    }
    this.emit("tiger/trace", entry);
  }

  private sentFrom(target: Target, change: ItemChange): void {
    this.seq += 1;
    const entry: TigerSentEntry = {
      change,
      key: changeKey(change),
      seq: this.seq,
      targetId: target.id,
      thread: target.host.scheduler.current?.name,
      tick: target.host.ticks,
    };
    target.sent.push(entry);
    if (target.sent.length > SENT_KEEP) {
      target.sent.splice(0, target.sent.length - SENT_KEEP);
    }
    const row = target.sentByRow.get(entry.key) ?? [];
    row.push(entry);
    if (row.length > SENT_PER_ROW_KEEP) {
      row.shift();
    }
    target.sentByRow.set(entry.key, row);
    this.emit("tiger/sent", entry);
  }

  trace(targetId: unknown): TigerTraceEntry[] {
    return this.target(targetId).trace;
  }

  // ---- breakpoints ----------------------------------------------------------

  setBreakpoints(
    path: string,
    requested: readonly DapSourceBreakpoint[]
  ): DapBreakpoint[] {
    const previous = this.breakpoints.get(path) ?? [];
    const list: Breakpoint[] = requested.map((spec) => {
      const same = previous.find(
        (old) =>
          old.line === spec.line &&
          old.condition === spec.condition &&
          old.logMessage === spec.logMessage &&
          old.hitCondition === spec.hitCondition
      );
      return {
        condition: spec.condition || undefined,
        hitCondition: spec.hitCondition || undefined,
        hits: same?.hits ?? 0,
        id: same?.id ?? this.nextBreakpointId++,
        line: spec.line,
        logMessage: spec.logMessage || undefined,
        path,
        resolvedLine: undefined,
      };
    });
    if (list.length === 0) {
      this.breakpoints.delete(path);
    } else {
      this.breakpoints.set(path, list);
    }
    this.resolveAll();
    for (const target of this.targets.values()) {
      this.updateHook(target);
    }
    return list.map((bp) => this.dapBreakpoint(bp));
  }

  private dapBreakpoint(bp: Breakpoint): DapBreakpoint {
    return {
      id: bp.id,
      line: bp.resolvedLine ?? bp.line,
      message:
        bp.resolvedLine === undefined
          ? "no code on or after this line in any loaded script"
          : undefined,
      source: { name: bp.path.split("/").at(-1) ?? bp.path, path: bp.path },
      verified: bp.resolvedLine !== undefined,
    };
  }

  // Lands every breakpoint on the first instruction of its line, or of the
  // next line with code, in every prototype of every target that has it.
  private resolveAll(): void {
    this.breakAt = new WeakMap();
    for (const [path, list] of this.breakpoints) {
      const prototypes = new Map<Method, SourceIndex>();
      for (const target of this.targets.values()) {
        for (const prototype of target.sources.prototypesOf(path)) {
          prototypes.set(prototype, target.sources);
        }
      }
      for (const bp of list) {
        bp.resolvedLine = undefined;
        // the file's lines, which a chunk's numbers are put back to
        let best: number | undefined;
        for (const [prototype, sources] of prototypes) {
          for (const chunkLine of prototype.lineInfo) {
            const line = sources.fileLine(path, chunkLine);
            if (line >= bp.line && (best === undefined || line < best)) {
              best = line;
            }
          }
        }
        if (best === undefined) {
          continue;
        }
        bp.resolvedLine = best;
        for (const [prototype, sources] of prototypes) {
          const lines = prototype.lineInfo;
          const landing = sources.chunkLine(path, best);
          for (let pc = 0; pc < lines.length; pc++) {
            if (
              lines[pc] !== landing ||
              (pc > 0 && lines[pc - 1] === landing)
            ) {
              continue;
            }
            let at = this.breakAt.get(prototype);
            if (!at) {
              at = new Map();
              this.breakAt.set(prototype, at);
            }
            at.set(pc, bp);
          }
        }
      }
    }
    this.emit("breakpoint-set", undefined);
  }

  // The hook costs a call per instruction: only while there is something to
  // stop on.
  private updateHook(target: Target): void {
    const wanted = this.breakpoints.size > 0 || target.step !== undefined;
    target.host.vm.debugHook = wanted ? target.debugHook : undefined;
  }

  // ---- the hook -------------------------------------------------------------

  private beforeInstruction(
    target: Target,
    thread: LuaThread,
    frame: ActivationRecord
  ): "continue" | "pause" {
    if (this.evaluating) {
      return "continue";
    }
    const prototype = frame.closure.prototype;
    const bp = this.breakAt.get(prototype)?.get(frame.pc);
    if (bp) {
      const verdict = this.atBreakpoint(target, thread, frame, bp);
      if (verdict !== undefined) {
        return verdict;
      }
    }
    const step = target.step;
    if (step && step.thread === thread && thread.mayPause()) {
      const depth = thread.debugFrames().length;
      const line = prototype.lineInfo[frame.pc];
      const arrived =
        (step.kind === "in" && (depth !== step.depth || line !== step.line)) ||
        (step.kind === "over" &&
          (depth < step.depth ||
            (depth === step.depth && line !== step.line))) ||
        (step.kind === "out" && depth < step.depth);
      if (arrived) {
        return this.stopHere(target, thread, "step");
      }
    }
    return "continue";
  }

  // undefined: not this breakpoint's to decide (a logpoint, a condition that
  // failed), so a step may still stop here.
  private atBreakpoint(
    target: Target,
    thread: LuaThread,
    frame: ActivationRecord,
    bp: Breakpoint
  ): "continue" | "pause" | undefined {
    if (bp.condition) {
      const value = this.tryEvaluate(target, bp.condition, frame, frame.pc);
      if (!(value.ok && isTruthy(value.value))) {
        return;
      }
    }
    bp.hits += 1;
    if (!hitConditionMet(bp.hitCondition, bp.hits)) {
      return;
    }
    if (bp.logMessage !== undefined) {
      const text = bp.logMessage.replace(LOG_EXPRESSION, (_, expression) => {
        const value = this.tryEvaluate(target, expression, frame, frame.pc);
        return value.ok ? luaToString(value.value) : `<${value.error}>`;
      });
      this.noteAt = { line: bp.resolvedLine, path: bp.path };
      try {
        target.host.writer.note(
          `logpoint ${bp.path}:${bp.resolvedLine}: ${text}`
        );
      } finally {
        this.noteAt = undefined;
      }
      return;
    }
    const script = target.host.scheduler.current;
    if (!(thread.mayPause() && script?.thread === thread)) {
      this.reportHostCallHit(target, thread, frame, bp);
      return "continue";
    }
    return this.stopHere(target, thread, "breakpoint", bp);
  }

  private stopHere(
    target: Target,
    thread: LuaThread,
    reason: "breakpoint" | "step",
    bp?: Breakpoint
  ): "continue" | "pause" {
    const script = target.host.scheduler.current;
    if (script?.thread !== thread) {
      return "continue";
    }
    script.gate = STOPPED_GATE;
    target.stoppedThreads.add(script);
    target.host.scheduler.paused = true;
    target.step = undefined;
    target.stopReason = reason;
    this.updateHook(target);
    this.forgetFrames();
    this.emit("stopped", {
      allThreadsStopped: true,
      hitBreakpointIds: bp ? [bp.id] : undefined,
      reason,
      threadId: this.threadId(target, script),
      description: `${target.label}: ${reason}`,
    });
    return "pause";
  }

  private reportHostCallHit(
    target: Target,
    thread: LuaThread,
    frame: ActivationRecord,
    bp: Breakpoint
  ): void {
    if (target.hostCallHits.get(bp.id) === target.host.ticks) {
      return;
    }
    target.hostCallHits.set(bp.id, target.host.ticks);
    const prototype = frame.closure.prototype;
    const locals: Record<string, string> = {};
    for (const { name, register } of activeLocals(frame, frame.pc)) {
      locals[name] = luaToString(frame.registers[register]);
    }
    const frames = [...this.resumingFrames(target)].reverse().map((f) => {
      const framePath = target.sources.pathOf(f.closure.prototype);
      return {
        line: target.sources.fileLine(
          framePath,
          f.closure.prototype.lineInfo[f.currentPc]
        ),
        name: target.sources.nameOf(f.closure.prototype),
        path: framePath,
      };
    });
    const path = target.sources.pathOf(prototype);
    const hit: TigerHit = {
      frames,
      line: target.sources.fileLine(path, prototype.lineInfo[frame.pc]),
      locals,
      path,
      targetId: target.id,
      tick: target.host.ticks,
    };
    target.host.writer.note(
      `breakpoint ${bp.path}:${bp.resolvedLine} met in a host call (${thread.hostCall ? "host call" : "nested resume"}), not stopped`
    );
    this.emit("tiger/hit", hit);
  }

  // Every Lua frame of every resume in flight, outermost first.
  private *resumingFrames(target: Target): Generator<ActivationRecord> {
    for (const thread of target.host.vm.resuming) {
      yield* thread.debugFrames();
    }
  }

  // ---- run control ------------------------------------------------------

  pause(targetId?: unknown): void {
    const targets =
      targetId === undefined
        ? [...this.targets.values()]
        : [this.target(targetId)];
    for (const target of targets) {
      if (target.host.scheduler.paused) {
        continue;
      }
      target.host.scheduler.paused = true;
      target.stopReason = "pause";
      this.forgetFrames();
      const first = target.host.scheduler.threads[0];
      this.emit("stopped", {
        allThreadsStopped: true,
        description: `${target.label}: paused`,
        reason: "pause",
        threadId: first ? this.threadId(target, first) : undefined,
      });
    }
  }

  // Lets the target run: the threads stopped mid-code go on from where they
  // stood, now, then the clock moves again.
  continue(targetId?: unknown): void {
    const targets =
      targetId === undefined
        ? [...this.targets.values()]
        : [this.target(targetId)];
    for (const target of targets) {
      this.resumeTarget(target);
    }
  }

  private resumeTarget(target: Target): void {
    target.stopReason = undefined;
    this.forgetFrames();
    this.emit("continued", { allThreadsContinued: true });
    target.host.scheduler.paused = false;
    for (const script of [...target.stoppedThreads]) {
      target.stoppedThreads.delete(script);
      this.resumeStopped(target, script);
      if (target.host.scheduler.paused) {
        // it met a breakpoint again
        return;
      }
    }
  }

  private resumeStopped(target: Target, script: LuaScriptThread): void {
    const outcome = target.host.scheduler.resumeOne(script);
    if (outcome === "failed") {
      target.host.writer.note(
        `thread ${script.name} failed: ${script.error?.message}`
      );
    }
  }

  step(threadId: number, kind: StepKind): void {
    const entry = this.threadsById.get(threadId);
    if (!entry) {
      throw new Error(`no thread ${threadId}`);
    }
    const { script, target } = entry;
    const frames = script.thread.debugFrames();
    const top = frames.at(-1);
    target.step = {
      depth: frames.length,
      kind,
      line: top
        ? top.closure.prototype.lineInfo[
            script.thread.debugPaused ? top.pc : top.currentPc
          ]
        : undefined,
      thread: script.thread,
    };
    this.updateHook(target);
    if (!target.stoppedThreads.has(script)) {
      // waiting on its own gate: run the world until it gets there
      this.resumeTarget(target);
      return;
    }
    // Stopped mid-code: step it alone, the rest of the target held.
    target.stoppedThreads.delete(script);
    this.forgetFrames();
    this.emit("continued", { allThreadsContinued: false, threadId });
    this.resumeStopped(target, script);
    if (target.stoppedThreads.has(script)) {
      return;
    }
    // It yielded (a sleep) or ended before the step landed: the world runs
    // and the step waits for the thread's next line.
    if (!script.thread.debugFrames().length) {
      target.step = undefined;
      this.updateHook(target);
    }
    this.resumeTarget(target);
  }

  // Frozen: run exactly one tick of the target's scripts, then hold again.
  stepTick(targetId: unknown): void {
    const target = this.target(targetId);
    const scheduler = target.host.scheduler;
    this.forgetFrames();
    scheduler.paused = false;
    target.host.tick();
    if (!scheduler.paused) {
      scheduler.paused = true;
      target.stopReason = "tick";
      this.emit("stopped", {
        allThreadsStopped: true,
        description: `${target.label}: tick ${target.host.ticks}`,
        reason: "step",
        threadId: scheduler.threads[0]
          ? this.threadId(target, scheduler.threads[0])
          : undefined,
      });
    }
  }

  // ---- thread control -------------------------------------------------------

  // Forces a thread past whatever it waits on (a sleep, a sleep_until, a
  // trigger). Frozen, it runs now; otherwise on the next tick.
  wakeThread(threadId: number): void {
    const { script, target } = this.entry(threadId);
    const waited = script.gate?.describe();
    target.host.writer.note(
      `debugger woke ${script.name}${waited ? ` (was waiting on ${waited})` : ""}`
    );
    if (target.stoppedThreads.has(script)) {
      target.stoppedThreads.delete(script);
    }
    if (target.host.scheduler.paused) {
      this.forgetFrames();
      this.resumeStopped(target, script);
      return;
    }
    target.host.scheduler.wake(script);
  }

  killThread(threadId: number): void {
    const { script, target } = this.entry(threadId);
    target.stoppedThreads.delete(script);
    target.host.scheduler.remove(script);
    target.host.writer.note(`debugger killed ${script.name}`);
    this.emit("thread", { reason: "exited", threadId });
  }

  // Starts the thread again from its first line, as a script's restart().
  restartThread(threadId: number): number | undefined {
    const { script, target } = this.entry(threadId);
    const owner = target.host.threadOwners.get(script);
    if (!owner) {
      throw new Error(`${script.name} has no owning instance`);
    }
    const prefix = target.host.instancePrefix.get(owner) ?? "";
    const name =
      prefix && script.name.startsWith(`${prefix}.`)
        ? script.name.slice(prefix.length + 1)
        : script.name;
    target.stoppedThreads.delete(script);
    target.host.writer.note(`debugger restarts ${script.name}`);
    const fresh = restartThread(target.host, owner, prefix, name);
    return fresh ? this.threadId(target, fresh) : undefined;
  }

  private entry(threadId: number): { script: LuaScriptThread; target: Target } {
    const entry = this.threadsById.get(threadId);
    if (!entry) {
      throw new Error(`no thread ${threadId}`);
    }
    return entry;
  }

  // Starts a mission phase (by name or index) now, leaving the running one.
  activatePhase(targetId: unknown, phase: string | number): string {
    const target = this.target(targetId);
    const phases = target.host.phases;
    const index =
      typeof phase === "number"
        ? phase
        : phases.findIndex(
            (p) => p.declName === phase || p.declName.endsWith(phase)
          );
    if (index < 0 || index >= phases.length) {
      throw new Error(`no mission phase ${phase}`);
    }
    this.asDebugger(() => jumpToPhase(target.host, index));
    this.forgetFrames();
    return `mission ${phases[index].declName} started`;
  }

  // ---- threads and frames ------------------------------------------------

  private threadId(target: Target, script: LuaScriptThread): number {
    let id = this.threadIds.get(script);
    if (id === undefined) {
      id = this.nextThreadId++;
      this.threadIds.set(script, id);
    }
    this.threadsById.set(id, { script, target });
    return id;
  }

  threads(): { id: number; name: string }[] {
    const out: { id: number; name: string }[] = [];
    for (const [id, entry] of this.threadsById) {
      if (!entry.target.host.scheduler.threads.includes(entry.script)) {
        this.threadsById.delete(id);
      }
    }
    for (const target of this.targets.values()) {
      for (const script of target.host.scheduler.threads) {
        out.push({
          id: this.threadId(target, script),
          name: `${target.label} · ${script.name}`,
        });
      }
    }
    return out;
  }

  activity(targetId: unknown): { snapshot: unknown; threads: TigerThread[] } {
    const target = this.target(targetId);
    this.refreshNames(target);
    const host = target.host;
    const threads = host.scheduler.threads.map((script): TigerThread => {
      const owner = host.threadOwners.get(script);
      const bundle = owner ? host.instanceBundle.get(owner) : undefined;
      const top = script.thread.debugFrames().at(-1);
      const stoppedHere = target.stoppedThreads.has(script);
      const prototype = top?.closure.prototype;
      return {
        bundle:
          bundle === undefined
            ? undefined
            : (bundle >>> 0).toString(16).padStart(8, "0"),
        id: this.threadId(target, script),
        line: prototype
          ? target.sources.fileLine(
              target.sources.pathOf(prototype),
              prototype.lineInfo[stoppedHere ? top.pc : top.currentPc]
            )
          : undefined,
        name: script.name,
        owner: owner ? instanceLabel(host, owner) : undefined,
        path: prototype ? target.sources.pathOf(prototype) : undefined,
        state: stoppedHere ? "stopped" : script.state,
        // A phase script's threads have no bundle: they are the activity's.
        world:
          bundle === undefined
            ? "activity"
            : (target.bundleInfo(bundle)?.world ?? "unknown"),
        stoppedHere,
        waitingOn: stoppedHere ? undefined : script.gate?.describe(),
      };
    });
    return { snapshot: host.debugSnapshot(), threads };
  }

  world(targetId: unknown): unknown {
    const target = this.target(targetId);
    const host = target.host;
    return {
      itemState: host.itemState.snapshot(),
      objects: host.objects.map((object) => ({
        path: object.path,
        row: object.row
          ? {
              bundle: (object.row.bundle >>> 0).toString(16).padStart(8, "0"),
              name: object.row.name,
              typeId: object.row.typeId,
              typeIndex: object.row.typeIndex,
            }
          : undefined,
      })),
      reports: host.debugSnapshot().reports,
      sentByRow: Object.fromEntries(target.sentByRow),
      sentRecent: target.sent.slice(-200),
    };
  }

  private forgetFrames(): void {
    this.frames.clear();
    this.inspector.handles.clear();
  }

  stackTrace(threadId: number): DapStackFrame[] {
    const entry = this.threadsById.get(threadId);
    if (!entry) {
      return [];
    }
    const { script, target } = entry;
    this.refreshNames(target);
    const stoppedHere = target.stoppedThreads.has(script);
    const frames = script.thread.debugFrames();
    const out: DapStackFrame[] = [];
    for (let i = frames.length - 1; i >= 0; i--) {
      const frame = frames[i];
      // The innermost frame of a thread stopped mid-code has not run frame.pc
      // yet; every other frame stands on its call (or its yield).
      const pc =
        stoppedHere && i === frames.length - 1 ? frame.pc : frame.currentPc;
      const prototype = frame.closure.prototype;
      const path = target.sources.pathOf(prototype);
      const id = this.nextFrameId++;
      this.frames.set(id, { frame, pc, target });
      out.push({
        column: 1,
        id,
        line: target.sources.fileLine(path, prototype.lineInfo[pc] ?? 0),
        name: target.sources.nameOf(prototype),
        source: path
          ? { name: path.split("/").at(-1) ?? path, path }
          : undefined,
      });
    }
    return out;
  }

  scopes(
    frameId: number
  ): { name: string; variablesReference: number; expensive: boolean }[] {
    const ref = this.frames.get(frameId);
    if (!ref) {
      return [];
    }
    const { frame, pc, target } = ref;
    const handles = this.inspector.handles;
    const scopes = [
      {
        expensive: false,
        name: "Locals",
        variablesReference: handles.add({ kind: "locals", target, frame, pc }),
      },
    ];
    // The script's members: `self`, which BungieScript never spells.
    const self = activeLocals(frame, pc).find(({ name }) => name === "self");
    const instance = self ? frame.registers[self.register] : undefined;
    if (instance instanceof LuaTable) {
      scopes.push({
        expensive: false,
        name: "Self",
        variablesReference: handles.add({
          kind: "lua",
          target,
          value: instance,
        }),
      });
    }
    return scopes;
  }

  variables(reference: number): ReturnType<Inspector["children"]> {
    return this.inspector.children(reference);
  }

  private tryEvaluate(
    target: Target,
    expression: string,
    frame: ActivationRecord | undefined,
    pc: number | undefined
  ):
    | { ok: true; value: ReturnType<typeof evaluate> }
    | { ok: false; error: string } {
    this.evaluating = true;
    try {
      return {
        ok: true,
        value: evaluate(target.host, expression, { frame, pc }),
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.evaluating = false;
    }
  }

  evaluate(
    expression: string,
    frameId: number | undefined,
    targetId: unknown
  ): { result: string; type?: string; variablesReference: number } {
    const ref = frameId === undefined ? undefined : this.frames.get(frameId);
    const target = ref?.target ?? this.target(targetId);
    const value = this.tryEvaluate(target, expression, ref?.frame, ref?.pc);
    if (!value.ok) {
      throw new Error(value.error);
    }
    const shown = this.inspector.present(target, "result", value.value);
    return {
      result: shown.value,
      type: shown.type,
      variablesReference: shown.variablesReference,
    };
  }

  // ---- the world's rows and incidents ----------------------------------------

  bundles(targetId: unknown): BundleView[] {
    const target = this.target(targetId);
    return bundlesView(
      target.host,
      (key) => target.sentByRow.get(key)?.at(-1)?.change
    ).map((view) => {
      const info = target.bundleInfo(Number.parseInt(view.bundle, 16));
      return { ...view, bubbles: info?.bubbles, world: info?.world };
    });
  }

  // Runs as the debugger: a breakpoint the action reaches does not stop it.
  // The embedder hears that a client's request may have changed a target's
  // rows (an expression, a row action, an incident), so it can send them
  // without waiting for its own next push.
  onChanged(listener: (targetId: string) => void): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  // undefined: every target.
  changed(targetId?: unknown): void {
    const ids =
      typeof targetId === "string" && this.targets.has(targetId)
        ? [targetId]
        : [...this.targets.keys()];
    for (const id of ids) {
      for (const listener of this.changeListeners) {
        listener(id);
      }
    }
  }

  private asDebugger<T>(run: () => T): T {
    this.evaluating = true;
    try {
      return run();
    } finally {
      this.evaluating = false;
    }
  }

  rowAction(
    targetId: unknown,
    bundle: string,
    typeId: number,
    typeIndex: number,
    action: string,
    args: readonly unknown[]
  ): string {
    const target = this.target(targetId);
    const result = this.asDebugger(() =>
      runRowAction(
        target.host,
        Number.parseInt(bundle, 16),
        typeId,
        typeIndex,
        action,
        args
      )
    );
    return luaToString(result);
  }

  incidentKinds(): readonly IncidentKind[] {
    return INCIDENT_KINDS;
  }

  incident(
    targetId: unknown,
    kind: string,
    params: Record<string, unknown>
  ): void {
    const target = this.target(targetId);
    this.asDebugger(() => sendIncident(target.host, kind, params));
  }

  // The console's `/` commands. Returns what to print.
  registerRequest(
    command: string,
    handler: (args: Record<string, unknown>) => unknown
  ): void {
    this.extraRequests.set(command, handler);
  }

  // undefined: nobody answers that command.
  request(
    command: string,
    args: Record<string, unknown>
  ): { body: unknown } | undefined {
    const handler = this.extraRequests.get(command);
    return handler ? { body: handler(args) } : undefined;
  }

  // Lets clients know something the embedder answers for changed.
  notify(event: string, body: unknown): void {
    this.emit(event, body);
  }

  registerCommand(verb: string, command: DebuggerCommand): void {
    this.extraCommands.set(verb, command);
  }

  // The commands the console offers, for a client's palette.
  commandList(): { usage: string; verb: string }[] {
    return [
      ...BUILT_IN_COMMANDS,
      ...[...this.extraCommands].map(([verb, command]) => ({
        usage: command.usage,
        verb,
      })),
    ];
  }

  command(line: string, targetId: unknown): string {
    const [verb = "", ...rest] = line
      .trim()
      .replace(COMMAND_SLASH, "")
      .split(WHITESPACE);
    const target = this.target(targetId);
    const threadNamed = (text: string | undefined): number => {
      const scripts = target.host.scheduler.threads;
      const byId = Number(text);
      const script =
        scripts.find((s) => this.threadIds.get(s) === byId) ??
        scripts.find((s) => s.name === text) ??
        scripts.find((s) => text !== undefined && s.name.endsWith(text));
      if (!script) {
        throw new Error(`no thread ${text ?? ""}`);
      }
      return this.threadId(target, script);
    };
    const keyValues = (words: readonly string[]) =>
      Object.fromEntries(
        words.map((word) => {
          const at = word.indexOf("=");
          return at < 0 ? [word, ""] : [word.slice(0, at), word.slice(at + 1)];
        })
      );
    switch (verb) {
      case "pause":
        this.pause(target.id);
        return "paused";
      case "continue":
      case "c":
        this.continue(target.id);
        return "running";
      case "tick":
        this.stepTick(target.id);
        return `tick ${target.host.ticks}`;
      case "wake":
        this.wakeThread(threadNamed(rest[0]));
        return `woke ${rest[0]}`;
      case "kill":
        this.killThread(threadNamed(rest[0]));
        return `killed ${rest[0]}`;
      case "restart":
        this.restartThread(threadNamed(rest[0]));
        return `restarted ${rest[0]}`;
      case "incident": {
        const [kind = "", ...params] = rest;
        this.incident(target.id, kind, keyValues(params));
        return `sent ${kind}`;
      }
      case "phase": {
        const which = rest.join(" ");
        if (!which) {
          return target.host.phases
            .map(
              (p, i) =>
                `${i === target.host.phaseIndex ? "*" : " "} ${i} ${p.declName}`
            )
            .join("\n");
        }
        return this.activatePhase(
          target.id,
          PHASE_INDEX.test(which) ? Number(which) : which
        );
      }
      case "row": {
        // /row <bundle> t<type>#<index> <action> [args...]
        const [bundle = "", item = "", action = "", ...args] = rest;
        const match = item.match(ROW_ITEM);
        if (!match) {
          throw new Error(
            "usage: /row <bundle> t<type>#<index> <action> [args]"
          );
        }
        return this.rowAction(
          target.id,
          bundle,
          Number(match[1]),
          Number(match[2]),
          action,
          args
        );
      }
      case "threads":
        return target.host.scheduler.threads
          .map(
            (s) =>
              `${this.threadId(target, s)} ${s.name} ${s.state} ${s.gate?.describe() ?? ""}`
          )
          .join("\n");
      default: {
        const extra = this.extraCommands.get(verb);
        if (extra) {
          return extra.run(rest, target.id);
        }
        return [
          ...this.commandList().map(
            ({ usage, verb: name }) => `/${name}${usage ? ` ${usage}` : ""}`
          ),
          "anything else: a BungieScript expression",
        ].join("\n");
      }
    }
  }

  // ---- sources --------------------------------------------------------------

  // Every script, with `active` on those a target has loaded. A breakpoint
  // set on one that is not loaded yet lands when an activity loads it.
  loadedSources(): { active: boolean; name: string; path: string }[] {
    const active = new Set<string>();
    for (const target of this.targets.values()) {
      for (const path of target.sources.sourcePaths) {
        active.add(path);
      }
    }
    const paths = new Set([...(this.options.sourcePaths?.() ?? []), ...active]);
    return [...paths].sort().map((path) => ({
      active: active.has(path),
      name: path.split("/").at(-1) ?? path,
      path,
    }));
  }

  sourceText(path: string): string | undefined {
    return this.options.sourceText?.(path);
  }

  // The root instances of a target by name, for a client's tree.
  instances(targetId: unknown): string[] {
    return [...this.target(targetId).host.instances.keys()];
  }

  isInstance(targetId: unknown, value: unknown): boolean {
    return (
      value instanceof LuaTable &&
      this.target(targetId).host.instancePrefix.has(value)
    );
  }
}
