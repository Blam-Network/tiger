import { describe, expect, it } from "vitest";
import {
  LuaHostFunction,
  LuaTable,
  type LuaValue,
} from "../../src/hks/values.ts";
import type { BoundRow } from "../../src/host/bindings.ts";
import {
  commandScriptBuilderOf,
  commandScriptIndex,
  controlPointAtoms,
  LuaCommandScriptBuilder,
} from "../../src/host/command_script.ts";
import type { CommandScriptAtom } from "../../src/host/items.ts";
import { fnv1 } from "../../src/host/name_hash.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/tag_types.ts";

const path: BoundRow = {
  bundle: 0x0a6d_9003,
  name: "fallen_dropship01_exit",
  typeId: ActivityBundleItemType.ControlPoint,
  typeIndex: 97,
};
const point = { bundle: 0x0a6d_9003, typeId: 56, typeIndex: 97 };
const exitAtoms: CommandScriptAtom[] = [
  { kind: 3, point, index: 0, stop: false, end: { kind: 0 } },
  { kind: 8, point, index: 0, end: { kind: 0 } },
];
const index = commandScriptIndex([
  { atoms: exitAtoms, bundle: 0x0a6d_9003, typeIndex: 97 },
]);

function builder() {
  const rows = new Map<LuaValue, BoundRow>();
  const notes: string[] = [];
  const handle = (row: BoundRow) => {
    const table = new LuaTable();
    rows.set(table, row);
    return table;
  };
  const cs = new LuaCommandScriptBuilder(
    ActivityBundleItemType,
    "enc.__cs",
    (value) => rows.get(value),
    (row) => controlPointAtoms(ActivityBundleItemType, index, row),
    (line) => notes.push(line)
  );
  const call = (method: string, ...args: LuaValue[]) => {
    const fn = cs.object.get(method);
    if (!(fn instanceof LuaHostFunction)) {
      throw new Error(`${method} did not resolve`);
    }
    fn.callback([cs.object, ...args], {
      name: method,
      requestYield: () => undefined,
    });
  };
  return { call, cs, handle, notes };
}

describe("command scripts", () => {
  it("looks a ControlPoint item's atoms up, and nothing else's", () => {
    expect(controlPointAtoms(ActivityBundleItemType, index, path)).toBe(
      exitAtoms
    );
    expect(
      controlPointAtoms(ActivityBundleItemType, index, { ...path, typeId: 2 })
    ).toBeUndefined();
  });

  it("builds cs_dropship_open_doors as one set_channel atom", () => {
    const { call, cs } = builder();
    expect(commandScriptBuilderOf(cs.object)).toBe(cs);
    call("clear");
    call("set_channel_scalar", "doors", 1);
    expect(cs.script).toEqual([
      {
        kind: 7,
        channel: 0x8029_6344,
        values: [1, 1, 1, 1],
        end: { kind: 0 },
      },
    ]);
  });

  // Retail's breach entrances: one kind-1 atom naming the animation, a
  // cracked name or a "0x" literal (the nest scatter's is uncracked).
  it("scripted_sequence is one kind-1 atom naming the animation", () => {
    const { call, cs } = builder();
    call("scripted_sequence", "act_fallen_vault_left");
    call("scripted_sequence", "0xF61E7211");
    expect(cs.script).toEqual([
      { kind: 1, name: 0xfc_44_a7_97, end: { kind: 0 } },
      { kind: 1, name: 0xf6_1e_72_11, end: { kind: 0 } },
    ]);
  });

  it("follows a path, then abilities, a sleep and a terminate delay", () => {
    const { call, cs, handle } = builder();
    call("snap_to", handle(path), 0);
    call("follow_path", handle(path));
    call("ability", "dropship", "exit_25");
    call("sleep", 1);
    call("point_targeted_ability", "fire", "command_script", handle(path), 2);
    call("terminate_delay", 3);
    expect(cs.script).toEqual([
      { kind: 0, point, index: 0, end: { kind: 0 } },
      ...exitAtoms,
      {
        kind: 9,
        name: fnv1("dropship"),
        argument: fnv1("exit_25"),
        slot: -1,
        index: 0,
        end: { kind: 0 },
      },
      { kind: 2, seconds: 1, end: { kind: 2, seconds: 1 } },
      {
        kind: 9,
        name: fnv1("fire"),
        argument: fnv1("command_script"),
        point,
        slot: -1,
        index: 2,
        end: { kind: 2, seconds: 3 },
      },
    ]);
  });

  it("says so when a point-targeted ability's point is not a point", () => {
    const { call, cs, handle, notes } = builder();
    const squad = handle({ ...path, typeId: ActivityBundleItemType.Squad });
    call("point_targeted_ability", "teleport", "command_script", squad, 0);
    expect(cs.script[0]).not.toHaveProperty("point");
    expect(notes.some((line) => line.includes("not a point row"))).toBe(true);
  });

  // Retail 2.3.1's Last Array wave ship leaving (cookie 2): a flag atom
  // ended at once, a move and a face on the exit path, then the exit.
  it("builds retail's dropship exit: set_flag, face and an immediate end", () => {
    const { call, cs, handle } = builder();
    call("set_flag", 3, 3);
    call("terminate_immediate");
    call("move_to", handle(path), 0, false);
    call("face", handle(path), 0);
    call("ability", "dropship", "exit_1");
    expect(cs.script).toEqual([
      { kind: 5, which: 3, value: 3, end: { kind: 1 } },
      { kind: 3, point, index: 0, stop: false, end: { kind: 0 } },
      { kind: 8, point, index: 0, end: { kind: 0 } },
      {
        kind: 9,
        name: fnv1("dropship"),
        argument: fnv1("exit_1"),
        slot: -1,
        index: 0,
        end: { kind: 0 },
      },
    ]);
  });

  it("holds no more than the client's 32 atoms", () => {
    const { call, cs } = builder();
    for (let i = 0; i < 40; i++) {
      call("sleep", 1);
    }
    expect(cs.script).toHaveLength(32);
  });
});
