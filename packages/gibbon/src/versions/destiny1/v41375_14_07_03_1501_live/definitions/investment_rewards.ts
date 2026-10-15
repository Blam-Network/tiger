import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

// The investment globals' enemy and destination tables.

// Investment globals +0x94: a victim's character definition hash -> enemy
// index.
export const k_investment_enemy_table_class = 0x80801842;

export const s_investment_enemy = c.struct({
  name_hash: c.u32(),
  // 0 cabal, 1 fallen, 2 hive, 3 vex, 4 unknown.
  race: c.u8({ padAfter: 3 }),
});

export type s_investment_enemy = c.infer<typeof s_investment_enemy>;

export const s_investment_enemy_table = c.struct({
  size: c.u32(),
  enemies: tag_block(s_investment_enemy, 0x80801861),
});

export type s_investment_enemy_table = c.infer<typeof s_investment_enemy_table>;

// Investment globals +0x8C: an activity definition's destination_index
// selects a row here.
export const k_investment_destination_table_class = 0x80801851;

export const s_investment_destination = c.struct({
  name_hash: c.u32(),
  unknown04: c.u8({ padAfter: 1 }),
  // A reward mapping index, 0xFFFF for none; what it indexes is unknown.
  mapping: c.u16(),
});

export type s_investment_destination = c.infer<typeof s_investment_destination>;

export const s_investment_destination_table = c.struct({
  size: c.u32(),
  destinations: tag_block(s_investment_destination, 0x808016c7),
});

export type s_investment_destination_table = c.infer<
  typeof s_investment_destination_table
>;
