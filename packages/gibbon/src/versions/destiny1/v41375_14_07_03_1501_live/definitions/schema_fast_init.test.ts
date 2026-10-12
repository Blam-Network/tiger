import { describe, expect, it } from "vitest";
import {
  k_schema_fast_init_array,
  k_schema_fast_init_copy,
  k_schema_fast_init_handle,
  k_schema_fast_init_hash,
  k_schema_fast_init_string,
  read_schema_fast_init,
} from "./schema_fast_init.ts";

function words(values: number[]): Buffer {
  const buffer = Buffer.alloc(values.length * 4);
  for (const [i, v] of values.entries()) {
    buffer.writeUInt32BE(v >>> 0, i * 4);
  }
  return buffer;
}

describe("schema fast init records", () => {
  it("applies copy, array and handle records and skips string and hash", () => {
    // The data's size word sits at 0x64; header +0x50 points at it.
    const data = [
      0x80800072,
      0, // size, patched below
      k_schema_fast_init_copy,
      4,
      0x00,
      0x0000002a,
      k_schema_fast_init_hash,
      0x6a807a1a,
      k_schema_fast_init_string,
      0x08,
      0x10,
      k_schema_fast_init_handle,
      0x0c,
      0x80800608,
      k_schema_fast_init_array,
      0x10,
      4,
      2,
      // Pad so the nested size word lands 16-aligned.
      0,
      0x80800072,
      20,
      k_schema_fast_init_copy,
      2,
      0,
      0xbeef0000,
    ];
    const at = 0x60;
    const buffer = Buffer.alloc(at + data.length * 4);
    words(data).copy(buffer, at);
    // The size word counts itself.
    buffer.writeUInt32BE((data.length - 1) * 4, at + 4);
    const mem = read_schema_fast_init(buffer, {
      default_value: at + 4 - 0x50,
      sizes: [0x18, 0, 0, 0],
    });
    expect(mem?.readUInt32BE(0x00)).toBe(42);
    expect(mem?.readUInt32BE(0x0c)).toBe(0x80800608);
    expect(mem?.readUInt16BE(0x10)).toBe(0xbeef);
    expect(mem?.readUInt16BE(0x14)).toBe(0xbeef);
    expect(mem?.readUInt32BE(0x08)).toBe(0);
  });

  it("returns undefined for a schema without fast init data", () => {
    expect(
      read_schema_fast_init(Buffer.alloc(0x58), {
        default_value: 0,
        sizes: [4, 4, 4, 4],
      })
    ).toBeUndefined();
  });
});
