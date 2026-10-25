// Archetypes and prefab rows through the host: two phases that name a row
// alike can run it as different archetypes, a prefab's row family reads as
// a list off its handle, a squad of named actors takes them out with it, and
// an object bound by identifier is used by the interaction naming it.
import { describe, expect, it } from "vitest";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import {
  formatScriptTag,
  type ScriptSource,
} from "../../src/hks/source/script_source.ts";
import type { ItemChange } from "../../src/host/state/items.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";
import type { ActivityBundleTag } from "../../src/host/tags/tag_types.ts";
import { ScriptRuntime } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/runtime.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/tag_types.ts";

const { Actor, Encounter, Object: ObjectRow, Squad } = ActivityBundleItemType;

const FILES = {
  root: {
    path: "es/test/act_p/act_p.es",
    text: ["act_p_mission1 phase_a", "act_p_mission2 phase_b", ""].join("\n"),
  },
  // the valley's goto: a volume objective, no import of its own
  mission1: {
    path: "es/test/act_p/act_p_mission1.esp",
    text: [
      "volume_goto sp_objective_goto",
      "",
      "script init(): pass",
      "",
      "script main():",
      "    sp_objective_goto.announce()",
      "",
    ].join("\n"),
  },
  // the catacombs' goto: a bubble objective bound to its location
  mission2: {
    path: "es/test/act_p/act_p_mission2.esp",
    text: [
      'bubble_goto sp_objective_goto bind("catacombs")',
      "",
      "script init(): pass",
      "",
      "script main():",
      "    sp_objective_goto.announce()",
      "",
    ].join("\n"),
  },
  volume: {
    path: "es/test/act_p/volume_goto.esu",
    text: ["def announce():", '    print("volume goto")', ""].join("\n"),
  },
  bubble: {
    path: "es/test/act_p/bubble_goto.esu",
    text: [
      "def import_only_bind(location):",
      "    return true",
      "",
      "def announce():",
      '    print("bubble goto")',
      "",
    ].join("\n"),
  },
  // an area encounter with a placement prefab and a cloud
  area: {
    path: "es/test/act_p/enc_area.es",
    text: [
      "encounter_handle sp_placement_set",
      "squad sq_cloud",
      'object o_kiosk bind("0xE2E80144")',
      "",
      "@startup()",
      "script sc_kiosk():",
      "    sleep_until(o_kiosk.is_active())",
      '    print("kiosk used")',
      "",
      "@startup()",
      "script main():",
      "    for i in range(0, 2):",
      "        sp_placement_set._objects[i].create()",
      "    sq_cloud.place()",
      "    sleep(1)",
      "    sq_cloud.remove()",
      "    sleep(1)",
      "    sq_cloud.place()",
      "    sleep(1000)",
      "",
    ].join("\n"),
  },
};

const TAGS = {
  area: 0x80ac_0106,
  bubble: 0x80ac_0105,
  mission1: 0x80ac_0102,
  mission2: 0x80ac_0103,
  root: 0x80ac_0101,
  volume: 0x80ac_0104,
};
const BUNDLE_A = 0x2222_0a01;
const BUNDLE_B = 0x2222_0b02;
const TAG_A = 0x80ac_0a01;
const TAG_B = 0x80ac_0b02;

const row = (name: string, typeId: number, typeIndex: number) => ({
  name,
  nameHash: fnv1(name),
  typeId,
  typeIndex,
});

function start() {
  const compiled = compileScriptFiles(Object.values(FILES));
  expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
    []
  );
  const byTag = new Map(
    (Object.keys(FILES) as (keyof typeof FILES)[]).map((name) => [
      formatScriptTag(TAGS[name]),
      FILES[name].path,
    ])
  );
  const refs = new Map([
    [
      formatScriptTag(TAGS.root),
      [formatScriptTag(TAGS.mission1), formatScriptTag(TAGS.mission2)],
    ],
    [formatScriptTag(TAGS.mission1), [formatScriptTag(TAGS.volume)]],
    [formatScriptTag(TAGS.mission2), [formatScriptTag(TAGS.bubble)]],
  ]);
  const scripts: ScriptSource = {
    read: (tagId) => {
      const path = byTag.get(tagId);
      if (!path) {
        return;
      }
      // the chunk padded to a word, then each referenced tag as a word
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
      const path = byTag.get(tagId);
      return path === undefined
        ? undefined
        : compiled.compiledDecl(path).schema;
    },
    tags: () => [...byTag.keys()],
  };
  const bundles: ActivityBundleTag[] = [
    {
      bundle: BUNDLE_A,
      rows: [
        // neither row names its archetype: the declaring phase does
        row("phase_a.sp_objective_goto", Encounter, 1),
        row("phase_b.sp_objective_goto", Encounter, 2),
      ],
      tag: TAG_A,
    },
    {
      bundle: BUNDLE_B,
      rows: [
        row("sp_placement_set", Encounter, 1),
        row("sp_placement_set._objects[0]", ObjectRow, 2),
        row("sp_placement_set._objects[1]", ObjectRow, 3),
        // the cloud: its only cell is its pilot's
        {
          ...row("sq_cloud", Squad, 4),
          cells: [0],
          memberCount: 1,
          memberNames: [fnv1("pilot")],
        },
        row("sq_cloud__pilot", Actor, 5),
        // no import identifier of its own: the script's bind gives it one
        row("o_kiosk", ObjectRow, 6),
      ],
      tag: TAG_B,
    },
  ];
  const changes: ItemChange[] = [];
  const runtime = new ScriptRuntime({
    bundles,
    clock: { activityTicks: () => 0 },
    log: () => undefined,
    onItemChange: (change) => changes.push(change),
    players: () => [{ characterKey: "a", powerLevel: undefined, ready: true }],
    scriptFor: (tag) => ({ [TAG_A]: TAGS.root, [TAG_B]: TAGS.area })[tag],
    scripts,
    squadPlacedByDefault: () => false,
    tickSeconds: 1,
  });
  runtime.start();
  runtime.reportPlayerSpawned();
  for (let i = 0; i < 6; i++) {
    runtime.tick();
  }
  return { changes, runtime };
}

describe("a row two phases name alike", () => {
  it("runs as the archetype each phase declares", () => {
    const { runtime } = start();
    expect(runtime.trace.some((line) => line.includes("did not load"))).toBe(
      false
    );
    expect(runtime.trace).toContain("print volume goto");
    expect(runtime.trace).toContain("print bubble goto");
  });
});

describe("a placement prefab's row family", () => {
  it("reads as a list of its rows off the handle", () => {
    const { changes, runtime } = start();
    expect(runtime.trace.some((line) => line.includes("failed"))).toBe(false);
    const created = changes.flatMap((change) =>
      change.kind === "object" &&
      change.item.bundle === BUNDLE_B &&
      change.state.present
        ? [change.item.typeIndex]
        : []
    );
    expect(new Set(created)).toEqual(new Set([2, 3]));
  });
});

describe("a squad of named actors", () => {
  it("takes its actors out with it and puts them back", () => {
    const { changes } = start();
    const placed = changes.flatMap((change) =>
      change.kind === "actor" &&
      change.item.bundle === BUNDLE_B &&
      change.item.typeIndex === 5
        ? [change.state.placed]
        : []
    );
    expect(placed.filter((value, i) => value !== placed[i - 1])).toEqual([
      true,
      false,
      true,
    ]);
  });
});

describe("an object bound by identifier", () => {
  it("is used by the interaction naming that identifier", () => {
    const { runtime } = start();
    expect(runtime.trace).not.toContain("print kiosk used");
    runtime.reportInteraction((name) => name === 0xe2_e8_01_44);
    runtime.tick();
    runtime.tick();
    expect(runtime.trace).toContain("print kiosk used");
  });
});
