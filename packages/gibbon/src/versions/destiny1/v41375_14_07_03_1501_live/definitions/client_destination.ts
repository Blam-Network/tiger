import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

// The client's destination table (client globals slot 5, 80A58005). Row
// index is the activity definition's destination_index. True Bungie names
// unknown beyond the progressions.
export const k_client_destination_table_class = 0x808033a6;
export const k_client_destination_class = 0x80803392;

// 4-byte element; true name unknown.
export const s_client_destination_unknown1c = c.struct({
  unknown00: c.u32(),
});

export type s_client_destination_unknown1c = c.infer<
  typeof s_client_destination_unknown1c
>;

export const s_client_destination_progression = c.struct({
  progression: c.i16(),
});

export type s_client_destination_progression = c.infer<
  typeof s_client_destination_progression
>;

// Same shape as a progression, another list (e.g. [899]).
export const s_client_destination_item = c.struct({
  item: c.i16(),
});

export type s_client_destination_item = c.infer<
  typeof s_client_destination_item
>;

export const s_client_destination = c.struct({
  // Unique per row.
  name_hash: c.u32(),
  // 0x00010000 on every row, as is unknown0c.
  unknown04: c.u32(),
  unknown08: c.u32(),
  unknown0c: c.u32(),
  unknown10: c.u32(),
  unknown14: c.u32(),
  // A tag.
  unknown18: c.u32(),
  unknown1c: tag_block(s_client_destination_unknown1c, 0x808036c2),
  unknown24: c.i16(),
  unknown26: c.i16(),
  // Progressions the destination advances, e.g. the Tower's [117, 120].
  progressions: tag_block(s_client_destination_progression, 0x808042f4),
  items: tag_block(s_client_destination_item, 0x8080432f),
  // 1..6; not the destination index.
  unknown38: c.u8({ padAfter: 3 }),
});

export type s_client_destination = c.infer<typeof s_client_destination>;

export const s_client_destination_table = c.struct({
  size: c.u32(),
  destinations: tag_block(s_client_destination, k_client_destination_class),
});

export type s_client_destination_table = c.infer<
  typeof s_client_destination_table
>;
