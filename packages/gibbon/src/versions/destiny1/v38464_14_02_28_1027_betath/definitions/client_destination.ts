import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

// The client's destination table (client globals slot 4, 808F604C). Row
// index is the activity definition's destination_index. 48-byte rows: the
// Alpha Trial's leading words, then two small fields where it has its
// blocks. True Bungie names unknown.
export const k_client_destination_table_class = 0x808033a5;
export const k_client_destination_class = 0x80803391;

export const s_client_destination = c.struct({
  // Unique per row.
  name_hash: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  // A hash.
  unknown0c: c.u32(),
  unknown10: c.u32(),
  // A hash.
  unknown14: c.u32(),
  unknown18: c.u32(),
  unknown1c: c.u32(),
  // A tag.
  unknown20: c.u32({ padAfter: 4 }),
  // An item index (the glimmer item on every row).
  unknown28: c.i16(),
  unknown2a: c.u8({ padAfter: 1 }),
  unknown2c: c.u32(),
});

export type s_client_destination = c.infer<typeof s_client_destination>;

export const s_client_destination_table = c.struct({
  size: c.u64(),
  destinations: tag_block(s_client_destination, k_client_destination_class),
});

export type s_client_destination_table = c.infer<
  typeof s_client_destination_table
>;
