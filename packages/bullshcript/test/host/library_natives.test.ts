import { describe, expect, it } from "vitest";
import { LuaHostEnvironment } from "../../src/hks/host_env.ts";
import {
  LuaHostFunction,
  LuaTable,
  type LuaValue,
} from "../../src/hks/values.ts";
import {
  bindLibraryNatives,
  formatEventMessage,
  LuaSchemaHandle,
} from "../../src/host/library_natives.ts";

function environment(enumValue?: (member: string) => number | undefined) {
  const lines: string[] = [];
  const env = new LuaHostEnvironment();
  bindLibraryNatives(env, { enumValue, log: (line) => lines.push(line) });
  const call = (name: string, ...args: LuaValue[]): LuaValue => {
    const fn = env.globals.get(name) as LuaHostFunction;
    expect(fn).toBeInstanceOf(LuaHostFunction);
    return (fn.callback(args, { name, requestYield: () => undefined }) ??
      [])[0];
  };
  return { call, lines };
}

describe("library natives", () => {
  it("gives one handle per schema name", () => {
    const { call } = environment();
    const first = call("__schema_get", "native.spasahalib.i_weapon");
    expect(first).toBeInstanceOf(LuaSchemaHandle);
    expect(call("__schema_get", "native.spasahalib.i_weapon")).toBe(first);
    expect(call("__schema_get", "native.spasahalib.i_weapon_barrel")).not.toBe(
      first
    );
  });

  it("remembers what schema an allocation came from", () => {
    const { call } = environment();
    const list = call(
      "__schema_get",
      "native.spasahalib.s_damage_attacker_list"
    );
    const other = call("__schema_get", "native.spasahalib.s_hop_on_state");
    const instance = call("allocate", list);
    expect(instance).toBeInstanceOf(LuaTable);
    expect(call("schema", instance)).toBe(list);
    expect(call("is_instance", instance, list)).toBe(true);
    expect(call("is_instance", instance, other)).toBe(false);
    expect(call("is_instance", new LuaTable(), list)).toBe(false);
    expect(call("schema", new LuaTable())).toBeUndefined();
  });

  it("answers enum_to_int from the caller's enum values, else nil", () => {
    const values: Record<string, number> = { "e_assault_rifle_type.auto": 0 };
    expect(
      environment((member) => values[member]).call(
        "enum_to_int",
        "e_assault_rifle_type.auto"
      )
    ).toBe(0);
    expect(
      environment().call("enum_to_int", "e_assault_rifle_type.auto")
    ).toBeUndefined();
  });

  it("logs events with their arguments filled in", () => {
    const { call, lines } = environment();
    call("event_warning", "route %s not present (%d)", "default", 3);
    call("event_message", "entering import for damage component.");
    expect(lines).toEqual([
      "event warning: route default not present (3)",
      "event message: entering import for damage component.",
    ]);
  });

  it("builds a vector4 table", () => {
    const vector = environment().call("vector4", 1, 2, 3) as LuaTable;
    expect(["x", "y", "z", "w"].map((axis) => vector.get(axis))).toEqual([
      1, 2, 3, 0,
    ]);
  });

  it("leaves unmatched specifiers alone", () => {
    expect(formatEventMessage(["%s and %s", "one"])).toBe("one and %s");
  });
});
