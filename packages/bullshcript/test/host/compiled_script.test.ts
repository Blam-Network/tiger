import { describe, expect, it } from "vitest";
import { compile } from "../../src/hks/compile.ts";
import type { ScriptSource } from "../../src/hks/script_source.ts";
import type { ItemChange } from "../../src/host/items.ts";
import { fnv1 } from "../../src/host/name_hash.ts";
import { ScriptRuntime } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/runtime.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/tag_types.ts";

// Scripts in Bungie's emitted shape, compiled from source and run by the TU0
// host.

const BUNDLE = 0x1111_2222;
const TAG = "82FF0001";

const PREAMBLE = `
local _M = {}
_M.decl_name = "enc_compiled_test"
_M.definition = {}
_M.instance = {}
local print = print
local assert = assert
local bundlelib = false
`;

const PROVIDER = `
function _M.upvalue_provider()
  local _result = { bundlelib = __class_definition_get("native.bundlelib.bundlelib") }
  return _result
end
return _M
`;

const row = (
  name: string,
  typeId: number,
  typeIndex: number,
  extra: object = {}
) => ({ name, nameHash: fnv1(name), typeId, typeIndex, ...extra });

function activity(body: string) {
  const bytes = compile(PREAMBLE + body + PROVIDER, {
    chunkName: "@es\\test\\enc_compiled_test.es",
  });
  const scripts: ScriptSource = {
    read: (tagId) => (tagId === TAG ? bytes : undefined),
    tags: () => [TAG],
  };
  const changes: ItemChange[] = [];
  const log: string[] = [];
  const runtime = new ScriptRuntime({
    bundles: [
      {
        bundle: BUNDLE,
        rows: [
          row("sq_guards", ActivityBundleItemType.Squad, 0, {
            cells: [2],
            memberCount: 1,
          }),
          row("sq_reinforcements", ActivityBundleItemType.Squad, 1, {
            cells: [3],
            memberCount: 1,
          }),
          row("po_kill_guards", ActivityBundleItemType.PlayerObjective, 2),
        ],
        tag: 0x809b_0001,
      },
    ],
    clock: { activityTicks: () => 0 },
    log: (line) => log.push(line),
    onItemChange: (change) => changes.push(change),
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
  const alive = (typeIndex: number, count: number) =>
    runtime.reportSquadAlive({ bundle: BUNDLE, typeIndex }, count);
  const objective = () =>
    changes
      .filter((change) => change.kind === "playerObjective")
      .map((change) => (change.state as { state: number }).state);
  const bodies = (typeIndex: number) =>
    changes
      .filter(
        (change) =>
          change.kind === "squad" && change.item.typeIndex === typeIndex
      )
      .map((change) => (change.state as { bodies: number }).bodies);
  const prints = () =>
    log
      .filter((line) => line.includes(" print "))
      .map((line) => line.split(" print ")[1]);
  return { alive, bodies, objective, prints, ticks };
}

describe("a compiled encounter script", () => {
  it("places a squad, waits it out with sleep_until and completes", () => {
    const { alive, bodies, objective, prints, ticks } = activity(`
function _M.instance:main_d_execute_impl()
  print("guards incoming")
  self.sq_guards:place()
  self.po_kill_guards:set_active()
  bundlelib:sleep_until(predicate_pack(function()
    return self.sq_guards:alive_count() <= 0, "sq_guards.alive_count() <= 0"
  end), 1)
  __coro_yield()
  self.po_kill_guards:set_complete()
  print("guards down")
end
`);
    ticks(3);
    expect(prints()).toEqual(["guards incoming"]);
    expect(bodies(0).at(-1)).toBe(2);
    alive(0, 2);
    ticks(2);
    expect(prints()).toEqual(["guards incoming"]);
    alive(0, 0);
    ticks(2);
    expect(prints()).toEqual(["guards incoming", "guards down"]);
    // active, then complete (PlayerObjectiveStage)
    expect(objective()).toEqual([2, 3]);
  });

  it("paces waves with a loop, a counter and sleep", () => {
    const { alive, bodies, prints, ticks } = activity(`
function _M.instance:main_d_execute_impl()
  self.wave = 0
  self.sq_guards:place()
  while self.sq_guards:alive_count() > 0 do
    bundlelib:sleep(1)
    __coro_yield()
  end
  for sq in pick_random_count(1, self.sq_reinforcements) do
    self.wave = self.wave + 1
    sq:place()
  end
  print("wave " .. self.wave)
end
`);
    ticks(2);
    alive(0, 2);
    ticks(3);
    expect(bodies(1)).not.toContain(3);
    alive(0, 0);
    ticks(3);
    expect(bodies(1).at(-1)).toBe(3);
    expect(prints()).toEqual(["wave 1"]);
  });

  // u_event_dropship_point_temp binds `dev_x[i]` over `o_x[i]`, then its
  // callers loop to `len(dev_x)`; with no rows that must be 0, not forever.
  it("counts an array import slot with no rows as empty", () => {
    const { prints, ticks } = activity(`
function _M.instance:user_import()
  for i, obj in enum_of(self.o_cov) do
    self.dev_cov[i]:import_only_bind(self.o_cov[i])
  end
end
function _M.instance:main_d_execute_impl()
  print("covers " .. len(self.dev_cov))
end
`);
    ticks(2);
    expect(prints()).toEqual(["covers 0"]);
  });
});
