import { describe, expect, it } from "vitest";
import { compile } from "../../src/hks/compile.ts";
import type { ScriptSource } from "../../src/hks/script_source.ts";
import { ScriptRuntime } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/runtime.ts";

// The thread natives against the xex's semantics: wake, kill, is_running =
// started && !finished, is_finished; restart is host-only.

const BUNDLE = 0x1111_2222;
const TAG = "82FF0002";

const PREAMBLE = `
local _M = {}
_M.decl_name = "enc_thread_test"
_M.definition = {}
_M.instance = {}
local print = print
local tostring = tostring
local bundlelib = false
`;

const PROVIDER = `
function _M.upvalue_provider()
  local _result = { bundlelib = __class_definition_get("native.bundlelib.bundlelib") }
  return _result
end
return _M
`;

function activity(body: string) {
  const bytes = compile(PREAMBLE + body + PROVIDER, {
    chunkName: "@es\\test\\enc_thread_test.es",
  });
  const scripts: ScriptSource = {
    read: (tagId) => (tagId === TAG ? bytes : undefined),
    tags: () => [TAG],
  };
  const log: string[] = [];
  const runtime = new ScriptRuntime({
    bundles: [{ bundle: BUNDLE, rows: [], tag: 0x809b_0002 }],
    clock: { activityTicks: () => 0 },
    log: (line) => log.push(line),
    scriptFor: () => Number.parseInt(TAG, 16),
    scripts,
    tickSeconds: 1,
  });
  runtime.start();
  runtime.reportPlayerSpawned();
  const ticks = (count: number) => {
    for (let i = 0; i < count; i++) {
      runtime.tick();
    }
  };
  const prints = () =>
    log
      .filter((line) => line.includes(" print "))
      .map((line) => line.split(" print ")[1]);
  const notes = (text: string) => log.filter((line) => line.includes(text));
  return { notes, prints, ticks };
}

describe("thread natives", () => {
  it("wake starts a thread never run and does nothing once it has finished", () => {
    const { notes, prints, ticks } = activity(`
function _M.instance:worker_d_execute_impl()
  print("worker ran")
end
function _M.instance:main_d_execute_impl()
  print("before " .. tostring(self.worker:is_running()) .. " " .. tostring(self.worker:is_finished()))
  self.worker:wake()
  bundlelib:sleep(1)
  __coro_yield()
  print("after " .. tostring(self.worker:is_running()) .. " " .. tostring(self.worker:is_finished()))
  self.worker:wake()
  bundlelib:sleep(1)
  __coro_yield()
  print("done")
end
`);
    ticks(6);
    expect(prints()).toEqual([
      "before false false",
      "worker ran",
      "after false true",
      "done",
    ]);
    expect(notes("worker:wake() has finished, cannot be woken")).toHaveLength(
      1
    );
  });

  it("wake resumes a waiting thread where it slept, not from the top", () => {
    const { prints, ticks } = activity(`
function _M.instance:sleeper_d_execute_impl()
  print("sleeper start")
  bundlelib:sleep(100)
  __coro_yield()
  print("sleeper woke")
end
function _M.instance:main_d_execute_impl()
  self.sleeper:restart()
  bundlelib:sleep(1)
  __coro_yield()
  self.sleeper:wake()
  bundlelib:sleep(1)
  __coro_yield()
  print("running " .. tostring(self.sleeper:is_running()))
end
`);
    ticks(6);
    expect(prints()).toEqual([
      "sleeper start",
      "sleeper woke",
      "running false",
    ]);
  });

  it("kill acts only on a running thread, and logs otherwise", () => {
    const { notes, prints, ticks } = activity(`
function _M.instance:worker_d_execute_impl()
  bundlelib:sleep(100)
  __coro_yield()
  print("worker finished")
end
function _M.instance:main_d_execute_impl()
  self.worker:kill()
  self.worker:restart()
  bundlelib:sleep(1)
  __coro_yield()
  print("running " .. tostring(self.worker:is_running()))
  self.worker:kill()
  print("after kill " .. tostring(self.worker:is_running()) .. " " .. tostring(self.worker:is_finished()))
  self.worker:kill()
end
`);
    ticks(6);
    expect(prints()).toEqual(["running true", "after kill false true"]);
    expect(notes("tried to kill thread before it was started")).toHaveLength(1);
    expect(notes("worker:kill() already finished")).toHaveLength(1);
  });

  it("restart runs a thread from the top, running or not", () => {
    const { prints, ticks } = activity(`
function _M.instance:worker_d_execute_impl()
  print("worker start")
  bundlelib:sleep(100)
  __coro_yield()
end
function _M.instance:main_d_execute_impl()
  self.worker:restart()
  bundlelib:sleep(1)
  __coro_yield()
  self.worker:restart()
  bundlelib:sleep(1)
  __coro_yield()
  print("running " .. tostring(self.worker:is_running()))
end
`);
    ticks(6);
    expect(prints()).toEqual(["worker start", "worker start", "running true"]);
  });
});
