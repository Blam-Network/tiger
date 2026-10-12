import { c } from "@craftycodie/cstruct";

export const s_package_entry = c.struct({
  class_hash: c.u32(),
  type_info: c.u32(),
  block_info: c.u64(),
});

export type s_package_entry = c.infer<typeof s_package_entry>;

export const k_package_entry_size = c.sizeof(s_package_entry);

// Tags have a class hash; manifest roots name their manifest instead.
// Wwise banks and media carry their Wwise id in place of a class.
export const k_package_entry_type_tag = 0x10;
export const k_package_entry_type_manifest_root = 0x80;
export const k_package_entry_type_sound_bank = 0x200;
export const k_package_entry_type_sound_media = 0x202;

export interface package_entry {
  class_hash: number;
  file_size: number;
  starting_block: number;
  starting_block_offset: number;
  subtype: number;
  type: number;
}

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
      "big"
    );
    const block = Number(raw.block_info & 0xffffffffn);
    entries.push({
      class_hash: raw.class_hash,
      type: raw.type_info >>> 18,
      subtype: raw.type_info & 0xff,
      starting_block: block & 0x3fff,
      starting_block_offset: ((block >>> 14) & 0x3fff) << 4,
      file_size: Number((raw.block_info >> 28n) & 0x3fffffffn),
    });
  }
  return entries;
}
