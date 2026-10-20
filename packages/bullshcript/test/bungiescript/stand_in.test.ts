import { describe, expect, it } from "vitest";
import { compileBungieScript } from "../../src/bungiescript/compile.ts";
import { compiledScriptSetOf } from "../../src/bungiescript/compiled_bs.ts";
import { parseBungieScript } from "../../src/bungiescript/parser.ts";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import { chunkLineOf, fileLineOf } from "../../src/bungiescript/stand_in.ts";
import { readBytecode } from "../../src/hks/bytecode/reader.ts";

// Decorator lines are not lines of the script: a chunk is numbered without
// them (LANGUAGE.md, Line numbers).

const PATH = "es/x/enc_x.es";

function standInLines(source: string): number[] {
  return [...parseBungieScript(source, PATH).standInLines];
}

function compileOne(source: string) {
  const result = compileBungieScript([{ path: PATH, source }]);
  expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  return result.decls[0];
}

// the chunk's own line info, root first
function lineInfo(source: string): number[][] {
  const chunk = compileOne(source).chunk;
  if (chunk === undefined) {
    throw new Error("no chunk");
  }
  const out: number[][] = [];
  const walk = (proto: { lineInfo: number[]; protos: unknown[] }) => {
    out.push(proto.lineInfo);
    for (const child of proto.protos) {
      walk(child as typeof proto);
    }
  };
  walk(readBytecode(chunk, "test").root as never);
  return out;
}

describe("stand-in lines", () => {
  it("are the lines that hold nothing but decorators", () => {
    const source = [
      '@activity_bundle("enc_x") @activity("x")', // 1, two on a line
      '@start_slice("plaza")', // 2
      "int a", // 3
      "", // 4
      "@member_counts({dreg: 2})", // 5
      "squad sq", // 6
    ].join("\n");
    expect(standInLines(source)).toEqual([1, 2, 5]);
  });

  it("leave a line that shares a decorator with code in the count", () => {
    const source = [
      '@activity_bundle("enc_x")', // 1
      "@member_counts({dreg: 2}) squad sq", // 2
      "int a", // 3
    ].join("\n");
    expect(standInLines(source)).toEqual([1]);
  });

  it("take a decorator that spans lines, whole", () => {
    const source = [
      '@activity_bundle("enc_x")', // 1
      "@member_counts({", // 2
      "    dreg: 2,", // 3
      "    vandal: 1,", // 4
      "})", // 5
      "squad sq", // 6
    ].join("\n");
    expect(standInLines(source)).toEqual([1, 2, 3, 4, 5]);
  });

  it("take the comments directly above them, not the ones a blank line away", () => {
    const source = [
      "# the file", // 1
      "", // 2
      "# about the bundle", // 3
      '@activity_bundle("enc_x")', // 4
      "int a", // 5
      "# about the squad", // 6
      "# (two lines)", // 7
      "@member_counts({dreg: 2})", // 8
      "squad sq", // 9
      "# about b", // 10
      "int b", // 11
      "", // 12
      "# not the decorator's", // 13
      "", // 14
      "@member_counts({dreg: 1})", // 15
      "squad sq2", // 16
    ].join("\n");
    expect(standInLines(source)).toEqual([3, 4, 6, 7, 8, 15]);
  });

  it("are none in a script without decorators", () => {
    expect(standInLines("# a\n\nint a\n")).toEqual([]);
  });

  it("map a file line to a chunk line and back", () => {
    const standIn = [1, 2, 5];
    expect(chunkLineOf(standIn, 3)).toBe(1);
    expect(chunkLineOf(standIn, 4)).toBe(2);
    expect(chunkLineOf(standIn, 6)).toBe(3);
    // a stand-in line takes the number of the next line that counts
    expect(chunkLineOf(standIn, 5)).toBe(3);
    expect(fileLineOf(standIn, 1)).toBe(3);
    expect(fileLineOf(standIn, 2)).toBe(4);
    expect(fileLineOf(standIn, 3)).toBe(6);
    expect(chunkLineOf([], 7)).toBe(7);
    expect(fileLineOf([], 7)).toBe(7);
  });
});

describe("a chunk's lines without them", () => {
  const BODY = "int a\n\nscript main():\n    a = 1\n    a = 2\n";

  it("do not move when decorators come or go", () => {
    const plain = lineInfo(BODY);
    expect(plain.flat().length).toBeGreaterThan(0);
    expect(
      lineInfo(`@activity("x")
@start_slice("plaza")
${BODY}`)
    ).toEqual(plain);
    // a comment directly above a decorator goes with it
    expect(
      lineInfo(`@activity("x")
# why
@start_slice("plaza")
${BODY}`)
    ).toEqual(plain);
    // and one with a blank line between does not
    expect(
      lineInfo(`# why

@activity("x")
${BODY}`)
    ).toEqual(
      lineInfo(`# why

${BODY}`)
    );
    expect(
      lineInfo(`# why

${BODY}`)
    ).not.toEqual(plain);
    // the bundle's line does not count either: a blank line takes its place
    expect(
      lineInfo(`@activity_bundle("enc_x")

${BODY}`)
    ).toEqual(
      lineInfo(`
${BODY}`)
    );
  });

  it("do not move when a script starts with @startup()", () => {
    const plain = lineInfo(BODY);
    const startup = ["int a", "", "@startup()", "script main():", "    a = 1"];
    expect(standInLines(startup.join("\n"))).toEqual([3]);
    expect(lineInfo(`${startup.join("\n")}\n    a = 2\n`)).toEqual(plain);
    // the schema keeps the file's line, and the flag
    const member = compileOne(`${startup.join("\n")}\n`).schema.members.find(
      (m) => m.name === "main"
    );
    expect(member).toMatchObject({ autostart: true, line: 4 });
    // a comment directly above the decorator goes with it; one between the
    // decorator and its script stays the script's
    expect(
      standInLines("int a\n\n# why\n@startup()\nscript main():\n    a = 1\n")
    ).toEqual([3, 4]);
    const between = "int a\n\n@startup()\n# why\nscript main():\n    a = 1\n";
    expect(standInLines(between)).toEqual([3]);
    expect(lineInfo(between)).toEqual(
      lineInfo("int a\n\n# why\nscript main():\n    a = 1\n")
    );
  });

  it("name the locals the chunk's line gave them", () => {
    const body =
      "def f(n):\n    switch n:\n        case 1:\n            go()\n";
    const withDecorators = `@activity("x")\n@start_slice("plaza")\n${body}`;
    expect(compileOne(withDecorators).lua).toBe(compileOne(body).lua);
    expect(compileOne(body).lua).toContain("switch_value_2");
  });

  it("keep the file's lines for the script's own positions", () => {
    const source = `@activity("x")\n@start_slice("plaza")\n\nint a\ndef f(n):\n    pass\n`;
    const decl = compileOne(source);
    const method = decl.schema.members.find((m) => m.name === "f");
    expect(method?.line).toBe(5);
    expect(decl.standInLines).toEqual([1, 2]);
    // the generated Lua's lines map to the file's lines
    expect(decl.lineMap).toContain(5);
  });

  it("travel with the compiled tree, only where there are some", () => {
    const compiled = compileScriptFiles([
      { path: PATH, text: '@activity_bundle("enc_x")\n\nint a\n' },
      { path: "es/utility_scripts/u.esu", text: "int a\n" },
    ]);
    const set = compiledScriptSetOf(compiled, "2000-01-01T00:00:00Z");
    expect(set.scriptByPath(PATH)?.standInLines).toEqual([1]);
    expect(set.scriptByPath("es/utility_scripts/u.esu")).not.toHaveProperty(
      "standInLines"
    );
  });
});
