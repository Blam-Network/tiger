import { describe, expect, it } from "vitest";
import {
  isFunction,
  isTruthy,
  LuaClosure,
  LuaHostFunction,
  LuaTable,
  LuaTypeError,
  LuaUpvalue,
  luaEquals,
  luaLessEqual,
  luaLessThan,
  luaToString,
  toNumber,
  typeName,
} from "../../src/hks/vm/values.ts";

describe("truth and type", () => {
  it("counts only nil and false", () => {
    expect(isTruthy(undefined)).toBe(false);
    expect(isTruthy(false)).toBe(false);
    expect(isTruthy(0)).toBe(true);
    expect(isTruthy("")).toBe(true);
    expect(isTruthy(new LuaTable())).toBe(true);
  });

  it("names every value kind", () => {
    expect(typeName(undefined)).toBe("nil");
    expect(typeName(true)).toBe("boolean");
    expect(typeName(1)).toBe("number");
    expect(typeName("s")).toBe("string");
    expect(typeName(new LuaTable())).toBe("table");
    expect(typeName(new LuaHostFunction("f", () => []))).toBe("function");
  });

  it("recognises both kinds of function", () => {
    expect(isFunction(new LuaHostFunction("f", () => []))).toBe(true);
    expect(isFunction(new LuaTable())).toBe(false);
    expect(isFunction(undefined)).toBe(false);
  });
});

describe("tables", () => {
  it("keeps integer keys from 1 in the array part and the rest in the hash", () => {
    const table = new LuaTable();
    table.set(1, "a");
    table.set(2, "b");
    table.set("name", "c");
    // this compiler indexes from 0, so t[0] is a hash key, not an array slot
    table.set(0, "zero");
    expect(table.array).toEqual(["a", "b"]);
    expect(table.length()).toBe(2);
    expect(table.get(0)).toBe("zero");
    expect(table.get("name")).toBe("c");
    expect([...table.hash.keys()]).toEqual(["name", 0]);
  });

  it("absorbs hash keys that extend the array part", () => {
    const table = new LuaTable();
    table.set(2, "b");
    table.set(3, "c");
    expect(table.length()).toBe(0);
    table.set(1, "a");
    expect(table.array).toEqual(["a", "b", "c"]);
    expect(table.hash.size).toBe(0);
  });

  it("treats assigning nil as removal", () => {
    const table = new LuaTable();
    table.set("k", 1);
    table.set("k", undefined);
    expect(table.get("k")).toBeUndefined();
    expect(table.hash.size).toBe(0);
  });

  it("refuses nil and NaN as keys", () => {
    const table = new LuaTable();
    expect(() => table.set(undefined, 1)).toThrow(LuaTypeError);
    expect(() => table.set(Number.NaN, 1)).toThrow(LuaTypeError);
  });

  it("puts -0 and 0 in the same slot", () => {
    const table = new LuaTable();
    table.set(-0, "zero");
    expect(table.get(0)).toBe("zero");
  });

  it("enumerates the array part before the hash part", () => {
    const table = new LuaTable();
    table.set(1, "a");
    table.set("k", "v");
    expect([...table.entries()]).toEqual([
      [1, "a"],
      ["k", "v"],
    ]);
  });
});

describe("comparison and coercion", () => {
  it("compares raw - there are no metatables in this VM", () => {
    const table = new LuaTable();
    expect(luaEquals(table, table)).toBe(true);
    expect(luaEquals(new LuaTable(), new LuaTable())).toBe(false);
    expect(luaEquals(1, 1)).toBe(true);
    expect(luaEquals(1, "1")).toBe(false);
  });

  it("orders numbers and strings but nothing across types", () => {
    expect(luaLessThan(1, 2)).toBe(true);
    expect(luaLessEqual(2, 2)).toBe(true);
    expect(luaLessThan("a", "b")).toBe(true);
    expect(() => luaLessThan(1, "b")).toThrow(LuaTypeError);
  });

  it("coerces numeric strings in arithmetic the way hks's strtod path does", () => {
    expect(toNumber(3)).toBe(3);
    expect(toNumber(" 3.5 ")).toBe(3.5);
    expect(toNumber("0x10")).toBe(16);
    expect(toNumber("1e2")).toBe(100);
    // a float32: 0.1 is not 0.1
    expect(toNumber("0.1")).toBe(Math.fround(0.1));
    expect(toNumber("")).toBeUndefined();
    expect(toNumber("x")).toBeUndefined();
    expect(toNumber("1 2")).toBeUndefined();
    expect(toNumber("inf")).toBeUndefined();
    expect(toNumber(true)).toBeUndefined();
    expect(toNumber(new LuaTable())).toBeUndefined();
  });
});

describe("luaToString", () => {
  // numbers are "%0.8g" through the MSVC CRT, see printf.ts
  it("prints scalars the way print does", () => {
    expect(luaToString(undefined)).toBe("nil");
    expect(luaToString(true)).toBe("true");
    expect(luaToString(3)).toBe("3");
    expect(luaToString(-0)).toBe("-0");
    expect(luaToString(0.5)).toBe("0.5");
    expect(luaToString(Math.fround(1 / 3))).toBe("0.33333334");
    expect(luaToString(Number.NaN)).toMatch(/^-?1\.#(QNAN|IND)$/);
    expect(luaToString(Number.POSITIVE_INFINITY)).toBe("1.#INF");
    expect(luaToString("text")).toBe("text");
  });

  it("gives objects a stable id rather than a pointer", () => {
    const table = new LuaTable();
    expect(luaToString(table)).toBe(luaToString(table));
    expect(luaToString(table)).toMatch(/^table: 0x[0-9a-f]{8}$/);
    expect(luaToString(new LuaHostFunction("print", () => []))).toBe(
      "function: builtin: print"
    );
  });
});

describe("upvalues", () => {
  it("follows the register while open and keeps the value once closed", () => {
    const registers = [1, 2];
    const upvalue = LuaUpvalue.open(registers, 0);
    expect(upvalue.isOpen).toBe(true);
    expect(upvalue.get()).toBe(1);
    registers[0] = 9;
    expect(upvalue.get()).toBe(9);
    upvalue.close();
    registers[0] = 11;
    expect(upvalue.isOpen).toBe(false);
    expect(upvalue.get()).toBe(9);
  });

  it("writes through to the register while open", () => {
    const registers = [1];
    const upvalue = LuaUpvalue.open(registers, 0);
    upvalue.set(7);
    expect(registers[0]).toBe(7);
    upvalue.close();
    upvalue.set(8);
    expect(registers[0]).toBe(7);
    expect(upvalue.get()).toBe(8);
  });

  it("can be created already closed", () => {
    expect(LuaUpvalue.closed("v").get()).toBe("v");
  });
});

describe("closures", () => {
  it("carries the chunk it came from, for error messages", () => {
    const closure = new LuaClosure(
      {
        offset: 0,
        endOffset: 0,
        nups: 0,
        numParams: 0,
        isVararg: 0,
        maxStackSize: 2,
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
      },
      [],
      "821B803B"
    );
    expect(closure.chunkName).toBe("821B803B");
    expect(closure.kind).toBe("closure");
  });
});
