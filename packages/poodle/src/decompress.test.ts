import { describe, expect, it } from "vitest";
import { c_lzh_quantum, quantum_header } from "../test/lzh_writer.ts";
import { synthetic_cases } from "../test/synthetic.ts";
import { decompress, PoodleError } from "./index.ts";

const k_header_lzh = 0x32;

function stream(...parts: (number | number[])[]): Uint8Array {
  return Uint8Array.from(parts.flat());
}

describe("decompress", () => {
  const cases = synthetic_cases();

  for (const c of cases) {
    it(`decodes ${c.name}`, () => {
      expect(decompress(c.compressed, c.raw_size)).toEqual(c.expected);
    });
  }

  it("stops where a short last block's stream does", () => {
    const c = cases[1];
    expect(decompress(c.compressed, 0x4_0000)).toEqual(c.expected);
  });

  it("rejects codecs other than LZH", () => {
    expect(() => decompress(stream(0x8c, 0x06), 0x4_0000)).toThrow(/Kraken/);
    expect(() => decompress(stream(0x8c, 0x08), 0x4_0000)).toThrow(
      /LZH variant 1/
    );
  });

  it("rejects the reserved quantum escape", () => {
    expect(() => decompress(stream(k_header_lzh, 0xff, 0xff), 0x4000)).toThrow(
      PoodleError
    );
  });

  it("rejects truncated streams", () => {
    const c = cases[0];
    expect(() =>
      decompress(c.compressed.subarray(0, c.compressed.length - 1), c.raw_size)
    ).toThrow(PoodleError);
  });

  it("rejects a quantum whose codes don't fill its size", () => {
    const q = new c_lzh_quantum().literal("abc").bytes();
    const word = (q[0] << 8) | q[1];
    const padded = [
      ...quantum_header((word & 0x3fff) + 2, true),
      ...q.slice(2),
      0,
    ];
    expect(() => decompress(stream(k_header_lzh, padded), 3)).toThrow(
      /size mismatch/
    );
  });

  it("rejects matches before the start", () => {
    const q = new c_lzh_quantum().literal("ab").match(3, 20).bytes();
    expect(() => decompress(stream(k_header_lzh, q), 5)).toThrow(
      /before the block/
    );
  });

  it("rejects matches past the end of the quantum", () => {
    const q = new c_lzh_quantum().literal("ab").match(9, 2).bytes();
    expect(() => decompress(stream(k_header_lzh, q), 10)).toThrow(
      /past the quantum/
    );
  });

  it("wants Huffman tables before any codes", () => {
    const q = new c_lzh_quantum().literal("ab");
    expect(() =>
      decompress(stream(k_header_lzh, q.bytes(q.lengths())), 2)
    ).toThrow(/before any Huffman tables/);
  });
});
