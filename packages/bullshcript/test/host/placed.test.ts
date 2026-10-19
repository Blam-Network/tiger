// @placed through the host: the named members of a marked squad stand
// from the first apply, with no script placing it and whatever
// the package's default says; a squad it does not mark stays down.
import { describe, expect, it } from "vitest";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import {
  formatScriptTag,
  type ScriptSource,
} from "../../src/hks/source/script_source.ts";
import type { ActorState, ItemChange } from "../../src/host/state/items.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";
import type { ActivityBundleTag } from "../../src/host/tags/tag_types.ts";
import { ScriptRuntime } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/runtime.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/tag_types.ts";

const ARCHETYPE = (
  marked: boolean
) => `${marked ? "@placed()\n" : ""}c_squad_sensor_host _squad
c_squad_member_sensor_host _squad__gate

def standing():
    return _squad.alive_count() > 0
`;
const GATE = { path: "es/test/test_gate.esu", text: ARCHETYPE(true) };
const PLAIN = { path: "es/test/test_plain.esu", text: ARCHETYPE(false) };
const OWNER = {
  path: "es/test/enc_owner.es",
  text: `test_gate gate
test_plain plain

startup thread sc_owner:
    sleep(1)
`,
};

const BUNDLE = 0x1111_0001;
const BUNDLE_TAG = 0x80ab_0001;
const GATE_SCRIPT = 0x80ab_0003;
const PLAIN_SCRIPT = 0x80ab_0004;
const OWNER_SCRIPT = 0x80ab_0005;

const { Actor, Encounter, Squad } = ActivityBundleItemType;
const squadRows = (name: string, first: number) => [
  {
    cells: [0],
    memberCount: 1,
    memberNames: [fnv1("gate")],
    name: `${name}._squad`,
    nameHash: fnv1(`${name}._squad`),
    typeId: Squad,
    typeIndex: first,
  },
  {
    name: `${name}._squad__gate`,
    nameHash: fnv1(`${name}._squad__gate`),
    typeId: Actor,
    typeIndex: first + 1,
  },
];

function start(squadPlacedByDefault: () => boolean) {
  const compiled = compileScriptFiles([GATE, PLAIN, OWNER]);
  expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
    []
  );
  const files = new Map([
    [formatScriptTag(GATE_SCRIPT), GATE.path],
    [formatScriptTag(PLAIN_SCRIPT), PLAIN.path],
    [formatScriptTag(OWNER_SCRIPT), OWNER.path],
  ]);
  const refs = new Map([
    [
      formatScriptTag(OWNER_SCRIPT),
      [formatScriptTag(GATE_SCRIPT), formatScriptTag(PLAIN_SCRIPT)],
    ],
  ]);
  const scripts: ScriptSource = {
    read: (tagId) => {
      const path = files.get(tagId);
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
          childScript: "test_gate",
          name: "gate",
          nameHash: fnv1("gate"),
          typeId: Encounter,
          typeIndex: 0,
        },
        ...squadRows("gate", 1),
        {
          childScript: "test_plain",
          name: "plain",
          nameHash: fnv1("plain"),
          typeId: Encounter,
          typeIndex: 3,
        },
        ...squadRows("plain", 4),
      ],
      tag: BUNDLE_TAG,
    },
  ];
  const changes: ItemChange[] = [];
  const log: string[] = [];
  const runtime = new ScriptRuntime({
    bundles,
    clock: { activityTicks: () => 0 },
    log: (line) => log.push(line),
    onItemChange: (change) => changes.push(change),
    scriptFor: () => OWNER_SCRIPT,
    scripts,
    squadPlacedByDefault,
    tickSeconds: 1,
  });
  runtime.start();
  const placed = (typeIndex: number) =>
    changes
      .filter(
        (change) =>
          change.kind === "actor" && change.item.typeIndex === typeIndex
      )
      .map((change) => (change.state as ActorState).placed)
      .at(-1);
  return { log, placed, runtime };
}

describe("@placed", () => {
  it("stands a marked squad's named member at the start, nothing placing it", () => {
    const { log, placed } = start(() => false);
    expect(placed(2)).toBe(true);
    expect(log).toContain(
      "lua gate._squad__gate t2#2 placed with gate._squad (table)"
    );
  });

  it("leaves an unmarked squad down while the package's default says so", () => {
    const { placed } = start(() => false);
    expect(placed(5)).toBeUndefined();
  });

  it("counts the marked squad's body, so its actor stays placed", () => {
    const { runtime } = start(() => false);
    runtime.reportPlayerSpawned();
    for (let i = 0; i < 3; i++) {
      runtime.tick();
    }
    expect(runtime.defaultBodies(BUNDLE, 1)).toBe(1);
    expect(runtime.defaultBodies(BUNDLE, 4)).toBe(0);
  });
});
