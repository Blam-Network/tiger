import { CFieldType } from "@craftycodie/cstruct";
import { tag_format_error } from "./tag_block.ts";

// Class 80800065: a u64 length that counts the trailing NUL, then the bytes.
export const k_tag_string_class = 0x80800065;

export function read_tag_string(buffer: Buffer, offset: number): string {
  const length = Number(buffer.readBigUInt64LE(offset));
  if (length === 0) {
    return "";
  }
  return buffer.toString("latin1", offset + 8, offset + 8 + length - 1);
}

// `{i64 offset}` relative to its own address, landing on a NUL-terminated
// string (a tag string's bytes). Zero means there is none.
export class c_tag_relative_string extends CFieldType<string | undefined> {
  getSize(): number {
    return 8;
  }

  read(buffer: Buffer, offset: number): string | undefined {
    const relative = Number(buffer.readBigInt64LE(offset));
    if (relative === 0) {
      return;
    }
    const start = offset + relative;
    const end = buffer.indexOf(0, start);
    return buffer.toString("latin1", start, end < 0 ? buffer.length : end);
  }

  write(): void {
    throw new tag_format_error("tag strings are read-only");
  }
}

export function tag_relative_string(): c_tag_relative_string {
  return new c_tag_relative_string();
}
