// Cooperative scheduler for host Lua script threads.

import type { LuaFunction, LuaValue } from "./values.ts";
import { LuaRuntimeError, type LuaThread, type LuaVm } from "./vm.ts";

export interface LuaTickContext {
  readonly tick: number;
  // seconds of game time; the host decides the clock
  readonly time: number;
}

export interface LuaThreadGate {
  // Set by a plain time gate, so a caller can honour "a sleep never pulls
  // an existing wake earlier" without knowing what other gates mean.
  readonly deadline?: number;
  describe(): string;
  isReady(context: LuaTickContext): boolean;
}

export function gateUntilTime(deadline: number): LuaThreadGate {
  return {
    deadline,
    describe: () => `until time ${deadline}`,
    isReady: (context) => context.time >= deadline,
  };
}

export function gateUntilPredicate(
  description: string,
  predicate: (context: LuaTickContext) => boolean
): LuaThreadGate {
  return {
    describe: () => description,
    isReady: predicate,
  };
}

type LuaScriptThreadState = "done" | "failed" | "ready" | "waiting";

export class LuaScriptThread {
  readonly name: string;
  readonly thread: LuaThread;
  gate: LuaThreadGate | undefined;
  error: Error | undefined;
  results: readonly LuaValue[] | undefined;

  constructor(name: string, thread: LuaThread) {
    this.name = name;
    this.thread = thread;
  }

  get state(): LuaScriptThreadState {
    if (this.error !== undefined) {
      return "failed";
    }
    if (this.results !== undefined) {
      return "done";
    }
    return this.gate === undefined ? "ready" : "waiting";
  }
}

// Bounds the same-tick passes in LuaScheduler.tick: threads that keep
// waking fresh threads cannot spin one tick forever.
const MAX_PASSES_PER_TICK = 8;

interface LuaTickReport {
  readonly completed: readonly LuaScriptThread[];
  readonly failed: readonly LuaScriptThread[];
  readonly resumed: readonly LuaScriptThread[];
  readonly tick: number;
}

export class LuaScheduler {
  readonly vm: LuaVm;
  private readonly scripts: LuaScriptThread[] = [];
  // Whether a thread may run this tick at all; one that may not is neither
  // polled nor resumed.
  isRunnable: (script: LuaScriptThread) => boolean = () => true;
  private running: LuaScriptThread | undefined;

  constructor(vm: LuaVm) {
    this.vm = vm;
  }

  get threads(): readonly LuaScriptThread[] {
    return this.scripts;
  }

  get current(): LuaScriptThread | undefined {
    return this.running;
  }

  spawn(
    name: string,
    fn: LuaFunction,
    args: readonly LuaValue[] = []
  ): LuaScriptThread {
    const script = new LuaScriptThread(name, this.vm.createThread(fn, args));
    this.scripts.push(script);
    return script;
  }

  // Suspends whichever thread is running. The thread does not stop here - it
  // stops at the `__coro_yield()` the compiler always emits after a sleep.
  suspend(gate: LuaThreadGate): void {
    if (this.running === undefined) {
      throw new LuaRuntimeError(
        "no script thread is running, so none can be suspended"
      );
    }
    this.running.gate = gate;
  }

  // The time the running thread already waits until: a shorter sleep must not
  // pull a wake earlier.
  wakeAt(): number | undefined {
    return this.running?.gate?.deadline;
  }

  // Clears a gate early, whatever it was waiting for. This is what a `wake`
  // native binds to.
  wake(script: LuaScriptThread): void {
    script.gate = undefined;
  }

  remove(script: LuaScriptThread): void {
    const index = this.scripts.indexOf(script);
    if (index >= 0) {
      this.scripts.splice(index, 1);
    }
  }

  // One server tick: resume every thread whose gate has opened, in spawn order.
  tick(context: LuaTickContext): LuaTickReport {
    const resumed: LuaScriptThread[] = [];
    const completed: LuaScriptThread[] = [];
    const failed: LuaScriptThread[] = [];
    const report = { completed, failed, resumed };
    let pass = [...this.scripts];
    for (let round = 0; round < MAX_PASSES_PER_TICK; round++) {
      this.runPass(pass, round === 0, context, report);
      pass = this.scripts.filter(
        (script) => script.state === "ready" && !resumed.includes(script)
      );
      if (pass.length === 0) {
        break;
      }
    }
    return { tick: context.tick, resumed, completed, failed };
  }

  private runPass(
    pass: readonly LuaScriptThread[],
    pollGates: boolean,
    context: LuaTickContext,
    report: {
      completed: LuaScriptThread[];
      failed: LuaScriptThread[];
      resumed: LuaScriptThread[];
    }
  ): void {
    const { completed, failed, resumed } = report;
    for (const script of pass) {
      if (script.state === "done" || script.state === "failed") {
        continue;
      }
      if (resumed.includes(script) || !this.isRunnable(script)) {
        continue;
      }
      if (script.gate !== undefined && !pollGates) {
        continue;
      }
      if (script.gate !== undefined) {
        // A predicate runs outside the resume, so one that raises fails only its own
        // thread.
        let ready: boolean;
        try {
          ready = script.gate.isReady(context);
        } catch (error) {
          script.error =
            error instanceof Error ? error : new Error(String(error));
          script.gate = undefined;
          failed.push(script);
          continue;
        }
        if (!ready) {
          continue;
        }
      }
      script.gate = undefined;
      resumed.push(script);
      this.running = script;
      try {
        const result = script.thread.resume();
        if (result.status === "returned") {
          script.results = result.values;
          completed.push(script);
          // A returned thread is no longer a thread: is_done()/is_finished() read the
          // same list.
          this.remove(script);
        }
      } catch (error) {
        script.error =
          error instanceof Error ? error : new Error(String(error));
        failed.push(script);
        // Same for one that raised: it is not going to run again.
        this.remove(script);
      } finally {
        this.running = undefined;
      }
    }
  }
}
