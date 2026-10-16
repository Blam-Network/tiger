import { describe, expect, it } from "vitest";
import {
  ascii_strnlwr,
  csstrnzcpy_bytes,
  string_from_fixed_bytes,
} from "../../../src/blam/cseries/cseries_strings.ts";

describe("csstrnzcpy_bytes", () => {
  it("pads short text with NULs to exactly size bytes", () => {
    expect([...csstrnzcpy_bytes("abc", 6)]).toEqual([97, 98, 99, 0, 0, 0]);
  });

  it("always leaves a terminating NUL", () => {
    expect([...csstrnzcpy_bytes("abcdef", 4)]).toEqual([97, 98, 99, 0]);
    expect([...csstrnzcpy_bytes("abc", 3)]).toEqual([97, 98, 0]);
  });

  it("handles degenerate sizes", () => {
    expect(csstrnzcpy_bytes("abc", 0)).toHaveLength(0);
    expect([...csstrnzcpy_bytes("abc", 1)]).toEqual([0]);
  });

  it("never cuts inside a utf8 sequence", () => {
    // "aé" is 61 c3 a9; a 3 byte field has room for 2 text bytes, which would split the é.
    expect([...csstrnzcpy_bytes("aé", 3)]).toEqual([0x61, 0, 0]);
    expect([...csstrnzcpy_bytes("aé", 4)]).toEqual([0x61, 0xc3, 0xa9, 0]);
    // Four byte sequence (emoji) in a field that only fits part of it.
    expect([...csstrnzcpy_bytes("a😀", 4)]).toEqual([0x61, 0, 0, 0]);
  });

  it("encodes latin1 one byte per character", () => {
    expect([...csstrnzcpy_bytes("aé", 4, "latin1")]).toEqual([
      0x61, 0xe9, 0, 0,
    ]);
  });

  it("stops at an embedded NUL like strcpy", () => {
    expect([...csstrnzcpy_bytes("ab\0cd", 8)]).toEqual([
      97, 98, 0, 0, 0, 0, 0, 0,
    ]);
  });
});

describe("string_from_fixed_bytes", () => {
  it("reads up to the first NUL", () => {
    expect(string_from_fixed_bytes(Buffer.from([97, 98, 0, 99]))).toBe("ab");
  });

  it("reads a field with no NUL in full", () => {
    expect(string_from_fixed_bytes(Buffer.from("abc"))).toBe("abc");
  });

  it("honours the encoding and the view offset", () => {
    const backing = Buffer.from([0xff, 0xe9, 0x41, 0]);
    expect(string_from_fixed_bytes(backing.subarray(1), "latin1")).toBe("éA");
  });

  it("round trips through csstrnzcpy_bytes", () => {
    expect(string_from_fixed_bytes(csstrnzcpy_bytes("héllo", 16))).toBe(
      "héllo"
    );
  });
});

describe("ascii_strnlwr", () => {
  it("lowercases ASCII letters only", () => {
    expect(ascii_strnlwr("Hello_WORLD-9 É")).toBe("hello_world-9 É");
  });
});
