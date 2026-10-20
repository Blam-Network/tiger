// @objective and @task through the host: the Objective a squad is against
// and the squad filter and condition of an Objective's tasks, from the
// scripts, steer the influencer walk and answer squadObjective().
import { describe, expect, it } from "vitest";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import {
  formatScriptTag,
  type ScriptSource,
} from "../../src/hks/source/script_source.ts";
import type { ItemChange, SquadState } from "../../src/host/state/items.ts";
import { FNV1_EMPTY, fnv1 } from "../../src/host/tags/name_hash.ts";
import type {
  ActivityBundleTag,
  ObjectiveTask,
} from "../../src/host/tags/tag_types.ts";
import { ScriptRuntime } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/runtime.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/tag_types.ts";

const ARCHETYPE = {
  path: "es/test/test_arch.esu",
  text: "dynamic_array<squad> _squad\nobjective _objective\n",
};
const OWNER = (decorated: boolean) => ({
  path: "es/test/enc_owner.es",
  text: `bool lane_open = true
${decorated ? "@objective(obj_a)\n" : ""}squad sq_direct
${decorated ? "@objective(obj_a)\n" : ""}squad sq_other
squad sq_plain
${decorated ? "@objective(arch._objective)\n" : ""}squad sq_extra
${decorated ? "@objective(arch._objective)\n" : ""}squad sq_extra2
${decorated ? '@objective({_squad: obj_b})\n@task("pick", objective: _objective, squad: sq_extra)\n@task("rest", objective: _objective)\n' : ""}test_arch arch
${decorated ? '@task("lane", squad: sq_direct, condition: lane_open)\n@task("open")\n' : ""}objective obj_a
objective obj_b

@startup()
script sc_owner():
    sleep(2)
    lane_open = false
`,
});

const BUNDLE = 0x1111_0002;
const BUNDLE_TAG = 0x80ab_0011;
const ARCH_SCRIPT = 0x80ab_0012;
const OWNER_SCRIPT = 0x80ab_0013;

const { Encounter, Objective, Squad } = ActivityBundleItemType;
// type indexes are kept apart so the item keys do not meet
const ARCH_SQUADS = [11, 12];
const OBJ_A = 21;
const OBJ_B = 22;
const SQ_DIRECT = 31;
const SQ_OTHER = 32;
const SQ_PLAIN = 33;
const SQ_EXTRA = 34;
const SQ_EXTRA2 = 35;
const ARCH_OBJECTIVE = 23;

const squad = (name: string, typeIndex: number) => ({
  cells: [1],
  memberCount: 1,
  memberNames: [fnv1("grunt")],
  name,
  nameHash: fnv1(name),
  typeId: Squad,
  typeIndex,
});
const node = (
  name: number,
  influencer: number,
  links: Partial<ObjectiveTask>
): ObjectiveTask => ({
  capacity: -1,
  firstChild: -1,
  influencer,
  name,
  nextSibling: -1,
  parent: -1,
  priority: 0,
  ...links,
});
const objective = (
  name: string,
  typeIndex: number,
  tasks: ObjectiveTask[]
) => ({
  name,
  nameHash: fnv1(name),
  tasks,
  typeId: Objective,
  typeIndex,
});

function start(decorated: boolean) {
  const owner = OWNER(decorated);
  const compiled = compileScriptFiles([ARCHETYPE, owner]);
  expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
    []
  );
  const files = new Map([
    [formatScriptTag(ARCH_SCRIPT), ARCHETYPE.path],
    [formatScriptTag(OWNER_SCRIPT), owner.path],
  ]);
  const refs = new Map([
    [formatScriptTag(OWNER_SCRIPT), [formatScriptTag(ARCH_SCRIPT)]],
  ]);
  const scripts: ScriptSource = {
    read: (tagId) => {
      const path = files.get(tagId);
      if (!path) {
        return;
      }
      const chunk = compiled.chunkFor(path);
      const padded = Math.ceil(chunk.length / 4) * 4;
      const tags = refs.get(tagId) ?? [];
      const out = new Uint8Array(padded + tags.length * 4);
      out.set(chunk);
      const view = new DataView(out.buffer);
      tags.forEach((ref, i) => {
        view.setUint32(padded + i * 4, Number.parseInt(ref, 16));
      });
      return out;
    },
    schema: (tagId) => {
      const path = files.get(tagId);
      return path === undefined
        ? undefined
        : compiled.compiledDecl(path).schema;
    },
    tags: () => [...files.keys()],
  };
  const bundles: ActivityBundleTag[] = [
    {
      bundle: BUNDLE,
      rows: [
        {
          childScript: "test_arch",
          name: "arch",
          nameHash: fnv1("arch"),
          typeId: Encounter,
          typeIndex: 10,
        },
        squad("arch._squad[0]", ARCH_SQUADS[0]),
        squad("arch._squad[1]", ARCH_SQUADS[1]),
        objective("obj_a", OBJ_A, [
          node(FNV1_EMPTY, -1, { firstChild: 1 }),
          node(fnv1("lane"), 1, { nextSibling: 2, parent: 0 }),
          node(fnv1("open"), 2, { parent: 0, priority: 1 }),
        ]),
        objective("obj_b", OBJ_B, [
          node(FNV1_EMPTY, -1, { firstChild: 1 }),
          node(fnv1("any"), 3, { parent: 0 }),
        ]),
        squad("sq_direct", SQ_DIRECT),
        squad("sq_other", SQ_OTHER),
        squad("sq_plain", SQ_PLAIN),
        squad("sq_extra", SQ_EXTRA),
        squad("sq_extra2", SQ_EXTRA2),
        objective("arch._objective", ARCH_OBJECTIVE, [
          node(FNV1_EMPTY, -1, { firstChild: 1 }),
          node(fnv1("pick"), 4, { nextSibling: 2, parent: 0 }),
          node(fnv1("rest"), 5, { parent: 0, priority: 1 }),
        ]),
      ],
      tag: BUNDLE_TAG,
    },
  ];
  const changes: ItemChange[] = [];
  const runtime = new ScriptRuntime({
    bundles,
    clock: { activityTicks: () => 0 },
    onItemChange: (change) => changes.push(change),
    scriptFor: () => OWNER_SCRIPT,
    scripts,
    tickSeconds: 1,
  });
  runtime.start();
  const influencer = (typeIndex: number) =>
    changes
      .filter(
        (change) =>
          change.kind === "squad" &&
          change.item.typeIndex === typeIndex &&
          (change.state as SquadState).influencer !== undefined
      )
      .map((change) => (change.state as SquadState).influencer)
      .at(-1);
  return { influencer, runtime };
}

describe("@objective and @task", () => {
  it("answers the Objective of a squad, an archetype's squads included", () => {
    const { runtime } = start(true);
    expect(runtime.squadObjective(BUNDLE, SQ_DIRECT)).toEqual({
      bundle: BUNDLE,
      typeIndex: OBJ_A,
    });
    expect(runtime.squadObjective(BUNDLE, SQ_OTHER)).toEqual({
      bundle: BUNDLE,
      typeIndex: OBJ_A,
    });
    for (const typeIndex of ARCH_SQUADS) {
      expect(runtime.squadObjective(BUNDLE, typeIndex)).toEqual({
        bundle: BUNDLE,
        typeIndex: OBJ_B,
      });
    }
    expect(runtime.squadObjective(BUNDLE, SQ_PLAIN)).toBeUndefined();
    expect(runtime.squadObjective(BUNDLE, SQ_EXTRA)).toEqual({
      bundle: BUNDLE,
      typeIndex: ARCH_OBJECTIVE,
    });
  });

  it("filters a task by its squad and gates it on its condition", () => {
    const { influencer, runtime } = start(true);
    runtime.reportPlayerSpawned();
    runtime.tick();
    // lane takes sq_direct while lane_open stands, open takes the rest
    expect(influencer(SQ_DIRECT)).toBe(1);
    expect(influencer(SQ_OTHER)).toBe(2);
    expect(influencer(ARCH_SQUADS[0])).toBe(3);
    expect(influencer(ARCH_SQUADS[1])).toBe(3);
    expect(influencer(SQ_PLAIN)).toBeUndefined();
    // an archetype instance's own Objective, gated from the declaring script
    expect(influencer(SQ_EXTRA)).toBe(4);
    expect(influencer(SQ_EXTRA2)).toBe(5);
    for (let i = 0; i < 4; i++) {
      runtime.tick();
    }
    expect(influencer(SQ_DIRECT)).toBe(2);
    expect(influencer(SQ_OTHER)).toBe(2);
  });

  it("leaves squads with no decorator out of the walk, and tasks open", () => {
    const { influencer, runtime } = start(false);
    expect(runtime.squadObjective(BUNDLE, SQ_DIRECT)).toBeUndefined();
    runtime.reportPlayerSpawned();
    runtime.tick();
    expect(influencer(SQ_DIRECT)).toBeUndefined();
  });
});
