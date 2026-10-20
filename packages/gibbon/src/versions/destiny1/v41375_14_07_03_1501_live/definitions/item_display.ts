import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";
import { k_string_hash_class, s_string_hash } from "../tag/tag_string.ts";
import { s_tag_table_entry } from "./investment.ts";

// A reference into a localized strings tag by key. list is 0xFFFF for none,
// and the key is then fnv1("").
export const s_string_ref = c.struct({
  list: c.u16({ padAfter: 2 }),
  key: c.u32(),
});

export type s_string_ref = c.infer<typeof s_string_ref>;

// Item displays (client globals slot 26, 80A5801A): one tag per item
// definition index, in item table order.
export const k_item_display_table_class = 0x808034c7;
export const k_item_display_table_entry_class = 0x808033e8;
export const k_item_display_class = 0x80803484;

export const s_item_display_table_entry = c.struct({
  unknown00: c.u32(),
  tag: c.u32(),
});

export type s_item_display_table_entry = c.infer<
  typeof s_item_display_table_entry
>;

export const s_item_display_table = c.struct({
  size: c.u32(),
  displays: tag_block(
    s_item_display_table_entry,
    k_item_display_table_entry_class
  ),
});

export type s_item_display_table = c.infer<typeof s_item_display_table>;

// 118 or 152 bytes depending on the item; only the leading fields are mapped.
export const s_item_display = c.struct({
  size: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  unknown0c: c.u32(),
  unknown10: c.u32(),
  unknown14: c.u32(),
  unknown18: c.u32(),
  unknown1c: c.u32(),
  unknown20: c.u32(),
  name: s_string_ref,
});

export type s_item_display = c.infer<typeof s_item_display>;

// Localized strings (client globals slot 45, 80A5802D): one tag each, found
// by its name hash.
export const k_localized_strings_table_class = 0x808034cb;
export const k_localized_strings_table_entry_class = 0x80803473;
export const k_localized_strings_class = 0x8080035a;

export const s_localized_strings_table = c.struct({
  size: c.u32(),
  lists: tag_block(s_tag_table_entry, k_localized_strings_table_entry_class),
});

export type s_localized_strings_table = c.infer<
  typeof s_localized_strings_table
>;

export const k_localized_strings_language_count = 12;

// One string bank tag per language. Bank 0 is English; languages without
// strings share a placeholder bank. The bank format (class 808008BE) is not
// defined here.
export const s_localized_strings = c.struct({
  size: c.u32(),
  keys: tag_block(s_string_hash, k_string_hash_class),
  banks: c.array(c.u32(), k_localized_strings_language_count),
});

export type s_localized_strings = c.infer<typeof s_localized_strings>;
