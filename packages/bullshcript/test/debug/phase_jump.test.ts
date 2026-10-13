// The debugger's phase jump: the running mission is left, the asked-for one
// starts as if the activity had reached it.
import { describe, expect, it } from "vitest";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import { ScriptDebugger } from "../../src/debug/debugger.ts";
import {
  formatScriptTag,
  type ScriptSource,
} from "../../src/hks/script_source.ts";
import { fnv1 } from "../../src/host/name_hash.ts";
import { ScriptRuntime } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/runtime.ts";

const ROOT = "es/test/act_t/act_t.es";
const MISSIONS = [1, 2, 3].map((n) => `es/test/act_t/act_t_mission${n}.esp`);
const ROOT_TAG = 0x82ff_0010;

const mission = (n: number) => `# es\\test\\act_t\\act_t_mission${n}.esp
thread init: pass

thread complete: pass

thread main:
    print("mission ${n} main")
    sleep(1000)
`;

function harness() {
  const files = [
    { path: ROOT, text: "# es\\test\\act_t\\act_t.es\nint unused = 0\n" },
    ...MISSIONS.map((path, i) => ({ path, text: mission(i + 1) })),
  ];
  const compiled = compileScriptFiles(files);
  expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
    []
  );
  const rootId = formatScriptTag(ROOT_TAG);
  const missionIds = MISSIONS.map((path) => formatScriptTag(fnv1(path)));
  const read = (id: string) => {
    if (id === rootId) {
      // the root's chunk, then each mission's tag as a big-endian word
      const chunk = compiled.chunkFor(ROOT);
      const padded = Math.ceil(chunk.length / 4) * 4;
      const out = new Uint8Array(padded + missionIds.length * 4);
      out.set(chunk);
      const view = new DataView(out.buffer);
      missionIds.forEach((m, i) => {
        view.setUint32(padded + i * 4, Number.parseInt(m, 16));
      });
      return out;
    }
    const index = missionIds.indexOf(id);
    return index < 0 ? undefined : compiled.chunkFor(MISSIONS[index]);
  };
  const scripts: ScriptSource = {
    read,
    schema: (id) => {
      const index = missionIds.indexOf(id);
      if (id === rootId) {
        return compiled.compiledDecl(ROOT).schema;
      }
      return index < 0
        ? undefined
        : compiled.compiledDecl(MISSIONS[index]).schema;
    },
    tags: () => [rootId, ...missionIds],
  };
  const host = new ScriptRuntime({
    bundles: [{ bundle: 0x1234_5678, rows: [], tag: ROOT_TAG }],
    clock: { activityTicks: () => 0 },
    scriptFor: () => ROOT_TAG,
    scripts,
    tickSeconds: 1,
  });
  host.start();
  host.reportPlayerSpawned();
  const dbg = new ScriptDebugger();
  dbg.attach("t", "test", host);
  return { dbg, host };
}

describe("the debugger's phase jump", () => {
  it("leaves the running mission and starts the one asked for", () => {
    const { dbg, host } = harness();
    host.tick();
    expect(host.phases.map((p) => p.declName)).toHaveLength(3);
    expect(host.phaseIndex).toBe(0);
    const before = host.phases[0];
    expect(dbg.command("/phase mission3", "t")).toMatch(/started$/);
    expect(host.phaseIndex).toBe(2);
    expect(
      host.scheduler.threads.some(
        (s) => host.threadOwners.get(s) === before.instance
      )
    ).toBe(false);
    host.tick();
    expect(host.trace).toContain("print mission 3 main");
    expect(dbg.command("/phase", "t")).toMatch(/\* 2 /);
  });
});
