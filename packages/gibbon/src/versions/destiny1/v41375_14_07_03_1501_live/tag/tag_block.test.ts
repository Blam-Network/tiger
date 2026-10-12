import { c } from "@craftycodie/cstruct";
import { describe, expect, it } from "vitest";
import {
  find_tag_blocks,
  k_tag_block_marker,
  read_definition,
  read_tag_block_at,
  tag_block,
  tag_bytes,
  tag_format_error,
  tag_span_bytes,
  tag_struct,
} from "./tag_block.ts";
import { row_reference_index, row_reference_type } from "./tag_reference.ts";
import {
  read_tag_string,
  scan_tag_strings,
  tag_relative_string,
} from "./tag_string.ts";

const s_pair = c.struct({
  a: c.u16(),
  b: c.u16(),
});

const s_holder = c.struct({
  size: c.u32(),
  pairs: tag_block(s_pair, 0x80801234),
  single: tag_struct(s_pair, 0x80805678),
});

// size, block {count, offset}, struct {offset}, then the block's marker,
// header and elements, then the struct's class and body.
function holder(): Buffer {
  const words = [
    0,
    2,
    0x0c, // 0x08 + 0x0c = 0x14, the block header
    0x24, // 0x0c + 0x24 = 0x30, the struct
    k_tag_block_marker,
    2,
    0x80801234,
    0,
    0,
    0x00010002,
    0x00030004,
    0x80805678,
    0x0009000a,
  ];
  const buffer = Buffer.alloc(words.length * 4);
  for (const [i, word] of words.entries()) {
    buffer.writeUInt32BE(word >>> 0, i * 4);
  }
  buffer.writeUInt32BE(buffer.length, 0);
  return buffer;
}

describe("tag blocks", () => {
  it("follows relative offsets to blocks and structs", () => {
    const read = read_definition(holder(), s_holder);
    expect(read.pairs).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    expect(read.single).toMatchObject({ a: 9, b: 10 });
  });

  it("refuses a block of the wrong class or without its marker", () => {
    const buffer = holder();
    expect(() => read_tag_block_at(buffer, 0x14, s_pair, 0x80809999)).toThrow(
      tag_format_error
    );
    buffer.writeUInt32BE(0, 0x10);
    expect(() => read_definition(buffer, s_holder)).toThrow(tag_format_error);
  });

  it("reads an empty block and a missing struct without following them", () => {
    const buffer = holder();
    buffer.writeUInt32BE(0, 0x04);
    buffer.writeUInt32BE(0, 0x0c);
    const read = read_definition(buffer, s_holder);
    expect(read.pairs).toEqual([]);
    expect(read.single).toBeUndefined();
  });

  it("reads a byte block", () => {
    const s_bytes = c.struct({ size: c.u32(), bytes: tag_bytes(0x80801234) });
    const buffer = holder();
    buffer.writeUInt32BE(8, 0x04);
    const { bytes } = read_definition(buffer, s_bytes);
    expect([...tag_span_bytes(buffer, bytes)]).toEqual([
      0, 1, 0, 2, 0, 3, 0, 4,
    ]);
  });

  it("finds blocks by marker", () => {
    expect(find_tag_blocks(holder(), 0x80801234)).toEqual([0x14]);
    expect(find_tag_blocks(holder(), 0x80804321)).toEqual([]);
  });
});

describe("tag strings and references", () => {
  it("reads a length-prefixed string", () => {
    const buffer = Buffer.alloc(16);
    buffer.writeUInt32BE(6, 4);
    buffer.write("tower\0", 8, "latin1");
    expect(read_tag_string(buffer, 4)).toBe("tower");
    expect(scan_tag_strings(buffer)).toEqual([{ offset: 4, value: "tower" }]);
  });

  it("follows a relative string", () => {
    const s_named = c.struct({
      name: tag_relative_string(),
      none: tag_relative_string(),
    });
    const buffer = Buffer.alloc(16);
    buffer.writeInt32BE(8, 0);
    buffer.write("tower\0", 8, "latin1");
    expect(read_definition(buffer, s_named)).toEqual({
      name: "tower",
      none: undefined,
    });
  });

  it("unpacks row references", () => {
    expect(row_reference_type(0x03000012)).toBe(3);
    expect(row_reference_index(0x03000012)).toBe(0x12);
    expect(row_reference_index(0x0300ffff)).toBe(-1);
  });
});
