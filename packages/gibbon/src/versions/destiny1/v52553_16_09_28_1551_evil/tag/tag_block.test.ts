import { c } from "@craftycodie/cstruct";
import { describe, expect, it } from "vitest";
import {
  find_tag_blocks,
  k_tag_block_marker,
  read_definition,
  tag_block,
  tag_format_error,
  tag_struct,
} from "./tag_block.ts";
import {
  k_tag_string_class,
  read_tag_string,
  tag_relative_string,
} from "./tag_string.ts";

const s_pair = c.struct({
  a: c.u16(),
  b: c.u16(),
});

const s_holder = c.struct({
  size: c.u64(),
  pairs: tag_block(s_pair, 0x80801234),
  single: tag_struct(s_pair, 0x80805678),
  name: tag_relative_string(),
});

// size, block {u64 count, i64 offset}, struct {i64 offset}, string {i64
// offset}; then the block's marker, header and elements, the struct's class
// and body, and the string's class, length and bytes.
function holder(): Buffer {
  const buffer = Buffer.alloc(0x70);
  buffer.writeBigUInt64LE(BigInt(buffer.length), 0x00);
  buffer.writeBigUInt64LE(2n, 0x08);
  buffer.writeBigInt64LE(0x20n, 0x10); // 0x10 + 0x20 = 0x30, the header
  buffer.writeBigInt64LE(0x38n, 0x18); // 0x18 + 0x38 = 0x50, the struct
  buffer.writeBigInt64LE(0x48n, 0x20); // 0x20 + 0x48 = 0x68, the string
  buffer.writeUInt32LE(k_tag_block_marker, 0x2c);
  buffer.writeBigUInt64LE(2n, 0x30);
  buffer.writeUInt32LE(0x80801234, 0x38);
  buffer.writeUInt32LE(0x00020001, 0x40);
  buffer.writeUInt32LE(0x00040003, 0x44);
  buffer.writeUInt32LE(0x80805678, 0x4c);
  buffer.writeUInt32LE(0x000a0009, 0x50);
  buffer.writeUInt32LE(k_tag_string_class, 0x5c);
  buffer.writeBigUInt64LE(4n, 0x60);
  buffer.write("abc\0", 0x68, "latin1");
  return buffer;
}

describe("PS4 tag blocks", () => {
  it("follows 64-bit relative offsets to blocks, structs and strings", () => {
    expect(read_definition(holder(), s_holder)).toEqual({
      size: 0x70n,
      pairs: [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ],
      single: { a: 9, b: 10 },
      name: "abc",
    });
    expect(read_tag_string(holder(), 0x60)).toBe("abc");
  });

  it("reads an empty block and a null pointer as nothing", () => {
    const buffer = holder();
    buffer.writeBigUInt64LE(0n, 0x08);
    buffer.writeBigInt64LE(0n, 0x18);
    const read = read_definition(buffer, s_holder);
    expect(read.pairs).toEqual([]);
    expect(read.single).toBeUndefined();
  });

  it("refuses a block without its marker or of another class", () => {
    const unmarked = holder();
    unmarked.writeUInt32LE(0, 0x2c);
    expect(() => read_definition(unmarked, s_holder)).toThrow(tag_format_error);
    const other = holder();
    other.writeUInt32LE(0x80809999, 0x38);
    expect(() => read_definition(other, s_holder)).toThrow(tag_format_error);
  });

  it("finds blocks by marker and class", () => {
    expect(find_tag_blocks(holder(), 0x80801234)).toEqual([0x30]);
  });
});
