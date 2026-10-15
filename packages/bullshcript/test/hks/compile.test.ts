import { describe, expect, it } from "vitest";
import {
  opcodeName,
  walkInstructions,
} from "../../src/hks/bytecode/opcodes.ts";
import type { Method } from "../../src/hks/bytecode/proto.ts";
import { HEADER_BYTES, readBytecode } from "../../src/hks/bytecode/reader.ts";
import { dumpBytecode } from "../../src/hks/bytecode/writer.ts";
import {
  compile,
  compileLua,
  compileLuaChunk,
  LuaCompileError,
} from "../../src/hks/compiler/compile.ts";
import {
  applyUpvalueProvider,
  LuaHostEnvironment,
} from "../../src/hks/env/host_env.ts";
import { LuaState } from "../../src/hks/vm/interpreter.ts";
import { LuaTable, type LuaValue } from "../../src/hks/vm/values.ts";

function run(source: string, vm = new LuaState()): readonly LuaValue[] {
  return vm.call(vm.loadChunk(compileLuaChunk(source)));
}

// Real instructions in order, as mnemonics with their operands.
function listing(proto: Method): string[] {
  return [...walkInstructions(proto)].map(({ instruction: i }) =>
    [opcodeName(i.opcode), i.a, i.b, i.c].join(" ")
  );
}

function opcodes(proto: Method): string[] {
  return [...walkInstructions(proto)].map(({ instruction }) =>
    opcodeName(instruction.opcode)
  );
}

function main(source: string): Method {
  return compileLuaChunk(source).root;
}

describe("the TU0 compiler's chunk format", () => {
  it("writes the alpha's header, type table and main prototype", () => {
    const bytes = compileLua("return 1", { chunkName: "@es\\test.es" });
    expect([...bytes.subarray(0, HEADER_BYTES.length)]).toEqual([
      ...HEADER_BYTES,
    ]);
    const chunk = readBytecode(bytes, "TEST");
    expect(chunk.chunkBytes).toBe(bytes.length);
    expect(chunk.typeTable.names.get(12)).toBe("TSTRUCT");
    expect(chunk.root.source).toBe("@es\\test.es");
    expect(chunk.root.name).toBe("(main chunk)");
    expect(chunk.root.isVararg).toBe(2);
    expect(chunk.root.unknownAfterConstants).toBe(1);
    expect(Buffer.from(dumpBytecode(chunk)).equals(Buffer.from(bytes))).toBe(
      true
    );
  });

  it("names nested prototypes with NULL strings, as the corpus does", () => {
    const root = main("local function f() end");
    expect(root.protos[0].source).toBeUndefined();
    expect(root.protos[0].name).toBeUndefined();
    expect(root.protos[0].isVararg).toBe(0);
  });

  it("offers compile() for build tools, keeping the chunk name exactly", () => {
    const name = "@es\\venus\\strike_1_activity\\strike_1_activity.es";
    const bytes = compile("return 1", { chunkName: name });
    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect(readBytecode(bytes, "X").root.source).toBe(name);
  });

  it("stores string constants as the UTF-8 bytes of the source", () => {
    const [value] = run('return "café"');
    expect(value).toBe(Buffer.from("café", "utf8").toString("latin1"));
  });

  it("records locals, upvalues and line numbers", () => {
    const root = main("local a = 1\nlocal function f()\n  return a\nend\n");
    expect(root.locals.map((local) => local.name)).toEqual(["a", "f"]);
    expect(root.protos[0].upvalues).toEqual(["a"]);
    expect(root.protos[0].lineDefined).toBe(2);
    expect(root.protos[0].lastLineDefined).toBe(4);
    expect(root.protos[0].lineInfo[0]).toBe(3);
  });

  it("maps every stamped line through lineMap, hks's m_debugMap", () => {
    const source = "local a = 1\nlocal function f()\n  return a\nend\n";
    const map = [10, 21, 22, 23, 24];
    const root = compileLuaChunk(source, { lineMap: (line) => map[line] }).root;
    // the main chunk's own 0 maps too
    expect([root.lineDefined, root.lastLineDefined]).toEqual([10, 10]);
    expect(root.lineInfo[0]).toBe(21);
    expect(root.protos[0].lineDefined).toBe(22);
    expect(root.protos[0].lastLineDefined).toBe(24);
    expect(root.protos[0].lineInfo[0]).toBe(23);
    expect(main(source).protos[0].lineInfo[0]).toBe(3);
  });
});

describe("expressions", () => {
  it("folds constant arithmetic the way lcode does, in 4-byte floats", () => {
    expect(listing(main("return 2 + 3 * 4"))).toEqual([
      "LOADK 0 0 0",
      "RETURN 0 2 0",
      "RETURN 0 1 0",
    ]);
    expect(run("return 2 + 3 * 4, (2 + 3) * 4, 2 ^ 3 ^ 2, -2 ^ 2")).toEqual([
      14, 20, 512, -4,
    ]);
    expect(run("return 0.1")).toEqual([Math.fround(0.1)]);
    // division by zero is left for run time
    expect(run("return 1 / 0, -1 / 0")).toEqual([
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]);
  });

  it("evaluates operators on registers with Lua precedence", () => {
    const values = run(`
      local a, b, c = 2, 3, 4
      return a + b * c, (a + b) * c, a ^ b ^ 2, -a ^ 2, 7 % b, -7 % b,
        10 / c, 1 - a, 2 * b, a .. b .. c, #"hello"
    `);
    expect(values).toEqual([14, 20, 512, -4, 1, 2, 2.5, -1, 6, "234", 5]);
  });

  it("puts a constant left operand in B with the _BK opcode", () => {
    expect(opcodes(main("local a = ...; return 1 - a, 2 * a, 1 == a"))).toEqual(
      expect.arrayContaining(["SUB", "MUL", "EQ"])
    );
    const words = [...walkInstructions(main("local a = ...; return 1 - a"))];
    // SUB_BK: B names K[1] (the 1), C the register
    expect(words[1].instruction).toMatchObject({ opcode: 43, a: 1, b: 0 });
  });

  it("compares and short-circuits with value semantics", () => {
    expect(
      run(`
        local a, b = 1, 2
        return a < b, a > b, a <= b, a >= b, a == b, a ~= b, not a,
          a and b, nil and a, false or b, a or b, nil or false
      `)
    ).toEqual([
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      2,
      undefined,
      2,
      1,
      false,
    ]);
  });

  it("nests and/or groups", () => {
    const [value] = run(`
      local a, b, c, d = false, 2, nil, 4
      return (a or b) and (c or d)
    `);
    expect(value).toBe(4);
    expect(
      run("local x, y = 1, nil; return x and y or 'dflt', not (x and y)")
    ).toEqual(["dflt", true]);
  });

  it("reads string escapes and long brackets", () => {
    expect(
      run(`return "a\\tb\\n", "\\65\\066\\x", 'q"\\'', "\\\\", [[
line one
line two]], [==[has ]] inside]==]`)
    ).toEqual([
      "a\tb\n",
      "ABx",
      "q\"'",
      "\\",
      "line one\nline two",
      "has ]] inside",
    ]);
  });

  it("reads every numeric literal form", () => {
    expect(run("return 0x10, 0XfF, 1e3, 2E-1, .5, 3., 1e+2")).toEqual([
      16,
      255,
      1000,
      Math.fround(0.2),
      0.5,
      3,
      100,
    ]);
  });

  it("skips comments of both kinds", () => {
    expect(
      run(`-- a line comment
        --[[ a block
        comment ]] return --[==[ inline ]==] 7`)
    ).toEqual([7]);
  });
});

describe("functions", () => {
  it("captures locals as shared upvalues", () => {
    expect(
      run(`
        local function counter()
          local n = 0
          return function() n = n + 1 return n end, function() return n end
        end
        local bump, read = counter()
        bump() bump()
        return read()
      `)
    ).toEqual([2]);
  });

  it("captures an upvalue from an enclosing closure", () => {
    const root = main(`
      local x = 5
      local function outer()
        return function() return x end
      end
      return outer()()
    `);
    // the inner CLOSURE's capture word names the outer's upvalue (A=2)
    const inner = root.protos[0];
    const closure = inner.code.findIndex((i) => i.opcode === 66);
    expect(inner.code[closure + 1]).toMatchObject({ opcode: 76, a: 2 });
    const vm = new LuaState();
    expect(
      vm.call(
        vm.loadChunk(
          compileLuaChunk(`
      local x = 5
      local function outer() return function() return x end end
      return outer()()
    `)
        )
      )
    ).toEqual([5]);
  });

  it("passes varargs through", () => {
    expect(
      run(`
        local function swap(...) local a, b = ... return b, a end
        local function all(...) return ... end
        local function pack(...) return {...} end
        local t = pack(all(7, 8, 9))
        return swap(1, 2), #t, t[3]
      `)
    ).toEqual([2, 3, 9]);
  });

  it("adjusts multiple results to their targets", () => {
    expect(
      run(`
        local function two() return 1, 2 end
        local a, b, c = two()
        local d = two()
        local e, f = (two())
        return a, b, c, d, e, f
      `)
    ).toEqual([1, 2, undefined, 1, 1, undefined]);
  });

  it("compiles return f(x) as a tail call", () => {
    const source = `
      local function down(n) if n == 0 then return "done" end return down(n - 1) end
      return down(50)
    `;
    expect(opcodes(main(source).protos[0])).toContain("TAILCALL");
    expect(run(source)).toEqual(["done"]);
  });

  it("calls methods through SELF and its companion word", () => {
    const source = `
      local obj = { n = 1 }
      function obj:add(k) self.n = self.n + k return self end
      obj:add(2):add(3)
      return obj.n
    `;
    expect(run(source)).toEqual([6]);
    const ops = opcodes(main(source));
    const self = ops.indexOf("SELF");
    expect(ops[self + 1]).toBe("CALL_I_R1");
    expect(listing(main(source))[self + 1]).toBe("CALL_I_R1 1 3 3");
  });

  it("gives the method's receiver a third stack slot, as the fork does", () => {
    expect(main("local t = ...; t:m()").maxStackSize).toBe(4);
  });

  it("reads and writes globals", () => {
    const vm = new LuaState();
    expect(
      run("counter = 5; counter = counter + 1; return counter", vm)
    ).toEqual([6]);
    expect(vm.globals.get("counter")).toBe(6);
  });
});

describe("statements", () => {
  it("runs numeric for loops with any step", () => {
    expect(
      run(`
        local sum, down, halves = 0, 0, 0
        for i = 1, 10 do sum = sum + i end
        for i = 10, 1, -2 do down = down + i end
        for i = 0, 1, 0.5 do halves = halves + 1 end
        return sum, down, halves
      `)
    ).toEqual([55, 30, 3]);
  });

  it("runs generic for loops over a Lua iterator", () => {
    expect(
      run(`
        local function step(t, i)
          i = i + 1
          local v = t[i]
          if v then return i, v end
        end
        local total = 0
        for i, v in step, { 10, 20, 30 }, 0 do total = total + i * v end
        return total
      `)
    ).toEqual([140]);
  });

  it("runs while, repeat and break", () => {
    expect(
      run(`
        local n, m, k = 0, 0, 0
        while n < 5 do n = n + 1 end
        repeat local done = m >= 3; m = m + 1 until done
        while true do
          k = k + 1
          if k == 4 then break end
        end
        return n, m, k
      `)
    ).toEqual([5, 4, 4]);
  });

  it("closes captured loop locals per iteration", () => {
    expect(
      run(`
        local fs = {}
        for i = 1, 3 do fs[i] = function() return i end end
        return fs[1](), fs[3]()
      `)
    ).toEqual([1, 3]);
  });

  it("chains if/elseif/else", () => {
    const source = `
      local function grade(x)
        if x > 90 then return "a" elseif x > 50 then return "b" else return "c" end
      end
      return grade(95), grade(60), grade(10)
    `;
    expect(run(source)).toEqual(["a", "b", "c"]);
  });

  it("assigns several targets at once, evaluating right sides first", () => {
    expect(
      run(`
        local a, b = 1, 2
        a, b = b, a
        local t = {}
        t.x, t.y = a, b
        return a, b, t.x, t.y
      `)
    ).toEqual([2, 1, 2, 1]);
  });
});

describe("tables", () => {
  it("builds array, record and computed-key fields", () => {
    expect(
      run(`
        local t = { 1, 2, 3, x = 4, ["y z"] = 5, [10] = 6 }
        return t[1], t[3], t.x, t["y z"], t[10], #t
      `)
    ).toEqual([1, 3, 4, 5, 6, 3]);
  });

  it("flushes long array constructors 50 items at a time", () => {
    const items = Array.from({ length: 120 }, (_, i) => i + 1).join(", ");
    const source = `local t = { ${items} } return #t, t[50], t[51], t[120]`;
    expect(run(source)).toEqual([120, 50, 51, 120]);
    expect(opcodes(main(source)).filter((op) => op === "SETLIST")).toHaveLength(
      3
    );
  });

  it("sizes NEWTABLE with the fork's floating-point byte", () => {
    const fields = Array.from({ length: 17 }, (_, i) => `f${i} = ${i}`);
    const [newtable] = [...walkInstructions(main(`local t = { ${fields} }`))];
    // 17 record fields round up to 18: eeeeexxx = 0b00010_001
    expect(newtable.instruction).toMatchObject({ opcode: 52, b: 0, c: 17 });
  });

  it("indexes with every key kind", () => {
    const source = `
      local t = {}
      local k = "key"
      t.name = 1; t[0] = 2; t[k] = 3; t[true] = 4
      return t.name, t[0], t.key, t[true]
    `;
    expect(run(source)).toEqual([1, 2, 3, 4]);
    const ops = opcodes(main(source));
    // string key SETFIELD, constant key SETTABLE_BK (17), register key 16
    const stores = [...walkInstructions(main(source))]
      .map(({ instruction }) => instruction.opcode)
      .filter((op) => [15, 16, 17, 74].includes(op));
    expect(stores).toEqual([15, 17, 16, 17]);
    expect(ops).toContain("GETTABLE");
  });
});

describe("the fork's instruction selection", () => {
  // bs\weapons\weapon_types.bs, the corpus's smallest chunk (8210002C), written
  // back out the way the decompiler prints it.
  const WEAPON_TYPES = `
local _M = {}
_M.decl_name = "weapon"
_M.definition = {}
_M.instance = {}
local print = print
local assert = assert
function _M.instance:foo()
  print("this sucks")
end
function _M.upvalue_provider()
  return {}
end
return _M
`;

  it("reproduces a corpus chunk's code word for word", () => {
    const root = main(WEAPON_TYPES);
    const words = root.code.map((i) => i.raw.toString(16).padStart(8, "0"));
    expect(words).toEqual([
      "68000000",
      "94010100",
      "68000001",
      "1e040100",
      "68000001",
      "1e060100",
      "b6000401",
      "98000514",
      "b6000702",
      "98000814",
      "00000303",
      "98000000",
      "98000000",
      "84000004",
      "98000101",
      "1e140403",
      "84000103",
      "1e160300",
      "12040000",
      "12020000",
    ]);
    expect(root.protos[0].code.map((i) => i.raw.toString(16))).toEqual([
      "4c000001",
      "32000002",
      "4040101",
      "12020000",
    ]);
    expect(root.maxStackSize).toBe(5);
    expect(root.constants.map((k) => k.kind)).toEqual([
      "string",
      "string",
      "string",
      "string",
      "string",
      "nil",
      "nil",
      "string",
      "nil",
      "nil",
      "string",
      "string",
    ]);
  });

  it("gives each global two cache slots, shared by every read of it", () => {
    const root = main("print(1) print(2)");
    expect(root.constants).toEqual([
      { kind: "string", value: "print" },
      { kind: "nil" },
      { kind: "nil" },
      { kind: "number", value: 1 },
      { kind: "number", value: 2 },
    ]);
    // `x == nil` gets a nil of its own, not a cache slot
    const compare = main("local x = print; return x == nil");
    expect(compare.constants.filter((k) => k.kind === "nil")).toHaveLength(3);
  });

  it("uses the _R1 twin when the previous instruction wrote the operand", () => {
    const source = `
      local t = {}
      t.x = 1
      local self = ...
      if self.flag then self.a.b:go() end
      __coro_yield()
    `;
    expect(opcodes(main(source))).toEqual([
      "NEWTABLE",
      "SETFIELD_R1",
      "VARARG",
      "GETFIELD",
      "TEST_R1",
      "JMP",
      "GETFIELD",
      "GETFIELD_R1",
      "SELF",
      "CALL_I_R1",
      "CALL",
      "GETGLOBAL",
      "CALL_I_R1",
      "RETURN",
    ]);
  });

  it("never uses an _R1 twin on a jump target", () => {
    const ops = opcodes(
      main(`
        local s, t = ...
        if s then s = t.x end
        if s then return 1 end
      `)
    );
    expect(ops.filter((op) => op === "TEST_R1")).toHaveLength(0);
  });

  it("emits a bare `local x` as LOADNIL, even at pc 0", () => {
    expect(opcodes(main("local success\nsuccess = true"))[0]).toBe("LOADNIL");
  });
});

describe("a Bungie-style module on the host", () => {
  it("loads, takes its imports and sleeps through __coro_yield", () => {
    const calls: string[] = [];
    const environment = new LuaHostEnvironment();
    const vm = new LuaState({ globals: environment.globals });
    const bundlelib = new LuaTable();
    environment.bind("__class_definition_get", () => [bundlelib]);
    environment.bind("predicate_pack", (args) => [args[0]]);
    const record = (name: string) =>
      environment.bind(`host_${name}`, (args) => {
        calls.push(`${name}(${args.slice(1).join(", ")})`);
      });
    bundlelib.set("sleep", record("sleep"));
    bundlelib.set("sleep_until", record("sleep_until"));
    const chunk = compileLuaChunk(
      `
local _M = {}
_M.decl_name = "compiled_module"
_M.definition = {}
_M.instance = {}
local print = print
local assert = assert
local bundlelib = false
function _M.instance:main_d_execute_impl()
  self.count = 0
  while self.count < 2 do
    bundlelib:sleep(1)
    __coro_yield()
    self.count = self.count + 1
  end
  bundlelib:sleep_until(predicate_pack(function()
    return self.count >= 2, "count >= 2"
  end), 1)
  __coro_yield()
  return self.count
end
function _M.upvalue_provider()
  local _result = { bundlelib = __class_definition_get("native.bundlelib.bundlelib") }
  return _result
end
return _M
`,
      { chunkName: "@es\\test\\compiled_module.esu" }
    );
    const [module] = vm.call(vm.loadChunk(chunk));
    expect(applyUpvalueProvider(vm, module).applied).toEqual(["bundlelib"]);
    const instance = (module as LuaTable).get("instance") as LuaTable;
    const self = new LuaTable();
    const thread = vm.createThread(
      instance.get("main_d_execute_impl") as never,
      [self]
    );
    expect(thread.resume()).toEqual({ status: "yielded" });
    expect(thread.resume()).toEqual({ status: "yielded" });
    expect(thread.resume()).toEqual({ status: "yielded" });
    expect(thread.resume()).toEqual({ status: "returned", values: [2] });
    expect(calls).toEqual([
      "sleep(1)",
      "sleep(1)",
      expect.stringMatching(/^sleep_until\(.*, 1\)$/),
    ]);
  });
});

describe("compile errors", () => {
  const error = (source: string) => {
    try {
      compileLua(source, { chunkName: "@es\\bad.es" });
    } catch (caught) {
      return caught;
    }
    return;
  };

  it("names the chunk and line", () => {
    const caught = error("local a = 1\nlocal b = = 2");
    expect(caught).toBeInstanceOf(LuaCompileError);
    expect((caught as LuaCompileError).line).toBe(2);
    expect(String(caught)).toContain("@es\\bad.es:2:");
  });

  it("rejects what Lua 5.1 rejects", () => {
    expect(String(error("break"))).toContain("no loop to break");
    expect(String(error("x = 'open"))).toContain("unfinished string");
    expect(String(error("f()\n(g)()"))).toContain("ambiguous syntax");
    expect(String(error("return 1 x = 2"))).toContain("'<eof>' expected");
    expect(String(error("local t = {1"))).toContain("'}' expected");
    expect(String(error("x = 3x"))).toContain("malformed number");
    expect(error("return ...")).toBeUndefined();
    expect(String(error("local function f() return ... end"))).toContain(
      "outside a vararg function"
    );
  });
});
