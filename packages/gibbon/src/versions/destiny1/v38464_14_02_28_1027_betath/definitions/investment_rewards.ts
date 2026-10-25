import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

// The investment globals' enemy and destination tables, the Alpha Trial's
// rows.

// Investment globals slot 17: a victim's character definition hash -> enemy
// index.
export const k_investment_enemy_table_class = 0x808016f7;

export const s_investment_enemy = c.struct({
  name_hash: c.u32(),
  race: c.u8({ padAfter: 3 }),
});

export type s_investment_enemy = c.infer<typeof s_investment_enemy>;

export const s_investment_enemy_table = c.struct({
  size: c.u64(),
  enemies: tag_block(s_investment_enemy, 0x80801835),
});

export type s_investment_enemy_table = c.infer<typeof s_investment_enemy_table>;

// Investment globals slot 16: an activity definition's destination_index
// selects a row here.
export const k_investment_destination_table_class = 0x808016c4;

export const s_investment_destination = c.struct({
  name_hash: c.u32(),
  unknown04: c.u8({ padAfter: 1 }),
  // A reward mapping index, 0xFFFF for none; what it indexes is unknown.
  mapping: c.u16(),
});

export type s_investment_destination = c.infer<typeof s_investment_destination>;

export const s_investment_destination_table = c.struct({
  size: c.u64(),
  destinations: tag_block(s_investment_destination, 0x808016a7),
});

export type s_investment_destination_table = c.infer<
  typeof s_investment_destination_table
>;
