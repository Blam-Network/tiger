// The script debugger on a compiled BungieScript run by the TU0 host:
// breakpoints stop one coroutine and hold its target, continue and steps go
// on from where it stood, and a waiting thread shows its stack anyway.
import { describe, expect, it } from "vitest";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import { DapSession } from "../../src/debug/dap.ts";
import { ScriptDebugger } from "../../src/debug/debugger.ts";
import type { DapEvent, DapResponse } from "../../src/debug/protocol.ts";
import type { ScriptSource } from "../../src/hks/source/script_source.ts";
import type { ItemChange } from "../../src/host/state/items.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";
import { ScriptRuntime } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/runtime.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/tag_types.ts";

const PATH = "es/test/enc_debug_test.es";
const TAG = 0x82ff_0001;
// Line numbers below are the source's.
const SOURCE = `# es\\test\\enc_debug_test.es
int counter = 0

@startup()
script sc_main():
    counter = 1
    sleep(1)
    counter = 2
    bump(10)
    counter = counter + 1

def bump(amount):
    total = counter + amount
    counter = total
`;
const LINE_COUNTER_2 = 8;
const LINE_BUMP_CALL = 9;
const LINE_AFTER_BUMP = 10;
const LINE_TOTAL = 13;

function harness(source = SOURCE) {
  const compiled = compileScriptFiles([{ path: PATH, text: source }]);
  expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
    []
  );
  const chunk = compiled.chunkFor(PATH);
  const tagId = TAG.toString(16).toUpperCase();
  const scripts: ScriptSource = {
    read: (id) => (id === tagId ? chunk : undefined),
    schema: (id) =>
      id === tagId ? compiled.compiledDecl(PATH).schema : undefined,
    tags: () => [tagId],
  };
  const changes: ItemChange[] = [];
  const host = new ScriptRuntime({
    onItemChange: (change) => changes.push(change),
    bundles: [
      {
        bundle: 0x1234_5678,
        rows: [
          {
            name: "lifetime",
            nameHash: fnv1("lifetime"),
            typeId: ActivityBundleItemType.Lifetime,
            typeIndex: 1,
          },
          {
            cells: [2],
            memberCount: 1,
            name: "sq_guards",
            nameHash: fnv1("sq_guards"),
            typeId: ActivityBundleItemType.Squad,
            typeIndex: 0,
          },
        ],
        tag: TAG,
      },
    ],
    clock: { activityTicks: () => 0 },
    scriptFor: () => TAG,
    scripts,
    tickSeconds: 1,
  });
  host.start();
  host.reportPlayerSpawned();
  const dbg = new ScriptDebugger({
    sourceText: (path) => (path === PATH ? source : undefined),
  });
  const events: DapEvent[] = [];
  const responses: DapResponse[] = [];
  const session = new DapSession(dbg, (message) => {
    if (message.type === "event") {
      events.push(message);
    } else {
      responses.push(message);
    }
  });
  let seq = 0;
  const request = (command: string, args: Record<string, unknown> = {}) => {
    seq += 1;
    session.handle({ seq, type: "request", command, arguments: args });
    const response = responses.find((r) => r.request_seq === seq);
    if (!response?.success) {
      throw new Error(`${command}: ${response?.message}`);
    }
    return response.body as Record<string, unknown>;
  };
  dbg.attach("t", "test", host, {
    standInLines: (path) =>
      path === PATH ? compiled.compiledDecl(PATH).standInLines : undefined,
  });
  const counter = () => {
    const instance = host.instances.get("enc_debug_test");
    return instance?.get("counter");
  };
  const stops = () => events.filter((e) => e.event === "stopped");
  const mainThread = () => {
    const threads = request("threads").threads as {
      id: number;
      name: string;
    }[];
    const main = threads.find((t) => t.name.endsWith("sc_main"));
    if (!main) {
      throw new Error("no sc_main");
    }
    return main.id;
  };
  const topLine = (threadId: number) =>
    (request("stackTrace", { threadId }).stackFrames as { line: number }[])[0]
      ?.line;
  return {
    changes,
    counter,
    dbg,
    events,
    host,
    mainThread,
    request,
    stops,
    topLine,
  };
}

const breakAt = (
  request: ReturnType<typeof harness>["request"],
  ...lines: number[]
) =>
  request("setBreakpoints", {
    source: { path: PATH },
    breakpoints: lines.map((line) => ({ line })),
  });

describe("the script debugger", () => {
  it("stops a thread at a breakpoint, holds the clock, and continues", () => {
    const h = harness();
    const set = breakAt(h.request, LINE_COUNTER_2);
    expect(set.breakpoints).toMatchObject([
      { line: LINE_COUNTER_2, verified: true },
    ]);
    for (let i = 0; i < 4 && h.stops().length === 0; i++) {
      h.host.tick();
    }
    expect(h.stops()).toHaveLength(1);
    expect(h.counter()).toBe(1);
    const thread = h.mainThread();
    expect(h.topLine(thread)).toBe(LINE_COUNTER_2);
    // held: ticks do nothing, the clock stands
    const time = h.host.now;
    h.host.tick();
    expect(h.host.now).toBe(time);
    expect(h.counter()).toBe(1);
    h.request("setBreakpoints", { source: { path: PATH }, breakpoints: [] });
    h.request("continue");
    expect(h.counter()).toBe(13);
  });

  it("steps over a call, into one, and shows its locals", () => {
    const h = harness();
    breakAt(h.request, LINE_BUMP_CALL);
    for (let i = 0; i < 4 && h.stops().length === 0; i++) {
      h.host.tick();
    }
    const thread = h.mainThread();
    expect(h.topLine(thread)).toBe(LINE_BUMP_CALL);
    h.request("setBreakpoints", { source: { path: PATH }, breakpoints: [] });
    h.request("stepIn", { threadId: thread });
    expect(h.topLine(thread)).toBe(LINE_TOTAL);
    h.request("next", { threadId: thread });
    const frames = h.request("stackTrace", { threadId: thread })
      .stackFrames as { id: number; name: string }[];
    expect(frames[0].name).toBe("bump");
    const scopes = h.request("scopes", { frameId: frames[0].id }).scopes as {
      variablesReference: number;
    }[];
    const locals = h.request("variables", {
      variablesReference: scopes[0].variablesReference,
    }).variables as { name: string; value: string }[];
    expect(locals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "amount", value: "10" }),
        expect.objectContaining({ name: "total", value: "12" }),
      ])
    );
    // out of bump: the caller's next instruction, on the line after the call
    h.request("stepOut", { threadId: thread });
    expect(h.topLine(thread)).toBe(LINE_AFTER_BUMP);
    h.request("continue");
    expect(h.counter()).toBe(13);
  });

  it("logs a logpoint without stopping, and evaluates in a frame", () => {
    const h = harness();
    h.request("setBreakpoints", {
      source: { path: PATH },
      breakpoints: [{ line: LINE_TOTAL, logMessage: "amount is {amount}" }],
    });
    for (let i = 0; i < 4; i++) {
      h.host.tick();
    }
    expect(h.stops()).toHaveLength(0);
    expect(h.host.trace).toContain(
      `logpoint ${PATH}:${LINE_TOTAL}: amount is 10`
    );
    expect(h.dbg.evaluate("counter * 2", undefined, "t").result).toBe("26");
  });

  it("shows a waiting thread's stack and wakes it early", () => {
    const h = harness();
    h.host.tick();
    const thread = h.mainThread();
    const activity = h.request("tiger/activity", { targetId: "t" });
    const main = (
      activity.threads as { id: number; waitingOn?: string }[]
    ).find((t) => t.id === thread);
    expect(main?.waitingOn).toMatch(/until time/);
    expect(h.topLine(thread)).toBe(7);
    h.request("pause");
    h.request("tiger/wake", { threadId: thread });
    expect(h.counter()).toBe(13);
  });

  it("runs one tick at a time while frozen", () => {
    const h = harness();
    h.request("pause");
    const before = h.host.ticks;
    h.request("tiger/stepTick", { targetId: "t" });
    expect(h.host.ticks).toBe(before + 1);
    h.host.tick();
    expect(h.host.ticks).toBe(before + 1);
    expect(h.counter()).toBe(1);
  });

  it("files a trace line under the line it came from", () => {
    const h = harness();
    h.request("setBreakpoints", {
      source: { path: PATH },
      breakpoints: [{ line: LINE_COUNTER_2, logMessage: "here" }],
    });
    for (let i = 0; i < 4; i++) {
      h.host.tick();
    }
    const trace = h.request("tiger/trace", { targetId: "t" }).entries as {
      line?: number;
      path?: string;
      text: string;
      thread?: string;
    }[];
    expect(trace.find((entry) => entry.text.endsWith(": here"))).toMatchObject({
      line: LINE_COUNTER_2,
      path: PATH,
      thread: "sc_main",
    });
  });

  it("stops on a BungieScript condition", () => {
    const h = harness();
    h.request("setBreakpoints", {
      source: { path: PATH },
      breakpoints: [
        { line: LINE_TOTAL, condition: "amount == 10 and counter != 0" },
      ],
    });
    for (let i = 0; i < 4 && h.stops().length === 0; i++) {
      h.host.tick();
    }
    expect(h.stops()).toHaveLength(1);
    expect(h.topLine(h.mainThread())).toBe(LINE_TOTAL);
  });

  it("lists bundle rows and acts on them from their menu", () => {
    const h = harness();
    const { bundles } = h.request("tiger/bundles", { targetId: "t" }) as {
      bundles: {
        bundle: string;
        rows: { actions: { name: string }[]; name: string; type: string }[];
      }[];
    };
    const row = bundles[0].rows.find((r) => r.name === "sq_guards");
    expect(row).toMatchObject({ name: "sq_guards", type: "Squad" });
    expect(row?.actions.map((a) => a.name)).toContain("place");
    h.request("tiger/rowAction", {
      targetId: "t",
      bundle: bundles[0].bundle,
      typeId: ActivityBundleItemType.Squad,
      typeIndex: 0,
      action: "place",
    });
    expect(h.host.itemState.bodiesFor(0x1234_5678, 0)).toBe(2);
  });

  it("answers / commands on the console and sends incidents", () => {
    const h = harness();
    h.host.tick();
    const threads = h.request("evaluate", {
      expression: "/threads",
      targetId: "t",
    });
    expect(String(threads.result)).toMatch(/sc_main/);
    h.request("evaluate", {
      expression: "/incident playerDied characterKey=abc",
      targetId: "t",
    });
    expect(
      h.host.trace.some((line) => line.includes("incident playerDied"))
    ).toBe(true);
    h.request("evaluate", { expression: "/wake sc_main", targetId: "t" });
    h.host.tick();
    expect(h.counter()).toBe(13);
  });

  it("lets a frozen activity go when the last client leaves", () => {
    const h = harness();
    breakAt(h.request, LINE_COUNTER_2);
    for (let i = 0; i < 4 && h.stops().length === 0; i++) {
      h.host.tick();
    }
    expect(h.host.scheduler.paused).toBe(true);
    h.request("disconnect");
    expect(h.host.scheduler.paused).toBe(false);
    expect(h.counter()).toBe(13);
  });

  it("jumps to a mission phase and answers the embedder's requests", () => {
    const h = harness();
    h.dbg.registerRequest("tiger/players", () => ({ players: ["p1"] }));
    expect(h.request("tiger/players")).toEqual({ players: ["p1"] });
    expect(() =>
      h.request("tiger/activatePhase", { targetId: "t", phase: 0 })
    ).toThrow(/no mission phase/);
  });

  // An activity with no scripts never spawns its players: nothing moves the
  // lifetime on. The console can.
  it("sets the lifetime to active from a BungieScript expression", () => {
    const h = harness();
    h.request("evaluate", {
      expression:
        "c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.active)",
      targetId: "t",
    });
    expect(h.changes.at(-1)).toMatchObject({
      kind: "lifetime",
      state: { state: 2 },
    });
  });

  it("stands on the file's lines when decorators above them are not counted", () => {
    // the decorator line above the script is left out of the chunk's lines
    const source = `@activity_bundle("enc_debug_test")
${SOURCE}`;
    const h = harness(source);
    const fileLine = LINE_COUNTER_2 + 1;
    const set = breakAt(h.request, fileLine);
    expect(set.breakpoints).toMatchObject([{ line: fileLine, verified: true }]);
    for (let i = 0; i < 4 && h.stops().length === 0; i++) {
      h.host.tick();
    }
    expect(h.stops()).toHaveLength(1);
    expect(h.topLine(h.mainThread())).toBe(fileLine);
    // a breakpoint on the decorator's own line lands on the next line with code
    const onDecorator = breakAt(h.request, 1);
    expect(onDecorator.breakpoints).toMatchObject([
      { line: 2, verified: true },
    ]);
  });
});
