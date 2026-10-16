import { describe, expect, it } from "vitest";
import {
  compileBungieScript,
  lineMapper,
} from "../../src/bungiescript/compile.ts";
import { readBytecode } from "../../src/hks/bytecode/reader.ts";
import { compileLuaChunk } from "../../src/hks/compiler/compile.ts";
import { LuaHostEnvironment } from "../../src/hks/env/host_env.ts";
import { LuaState } from "../../src/hks/vm/interpreter.ts";
import { LuaHostFunction, LuaTable } from "../../src/hks/vm/values.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";

// Small sources through the whole front end; test/fukugen_daihon_alpha.test.ts
// proves them on real decls.

function compileOne(source: string, path = "es/utility_scripts/t.esu") {
  const result = compileBungieScript([{ path, source }]);
  expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  return { decl: result.decls[0], diagnostics: result.diagnostics };
}

describe("the BungieScript code generator", () => {
  it("emits the module prologue, methods in order, import and provider", () => {
    const { decl } = compileOne(
      "c_squad_sensor_host sq\n\n\nthread main:\n    sq.place()\n"
    );
    expect(decl.lua).toBe(
      [
        "local _M = {}",
        '_M.decl_name = "t"',
        "_M.definition = {}",
        "_M.instance = {}",
        "local print = print",
        "local assert = assert",
        "local bundlelib = false",
        "function _M.instance:main_d_execute_impl()",
        "  self.sq:place()",
        "end",
        "function _M.instance:import()",
        "  local success",
        "  success = true",
        "  return success",
        "end",
        "function _M.upvalue_provider()",
        "  local _result = {",
        '    bundlelib = __class_definition_get("native.bundlelib.bundlelib")',
        "  }",
        "  return _result",
        "end",
        "return _M",
        "",
      ].join("\n")
    );
    // prologue on the first method's line, generated code on line 1
    expect(decl.lineMap).toEqual([
      4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ]);
    expect(decl.modulePath).toBe("_es.utility_scripts.t.t");
    expect(decl.chunkName).toBe("@es\\utility_scripts\\t.esu");
    expect(decl.imports.map((i) => i.name)).toEqual(["bundlelib"]);
  });

  it("resolves names: locals, members, bases, types, builtins", () => {
    const base =
      "class c_base:\n    int score\n    delegate d_tick(timer)\n    def add(n):\n        score = score + n\n";
    const derived = [
      "class c_derived : c_base:",
      "    def d_tick(timer):",
      "        total = len(mathlib.abs(score))",
      "        add(total)",
      "        self.add(e_damage_scalar.base)",
      '        print("n: " + total)',
      "",
    ].join("\n");
    const result = compileBungieScript([
      { path: "bs/a.bs", source: base },
      { path: "bs/b.bs", source: derived },
    ]);
    expect(result.diagnostics).toEqual([]);
    const lua = result.decls[1].lua;
    expect(lua).toContain("function _M.instance:d_tick_impl(timer)");
    expect(lua).toContain(
      "local total\n  total = len(mathlib:abs(self.score))"
    );
    expect(lua).toContain("self:add(total)");
    expect(lua).toContain("self:add(e_damage_scalar.base)");
    expect(lua).toContain('print("n: " + total)');
    expect(result.decls[1].imports.map((i) => `${i.kind} ${i.path}`)).toEqual([
      "class util.mathlib.mathlib",
      "enum native.spasahalib.e_damage_scalar",
    ]);
    expect(result.decls[1].schema.parent).toBe("c_base");
  });

  it("warns about an undeclared bare name and treats it as a member", () => {
    const { decl, diagnostics } = compileOne("def f():\n    mystery.go()\n");
    expect(decl.lua).toContain("self.mystery:go()");
    expect(diagnostics).toEqual([
      {
        line: 2,
        message: "'mystery' is not declared; taken as a member",
        path: "es/utility_scripts/t.esu",
        severity: "warning",
      },
    ]);
  });

  it("lowers sleeps with the condition's raw text and a yield", () => {
    const { decl } = compileOne(
      [
        "c_squad_sensor_host sq",
        "def f():",
        "    sleep(2)",
        "    sleep_until(sq.alive_count() <= 0 and not sq.is_active())",
        "    sleep_until_timeout(sq.is_done(), 10)",
        "    sleep_until(false, 0.2)",
        "",
      ].join("\n")
    );
    expect(decl.lua).toContain(
      [
        "  bundlelib:sleep(2)",
        "  __coro_yield()",
        "  bundlelib:sleep_until(predicate_pack(function()",
        '    return self.sq:alive_count() <= 0 and not self.sq:is_active(), "sq.alive_count() <= 0 and not sq.is_active()"',
        "  end), 1)",
        "  __coro_yield()",
        "  bundlelib:sleep_until_timeout(predicate_pack(function()",
        '    return self.sq:is_done(), "sq.is_done()"',
        "  end), 10)",
        "  __coro_yield()",
        "  bundlelib:sleep_until(predicate_pack(function()",
        '    return false, "false"',
        "  end), 0.2)",
        "  __coro_yield()",
      ].join("\n")
    );
  });

  it("lowers loops, switch, locals, tuple assignment and operators", () => {
    const { decl } = compileOne(
      [
        "dynamic_array<c_squad_sensor_host> squads",
        "def f(n):",
        "    for i in range(n):",
        "        for j in range(1, n + 1):",
        "            pass",
        "    for s in squads:",
        "        for k, v in squads: pass",
        "    for x in pick_random_count(1, 60):",
        "        return x",
        "    a, b = g()",
        "    a = a != b or a ** 2 >= -b",
        "    switch schema(a):",
        "        case s_damage_attacker_list:",
        "            go()",
        "        case s_hop_on_instance_state: pass",
        "        default:",
        "            stop()",
        "    assert(a > 0)",
        '    return "%d".format(a), nil',
        "",
      ].join("\n")
    );
    expect(decl.lua).toContain(
      [
        "  for i = 0, n - 1 do",
        "    for j = 1, n + 1 - 1 do",
        "    end",
        "  end",
        "  for index_6_unused, s in enum_of(self.squads) do",
        "    for k, v in enum_of(self.squads) do",
        "    end",
        "  end",
        "  for x in pick_random_count(1, 60) do",
        "    return x",
        "  end",
        "  local a, b",
        "  a, b = self:g()",
        "  a = a ~= b or a ^ 2 >= -b",
        "  local switch_value_12 = schema(a)",
        "  if switch_value_12 == s_damage_attacker_list then",
        "    self:go()",
        "  else",
        "    if switch_value_12 == s_hop_on_instance_state then",
        "    else",
        "      self:stop()",
        "    end",
        "  end",
        '  assert(a > 0, "a > 0")',
        '  return ("%d"):format(a), nil',
      ].join("\n")
    );
  });

  it("splits an expression across lines where the source did", () => {
    const { decl } = compileOne(
      "int a\nint b\ndef f():\n    if a and \\\n            b:\n        go()\n"
    );
    const lines = decl.lua.split("\n");
    const at = lines.indexOf("  if self.a and");
    expect(at).toBeGreaterThan(0);
    expect(lines[at + 1]).toBe("      self.b then");
    expect(decl.lineMap[at + 1]).toBe(4);
    expect(decl.lineMap[at + 2]).toBe(5);
  });

  it("writes command scripts as __cs atoms on the header line", () => {
    const { decl } = compileOne(
      "command_script cs_open(path):\n    snap_to(path, 0)\n    sleep(1)\n"
    );
    expect(decl.lua).toContain(
      [
        "function _M.instance:cs_open(path)",
        "  self.__cs:clear()",
        "  self.__cs:snap_to(path, 0)",
        "  self.__cs:sleep(1)",
        "  return self.__cs",
        "end",
      ].join("\n")
    );
    const chunk = readBytecode(decl.chunk as Uint8Array, "T");
    const cs = chunk.root.protos[0];
    expect([cs.lineDefined, cs.lastLineDefined]).toEqual([1, 1]);
    expect(cs.lineInfo[0]).toBe(1);
    expect(cs.lineInfo.at(-1)).toBe(1);
    expect(new Set(cs.lineInfo)).toEqual(new Set([1, 2, 3]));
    expect(decl.schema.members.at(-1)).toMatchObject({
      name: "__cs",
      kind: "object",
    });
  });

  it("generates the bind chain and user_import in import()", () => {
    const { decl } = compileOne(
      [
        'kill_squad_objective po_kill bind("_squad", 0)',
        "c_player_monitor_sensor_host pm_x bind(entrance)",
        "c_trigger_volume_slot_host entrance",
        "def user_import():",
        "    pass",
        "",
      ].join("\n")
    );
    expect(decl.lua).toContain(
      [
        "function _M.instance:import()",
        "  local success",
        "  success = true",
        "  if success then",
        '    success = self.po_kill:import_only_bind("_squad", 0)',
        "  end",
        "  if success then",
        "    success = self.pm_x:import_only_bind(self.entrance)",
        "  end",
        "  self:user_import()",
        "  return success",
        "end",
      ].join("\n")
    );
  });

  it("compiles a chunk whose lines map back to the source", () => {
    const { decl } = compileOne(
      "c_squad_sensor_host sq\n\ndef f():\n\n    sq.place()\n"
    );
    const chunk = readBytecode(decl.chunk as Uint8Array, "T");
    expect([chunk.root.lineDefined, chunk.root.lastLineDefined]).toEqual([
      3, 3,
    ]);
    expect(chunk.root.lineInfo[0]).toBe(3);
    const f = chunk.root.protos[0];
    expect([f.lineDefined, f.lastLineDefined]).toEqual([3, 5]);
    expect(f.lineInfo.every((line) => line === 5)).toBe(true);
    expect(lineMapper(decl.lineMap)(0)).toBe(3);
  });

  it("describes the schema: kinds, sides, defaults and flags", () => {
    const { decl } = compileOne(
      [
        'static string_hash h = "any_kill"',
        "static vector3d up = (0, 0, 1)",
        "int count = -1",
        "bool b",
        "e_damage_scalar scalar = e_damage_scalar.base",
        "c_squad_sensor_host sq",
        "static_array<c_device_host, 10> dev",
        "c_squad_sensor_host arr[7]",
        "startup thread ss_main: pass",
        "thread sc_x: pass",
        "delegate d_x(a)",
        "def d_x(a): pass",
        "static def lib(): pass",
        "",
      ].join("\n")
    );
    expect(decl.schema.parent).toBe("c_activity_script");
    expect(decl.schema.members.map((m) => [m.name, m.kind, m.side])).toEqual([
      ["h", "string_hash", "definition"],
      ["up", "vector3d", "definition"],
      ["count", "int", "instance"],
      ["b", "bool", "instance"],
      ["scalar", "enum_field", "instance"],
      ["sq", "object", "both"],
      ["dev", "static_array", "both"],
      ["arr", "c_array", "both"],
      ["ss_main", "thread", "both"],
      ["sc_x", "thread", "both"],
      ["d_x", "delegate", "instance"],
      ["d_x", "method", "instance"],
      ["lib", "method", "definition"],
    ]);
    const [h, up, count, , scalar, , , , ss, sc, , impl] = decl.schema.members;
    expect(h.default).toEqual({
      kind: "string",
      value: "any_kill",
      hash: 0x324e_9a20,
    });
    expect(up.default).toEqual({ kind: "vector", values: [0, 0, 1] });
    expect(count.default).toEqual({ kind: "number", value: -1 });
    expect(scalar.default).toEqual({
      kind: "enum",
      type: "e_damage_scalar",
      member: "base",
    });
    expect([ss.autostart, sc.autostart, ss.luaName]).toEqual([
      true,
      false,
      "ss_main_d_execute_impl",
    ]);
    expect(impl.luaName).toBe("d_x_impl");
  });

  it("puts a .bs provider on the last method's line and keeps hand-written import()", () => {
    const { decl } = compileOne(
      "class c_x:\n    def import():\n        return true\n\n    def f():\n        pass\n",
      "bs/games/x.bs"
    );
    expect(decl.lua).toContain(
      "function _M.instance:import()\n  return true\nend\nfunction _M.instance:f()\nend\nfunction _M.upvalue_provider()\n  return {}\nend\nreturn _M"
    );
    expect(decl.lineMap.slice(-5)).toEqual([5, 5, 5, 5, 5]);
    expect(decl.modulePath).toBe("games.x.c_x");
  });

  it("reports a syntax error as a diagnostic and keeps the other files", () => {
    const result = compileBungieScript([
      { path: "es/a.esu", source: "def f(:\n" },
      { path: "es/b.esu", source: "def g(): pass\n" },
    ]);
    expect(result.decls.map((d) => d.name)).toEqual(["b"]);
    expect(result.diagnostics).toEqual([
      {
        line: 1,
        message: expect.stringContaining("es/a.esu:1"),
        path: "es/a.esu",
        severity: "error",
      },
    ]);
  });
});

describe("encounter classes", () => {
  const warnings = (path: string, source: string) =>
    compileBungieScript([{ path, source }]).diagnostics.filter(
      (d) => d.severity === "warning"
    );

  it("names a .es file's class c_encounter__<stem> on c_encounter", () => {
    const { decl } = compileOne(
      "c_squad_sensor_host sq\n",
      "es/venus/x/enc_x_amb1.es"
    );
    expect([decl.name, decl.schema.parent]).toEqual([
      "c_encounter__enc_x_amb1",
      "c_encounter",
    ]);
  });

  it("writes the definition name hash bsc wrote", () => {
    const nameHash = (path: string, source = "int i\n") =>
      compileOne(source, path).decl.schema.nameHash;
    expect(nameHash("es/x/enc_x_amb1.es")).toBe(fnv1("enc_x_amb1"));
    expect(nameHash("es/x/unknown_3c2f5ed5.es")).toBe(0x3c_2f_5e_d5);
    expect(nameHash("es/x/x_mission1.esp")).toBe(fnv1("x_mission1"));
    expect(nameHash("es/utility_scripts/t.esu")).toBe(fnv1("t"));
    // a .bs class's name is left for the bundle build, encounters included
    expect(nameHash("bs/games/x.bs", "class c_x:\n    int i\n")).toBe(fnv1(""));
    expect(
      nameHash(
        "bs/activities/common/story_common.bs",
        "class c_encounter__story_common : c_encounter:\n    int i\n"
      )
    ).toBe(fnv1(""));
    // no name on these bases, and none on a struct
    expect(nameHash("bs/w.bs", "class w : c_weapon:\n    int i\n")).toBe(
      undefined
    );
    expect(nameHash("bs/s.bs", "struct s_x:\n    int i\n")).toBe(undefined);
  });

  it("warns when an encounter class is not named after its file", () => {
    const bundle = '@activity_bundle("story_common")\n';
    expect(
      warnings(
        "bs/activities/common/story_common.bs",
        `${bundle}class c_encounter__story_common : c_encounter:\n    int i\n`
      )
    ).toEqual([]);
    expect(
      warnings(
        "bs/activities/common/story_common.bs",
        `${bundle}class c_encounter__other : c_encounter:\n    int i\n`
      ).map((d) => [d.line, d.message])
    ).toEqual([
      [
        2,
        "encounter class 'c_encounter__other' should be named 'c_encounter__story_common' after its file",
      ],
    ]);
    expect(
      warnings(
        "bs/binder.bs",
        `${bundle}class binder : c_encounter:\n    int i\n`
      )
    ).toHaveLength(1);
  });

  it("warns when a class carries the encounter prefix off c_encounter", () => {
    expect(
      warnings("bs/x.bs", "class c_encounter__x:\n    int i\n").map(
        (d) => d.message
      )
    ).toEqual([
      "'c_encounter__x' is named as an encounter but is not built on c_encounter",
    ]);
  });

  it("binds an encounter to the bundle its @activity_bundle names", () => {
    const bundleOf = (path: string, source: string) =>
      compileOne(source, path).decl.schema.activityBundleName;
    expect(
      bundleOf(
        "es/venus/venus_bounty_1.es",
        '@activity_bundle("bounty_1_activity")\nint i\n'
      )
    ).toBe(fnv1("bounty_1_activity"));
    // a name never cracked, by its hash
    expect(
      bundleOf(
        "es/mars/unknown_3c2f5ed5.es",
        "@activity_bundle(0x3C2F5ED5)\nint i\n"
      )
    ).toBe(0x3c_2f_5e_d5);
    expect(
      bundleOf(
        "bs/activities/common/story_common.bs",
        '@activity_bundle("story_common")\nclass c_encounter__story_common : c_encounter:\n    int i\n'
      )
    ).toBe(fnv1("story_common"));
  });

  it("warns about an encounter that runs in no bundle", () => {
    expect(
      warnings("es/x/enc_x_amb1.es", "int i\n").map((d) => d.message)
    ).toEqual([
      `encounter class 'c_encounter__enc_x_amb1' runs in no bundle; give it @activity_bundle("<bundle name>")`,
    ]);
    expect(
      warnings("es/x/enc_x_amb1.es", '@activity_bundle("enc_x_amb1")\nint i\n')
    ).toEqual([]);
  });

  it("refuses @activity_bundle off an encounter, and other decorators", () => {
    const errors = (path: string, source: string) =>
      compileBungieScript([{ path, source }])
        .diagnostics.filter((d) => d.severity === "error")
        .map((d) => d.message);
    expect(
      errors("es/utility_scripts/t.esu", '@activity_bundle("x")\nint i\n')
    ).toEqual(["@activity_bundle on 't', which is not an encounter class"]);
    expect(errors("es/x/enc_x.es", "@other(1)\nint i\n")).toEqual([
      expect.stringContaining("unknown decorator '@other'"),
    ]);
    expect(errors("es/x/enc_x.es", "@activity_bundle(3)\nint i\n")).toEqual([
      expect.stringContaining("takes a bundle name or a 0x<hash>"),
    ]);
  });
});

describe("list literals", () => {
  const source = [
    "c_squad_sensor_host sq_a",
    "c_squad_sensor_host sq_b",
    "c_squad_sensor_host sq_c[2]",
    "def go():",
    "    for sq in [sq_a, sq_b, sq_c[0]]:",
    "        sq.set_objective(1)",
    "    squads = [sq_a, sq_b]",
    "    empty = []",
    "    more = [1, 2,]",
    "    squads[1].set_objective(more[0] + len([[1], [2, 3]]))",
    "",
  ].join("\n");

  it("emits a table keyed from 0 and loops it like an array", () => {
    const { decl } = compileOne(source);
    expect(decl.lua).toContain(
      [
        "function _M.instance:go()",
        "  for index_5_unused, sq in enum_of({[0] = self.sq_a, [1] = self.sq_b, [2] = self.sq_c[0]}) do",
        "    sq:set_objective(1)",
        "  end",
        "  local squads",
        "  squads = {[0] = self.sq_a, [1] = self.sq_b}",
        "  local empty",
        "  empty = {}",
        "  local more",
        "  more = {[0] = 1, [1] = 2}",
        "  squads[1]:set_objective(more[0] + len({[0] = {[0] = 1}, [1] = {[0] = 2, [1] = 3}}))",
        "end",
      ].join("\n")
    );
  });

  it("calls a native on each element in order", () => {
    const { decl } = compileOne(
      [
        "c_squad_sensor_host sq_a",
        "c_squad_sensor_host sq_b",
        "c_squad_sensor_host sq_c[2]",
        "def go():",
        "    for sq in [sq_a, sq_b, sq_c[1]]:",
        "        sq.set_objective(7)",
        "",
      ].join("\n")
    );
    const calls: string[] = [];
    const environment = new LuaHostEnvironment();
    // the host's enum_of: indexes from 0
    const step = new LuaHostFunction("enum_of.step", (args) => {
      const index = (typeof args[1] === "number" ? args[1] : -1) + 1;
      const value = (args[0] as LuaTable).get(index);
      return value === undefined ? [] : [index, value];
    });
    environment.bind("enum_of", (args) => [step, args[0], -1]);
    const vm = new LuaState({ globals: environment.globals });
    const squad = (name: string) => {
      const table = new LuaTable();
      table.set(
        "set_objective",
        new LuaHostFunction(name, (args) => {
          calls.push(`${name}(${args[1]})`);
        })
      );
      return table;
    };
    const self = new LuaTable();
    self.set("sq_a", squad("a"));
    self.set("sq_b", squad("b"));
    const array = new LuaTable();
    array.set(0, squad("c0"));
    array.set(1, squad("c1"));
    self.set("sq_c", array);
    const [module] = vm.call(vm.loadChunk(compileLuaChunk(decl.lua)));
    const instance = (module as LuaTable).get("instance") as LuaTable;
    vm.call(instance.get("go") as never, [self]);
    expect(calls).toEqual(["a(7)", "b(7)", "c1(7)"]);
  });
});
