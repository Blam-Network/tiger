// A schema's "fast init data" (header +0x50): the byte image a fresh
// instance is built from (alpha sub_8281B398, sub_8281B510). It isn't an
// instance image itself but {u32 size (counting its own word)} plus records
// up to `size`, each after its class hash, 4-aligned. Applying every record
// to a zeroed buffer of the schema's own size reproduces the instance the
// game would build. The record classes' true names are unknown; they're
// named by what they do.

import type { s_schema, s_schema_member } from "./schema.ts";
import { k_default_value_offset, k_schema_kind } from "./schema.ts";

// Copy: {u32 length, u32 offset, u8 data[length]}, sparse; bytes no record
// covers read 0.
export const k_schema_fast_init_copy = 0x80800073;
// Array: {u32 offset, u32 stride, u32 count}, then zero pad to a 16-aligned
// size word and a nested 80800072 record, applied `count` times `stride`
// apart. Arrays nest.
export const k_schema_fast_init_array = 0x80800074;
// Handle: {u32 offset, u32 value}, a 4-byte word store (a class handle).
export const k_schema_fast_init_handle = 0x80800076;
// String: {u32 offset, i32 rel}, rel relative to its own word into the
// tag's string table (80800065 strings). No scalar member sits behind one (a
// string_hash member is a plain copy of its 4-byte hash), so it is parsed
// but never applied to the instance.
export const k_schema_fast_init_string = 0x80800075;
// Hash: {u32 hash}, a non-empty string hash the data references. Not
// applied.
export const k_schema_fast_init_hash = 0x80800077;
// The fast init data's own class, and the nested array element list's: its
// size word sits just after this class hash.
const k_fast_init_array_element_class = 0x80800072;

function apply(
  buffer: Buffer,
  at: number,
  end: number,
  mem: Buffer,
  base: number
): number {
  let o = at;
  while (o < end) {
    const record_class = buffer.readUInt32BE(o);
    if (record_class === k_schema_fast_init_copy) {
      const length = buffer.readUInt32BE(o + 4);
      const offset = buffer.readUInt32BE(o + 8);
      buffer.copy(mem, base + offset, o + 12, o + 12 + length);
      o += 12 + ((length + 3) & ~3);
    } else if (record_class === k_schema_fast_init_array) {
      const offset = buffer.readUInt32BE(o + 4);
      const stride = buffer.readUInt32BE(o + 8);
      const count = buffer.readUInt32BE(o + 12);
      let p = o + 16;
      while ((p + 4) % 16 !== 0) {
        p += 4;
      }
      if (buffer.readUInt32BE(p) !== k_fast_init_array_element_class) {
        throw new Error(
          `fast init array at 0x${o.toString(16)} has no nested 80800072`
        );
      }
      const size = buffer.readUInt32BE(p + 4);
      const nested_end = p + 4 + size;
      for (let i = 0; i < count; i++) {
        apply(buffer, p + 8, nested_end, mem, base + offset + i * stride);
      }
      o = nested_end;
    } else if (record_class === k_schema_fast_init_handle) {
      const offset = buffer.readUInt32BE(o + 4);
      mem.writeUInt32BE(buffer.readUInt32BE(o + 8), base + offset);
      o += 12;
    } else if (record_class === k_schema_fast_init_string) {
      o += 12;
    } else if (record_class === k_schema_fast_init_hash) {
      o += 8;
    } else {
      throw new Error(
        `unknown fast init record 0x${record_class.toString(16)} at 0x${o.toString(16)}`
      );
    }
  }
  return o;
}

// Builds the 360-layout instance image the schema's fast init data
// describes, or undefined for a schema with none ("Schema %s requires fast
// init data" is the runtime's complaint when it needed one).
export function read_schema_fast_init(
  buffer: Buffer,
  header: Pick<s_schema, "default_value" | "sizes">
): Buffer | undefined {
  if (header.default_value === 0) {
    return;
  }
  const at = k_default_value_offset + header.default_value;
  const total = buffer.readUInt32BE(at);
  const mem = Buffer.alloc(header.sizes[0]);
  apply(buffer, at + 4, at + total, mem, 0);
  return mem;
}

// A member's scalar value out of an instance image built by
// read_schema_fast_init (or any instance-shaped buffer). string_hash reads
// as the raw u32 hash; nothing here resolves it to a name.
export function read_schema_scalar(
  mem: Buffer,
  member: Pick<s_schema_member, "kind" | "offset">
): boolean | number | undefined {
  switch (member.kind) {
    case k_schema_kind.i32:
      return mem.readInt32BE(member.offset);
    case k_schema_kind.i16:
      return mem.readInt16BE(member.offset);
    case k_schema_kind.f32:
      return mem.readFloatBE(member.offset);
    case k_schema_kind.bool:
      return mem[member.offset] !== 0;
    case k_schema_kind.string_hash:
      return mem.readUInt32BE(member.offset);
    default:
      return;
  }
}

// A vector member's floats out of an instance image. aligned_vector3 reads
// its first three; the fourth lane's use is unknown.
export function read_schema_vector(
  mem: Buffer,
  member: Pick<s_schema_member, "kind" | "offset">
): number[] | undefined {
  let count: number;
  switch (member.kind) {
    case k_schema_kind.vector2:
      count = 2;
      break;
    case k_schema_kind.vector3:
    case k_schema_kind.aligned_vector3:
      count = 3;
      break;
    default:
      return;
  }
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    values.push(mem.readFloatBE(member.offset + i * 4));
  }
  return values;
}
