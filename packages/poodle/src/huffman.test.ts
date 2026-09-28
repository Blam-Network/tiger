import { describe, expect, it } from "vitest";
import { c_bit_writer, write_sparse_table } from "../test/lzh_writer.js";
import { c_bit_reader } from "./bit_reader.js";
import { read_huffman_table } from "./huffman.js";
import { k_lzh_symbol_count } from "./lzh.js";
import { PoodleError } from "./poodle_error.js";

function reader_of(writer: c_bit_writer): c_bit_reader {
  const bytes = Uint8Array.from(writer.bytes());
  return new c_bit_reader(bytes, 0, bytes.length);
}

function decode(
  reader: c_bit_reader,
  table: ReturnType<typeof read_huffman_table>
) {
  reader.refill();
  const code = table.lookup(reader.bits);
  reader.read(code & 31);
  return code >>> 5;
}

// A value v >= 2 as z zeros and then v in z + 2 bits.
function gamma(writer: c_bit_writer, value: number) {
  const zeros = 32 - Math.clz32(value) - 2;
  writer.bits(0, zeros).bits(value, zeros + 2);
}

describe("read_huffman_table", () => {
  it("reads the sparse layout and decodes canonical codes", () => {
    const writer = new c_bit_writer();
    write_sparse_table(
      writer,
      new Map([
        [0x41, 1],
        [0x42, 2],
        [0x100, 3],
        [0x2c8, 3],
      ])
    );
    writer.align();
    // Codes: A 0, B 10, 0x100 110, 0x2c8 111.
    writer.bits(0b0_10_111_110_0, 10);
    const reader = reader_of(writer);
    const table = read_huffman_table(reader, k_lzh_symbol_count);
    expect(table.used).toBe(4);
    reader.read((8 - (reader.consumed_bits() % 8)) % 8);
    expect([0, 1, 2, 3, 4].map(() => decode(reader, table))).toEqual([
      0x41, 0x42, 0x2c8, 0x100, 0x41,
    ]);
  });

  it("sends a lone symbol with no bits", () => {
    const writer = new c_bit_writer();
    write_sparse_table(writer, new Map([[0x7a, 0]]));
    const reader = reader_of(writer);
    const table = read_huffman_table(reader, k_lzh_symbol_count);
    expect(table.used).toBe(1);
    expect(table.lookup(0)).toBe(0x7a << 5);
  });

  it("reads the run layout", () => {
    const writer = new c_bit_writer();
    // Run layout, no forced bits, no leading zero run, a run of 2 lengths.
    writer.bits(1, 1).bits(0, 2).bits(1, 1);
    gamma(writer, 3);
    // Lengths code as zigzag deltas from a running average that starts at
    // 10 bits (713 symbols): 1 is -9 (v = 17), then against 8, -7 (v = 13).
    writer.bits(0, 17).bits(1, 1);
    writer.bits(0, 13).bits(1, 1);
    // The other 711 symbols are absent.
    gamma(writer, 712);
    writer.align();
    writer.bits(0b1001, 4);
    const reader = reader_of(writer);
    const table = read_huffman_table(reader, k_lzh_symbol_count);
    expect(table.used).toBe(2);
    reader.read((8 - (reader.consumed_bits() % 8)) % 8);
    expect([0, 1, 2, 3].map(() => decode(reader, table))).toEqual([1, 0, 0, 1]);
  });

  it("rejects an incomplete code", () => {
    const writer = new c_bit_writer();
    write_sparse_table(
      writer,
      new Map([
        [1, 1],
        [2, 2],
      ])
    );
    expect(() =>
      read_huffman_table(reader_of(writer), k_lzh_symbol_count)
    ).toThrow(PoodleError);
  });

  it("rejects sparse symbols out of order", () => {
    const writer = new c_bit_writer();
    writer.bits(0, 1).bits(2, 10).bits(0, 3).bits(9, 10).bits(3, 10);
    expect(() =>
      read_huffman_table(reader_of(writer), k_lzh_symbol_count)
    ).toThrow(PoodleError);
  });
});
