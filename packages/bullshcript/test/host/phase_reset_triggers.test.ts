// A hard wipe arms the reset phase's player triggers afresh: the client fires
// a trigger once per arming, and the host holds a fire until a script arms it
// again, so one the scripts only poll would read as fired from the restart
// (the m09 tower's skiffs all launched at once) and never fire again.
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

const { HardWipeGlobals, PlayerTrigger, Squad } = ActivityBundleItemType;

const FILES = {
  root: { path: "es/test/act_t/act_t.es", text: "int unused = 0\n" },
  mission1: {
    path: "es/test/act_t/act_t_mission1.esp",
    text: ["script init(): pass", "", "script main(): pass", ""].join("\n"),
  },
  // polls its own trigger, never arming it
  mission2: {
    path: "es/test/act_t/act_t_mission2.esp",
    text: [
      "@hard_wipe()",
      "player_trigger pt_gate",
      "",
      "script init(): pass",
      "",
      "script main():",
      "    sleep_until(pt_gate.is_triggered())",
      '    print("gate")',
      "    sleep(1000)",
      "",
    ].join("\n"),
  },
  // a skiff that launches when its trigger fires
  skiffs: {
    path: "es/test/act_t/enc_skiffs.es",
    text: [
      "squad sq_skiff",
      "player_trigger pt_skiff",
      "",
      "@startup()",
      "script sc_skiff():",
      "    sleep_until(pt_skiff.is_triggered())",
      '    print("skiff")',
      "    sq_skiff.place()",
      "",
    ].join("\n"),
  },
};

const TAGS = {
  mission1: 0x80ac_0202,
  mission2: 0x80ac_0203,
  root: 0x80ac_0201,
  skiffs: 0x80ac_0204,
};
const BUNDLE_A = 0x1112_0a01;
const BUNDLE_S = 0x1112_0d04;
const TAG_A = 0x80ac_0a01;
const TAG_S = 0x80ac_0d04;

const HARD_WIPE_GLOBALS = 1;
const PT_GATE = 2;
const SQ_SKIFF = 1;
const PT_SKIFF = 2;

const row = (name: string, typeId: number, typeIndex: number) => ({
  name,
  nameHash: fnv1(name),
  typeId,
  typeIndex,
});

function project() {
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
        row("hard_wipe_globals", HardWipeGlobals, HARD_WIPE_GLOBALS),
        row("pt_gate", PlayerTrigger, PT_GATE),
      ],
      tag: TAG_A,
    },
    {
      bundle: BUNDLE_S,
      rows: [
        {
          ...row("sq_skiff", Squad, SQ_SKIFF),
          cells: [1],
          memberCount: 1,
          memberNames: [fnv1("grunt")],
        },
        row("pt_skiff", PlayerTrigger, PT_SKIFF),
      ],
      tag: TAG_S,
    },
  ];
  return { bundles, scripts };
}

function start() {
  const { bundles, scripts } = project();
  const changes: ItemChange[] = [];
  let ticks = 0;
  const runtime = new ScriptRuntime({
    bundles,
    clock: { activityTicks: () => ticks },
    onItemChange: (change) => changes.push(change),
    scriptFor: (tag) => ({ [TAG_A]: TAGS.root, [TAG_S]: TAGS.skiffs })[tag],
    scripts,
    squadPlacedByDefault: () => false,
    tickSeconds: 1,
  });
  runtime.start();
  runtime.reportPlayerSpawned();
  const tick = (n: number) => {
    for (let i = 0; i < n; i++) {
      ticks += 30;
      runtime.tick();
    }
  };
  const printed = (text: string) =>
    runtime.trace.filter((line) => line === `print ${text}`).length;
  const triggers = (bundle: number, typeIndex: number) =>
    changes
      .filter(
        (change) =>
          change.kind === "playerTrigger" &&
          change.item.bundle === bundle &&
          change.item.typeIndex === typeIndex
      )
      .map((change) => change.state);
  const fire = (bundle: number, typeIndex: number) =>
    runtime.reportTriggerFired({ bundle, typeIndex });
  return {
    fire,
    now: () => ticks,
    printed,
    runtime,
    tick,
    triggers,
  };
}

describe("a hard wipe's player triggers", () => {
  it("are armed afresh and read as not fired until a player walks in again", () => {
    const { fire, now, printed, runtime, tick, triggers } = start();
    tick(5);
    expect(runtime.phaseIndex).toBe(1);
    fire(BUNDLE_A, PT_GATE);
    fire(BUNDLE_S, PT_SKIFF);
    tick(3);
    expect(printed("gate")).toBe(1);
    expect(printed("skiff")).toBe(1);
    // neither script ever armed its trigger
    expect(triggers(BUNDLE_A, PT_GATE)).toEqual([]);
    expect(triggers(BUNDLE_S, PT_SKIFF)).toEqual([]);

    runtime.resetCurrentPhase();
    const armedAt = now();
    expect(triggers(BUNDLE_A, PT_GATE)).toEqual([{ armedAt, enabled: true }]);
    expect(triggers(BUNDLE_S, PT_SKIFF)).toEqual([{ armedAt, enabled: true }]);

    // the fires before the wipe are forgotten
    tick(5);
    expect(printed("gate")).toBe(1);
    expect(printed("skiff")).toBe(1);

    fire(BUNDLE_S, PT_SKIFF);
    fire(BUNDLE_A, PT_GATE);
    tick(3);
    expect(printed("skiff")).toBe(2);
    expect(printed("gate")).toBe(2);
  });
});
