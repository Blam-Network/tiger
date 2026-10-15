import { c } from "@craftycodie/cstruct";

export const s_package_entry = c.struct({
  class_hash: c.u32(),
  type_info: c.u32(),
  block_info: c.u64(),
});

export type s_package_entry = c.infer<typeof s_package_entry>;

export const k_package_entry_size = c.sizeof(s_package_entry);

// The type sits in the low half of the type word here (0x10 a tag, 0x80 a
// manifest root, whose class word is its manifest's handle); the high half
// is unknown.
export const k_package_entry_type_tag = 0x10;
export const k_package_entry_type_manifest_root = 0x80;

export interface package_entry {
  class_hash: number;
  file_size: number;
  starting_block: number;
  starting_block_offset: number;
  type: number;
  // The type word's top half.
  unknown_type_info: number;
}

// block_info packs the starting block (14 bits), the offset into that
// block once decompressed (14 bits of 16-byte units) and the size (30
// bits). An entry can run on into the following blocks.
export function read_package_entries(
  buffer: Buffer,
  count: number
): package_entry[] {
  const entries: package_entry[] = [];
  for (let i = 0; i < count; i++) {
    const raw = c.read(
      s_package_entry,
      buffer,
      i * k_package_entry_size,
      "little"
    );
    const block = Number(raw.block_info & 0xffffffffn);
    entries.push({
      class_hash: raw.class_hash,
      type: raw.type_info & 0xffff,
      unknown_type_info: raw.type_info >>> 16,
      starting_block: block & 0x3fff,
      starting_block_offset: ((block >>> 14) & 0x3fff) << 4,
      file_size: Number((raw.block_info >> 28n) & 0x3fffffffn),
    });
  }
  return entries;
}
