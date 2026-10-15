// One archetype instance per Encounter row, seen through the debugger: two
// TU0 roots declare the same row (as the World's Grave root, its mission and
// enc_strength_m3 all declare pf_obj_strength_interact_place), the row's own
// bundle's script owns the one instance and the other holds a reference.
import { describe, expect, it } from "vitest";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import { DapSession } from "../../src/debug/dap.ts";
import { ScriptDebugger } from "../../src/debug/debugger.ts";
import type { DapResponse, DapVariable } from "../../src/debug/protocol.ts";
import {
  formatScriptTag,
  type ScriptSource,
} from "../../src/hks/source/script_source.ts";
import { LuaTable } from "../../src/hks/vm/values.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";
import type { ActivityBundleTag } from "../../src/host/tags/tag_types.ts";
import { ScriptRuntime } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/runtime.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/tag_types.ts";

const DOOR = {
  path: "es/test/test_door.esu",
  text: `# es\\test\\test_door.esu
int activations = 0
int ticks = 0

startup thread sc_door:
    while true:
        ticks = ticks + 1
        sleep(1)

def activate():
    activations = activations + 1
`,
};
const OWNER = {
  path: "es/test/enc_owner.es",
  text: `# es\\test\\enc_owner.es
test_door door

startup thread sc_owner:
    sleep(1)
`,
};
const OTHER = {
  path: "es/test/enc_other.es",
  text: `# es\\test\\enc_other.es
test_door door

startup thread sc_other:
    sleep(1)
`,
};

// The door row is the owner's bundle's; the other bundle loads first, so
// it reaches the row before its owner does.
const OWNER_BUNDLE = 0x1111_0001;
const OTHER_BUNDLE = 0x2222_0002;
const OWNER_TAG = 0x80ab_0001;
const OTHER_TAG = 0x80ab_0002;
const DOOR_SCRIPT = 0x80ab_0003;
const OWNER_SCRIPT = 0x80ab_0004;
const OTHER_SCRIPT = 0x80ab_0005;

function harness() {
  const compiled = compileScriptFiles([DOOR, OWNER, OTHER]);
  expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
    []
  );
  const door = formatScriptTag(DOOR_SCRIPT);
  const files = new Map([
    [door, { path: DOOR.path, refs: [] as string[] }],
    [formatScriptTag(OWNER_SCRIPT), { path: OWNER.path, refs: [door] }],
    [formatScriptTag(OTHER_SCRIPT), { path: OTHER.path, refs: [door] }],
  ]);
  const scripts: ScriptSource = {
    read: (tagId) => {
      const entry = files.get(tagId);
      if (!entry) {
        return;
      }
      // the chunk padded to a word, then each referenced tag as a word
      const chunk = compiled.chunkFor(entry.path);
      const padded = Math.ceil(chunk.length / 4) * 4;
      const out = new Uint8Array(padded + entry.refs.length * 4);
      out.set(chunk);
      const view = new DataView(out.buffer);
      entry.refs.forEach((ref, i) => {
        view.setUint32(padded + i * 4, Number.parseInt(ref, 16));
      });
      return out;
    },
    schema: (tagId) => {
      const entry = files.get(tagId);
      return entry && compiled.compiledDecl(entry.path).schema;
    },
    tags: () => [...files.keys()],
  };
  const bundles: ActivityBundleTag[] = [
    { bundle: OTHER_BUNDLE, rows: [], tag: OTHER_TAG },
    {
      bundle: OWNER_BUNDLE,
      rows: [
        {
          childScript: "test_door",
          name: "door",
          nameHash: fnv1("door"),
          typeId: ActivityBundleItemType.Encounter,
          typeIndex: 0,
        },
      ],
      tag: OWNER_TAG,
    },
  ];
  const host = new ScriptRuntime({
    bundles,
    clock: { activityTicks: () => 0 },
    scriptFor: (tag) =>
      ({ [OWNER_TAG]: OWNER_SCRIPT, [OTHER_TAG]: OTHER_SCRIPT })[tag],
    scripts,
    tickSeconds: 1,
  });
  host.start();
  host.reportPlayerSpawned();
  const dbg = new ScriptDebugger();
  const responses: DapResponse[] = [];
  const session = new DapSession(dbg, (message) => {
    if (message.type !== "event") {
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
  dbg.attach("t", "test", host);
  // An expression's value and its members, as a client's tree shows them.
  const inspect = (expression: string) => {
    const shown = request("evaluate", { expression, targetId: "t" }) as {
      result: string;
      variablesReference: number;
    };
    const members = request("variables", {
      variablesReference: shown.variablesReference,
    }).variables as DapVariable[];
    return { members, result: shown.result };
  };
  return { dbg, host, inspect, request };
}

describe("a shared archetype in the debugger", () => {
  it("is one instance, owned by the row's own bundle's script", () => {
    const h = harness();
    h.host.tick();
    // the instance tree's roots; the door is under them, not beside them
    expect(h.dbg.instances("t").sort()).toEqual(["enc_other", "enc_owner"]);
    const owner = h.inspect("enc_owner");
    const other = h.inspect("enc_other");
    expect(owner.result).toBe("instance enc_owner");
    expect(other.result).toBe("instance enc_other");
    const ownerDoor = owner.members.find((m) => m.name === "door");
    const otherDoor = other.members.find((m) => m.name === "door");
    // the owner's member shows plainly; the reference says whose it is
    expect(ownerDoor).toMatchObject({
      type: "instance",
      value: "instance door",
    });
    expect(otherDoor).toMatchObject({
      type: "instance",
      value: "instance door (shared, owned by enc_owner)",
    });
    // both expand to the same instance's state
    const doorMembers = (variable: DapVariable | undefined) =>
      (
        h.request("variables", {
          variablesReference: variable?.variablesReference,
        }).variables as DapVariable[]
      ).map(({ name, value }) => `${name} = ${value}`);
    expect(doorMembers(ownerDoor)).toContain("ticks = 1");
    expect(doorMembers(otherDoor)).toEqual(doorMembers(ownerDoor));
    expect(h.host.instances.get("enc_owner")?.get("door")).toBe(
      h.host.instances.get("enc_other")?.get("door")
    );
  });

  it("runs one set of the instance's threads", () => {
    const h = harness();
    h.host.tick();
    const threads = (
      h.request("threads").threads as { id: number; name: string }[]
    ).map((t) => t.name);
    expect(threads.filter((name) => name.endsWith("sc_door"))).toEqual([
      "test · door.sc_door",
    ]);
    const activity = h.request("tiger/activity", { targetId: "t" }) as {
      threads: { name: string; owner?: string }[];
    };
    expect(
      activity.threads.filter((t) => t.name.endsWith("sc_door"))
    ).toMatchObject([{ owner: "door" }]);
    // a second instance would tick a second counter; one ticks once a tick
    const before = h.inspect("door.ticks").result;
    h.host.tick();
    expect(Number(h.inspect("door.ticks").result)).toBe(Number(before) + 1);
  });

  it("sends a row action to that one instance", () => {
    const h = harness();
    h.request("tiger/rowAction", {
      action: "activate",
      bundle: OWNER_BUNDLE.toString(16).padStart(8, "0"),
      targetId: "t",
      typeId: ActivityBundleItemType.Encounter,
      typeIndex: 0,
    });
    expect(h.inspect("door.activations").result).toBe("1");
    // the referencing script's door is the one that ran it
    const door = h.host.instances.get("enc_other")?.get("door");
    expect(door instanceof LuaTable && door.get("activations")).toBe(1);
  });
});
