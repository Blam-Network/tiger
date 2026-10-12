import { describe, expect, it } from "vitest";
import {
  BsCompileError,
  parseBsNumber,
  tokenize,
} from "../../src/bungiescript/lexer.ts";

const kinds = (source: string) =>
  tokenize(source, "t.esu").map((t) =>
    t.kind === "name" || t.kind === "op" ? t.text : t.kind
  );

describe("the BungieScript lexer", () => {
  it("emits indent and dedent tokens on Python's rules", () => {
    expect(kinds("def f():\n    a = 1\n    if a:\n        b()\nc()\n")).toEqual(
      [
        "def",
        "f",
        "(",
        ")",
        ":",
        "newline",
        "indent",
        "a",
        "=",
        "number",
        "newline",
        "if",
        "a",
        ":",
        "newline",
        "indent",
        "b",
        "(",
        ")",
        "newline",
        "dedent",
        "dedent",
        "c",
        "(",
        ")",
        "newline",
        "eof",
      ]
    );
  });

  it("closes open blocks at the end of input", () => {
    expect(kinds("thread t:\n    x()").slice(-4)).toEqual([
      ")",
      "newline",
      "dedent",
      "eof",
    ]);
  });

  it("skips blank and comment lines without touching indentation", () => {
    expect(kinds("a()\n\n# note\n   # indented note\nb()\n")).toEqual([
      "a",
      "(",
      ")",
      "newline",
      "b",
      "(",
      ")",
      "newline",
      "eof",
    ]);
    expect(kinds("a() # trailing\n")).toEqual([
      "a",
      "(",
      ")",
      "newline",
      "eof",
    ]);
  });

  it("continues a line inside brackets and after a backslash", () => {
    const tokens = tokenize("f(a,\n  b)\nx = 1 + \\\n    2\n", "t.esu");
    expect(
      tokens.map((t) => t.kind).filter((k) => k === "newline").length
    ).toBe(2);
    expect(tokens.find((t) => t.text === "b")?.line).toBe(2);
    expect(tokens.find((t) => t.text === "2")?.line).toBe(4);
  });

  it("rejects a bad unindent", () => {
    expect(() => tokenize("if a:\n        b()\n    c()\n", "t.esu")).toThrow(
      BsCompileError
    );
  });

  it("decodes Python and Lua string escapes to single bytes", () => {
    const [token] = tokenize(String.raw`"a\n\t\"q\"\x41\065\\z"`, "t.esu");
    expect(token.kind).toBe("string");
    expect(token.text).toBe('a\n\t"q"AA\\z');
    expect(tokenize("'single'", "t.esu")[0].text).toBe("single");
  });

  it("keeps byte spans so a condition can be sliced back out", () => {
    const source = "sleep_until(a.b() != c, 0.5)";
    const tokens = tokenize(source, "t.esu");
    const open = tokens.findIndex((t) => t.text === "(");
    const comma = tokens.findIndex((t) => t.text === ",");
    expect(source.slice(tokens[open + 1].start, tokens[comma - 1].end)).toBe(
      "a.b() != c"
    );
  });

  it("reads numbers as the chunk's 4-byte floats", () => {
    const tokens = tokenize("60.1 0x10 1e-5 .5", "t.esu").filter(
      (t) => t.kind === "number"
    );
    expect(tokens.map((t) => t.value)).toEqual([
      Math.fround(60.1),
      16,
      Math.fround(1e-5),
      0.5,
    ]);
    expect(tokens[0].text).toBe("60.1");
    expect(parseBsNumber("3x")).toBeUndefined();
  });

  it("splits the longest operators first", () => {
    expect(kinds("a ** b != c <= d")).toEqual([
      "a",
      "**",
      "b",
      "!=",
      "c",
      "<=",
      "d",
      "newline",
      "eof",
    ]);
  });
});
