import { c } from "@craftycodie/cstruct";
import {
  k_tag_block_header_size,
  tag_block,
  tag_block_header,
  tag_pointer,
} from "../tag/tag_block.ts";
import { s_tag_table_entry } from "./investment.ts";

// A reference into a string list by key. list is 0xFFFF for none, and the key
// is then fnv1("").
export const s_string_ref = c.struct({
  list: c.u16({ padAfter: 2 }),
  key: c.u32(),
});

export type s_string_ref = c.infer<typeof s_string_ref>;

// Item displays (client globals slot 25): one tag per item definition index,
// in item table order. Several indices can share a tag.
export const k_item_display_table_class = 0x808038c5;
export const k_item_display_table_entry_class = 0x808038c1;
export const k_item_display_class = 0x808038bf;

export const s_item_display_table_entry = s_tag_table_entry;

export type s_item_display_table_entry = s_tag_table_entry;

export const s_item_display_table = c.struct({
  size: c.u32(),
  displays: tag_block(
    s_item_display_table_entry,
    k_item_display_table_entry_class
  ),
});

export type s_item_display_table = c.infer<typeof s_item_display_table>;

// 152 bytes including four small blocks the tag pointers land on, shared
// between items and not mapped here.
export const s_item_display = c.struct({
  size: c.u32(),
  name: s_string_ref,
  // The item's type, in list 44.
  item_type: s_string_ref,
  description: s_string_ref,
  unknown1c: c.u32(),
  // The icon bundle, -1 for none.
  icon_bundle: c.u32(),
  unknown24: c.u32(),
  unknown28: c.u32(),
  unknown2c: c.u32(),
  unknown30: c.u32(),
  // fnv1 category chain, e.g. {weapon_primary, auto_rifle, auto_rifle}; the
  // empty name hash for unset.
  category_hashes: c.array(c.u32(), 3),
  // 21 plus the item definition's tier.
  tier_code: c.u8({ padAfter: 3 }),
  unknown44: tag_pointer(),
  unknown48: tag_pointer(),
  unknown4c: tag_pointer(),
  unknown50: tag_pointer(),
});

export type s_item_display = c.infer<typeof s_item_display>;

// String lists (client globals slot 44): one tag per list, found by the
// list's name hash. A string_ref's list indexes this table.
export const k_string_list_table_class = 0x8080380b;
export const k_string_list_table_entry_class = 0x80803807;
export const k_string_list_class = 0x808004a8;

export const s_string_list_table = c.struct({
  size: c.u32(),
  lists: tag_block(s_tag_table_entry, k_string_list_table_entry_class),
});

export type s_string_list_table = c.infer<typeof s_string_list_table>;

export const k_string_list_language_count = 12;
export const k_string_list_key_class = 0x80800031;

export const s_string_list_key = c.struct({
  key: c.u32(),
});

export type s_string_list_key = c.infer<typeof s_string_list_key>;

// One string bank tag per language. Bank 0 is English; the other languages
// share an empty bank. A key's string is the bank's string at the key's
// position in the sorted keys.
export const s_string_list = c.struct({
  size: c.u32(),
  keys: tag_block(s_string_list_key, k_string_list_key_class),
  banks: c.array(c.u32(), k_string_list_language_count),
});

export type s_string_list = c.infer<typeof s_string_list>;

export const k_string_bank_class = 0x808004a6;

const k_string_bank_strings_offset = 0x14;
const k_string_bank_part_size = 28;

// A string bank's strings, in key order. The strings block holds
// {part_count, rel} rows; each part is 28 bytes with a start and an end,
// both relative to their own field, into UTF-16BE characters.
export function read_string_bank(buffer: Buffer): string[] {
  const header = tag_block_header(buffer, k_string_bank_strings_offset);
  if (header === undefined) {
    return [];
  }
  const count = buffer.readUInt32BE(k_string_bank_strings_offset);
  const strings: string[] = [];
  for (let i = 0; i < count; i++) {
    const row = header + k_tag_block_header_size + i * 8;
    const parts = buffer.readUInt32BE(row);
    const first =
      row + 4 + buffer.readInt32BE(row + 4) + k_tag_block_header_size;
    let text = "";
    for (let part = 0; part < parts; part++) {
      const at = first + part * k_string_bank_part_size;
      const start = at + 12 + buffer.readInt32BE(at + 12);
      const end = at + 16 + buffer.readInt32BE(at + 16);
      text += Buffer.from(buffer.subarray(start, end))
        .swap16()
        .toString("utf16le");
    }
    strings.push(text);
  }
  return strings;
}
