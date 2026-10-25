import { c } from "@craftycodie/cstruct";
import { tag_block } from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";

// The client's destination table (client globals slot 5, 80A76005). Row
// index is the activity definition's destination_index. The live build's
// row, widened, with 4 more bytes after the name hash. True Bungie names
// unknown beyond the progressions.
export const k_client_destination_table_class = 0x808033a6;
export const k_client_destination_class = 0x80803392;

// 4-byte element; true name unknown.
export const s_client_destination_unknown28 = c.struct({
  unknown00: c.u32(),
});

export type s_client_destination_unknown28 = c.infer<
  typeof s_client_destination_unknown28
>;

export const s_client_destination_progression = c.struct({
  progression: c.i16(),
});

export type s_client_destination_progression = c.infer<
  typeof s_client_destination_progression
>;

// Same shape as a progression, another list.
export const s_client_destination_item = c.struct({
  item: c.i16(),
});

export type s_client_destination_item = c.infer<
  typeof s_client_destination_item
>;

// 104 bytes.
export const s_client_destination = c.struct({
  // Unique per row.
  name_hash: c.u32(),
  unknown04: c.u32(),
  // 1 on every row, as is unknown10.
  unknown08: c.u32(),
  unknown0c: c.u32(),
  unknown10: c.u32(),
  unknown14: c.u32(),
  unknown18: c.u32(),
  unknown1c: c.u32(),
  // A tag.
  unknown20: c.u32({ padAfter: 4 }),
  unknown28: tag_block(s_client_destination_unknown28, 0x808036c2),
  unknown38: c.i16(),
  unknown3a: c.i16({ padAfter: 4 }),
  // Progressions the destination advances.
  progressions: tag_block(s_client_destination_progression, 0x808042f4),
  items: tag_block(s_client_destination_item, 0x8080432f),
  unknown60: c.u8({ padAfter: 7 }),
});

export type s_client_destination = c.infer<typeof s_client_destination>;

export const s_client_destination_table = c.struct({
  size: c.u64(),
  destinations: tag_block(s_client_destination, k_client_destination_class),
});

export type s_client_destination_table = c.infer<
  typeof s_client_destination_table
>;
