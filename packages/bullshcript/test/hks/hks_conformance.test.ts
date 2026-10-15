import { describe, expect, it } from "vitest";
import type {
  HksBytecode,
  LuaConstant,
  StructProto,
} from "../../src/hks/bytecode/proto.ts";
import { readBytecode } from "../../src/hks/bytecode/reader.ts";
import { dumpBytecode } from "../../src/hks/bytecode/writer.ts";
import { compileLua, compileLuaChunk } from "../../src/hks/compiler/compile.ts";
import { LuaHostEnvironment } from "../../src/hks/env/host_env.ts";
import { formatG } from "../../src/hks/env/printf.ts";
import {
  LuaState,
  type LuaThread,
  YIELD_ACROSS_C_BOUNDARY,
} from "../../src/hks/vm/interpreter.ts";
import {
  LuaClosure,
  type LuaFunction,
  LuaLightUserdata,
  LuaUi64,
  type LuaValue,
  luaToString,
  typeName,
} from "../../src/hks/vm/values.ts";

// Conformance of interpreter.ts with the Havok Script VM: float32 numbers, "%0.8g",
// strtod coercion, error texts, the yield rule, structures and extra constants.

const f32 = Math.fround;

function harness() {
  const prints: string[] = [];
  const environment = new LuaHostEnvironment({
    log: (message) => prints.push(message),
  });
  const vm = new LuaState({
    globals: environment.globals,
    stringMetatable: environment.stringMetatable,
  });
  const chunk = (source: string) =>
    compileLuaChunk(source, {
      chunkName: "@conformance.lua",
      tagId: "CONFORMANCE",
    });
  const run = (source: string) => vm.call(vm.loadChunk(chunk(source)));
  const first = (source: string) => run(source)[0];
  return { chunk, environment, first, prints, run, vm };
}

describe("numbers are float32", () => {
  const { first } = harness();

  it("rounds every arithmetic result to float32", () => {
    expect(first("local a = 1 return a / 3")).toBe(f32(1 / 3));
    expect(first("local a = 16777216 return a + 1")).toBe(16_777_216);
    expect(first("local a, b = 0.1, 0.2 return a + b")).toBe(f32(0.3));
    // which makes 0.1 + 0.2 == 0.3 true, unlike doubles
    expect(first("local a, b = 0.1, 0.2 return a + b == 0.3")).toBe(true);
    expect(first("local a = 3 return a * 0.1")).toBe(f32(3 * f32(0.1)));
    expect(first("local a = 1 return a - 0.9")).toBe(f32(1 - f32(0.9)));
    expect(first("local a = 2 return -a")).toBe(-2);
  });

  it("evaluates % as a - floor(a/b)*b and ^ through pow(), both float32", () => {
    expect(first("local a, b = 7, 3 return a % b")).toBe(1);
    expect(first("local a, b = -7, 3 return a % b")).toBe(2);
    expect(first("local a, b = 5.5, 2 return a % b")).toBe(1.5);
    expect(first("local a, b = 1, 0 return a % b")).toBeNaN();
    expect(first("local a = 2 return a ^ 0.5")).toBe(f32(Math.SQRT2));
    expect(first("local a = 10 return a ^ -1")).toBe(f32(0.1));
  });

  it("steps numeric for loops in float32", () => {
    // ten steps of 0.1f overshoot 1; eleven steps of 0.1 do not
    expect(
      first("local n = 0 for i = 0, 1, 0.1 do n = n + 1 end return n")
    ).toBe(10);
    expect(
      first("local n = 0 for i = 3, 1, -1 do n = n + i end return n")
    ).toBe(6);
  });

  it("converts string operands with strtod, hex included", () => {
    expect(first('return "10" + 5')).toBe(15);
    expect(first('return "0x10" + 0')).toBe(16);
    expect(first('return " 2.5 " * 2')).toBe(5);
    expect(first('return "1e2" - 1')).toBe(99);
    expect(first('return "3" + "4"')).toBe(7);
    expect(first('return "0.1" + 0')).toBe(f32(0.1));
    // strtoul wraps a negative hex literal; the float32 of 4294967280
    expect(first('local s = "-0x10" return s + 0')).toBe(f32(4_294_967_280));
  });

  it("hands a native's numbers back as float32", () => {
    const { environment, first } = harness();
    environment.bind("third", () => [1 / 3]);
    expect(first("return third()")).toBe(f32(1 / 3));
  });
});

describe('numbers print with "%0.8g" (MSVC CRT)', () => {
  const { first, prints, run } = harness();

  it("formats eight significant digits, trailing zeros stripped", () => {
    expect(first("local a = 1 return tostring(a / 3)")).toBe("0.33333334");
    expect(first("return tostring(0.1)")).toBe("0.1");
    expect(first("return tostring(30)")).toBe("30");
    expect(first("return tostring(-2.5)")).toBe("-2.5");
    expect(first("return tostring(1234567.25)")).toBe("1234567.3");
    expect(first("return tostring(0.001)")).toBe("0.001");
  });

  it("switches to exponent form at 1e8 and below 1e-4, three exponent digits", () => {
    expect(first("return tostring(100000000)")).toBe("1e+008");
    expect(first("return tostring(2166136261)")).toBe("2.1661363e+009");
    expect(first("return tostring(0.00001)")).toBe("9.9999997e-006");
    // 0.0001f is just under 1e-4, so it goes exponential too
    expect(first("return tostring(0.0001)")).toBe("9.9999997e-005");
    expect(first("return tostring(123456789)")).toBe("1.2345679e+008");
  });

  it("prints infinities and NaN the CRT way", () => {
    expect(first("local z = 0 return tostring(1 / z)")).toBe("1.#INF");
    expect(first("local z = 0 return tostring(-1 / z)")).toBe("-1.#INF");
    expect(first("local z = 0 return tostring(z / z)")).toMatch(
      /^-?1\.#(QNAN|IND)$/
    );
  });

  it("uses the same conversion in print and ..", () => {
    run('local a = 1 print(a / 3, 2.5, "x")');
    expect(prints).toEqual(["0.33333334\t2.5\tx"]);
    expect(first('local a = 1 return (a / 3) .. "|" .. 100000000')).toBe(
      "0.33333334|1e+008"
    );
  });

  it("formatG covers the %g corner cases", () => {
    expect(formatG(0, 8)).toBe("0");
    expect(formatG(-0, 8)).toBe("-0");
    expect(formatG(999_999_995, 8)).toBe("1e+009");
    expect(formatG(f32(1e-5), 8)).toBe("9.9999997e-006");
    expect(formatG(1e100, 8)).toBe("1e+100");
    expect(formatG(0.5, 1)).toBe("0.5");
    expect(formatG(1.5, 0)).toBe("2");
  });
});

describe("arithmetic on non-numbers", () => {
  const { first } = harness();

  it('raises "operator %s is not supported for %s %s %s"', () => {
    expect(() => first("local n return n + 1")).toThrow(
      "operator + is not supported for nil + number"
    );
    expect(() => first("local t = {} return 1 - t")).toThrow(
      "operator - is not supported for number - table"
    );
    expect(() => first("local b = true return b * 2")).toThrow(
      "operator * is not supported for boolean * number"
    );
    expect(() => first("local n return 2 / n")).toThrow(
      "operator / is not supported for number / nil"
    );
    expect(() => first("local n return n % 2")).toThrow(
      "operator % is not supported for nil % number"
    );
    expect(() => first("local n return n ^ 2")).toThrow(
      "operator ^ is not supported for nil ^ number"
    );
  });

  it("raises the unary form for - and #", () => {
    expect(() => first("local n return -n")).toThrow(
      "operator - is not supported for - nil"
    );
    expect(() => first("local n return #n")).toThrow(
      "operator # is not supported for # nil"
    );
    expect(() => first('local s = "abc" return -s')).toThrow(
      "operator - is not supported for - string"
    );
  });

  it("raises for a string that is not a number under every op but +", () => {
    expect(() => first('return "abc" - 1')).toThrow(
      "operator - is not supported for string - number"
    );
    expect(() => first('return "abc" * "2"')).toThrow(
      "operator * is not supported for string * string"
    );
  });

  it("concatenates on + through the host's string __add (host choice)", () => {
    expect(first('return "Wave: " + 3')).toBe("Wave: 3");
    expect(first('local a = 1 return "n=" + a / 3')).toBe("n=0.33333334");
    expect(first('return 3 + "x"')).toBe("3x");
    expect(first('return "a" + "b"')).toBe("ab");
    // numeric coercion comes first, as in hks
    expect(first('return "2" + "3"')).toBe(5);
    expect(first('local n return "wave " + n')).toBe("wave nil");
  });

  it("is stock hks without that metatable", () => {
    const vm = new LuaState();
    const chunk = compileLuaChunk('return "Wave: " + 3');
    expect(() => vm.call(vm.loadChunk(chunk))).toThrow(
      "operator + is not supported for string + number"
    );
  });

  it("calls a Lua __add like callBinaryHandler, result into R(A)", () => {
    const { environment, first, run } = harness();
    const [handler] = run(
      "return function(a, b) return tostring(a) .. '|' .. tostring(b) end"
    );
    environment.stringMetatable.set("__add", handler);
    expect(first('local a = 1 return ("x" + a) .. "!"')).toBe("x|1!");
    expect(first('return 2 + "y"')).toBe("2|y");
  });
});

describe("error texts", () => {
  const { first } = harness();

  it('"attempt to index a %s value", key in the site', () => {
    expect(() => first("local n return n.foo")).toThrow(
      /^attempt to index a nil value \[.*key foo\]$/
    );
    expect(() => first("local n n.foo = 1")).toThrow(
      "attempt to index a nil value"
    );
    expect(() => first("local b = true return b[1]")).toThrow(
      "attempt to index a boolean value"
    );
    expect(() => first('local s = "x" return s:format()')).toThrow(
      "attempt to index a string value"
    );
  });

  it('"Attempt to call a %s value"', () => {
    expect(() => first("local n return n()")).toThrow(
      "Attempt to call a nil value"
    );
    expect(() => first("local t = {} return t()")).toThrow(
      "Attempt to call a table value"
    );
  });

  it("luaG_ordererror's two comparison texts", () => {
    expect(() => first('local a = 1 return a < "a"')).toThrow(
      "attempt to compare number with string"
    );
    expect(() => first("local a, b = {}, {} return a <= b")).toThrow(
      "attempt to compare two table values"
    );
  });

  it("concat refuses anything but strings and numbers", () => {
    expect(() => first('local t = {} return "a" .. t')).toThrow(
      "attempt to concatenate a table value"
    );
  });
});

describe("yield rules", () => {
  function thread(source: string): { thread: LuaThread; vm: LuaState } {
    const { run, vm } = harness();
    const [body] = run(source);
    return { thread: vm.createThread(body as LuaFunction), vm };
  }

  it("lets a native yield one C level deep", () => {
    const { thread: t } = thread(
      "return function() __coro_yield() return 7 end"
    );
    expect(t.resume()).toEqual({ status: "yielded" });
    expect(t.resume()).toEqual({ status: "returned", values: [7] });
  });

  it("counts Lua-to-Lua calls as no C level", () => {
    const { thread: t } = thread(
      "return function() local function f() __coro_yield() end f() f() return 1 end"
    );
    expect(t.resume().status).toBe("yielded");
    expect(t.resume().status).toBe("yielded");
    expect(t.resume()).toEqual({ status: "returned", values: [1] });
  });

  it("refuses a yield inside a host-driven call (LuaState.call)", () => {
    const { run, vm } = harness();
    const [fn] = run("return function() __coro_yield() end");
    expect(() => vm.call(fn as LuaFunction)).toThrow(YIELD_ACROSS_C_BOUNDARY);
  });

  it("refuses a yield two C levels deep: a native running Lua", () => {
    const { environment, run, vm } = harness();
    environment.bind("run_inner", (args) => vm.call(args[0] as LuaFunction));
    const [body] = run(
      "return function() run_inner(function() __coro_yield() end) return 1 end"
    );
    const t = vm.createThread(body as LuaFunction);
    expect(() => t.resume()).toThrow(YIELD_ACROSS_C_BOUNDARY);
    expect(t.status).toBe("error");
  });

  it("refuses a yield inside a nested resume", () => {
    const { environment, run, vm } = harness();
    environment.bind("resume_other", (args) => {
      vm.createThread(args[0] as LuaFunction).resume();
    });
    const [body] = run(
      "return function() resume_other(function() __coro_yield() end) end"
    );
    expect(() => vm.createThread(body as LuaFunction).resume()).toThrow(
      YIELD_ACROSS_C_BOUNDARY
    );
  });

  it("the two-statement wait: a wait native records, __coro_yield suspends", () => {
    const { environment, prints, run, vm } = harness();
    const calls: string[] = [];
    environment.bind("record_sleep", (args) => {
      calls.push(`sleep ${luaToString(args[0])}`);
    });
    const [body] = run(
      'return function() record_sleep(1) print("still running") __coro_yield() print("resumed") end'
    );
    const t = vm.createThread(body as LuaFunction);
    expect(t.resume().status).toBe("yielded");
    expect(calls).toEqual(["sleep 1"]);
    expect(prints).toEqual(["still running"]);
    t.resume();
    expect(prints).toEqual(["still running", "resumed"]);
  });

  it("uses hks's resume refusals", () => {
    const { thread: done } = thread("return function() end");
    done.resume();
    expect(() => done.resume()).toThrow("cannot resume a dead coroutine");

    const { environment, run, vm } = harness();
    let current: LuaThread | undefined;
    environment.bind("resume_self", () => {
      current?.resume();
    });
    const [body] = run("return function() resume_self() end");
    current = vm.createThread(body as LuaFunction);
    expect(() => current?.resume()).toThrow("cannot resume running coroutine");
  });
});

describe("chunk format", () => {
  it("ends every chunk with the empty structures section", () => {
    const bytes = compileLua("return 1");
    expect([...bytes.subarray(-8)]).toEqual([0, 0, 0, 1, 0, 0, 0, 0]);
    const chunk = readBytecode(bytes, "T");
    expect(chunk.chunkBytes).toBe(bytes.length);
    expect(chunk.structures).toEqual([]);
  });

  it("round-trips a structure prototype", () => {
    const vec3: StructProto = {
      name: "vec3",
      id: 3,
      hasMeta: 0,
      hasProxy: 0,
      slots: ["x", "y", "z"].map((name, position) => ({
        name,
        structId: 0xff_ff,
        typeId: 3,
        reserved: 0,
        position,
      })),
    };
    const chunk: HksBytecode = {
      ...compileLuaChunk("return 1"),
      structures: [vec3],
    };
    const bytes = dumpBytecode(chunk);
    const again = readBytecode(bytes, "T");
    expect(again.structures).toEqual([vec3]);
    expect(again.chunkBytes).toBe(bytes.length);
    expect(dumpBytecode(again)).toEqual(bytes);
  });

  // `return 1` compiled, with its one constant swapped
  function withConstant(source: string, constant: LuaConstant): HksBytecode {
    const chunk = compileLuaChunk(source);
    const constants = [constant, ...chunk.root.constants.slice(1)];
    return { ...chunk, root: { ...chunk.root, constants } };
  }

  it("loads lightuserdata and ui64 constants as values of their own types", () => {
    const vm = new LuaState();
    const [pointer] = vm.call(
      vm.loadChunk(
        withConstant("return 7", {
          kind: "lightuserdata",
          value: 0xde_ad_be_ef,
        })
      )
    );
    expect(pointer).toBeInstanceOf(LuaLightUserdata);
    expect(typeName(pointer)).toBe("userdata");
    expect(luaToString(pointer)).toBe("userdata: 0xdeadbeef");

    const big = withConstant("return 7", {
      kind: "ui64",
      value: 0x01_23_45_67_89_ab_cd_efn,
    });
    const [wide] = vm.call(vm.loadChunk(big));
    expect(wide).toBeInstanceOf(LuaUi64);
    expect(typeName(wide)).toBe("ui64");
    expect(luaToString(wide)).toBe("0x0123456789abcdef");
    expect(readBytecode(dumpBytecode(big), "T").root.constants[0]).toEqual(
      big.root.constants[0]
    );
  });

  it("compares them by value and refuses arithmetic on them", () => {
    const vm = new LuaState();
    expect(
      vm.call(
        vm.loadChunk(
          withConstant("local a = 7 local b = 7 return a == b", {
            kind: "ui64",
            value: 5n,
          })
        )
      )
    ).toEqual([true]);
    expect(() =>
      vm.call(
        vm.loadChunk(
          withConstant("local a = 7 return a + 1", { kind: "ui64", value: 5n })
        )
      )
    ).toThrow("operator + is not supported for ui64 + number");
  });

  it("names the chunk (its tag) on the error site", () => {
    const { chunk, vm } = harness();
    const [fn] = vm.call(
      vm.loadChunk(chunk("return function() local n return n.x end"))
    );
    expect(fn).toBeInstanceOf(LuaClosure);
    expect(() => vm.call(fn as LuaFunction)).toThrow(/\[chunk CONFORMANCE/);
  });
});

// LuaValue admits both hks value classes (a compile-time check).
const _values: LuaValue[] = [new LuaUi64(1n), new LuaLightUserdata(1)];
