// A schema's "fast init data" (header +0x68): the byte image a fresh
// instance is built from. {u64 size (counting its own word)} plus records
// up to `size`, each after its class hash. The live build's records with
// their words widened to u64s: a record's body is aligned as its first
// field, 8 bytes for all but the hash's 4, its class hash in the word
// before. The Alpha Trial's record classes; their true names are unknown,
// so they're named by what they do.

import type { s_schema, s_schema_member } from "./schema.ts";
import {
  k_default_value_offset,
  k_schema_kind,
  k_schema_platform,
} from "./schema.ts";

// Copy: {u64 length, u64 offset, u8 data[length]}, sparse; bytes no record
// covers read 0.
export const k_schema_fast_init_copy = 0x80800073;
// Array: {u64 offset, u64 stride, u64 count}, then zero pad to a 16-aligned
// size word and a nested 80800072 record, applied `count` times `stride`
// apart. Arrays nest.
export const k_schema_fast_init_array = 0x80800074;
// Handle: {u64 offset, u32 value, 4 bytes pad}, a 4-byte word store (a
// class handle).
export const k_schema_fast_init_handle = 0x80800076;
// String: {u64 offset, i64 rel}, into the tag's string table. Parsed but
// never applied, as in the live build.
export const k_schema_fast_init_string = 0x80800075;
// Hash: {u32 hash}, a non-empty string hash the data references. Not
// applied.
export const k_schema_fast_init_hash = 0x80800077;
// The fast init data's own class, and the nested array element list's: its
// size word sits just after this class hash.
const k_fast_init_array_element_class = 0x80800072;

// Where the body of the record after `end` starts, past its class hash: a
// hash's body is 4-aligned, the others 8-aligned, so a word of pad can sit
// first.
function next_record(buffer: Buffer, end: number): number {
  if (end % 8 === 4 || end + 4 > buffer.length) {
    return end + 4;
  }
  return buffer.readUInt32LE(end) === k_schema_fast_init_hash
    ? end + 4
    : end + 8;
}

function read_u64(buffer: Buffer, offset: number): number {
  return Number(buffer.readBigUInt64LE(offset));
}

function apply(
  buffer: Buffer,
  at: number,
  end: number,
  mem: Buffer,
  base: number
): void {
  let body = next_record(buffer, at);
  while (body - 4 < end) {
    const record_class = buffer.readUInt32LE(body - 4);
    let next: number;
    if (record_class === k_schema_fast_init_copy) {
      const length = read_u64(buffer, body);
      const offset = read_u64(buffer, body + 8);
      buffer.copy(mem, base + offset, body + 16, body + 16 + length);
      next = body + 16 + ((length + 3) & ~3);
    } else if (record_class === k_schema_fast_init_array) {
      const offset = read_u64(buffer, body);
      const stride = read_u64(buffer, body + 8);
      const count = read_u64(buffer, body + 16);
      let size_word = body + 24 + 4;
      while (size_word % 16 !== 0) {
        size_word += 4;
      }
      if (
        buffer.readUInt32LE(size_word - 4) !== k_fast_init_array_element_class
      ) {
        throw new Error(
          `fast init array at 0x${body.toString(16)} has no nested 80800072`
        );
      }
      const nested_end = size_word + read_u64(buffer, size_word);
      for (let i = 0; i < count; i++) {
        apply(
          buffer,
          size_word + 8,
          nested_end,
          mem,
          base + offset + i * stride
        );
      }
      next = nested_end;
    } else if (record_class === k_schema_fast_init_handle) {
      const offset = read_u64(buffer, body);
      mem.writeUInt32LE(buffer.readUInt32LE(body + 8), base + offset);
      next = body + 16;
    } else if (record_class === k_schema_fast_init_string) {
      next = body + 16;
    } else if (record_class === k_schema_fast_init_hash) {
      next = body + 4;
    } else {
      throw new Error(
        `unknown fast init record 0x${record_class.toString(16)} at 0x${(body - 4).toString(16)}`
      );
    }
    body = next_record(buffer, next);
  }
}

// Builds this build's instance image the schema's fast init data describes,
// or undefined for a schema with none.
export function read_schema_fast_init(
  buffer: Buffer,
  header: Pick<s_schema, "default_value" | "sizes">
): Buffer | undefined {
  if (header.default_value === 0) {
    return;
  }
  const at = k_default_value_offset + header.default_value;
  const total = read_u64(buffer, at);
  const mem = Buffer.alloc(header.sizes[k_schema_platform]);
  apply(buffer, at + 8, at + total, mem, 0);
  return mem;
}

// A member's scalar value out of an instance image built by
// read_schema_fast_init (or any instance-shaped buffer). string_hash reads
// as the raw u32 hash.
export function read_schema_scalar(
  mem: Buffer,
  member: Pick<s_schema_member, "kind" | "offset">
): boolean | number | undefined {
  switch (member.kind) {
    case k_schema_kind.i32:
      return mem.readInt32LE(member.offset);
    case k_schema_kind.i16:
      return mem.readInt16LE(member.offset);
    case k_schema_kind.f32:
      return mem.readFloatLE(member.offset);
    case k_schema_kind.bool:
      return mem[member.offset] !== 0;
    case k_schema_kind.string_hash:
      return mem.readUInt32LE(member.offset);
    default:
      return;
  }
}

// A vector member's floats out of an instance image. aligned_vector3 reads
// its first three.
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
    values.push(mem.readFloatLE(member.offset + i * 4));
  }
  return values;
}
