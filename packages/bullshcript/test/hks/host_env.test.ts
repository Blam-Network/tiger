import { describe, expect, it } from "vitest";
import {
  applyUpvalueProvider,
  LuaHostEnvironment,
  LuaHostObject,
  missingGlobals,
  OBSERVED_GLOBALS,
  runMainChunk,
} from "../../src/hks/host_env.ts";
import type {
  LuaChunk,
  LuaInstruction,
  LuaPrototype,
} from "../../src/hks/types.ts";
import { LUA_TYPE_NAMES } from "../../src/hks/undump.ts";
import {
  LuaClosure,
  LuaHostFunction,
  LuaTable,
  LuaUpvalue,
  type LuaValue,
} from "../../src/hks/values.ts";
import { LuaRuntimeError, LuaVm } from "../../src/hks/vm.ts";

function prototype(overrides: Partial<LuaPrototype> = {}): LuaPrototype {
  return {
    offset: 0,
    endOffset: 0,
    nups: 0,
    numParams: 0,
    isVararg: 0,
    maxStackSize: 4,
    code: [],
    constants: [],
    unknownAfterConstants: 1,
    lineDefined: 1,
    lastLineDefined: 1,
    source: undefined,
    name: undefined,
    lineInfo: [],
    locals: [],
    upvalues: [],
    protos: [],
    ...overrides,
  };
}

// Calls a bound global the way the VM would, and reports whether it asked
// the thread to suspend.
function callGlobal(
  environment: LuaHostEnvironment,
  name: string,
  args: LuaValue[] = []
): { values: readonly LuaValue[]; yielded: boolean } {
  const fn = environment.globals.get(name);
  if (!(fn instanceof LuaHostFunction)) {
    throw new Error(`${name} is not bound`);
  }
  let yielded = false;
  const values =
    fn.callback(args, {
      name,
      requestYield: () => {
        yielded = true;
      },
    }) ?? [];
  return { values, yielded };
}

describe("OBSERVED_GLOBALS", () => {
  // Decoded from the alpha chunks' instruction stream, so it is exactly
  // the set a host has to be able to answer.
  it("lists every name the corpus reads with GETGLOBAL", () => {
    expect(OBSERVED_GLOBALS).toHaveLength(18);
    expect(
      OBSERVED_GLOBALS.map((entry) => entry.sites).reduce((a, b) => a + b)
    ).toBe(1739);
    expect(OBSERVED_GLOBALS.map((entry) => entry.name)).toContain(
      "__coro_yield"
    );
  });
});

describe("LuaHostEnvironment", () => {
  it("binds print, assert and __coro_yield and nothing else", () => {
    const environment = new LuaHostEnvironment({ log: () => undefined });
    expect(environment.unboundGlobals()).toEqual([
      "predicate_pack",
      "__class_definition_get",
      "__enum_definition_get",
      "__schema_get",
      "len",
      "enum_of",
      "enum_to_int",
      "is_instance",
      "pick_random_count",
      "event_message",
      "allocate",
      "event_error",
      "event_warning",
      "schema",
      "vector4",
    ]);
  });

  it("print joins its arguments with tabs, Lua style", () => {
    const lines: string[] = [];
    const environment = new LuaHostEnvironment({
      log: (message) => lines.push(message),
    });
    callGlobal(environment, "print", ["a", 1, true, undefined]);
    expect(lines).toEqual(["a\t1\ttrue\tnil"]);
  });

  it("assert passes its arguments through and throws on a falsy first", () => {
    const environment = new LuaHostEnvironment({ log: () => undefined });
    expect(callGlobal(environment, "assert", [1, "msg"]).values).toEqual([
      1,
      "msg",
    ]);
    expect(() => callGlobal(environment, "assert", [false])).toThrow(
      /assertion failed!/
    );
    expect(() =>
      callGlobal(environment, "assert", [
        undefined,
        "sqg_bridge_guardians.alive_count() <= 0",
      ])
    ).toThrow(/sqg_bridge_guardians/);
  });

  it("__coro_yield asks the running thread to suspend", () => {
    const environment = new LuaHostEnvironment({ log: () => undefined });
    expect(callGlobal(environment, "__coro_yield").yielded).toBe(true);
  });

  it("takes extra natives through the registry", () => {
    const environment = new LuaHostEnvironment({ log: () => undefined });
    environment.bind("len", (args) => [(args[0] as LuaTable).length()]);
    environment.bindValue("schema", "opaque");
    const table = new LuaTable();
    table.set(1, "x");
    expect(callGlobal(environment, "len", [table]).values).toEqual([1]);
    expect(environment.globals.get("schema")).toBe("opaque");
    expect(environment.unboundGlobals()).not.toContain("len");
  });
});

describe("LuaHostObject", () => {
  it("turns any unassigned string member into a bound native", () => {
    const seen: string[] = [];
    const row = new LuaHostObject("pillar_timer", ({ method, args }) => {
      seen.push(`${method}/${args.length}`);
      return [1];
    });
    const activate = row.get("activate");
    expect(activate).toBeInstanceOf(LuaHostFunction);
    expect((activate as LuaHostFunction).name).toBe("pillar_timer:activate");
    // same value on every read: the scripts compare function values
    expect(row.get("activate")).toBe(activate);
    // a method call passes the receiver first; the invocation drops it
    (activate as LuaHostFunction).callback([row, 45], {
      name: "x",
      requestYield: () => undefined,
    });
    expect(seen).toEqual(["activate/1"]);
  });

  it("lets an assigned member win over the native", () => {
    const row = new LuaHostObject("row", () => []);
    row.set("state", "armed");
    expect(row.get("state")).toBe("armed");
  });

  it("does not invent members for non-string keys", () => {
    const row = new LuaHostObject("row", () => []);
    expect(row.get(3)).toBeUndefined();
  });
});

describe("runMainChunk", () => {
  it("returns whatever the outermost prototype returns", () => {
    const vm = new LuaVm();
    const root = prototype({
      isVararg: 2,
      code: [
        // NEWTABLE R0; RETURN R0
        { raw: 0, opcode: 52, a: 0, b: 0, c: 0, bx: 0, sbx: 0 },
        { raw: 0, opcode: 9, a: 0, b: 2, c: 0, bx: 0, sbx: 0 },
      ],
    });
    const module = runMainChunk(vm, {
      tagId: "TEST",
      totalBytes: 0,
      chunkBytes: 0,
      header: {
        luaVersion: 0x51,
        formatVersion: 0x0e,
        bigEndian: true,
        sizeofInt: 4,
        sizeofSizeT: 4,
        sizeofInstruction: 4,
        sizeofNumber: 4,
        numberIsFloat: true,
      },
      typeTable: { names: new Map() },
      root,
    });
    expect(module).toBeInstanceOf(LuaTable);
  });
});

// The provider contract itself is exercised on the real chunks by the
// runtime and corpus tests; these cover the guards.
describe("applyUpvalueProvider", () => {
  function moduleWith(
    upvalueNames: string[],
    upvalues: LuaUpvalue[],
    provided: [string, LuaValue][]
  ): { module: LuaTable; vm: LuaVm } {
    const vm = new LuaVm();
    const module = new LuaTable();
    const method = new LuaClosure(
      prototype({ nups: upvalueNames.length, upvalues: upvalueNames }),
      upvalues,
      "TEST"
    );
    const instance = new LuaTable();
    instance.set("reset", method);
    module.set("instance", instance);

    const table = new LuaTable();
    for (const [key, value] of provided) {
      table.set(key, value);
    }
    // a provider is a Lua closure in the real chunks; here it is the
    // smallest one that returns a table the test built - GETUPVAL, RETURN
    module.set(
      "upvalue_provider",
      new LuaClosure(
        prototype({
          nups: 1,
          upvalues: ["table"],
          code: [
            { raw: 0, opcode: 38, a: 0, b: 0, c: 0, bx: 0, sbx: 0 },
            { raw: 0, opcode: 9, a: 0, b: 2, c: 0, bx: 0, sbx: 0 },
          ],
        }),
        [LuaUpvalue.closed(table)],
        "TEST"
      )
    );
    return { module, vm };
  }

  it("writes imports into matching upvalues by name", () => {
    const bundlelib = new LuaHostObject("native.bundlelib.bundlelib", () => []);
    const cell = LuaUpvalue.closed(false);
    const { module, vm } = moduleWith(
      ["bundlelib"],
      [cell],
      [["bundlelib", bundlelib]]
    );
    expect(applyUpvalueProvider(vm, module)).toEqual({
      applied: ["bundlelib"],
      unused: [],
    });
    expect(cell.get()).toBe(bundlelib);
  });

  // 39 of the 152 corpus modules declare an import their script never
  // captures, so this is normal rather than an error.
  it("reports an import nothing captures as unused", () => {
    const { module, vm } = moduleWith(
      ["print"],
      [LuaUpvalue.closed(new LuaHostFunction("print", () => []))],
      [["mathlib", new LuaHostObject("util.mathlib.mathlib", () => [])]]
    );
    expect(applyUpvalueProvider(vm, module)).toEqual({
      applied: [],
      unused: ["mathlib"],
    });
  });

  // false is the compiler's unbound-import sentinel - the main chunk writes
  // it with LOADBOOL before anything captures the register.
  it("stops when a captured upvalue is still the false sentinel", () => {
    const { module, vm } = moduleWith(
      ["bundlelib"],
      [LuaUpvalue.closed(false)],
      []
    );
    expect(() => applyUpvalueProvider(vm, module)).toThrow(
      /"bundlelib" are still the compiler's unbound-import sentinel/
    );
  });

  it("does nothing when a module has no provider", () => {
    expect(applyUpvalueProvider(new LuaVm(), new LuaTable())).toEqual({
      applied: [],
      unused: [],
    });
  });

  it("refuses a provider that is not a Lua closure", () => {
    const module = new LuaTable();
    module.set("upvalue_provider", new LuaHostFunction("p", () => []));
    expect(() => applyUpvalueProvider(new LuaVm(), module)).toThrow(
      LuaRuntimeError
    );
  });
});

function word(opcode: number, a = 0, bx = 0): LuaInstruction {
  return { opcode, a, b: 0, c: 0, bx, sbx: 0, raw: 0 };
}

describe("missingGlobals", () => {
  // GETGLOBAL (91) owns one trailing cache word (76); RETURN is 9.
  const chunk = (names: string[]): LuaChunk => ({
    tagId: "00000000",
    totalBytes: 0,
    chunkBytes: 0,
    header: {
      luaVersion: 0x51,
      formatVersion: 0x0e,
      bigEndian: true,
      sizeofInt: 4,
      sizeofSizeT: 4,
      sizeofInstruction: 4,
      sizeofNumber: 4,
      numberIsFloat: true,
    },
    typeTable: { names: LUA_TYPE_NAMES },
    root: prototype({
      constants: names.map((value) => ({ kind: "string", value })),
      code: [
        ...names.flatMap((_, index) => [word(91, 0, index), word(76, 20)]),
        word(9),
      ],
    }),
  });

  it("names the globals a chunk reads that nothing binds", () => {
    const environment = new LuaHostEnvironment();
    expect(
      missingGlobals(
        chunk(["print", "tu0_only_native", "assert", "another"]),
        environment.globals
      )
    ).toEqual(["another", "tu0_only_native"]);
  });

  it("is empty when the environment binds everything read", () => {
    const environment = new LuaHostEnvironment();
    expect(missingGlobals(chunk(["print"]), environment.globals)).toEqual([]);
  });
});
