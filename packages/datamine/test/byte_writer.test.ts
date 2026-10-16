import { describe, expect, it } from "vitest";
import { c_byte_reader, c_byte_writer } from "../src/byte_writer.ts";
import { DatamineError } from "../src/datamine_error.ts";

describe("c_byte_writer", () => {
  it("writes little endian", () => {
    const writer = new c_byte_writer("little");
    writer.u8(1);
    writer.u16(0x02_03);
    writer.u32(0x04_05_06_07);
    expect([...writer.finish()]).toEqual([1, 3, 2, 7, 6, 5, 4]);
  });

  it("writes big endian", () => {
    const writer = new c_byte_writer("big");
    writer.u16(0x02_03);
    writer.i32(-2);
    writer.u64(0x01_02_03_04_05_06_07_08n);
    expect([...writer.finish()]).toEqual([
      2, 3, 0xff, 0xff, 0xff, 0xfe, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it("wraps out of range values like a C cast", () => {
    const writer = new c_byte_writer("little");
    writer.u8(0x1_05);
    writer.u16(-1);
    writer.i16(0x1_00_01);
    writer.u32(-1);
    writer.i32(0x1_00_00_00_02);
    writer.u64(-1n);
    writer.i64(2n ** 63n);
    const reader = new c_byte_reader(writer.finish(), "little");
    expect(reader.u8()).toBe(5);
    expect(reader.u16()).toBe(0xff_ff);
    expect(reader.i16()).toBe(1);
    expect(reader.u32()).toBe(0xff_ff_ff_ff);
    expect(reader.i32()).toBe(2);
    expect(reader.u64()).toBe(2n ** 64n - 1n);
    expect(reader.i64()).toBe(-(2n ** 63n));
  });

  it("grows past the initial capacity", () => {
    const writer = new c_byte_writer("little", 2);
    for (let i = 0; i < 1000; i++) {
      writer.u32(i);
    }
    expect(writer.offset).toBe(4000);
    expect(new c_byte_reader(writer.finish(), "little", 3996).u32()).toBe(999);
  });

  it("writes fixed strings, bytes and zeros", () => {
    const writer = new c_byte_writer("little");
    writer.fixed_string("abcdef", 4);
    writer.bytes(Buffer.from([9, 9]));
    writer.zero(3);
    expect([...writer.finish()]).toEqual([97, 98, 99, 0, 9, 9, 0, 0, 0]);
  });

  it("patches a u32 in place", () => {
    const writer = new c_byte_writer("big");
    writer.u32(0);
    writer.u8(7);
    writer.patch_u32(0, 0xaa_bb_cc_dd);
    expect([...writer.finish()]).toEqual([0xaa, 0xbb, 0xcc, 0xdd, 7]);
    expect(() => writer.patch_u32(3, 1)).toThrow(DatamineError);
  });

  it("finish returns a copy", () => {
    const writer = new c_byte_writer("little");
    writer.u8(1);
    const first = writer.finish();
    writer.u8(2);
    expect(first).toHaveLength(1);
    expect(writer.finish()).toHaveLength(2);
  });
});

describe("c_byte_reader", () => {
  it("round trips every type in both orders", () => {
    for (const order of ["little", "big"] as const) {
      const writer = new c_byte_writer(order);
      writer.u8(200);
      writer.u16(60_000);
      writer.i16(-1234);
      writer.u32(4_000_000_000);
      writer.i32(-2_000_000_000);
      writer.u64(0xff_ee_dd_cc_bb_aa_99_88n);
      writer.i64(-5n);
      writer.f32(1.5);
      writer.f64(-2.25);
      writer.fixed_string("name", 8);
      const reader = new c_byte_reader(writer.finish(), order);
      expect(reader.u8()).toBe(200);
      expect(reader.u16()).toBe(60_000);
      expect(reader.i16()).toBe(-1234);
      expect(reader.u32()).toBe(4_000_000_000);
      expect(reader.i32()).toBe(-2_000_000_000);
      expect(reader.u64()).toBe(0xff_ee_dd_cc_bb_aa_99_88n);
      expect(reader.i64()).toBe(-5n);
      expect(reader.f32()).toBe(1.5);
      expect(reader.f64()).toBe(-2.25);
      expect(reader.fixed_string(8)).toBe("name");
      expect(reader.remaining).toBe(0);
    }
  });

  it("switches byte order mid stream and seeks", () => {
    const reader = new c_byte_reader(Buffer.from([1, 2, 1, 2, 0xff]), "little");
    expect(reader.u16()).toBe(0x02_01);
    reader.byte_order = "big";
    expect(reader.u16()).toBe(0x01_02);
    reader.seek(0);
    expect(reader.offset).toBe(0);
    reader.skip(4);
    expect(reader.remaining).toBe(1);
    expect(reader.bytes(1)).toEqual(Buffer.from([0xff]));
  });

  it("starts at the given offset and respects a view's byteOffset", () => {
    const backing = Buffer.from([9, 9, 1, 0, 2, 0]);
    const reader = new c_byte_reader(backing.subarray(2), "little", 2);
    expect(reader.u16()).toBe(2);
  });

  it("throws on overrun and bad seeks", () => {
    const reader = new c_byte_reader(Buffer.from([1, 2, 3]), "little");
    expect(() => reader.u32()).toThrow(DatamineError);
    expect(reader.offset).toBe(0);
    expect(() => reader.bytes(4)).toThrow(DatamineError);
    expect(() => reader.skip(4)).toThrow(DatamineError);
    expect(() => reader.seek(4)).toThrow(DatamineError);
    expect(() => reader.seek(-1)).toThrow(DatamineError);
  });
});
