import {
  csstrnzcpy_bytes,
  string_from_fixed_bytes,
  type t_text_encoding,
} from "./blam/cseries/cseries_strings.ts";
import { DatamineError } from "./datamine_error.ts";

export type t_byte_order = "little" | "big";

// Growable output buffer. Out of range values wrap the way a C cast would instead of throwing.
export class c_byte_writer {
  private m_buffer: Buffer;
  private m_offset = 0;
  private readonly m_little: boolean;

  constructor(byte_order: t_byte_order, initial_capacity = 256) {
    this.m_little = byte_order === "little";
    this.m_buffer = Buffer.alloc(Math.max(initial_capacity, 1));
  }

  get offset(): number {
    return this.m_offset;
  }

  private reserve(count: number): number {
    const start = this.m_offset;
    const required = start + count;
    if (required > this.m_buffer.length) {
      let capacity = this.m_buffer.length * 2;
      while (capacity < required) {
        capacity *= 2;
      }
      const grown = Buffer.alloc(capacity);
      this.m_buffer.copy(grown, 0, 0, start);
      this.m_buffer = grown;
    }
    this.m_offset = required;
    return start;
  }

  u8(value: number): void {
    this.m_buffer[this.reserve(1)] = value & 0xff;
  }

  u16(value: number): void {
    const at = this.reserve(2);
    const wrapped = value & 0xffff;
    if (this.m_little) {
      this.m_buffer.writeUInt16LE(wrapped, at);
    } else {
      this.m_buffer.writeUInt16BE(wrapped, at);
    }
  }

  i16(value: number): void {
    const at = this.reserve(2);
    const wrapped = (value << 16) >> 16;
    if (this.m_little) {
      this.m_buffer.writeInt16LE(wrapped, at);
    } else {
      this.m_buffer.writeInt16BE(wrapped, at);
    }
  }

  u32(value: number): void {
    const at = this.reserve(4);
    const wrapped = value >>> 0;
    if (this.m_little) {
      this.m_buffer.writeUInt32LE(wrapped, at);
    } else {
      this.m_buffer.writeUInt32BE(wrapped, at);
    }
  }

  i32(value: number): void {
    const at = this.reserve(4);
    const wrapped = value | 0;
    if (this.m_little) {
      this.m_buffer.writeInt32LE(wrapped, at);
    } else {
      this.m_buffer.writeInt32BE(wrapped, at);
    }
  }

  u64(value: bigint): void {
    const at = this.reserve(8);
    const wrapped = BigInt.asUintN(64, value);
    if (this.m_little) {
      this.m_buffer.writeBigUInt64LE(wrapped, at);
    } else {
      this.m_buffer.writeBigUInt64BE(wrapped, at);
    }
  }

  i64(value: bigint): void {
    const at = this.reserve(8);
    const wrapped = BigInt.asIntN(64, value);
    if (this.m_little) {
      this.m_buffer.writeBigInt64LE(wrapped, at);
    } else {
      this.m_buffer.writeBigInt64BE(wrapped, at);
    }
  }

  f32(value: number): void {
    const at = this.reserve(4);
    if (this.m_little) {
      this.m_buffer.writeFloatLE(value, at);
    } else {
      this.m_buffer.writeFloatBE(value, at);
    }
  }

  f64(value: number): void {
    const at = this.reserve(8);
    if (this.m_little) {
      this.m_buffer.writeDoubleLE(value, at);
    } else {
      this.m_buffer.writeDoubleBE(value, at);
    }
  }

  bytes(data: Uint8Array): void {
    const at = this.reserve(data.length);
    this.m_buffer.set(data, at);
  }

  fixed_string(
    value: string,
    size: number,
    encoding: t_text_encoding = "utf8"
  ): void {
    this.bytes(csstrnzcpy_bytes(value, size, encoding));
  }

  zero(count: number): void {
    const at = this.reserve(count);
    this.m_buffer.fill(0, at, at + count);
  }

  patch_u32(offset: number, value: number): void {
    if (offset < 0 || offset + 4 > this.m_offset) {
      throw new DatamineError(
        `patch_u32 offset ${offset} is outside the written ${this.m_offset} bytes`
      );
    }
    if (this.m_little) {
      this.m_buffer.writeUInt32LE(value >>> 0, offset);
    } else {
      this.m_buffer.writeUInt32BE(value >>> 0, offset);
    }
  }

  // Copy, so the writer can keep being used.
  finish(): Buffer {
    return Buffer.from(this.m_buffer.subarray(0, this.m_offset));
  }
}

export class c_byte_reader {
  private readonly m_buffer: Buffer;
  private m_offset: number;
  private m_little: boolean;

  constructor(buffer: Uint8Array, byte_order: t_byte_order, offset = 0) {
    this.m_buffer = Buffer.from(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );
    this.m_little = byte_order === "little";
    this.m_offset = offset;
  }

  set byte_order(byte_order: t_byte_order) {
    this.m_little = byte_order === "little";
  }

  get offset(): number {
    return this.m_offset;
  }

  get remaining(): number {
    return this.m_buffer.length - this.m_offset;
  }

  seek(offset: number): void {
    if (offset < 0 || offset > this.m_buffer.length) {
      throw new DatamineError(
        `seek to ${offset} is outside the ${this.m_buffer.length} byte buffer`
      );
    }
    this.m_offset = offset;
  }

  skip(count: number): void {
    this.take(count);
  }

  private take(count: number): number {
    if (count < 0 || this.m_offset + count > this.m_buffer.length) {
      throw new DatamineError(
        `read of ${count} bytes at offset ${this.m_offset} overruns the ${this.m_buffer.length} byte buffer`
      );
    }
    const start = this.m_offset;
    this.m_offset += count;
    return start;
  }

  u8(): number {
    return this.m_buffer[this.take(1)];
  }

  u16(): number {
    const at = this.take(2);
    return this.m_little
      ? this.m_buffer.readUInt16LE(at)
      : this.m_buffer.readUInt16BE(at);
  }

  i16(): number {
    const at = this.take(2);
    return this.m_little
      ? this.m_buffer.readInt16LE(at)
      : this.m_buffer.readInt16BE(at);
  }

  u32(): number {
    const at = this.take(4);
    return this.m_little
      ? this.m_buffer.readUInt32LE(at)
      : this.m_buffer.readUInt32BE(at);
  }

  i32(): number {
    const at = this.take(4);
    return this.m_little
      ? this.m_buffer.readInt32LE(at)
      : this.m_buffer.readInt32BE(at);
  }

  u64(): bigint {
    const at = this.take(8);
    return this.m_little
      ? this.m_buffer.readBigUInt64LE(at)
      : this.m_buffer.readBigUInt64BE(at);
  }

  i64(): bigint {
    const at = this.take(8);
    return this.m_little
      ? this.m_buffer.readBigInt64LE(at)
      : this.m_buffer.readBigInt64BE(at);
  }

  f32(): number {
    const at = this.take(4);
    return this.m_little
      ? this.m_buffer.readFloatLE(at)
      : this.m_buffer.readFloatBE(at);
  }

  f64(): number {
    const at = this.take(8);
    return this.m_little
      ? this.m_buffer.readDoubleLE(at)
      : this.m_buffer.readDoubleBE(at);
  }

  bytes(count: number): Buffer {
    const at = this.take(count);
    return Buffer.from(this.m_buffer.subarray(at, at + count));
  }

  fixed_string(size: number, encoding: t_text_encoding = "utf8"): string {
    return string_from_fixed_bytes(this.bytes(size), encoding);
  }
}
