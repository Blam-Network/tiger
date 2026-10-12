import { CFieldType } from "@craftycodie/cstruct";
import { tag_format_error } from "./tag_block.ts";

// Class 808000CB: a u32 length that counts the trailing NUL, then the bytes.
export const k_tag_string_class = 0x808000cb;

export function read_tag_string(buffer: Buffer, offset: number): string {
  const length = buffer.readUInt32BE(offset);
  if (length === 0) {
    return "";
  }
  return buffer.toString("latin1", offset + 4, offset + 4 + length - 1);
}

// Every string in `buffer` a tag-string header could start, in order: a
// length that fits, printable bytes, and the NUL where the length says.
// Tags that embed a string at no known field are read this way.
export function scan_tag_strings(
  buffer: Buffer,
  min_length = 2
): { offset: number; value: string }[] {
  const found: { offset: number; value: string }[] = [];
  for (let at = 0; at + 4 <= buffer.length; at += 4) {
    const length = buffer.readUInt32BE(at);
    if (length < min_length + 1 || at + 4 + length > buffer.length) {
      continue;
    }
    const end = at + 4 + length - 1;
    if (buffer[end] !== 0) {
      continue;
    }
    let printable = true;
    for (let i = at + 4; i < end; i++) {
      if (buffer[i] < 0x20 || buffer[i] > 0x7e) {
        printable = false;
        break;
      }
    }
    if (printable) {
      found.push({ offset: at, value: buffer.toString("latin1", at + 4, end) });
    }
  }
  return found;
}

// `{i32 offset}` relative to its own address, landing on a NUL-terminated
// string. Zero means there is none.
export class c_tag_relative_string extends CFieldType<string | undefined> {
  getSize(): number {
    return 4;
  }

  read(buffer: Buffer, offset: number): string | undefined {
    const relative = buffer.readInt32BE(offset);
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
