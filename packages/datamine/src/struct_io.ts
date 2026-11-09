import type {
  c,
  Struct,
  StructFields,
  StructInput,
} from "@craftycodie/cstruct";
import { DatamineError } from "./datamine_error.ts";

export type t_byte_order = "little" | "big";

// Walks a buffer one cstruct schema at a time. Reads past the end throw.
export class c_struct_reader {
  private readonly m_bytes: Uint8Array;
  private readonly m_byte_order: t_byte_order;
  private m_offset: number;

  constructor(bytes: Uint8Array, byte_order: t_byte_order, offset = 0) {
    this.m_bytes = bytes;
    this.m_byte_order = byte_order;
    this.m_offset = offset;
  }

  get offset(): number {
    return this.m_offset;
  }

  read<F extends StructFields>(schema: Struct<F>): c.output<Struct<F>> {
    const value = schema.read(this.m_bytes, {
      offset: this.m_offset,
      endian: this.m_byte_order,
    });
    this.m_offset += schema.size;
    return value;
  }

  bytes(count: number): Uint8Array {
    if (count < 0 || this.m_offset + count > this.m_bytes.length) {
      throw new DatamineError(
        `read of ${count} bytes at offset ${this.m_offset} overruns the ${this.m_bytes.length} byte buffer`
      );
    }
    const start = this.m_offset;
    this.m_offset += count;
    return this.m_bytes.slice(start, this.m_offset);
  }
}

// Collects cstruct writes into one buffer. Out of range values wrap the way a C cast would
// instead of throwing.
export class c_struct_writer {
  private readonly m_byte_order: t_byte_order;
  private readonly m_parts: Uint8Array[] = [];
  private m_size = 0;

  constructor(byte_order: t_byte_order) {
    this.m_byte_order = byte_order;
  }

  get size(): number {
    return this.m_size;
  }

  write<F extends StructFields>(
    schema: Struct<F>,
    value: StructInput<F>
  ): void {
    this.bytes(
      schema.write(value, { endian: this.m_byte_order, checked: false })
    );
  }

  bytes(data: Uint8Array): void {
    this.m_parts.push(data);
    this.m_size += data.length;
  }

  finish(): Uint8Array {
    const out = new Uint8Array(this.m_size);
    let at = 0;
    for (const part of this.m_parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }
}
