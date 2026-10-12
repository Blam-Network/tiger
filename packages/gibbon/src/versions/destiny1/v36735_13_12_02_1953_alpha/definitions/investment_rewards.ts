import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

// Kill and incident reward tables: what a combatant or incident grants,
// resolved by sub_83725B30.

// 808E2044 "enemy": a victim's character definition hash -> enemy index.
export const k_investment_enemy_table_tag = 0x808e2044;

export const s_investment_enemy = c.struct({
  name_hash: c.u32(),
  // 0 cabal, 1 fallen, 2 hive, 3 vex; 4 and 5 unknown.
  race: c.u8({ padAfter: 3 }),
});

export type s_investment_enemy = c.infer<typeof s_investment_enemy>;

export const s_investment_enemy_table = c.struct({
  size: c.u32(),
  // Row class unknown.
  enemies: tag_block(s_investment_enemy),
});

export type s_investment_enemy_table = c.infer<typeof s_investment_enemy_table>;

// 808E2043 "destination": an activity definition's destination_index
// selects a row here; the row's mapping is the reward mapping to try after
// the activity's own gates.
export const k_investment_destination_table_tag = 0x808e2043;

export const s_investment_destination = c.struct({
  unknown00: c.u32(),
  unknown04: c.u16(),
  mapping: c.u16(),
});

export type s_investment_destination = c.infer<typeof s_investment_destination>;

export const s_investment_destination_table = c.struct({
  size: c.u32(),
  destinations: tag_block(s_investment_destination),
});

export type s_investment_destination_table = c.infer<
  typeof s_investment_destination_table
>;

// 808E205B "reward mapping": one row per mapping index, in three kinds.
// Item (A) rows are only sized; combatant (B) and incident (C) rows are
// decoded.
export const k_investment_reward_mapping_table_tag = 0x808e205b;
export const k_investment_reward_mapping_item_class = 0x8080183b;
export const k_investment_reward_mapping_combatant_class = 0x8080183d;
export const k_investment_reward_mapping_incident_class = 0x8080183f;

export const s_investment_reward_grant = c.struct({
  // Into the progression mapping table (808E2059): 3 is experience, 0 a
  // one-time item grant at 75 points on progression 0.
  progression_mapping: c.u8({ padAfter: 3 }),
  amount: c.i32(),
});

export type s_investment_reward_grant = c.infer<
  typeof s_investment_reward_grant
>;

// A row, 176 bytes (8080183B): an item or engram reward. Only its index is
// mapped.
export const s_investment_reward_item = c.struct({
  reward_index: c.u16({ padAfter: 174 }),
});

export type s_investment_reward_item = c.infer<typeof s_investment_reward_item>;

// A one-byte element for the incident row's unmapped blocks.
const s_investment_reward_unread_element = c.struct({ unknown: c.u8() });

// B row, 64 bytes (8080183D): one combatant's grant for this mapping.
export const s_investment_reward_combatant = c.struct({
  // Index into the enemy table (808E2044).
  enemy_index: c.u8({ padAfter: 3 }),
  // Proportional to the grant; the drop chance itself is server data.
  // True name unknown.
  value: c.f32(),
  // 0xFFFF: no drop.
  reward_index: c.u16({ padAfter: 2 }),
  grant_count: c.u32(),
  grants: c.array(s_investment_reward_grant, 4),
  unknown30: c.array(c.u32(), 4),
});

export type s_investment_reward_combatant = c.infer<
  typeof s_investment_reward_combatant
>;

// C row, 72 bytes (8080183F): an incident's reward (bounties, terminals,
// gather actions).
export const s_investment_reward_incident = c.struct({
  incident_hash: c.u32(),
  flag: c.u8({ padAfter: 3 }),
  unknown08: tag_block(s_investment_reward_unread_element),
  reward_index: c.u16({ padAfter: 2 }),
  grant_count: c.u32(),
  grants: c.array(s_investment_reward_grant, 4),
  unknown38: tag_block(s_investment_reward_unread_element),
  unknown40: tag_block(s_investment_reward_unread_element),
});

export type s_investment_reward_incident = c.infer<
  typeof s_investment_reward_incident
>;

export const s_investment_reward_mapping = c.struct({
  name_hash: c.u32(),
  items: tag_block(
    s_investment_reward_item,
    k_investment_reward_mapping_item_class
  ),
  combatants: tag_block(
    s_investment_reward_combatant,
    k_investment_reward_mapping_combatant_class
  ),
  incidents: tag_block(
    s_investment_reward_incident,
    k_investment_reward_mapping_incident_class
  ),
});

export type s_investment_reward_mapping = c.infer<
  typeof s_investment_reward_mapping
>;

export const s_investment_reward_mapping_table = c.struct({
  size: c.u32(),
  // Row class unknown.
  mappings: tag_block(s_investment_reward_mapping),
});

export type s_investment_reward_mapping_table = c.infer<
  typeof s_investment_reward_mapping_table
>;
