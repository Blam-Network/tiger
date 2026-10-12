import { describe, expect, it } from "vitest";
import type {
  BsExpr,
  BsField,
  BsIf,
  BsList,
  BsMethod,
  BsSwitch,
  BsThread,
} from "../../src/bungiescript/ast.ts";
import { BsCompileError } from "../../src/bungiescript/lexer.ts";
import {
  implicitDeclName,
  parseBungieScript,
} from "../../src/bungiescript/parser.ts";

describe("the BungieScript parser", () => {
  it("names an es-family file's implicit class by kind", () => {
    expect(implicitDeclName("es/venus/x/enc_x_amb1.es", "es")).toBe(
      "c_encounter__enc_x_amb1"
    );
    expect(implicitDeclName("es/utility_scripts/u_globals.esu", "esu")).toBe(
      "u_globals"
    );
    expect(parseBungieScript("int x\n", "es\\a\\b.esp").decls[0]).toMatchObject(
      { implicit: true, kind: "class", name: "b" }
    );
  });

  it("reads .bs classes, structs and enums with bases", () => {
    const file = parseBungieScript(
      [
        "class c_a : c_base:",
        "    int x = 1",
        "struct s_b:",
        "    real r",
        "enum e_c:",
        "    first",
        "    third = 3",
        "    fourth",
        "",
      ].join("\n"),
      "bs/x.bs"
    );
    expect(file.decls.map((d) => [d.kind, d.name, d.base])).toEqual([
      ["class", "c_a", "c_base"],
      ["struct", "s_b", undefined],
      ["enum", "e_c", undefined],
    ]);
    expect(
      file.decls[2].members.map((m) =>
        m.kind === "enum_value" ? [m.name, m.value] : []
      )
    ).toEqual([
      ["first", 0],
      ["third", 3],
      ["fourth", 4],
    ]);
  });

  it("reads every member form", () => {
    const file = parseBungieScript(
      [
        'static string_hash h = "x"',
        "static_array<c_device_host, 10> dev",
        "c_squad_sensor_host sq[7]",
        "table<e_k, s_v> t",
        'simple_encounter enc bind("id", 2)',
        "startup thread ss_main:",
        "    go()",
        "thread sc_dormant: pass",
        "def f(a, b):",
        "    return a",
        "static def g(): pass",
        "def finalize_interface.finalize():",
        "    pass",
        "delegate d_x(timer)",
        "command_script cs_go(path):",
        "    follow_path(path)",
        "implements i_weapon weapon_interface",
        "",
      ].join("\n"),
      "es/t.esu"
    );
    const members = file.decls[0].members;
    expect(members.map((m) => `${m.kind} ${m.name}`)).toEqual([
      "field h",
      "field dev",
      "field sq",
      "field t",
      "field enc",
      "thread ss_main",
      "thread sc_dormant",
      "def f",
      "def g",
      "def finalize",
      "delegate d_x",
      "command_script cs_go",
      "implements weapon_interface",
    ]);
    const [h, dev, sq, t, enc] = members as BsField[];
    expect(h.isStatic).toBe(true);
    expect(dev.type).toMatchObject({
      name: "static_array",
      text: "static_array<c_device_host, 10>",
    });
    expect(dev.type.args[1]).toBe(10);
    expect(sq.type.count).toBe(7);
    expect(
      t.type.args.map((a) => (typeof a === "number" ? a : a.name))
    ).toEqual(["e_k", "s_v"]);
    expect(enc.bind?.length).toBe(2);
    expect((members[5] as BsThread).startup).toBe(true);
    expect((members[6] as BsThread).body.map((s) => s.kind)).toEqual(["pass"]);
    expect((members[8] as BsMethod).isStatic).toBe(true);
    expect((members[9] as BsMethod).owner).toBe("finalize_interface");
    expect(members[10]).toMatchObject({ params: ["timer"] });
  });

  it("reads if/elif/else, loops, switch and semicolon statements", () => {
    const file = parseBungieScript(
      [
        "def f():",
        "    if a: x = 1",
        "    elif b:",
        "        x = 2",
        "    else:",
        "        x, y = g()",
        "    while not done():",
        "        break",
        "    for i, v in coll:",
        "        pass",
        "    switch schema(v):",
        "        case s_a:",
        "            go()",
        "        default: stop()",
        "    a.b(); sleep_until(c != d, 0.2)",
        "    return 1, 2",
        "",
      ].join("\n"),
      "es/t.esu"
    );
    const body = (file.decls[0].members[0] as BsMethod).body;
    expect(body.map((s) => s.kind)).toEqual([
      "if",
      "while",
      "for",
      "switch",
      "expr",
      "expr",
      "return",
    ]);
    const branches = (body[0] as BsIf).branches;
    expect(branches.map((b) => b.line)).toEqual([2, 3]);
    expect((body[0] as BsIf).orelse?.[0]).toMatchObject({
      kind: "assign",
      targets: [{ name: "x" }, { name: "y" }],
    });
    expect(body[3] as BsSwitch).toMatchObject({
      cases: [{ line: 12 }],
      default: [{ kind: "expr" }],
    });
    expect(body[4]).toMatchObject({ line: 15 });
    expect(body[5]).toMatchObject({
      line: 15,
      expr: { kind: "call", callee: { name: "sleep_until" } },
    });
  });

  it("parses expressions with Python 2 precedence", () => {
    const file = parseBungieScript(
      "def f():\n    return not a == b and -c ** 2 + d * e\n",
      "es/t.esu"
    );
    const [ret] = (file.decls[0].members[0] as BsMethod).body;
    expect(ret).toMatchObject({
      kind: "return",
      values: [
        {
          kind: "binary",
          op: "and",
          left: {
            kind: "unary",
            op: "not",
            operand: { kind: "binary", op: "==" },
          },
          right: {
            kind: "binary",
            op: "+",
            left: {
              kind: "unary",
              op: "-",
              operand: { kind: "binary", op: "**" },
            },
            right: { kind: "binary", op: "*" },
          },
        },
      ],
    });
  });

  it("reports syntax errors with the file and line", () => {
    expect(() => parseBungieScript("def f(:\n", "es/t.esu")).toThrow(
      BsCompileError
    );
    expect(() => parseBungieScript("def f():\n    a = \n", "es/t.esu")).toThrow(
      /t\.esu:2: expression expected/
    );
    expect(() => parseBungieScript("x\n", "es/t.esu")).toThrow(
      /not a BungieScript source|expected/
    );
  });

  it("reads list literals: empty, trailing comma, nested, over lines", () => {
    const file = parseBungieScript(
      [
        "def f():",
        "    a = []",
        "    b = [x, y[0], g(1),]",
        "    for s in [[1], [2,",
        "            3]]:",
        "        pass",
        "",
      ].join("\n"),
      "es/t.esu"
    );
    const body = (file.decls[0].members[0] as BsMethod).body;
    const value = (i: number) =>
      (body[i] as unknown as { value: BsExpr }).value;
    expect(value(0)).toMatchObject({ items: [], kind: "list" });
    expect(value(1)).toMatchObject({ kind: "list" });
    expect((value(1) as BsList).items.map((e) => e.kind)).toEqual([
      "name",
      "index",
      "call",
    ]);
    const loop = body[2] as unknown as { iter: BsList };
    expect(loop.iter.items.map((e) => (e as BsList).items.length)).toEqual([
      1, 2,
    ]);
  });

  it("rejects an unclosed list", () => {
    expect(() =>
      parseBungieScript("def f():\n    a = [1, 2\n", "es/t.esu")
    ).toThrow();
  });
});
