import { c } from "@craftycodie/cstruct";
import { tag_block, tag_struct } from "../tag/tag_block.ts";

// Unlock expressions: every sub-expression must hold. Each is RPN over the
// character's unlock flags (sub_83692AE8): op 1 pushes "flag[operand] is
// set", then 2 not, 3 or, 4 and, 5 nor, 6 xor, 7 nand, 8 and 9 xnor.
export const s_unlock_token = c.struct({
  op: c.u8({ padAfter: 1 }),
  operand: c.u16(),
});

export type s_unlock_token = c.infer<typeof s_unlock_token>;

export const s_unlock_expression = c.struct({
  tokens: tag_block(s_unlock_token, 0x80801757),
});

export type s_unlock_expression = c.infer<typeof s_unlock_expression>;

export const k_unlock_expression_class = 0x80801759;

// A keyed value; unused slots are {0xFF, 0}.
export const s_investment_item_stat = c.struct({
  key: c.u8({ padAfter: 3 }),
  value: c.i32(),
});

export type s_investment_item_stat = c.infer<typeof s_investment_item_stat>;

export const s_investment_material_requirement = c.struct({
  item: c.u16({ padAfter: 2 }),
  count: c.i32(),
  delete_on_action: c.u8(),
  omit_from_requirements: c.u8({ padAfter: 2 }),
});

export type s_investment_material_requirement = c.infer<
  typeof s_investment_material_requirement
>;

// A table row naming a tag by hash: the vendor and talent grid tables.
export const s_tag_table_entry = c.struct({
  name_hash: c.u32({ padAfter: 4 }),
  tag: c.u32(),
});

export type s_tag_table_entry = c.infer<typeof s_tag_table_entry>;

// Item definitions, one tag per definition index.
export const k_item_definition_class = 0x80801a24;
export const k_item_definition_first_tag = 0x808e288b;

// What the item can be turned into (dismantled, decrypted). Names follow
// what the action does; true names unknown.
export const s_item_action_block = c.struct({
  // e.g. "shard" (dismantle), "decrypt" (engrams).
  action_type_hash: c.u32(),
  // One value per item family (armor set, weapon class, engram), 0xFFFF
  // for none. Nothing in the client reads it.
  unknown04: c.u16(),
  // The item the action gives, -1 for none. Talent step rewards fall back
  // to it (sub_836B98A0).
  reward_item: c.i16(),
  progression_reward_count: c.u32(),
  // Keyed by progression index.
  progression_rewards: c.array(s_investment_item_stat, 4),
  unknown2c: c.u8(),
  unknown2d: c.u8(),
  unknown2e: c.i16(),
  unknown30: c.u32(),
  cooldown_seconds: c.u32(),
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  required_items: tag_block(s_investment_material_requirement, 0x80801977),
  unknown48: c.u32(),
});

export type s_item_action_block = c.infer<typeof s_item_action_block>;

export const s_item_equipable_block = c.struct({
  equip_slot: c.u8({ padAfter: 0x17 }),
  art_arrangement: c.u16(),
  // Not the pattern the client reads; that comes from the server-sent
  // item (808019C7 +0x0A).
  pattern: c.u8(),
});

export type s_item_equipable_block = c.infer<typeof s_item_equipable_block>;

export const s_item_talent_grid_block = c.struct({
  grid_index: c.u16(),
});

export type s_item_talent_grid_block = c.infer<typeof s_item_talent_grid_block>;

// Copied into the item as the block its stat curves scale from
// (sub_8368D510). True name unknown.
export const s_item_scaling_block = c.struct({
  // Always 1.
  slot_count: c.u32(),
  slots: c.array(s_investment_item_stat, 2),
  // Runs through the pre-curve before the stat curves (sub_8368DB28).
  bias: c.i16({ padAfter: 2 }),
});

export type s_item_scaling_block = c.infer<typeof s_item_scaling_block>;

// sub_8368DDA8 sums every entry for a stat, so a stat can appear twice.
export const s_item_stat_block = c.struct({
  stat_count: c.u32(),
  stats: c.array(s_investment_item_stat, 10),
  perk_count: c.u32(),
  // Into the perk table; owning the item sets each perk's unlock flag
  // (sub_83693E08). -1 unused.
  perks: c.array(c.i16(), 4),
});

export type s_item_stat_block = c.infer<typeof s_item_stat_block>;

export const s_item_definition = c.struct({
  size: c.u32(),
  unknown04: c.u32(),
  bucket: c.u8(),
  instanced: c.u8(),
  unknown0a: c.u8({ padAfter: 1 }),
  max_stack: c.i32(),
  // The empty name hash when the item doesn't stack with another.
  stack_merge_hash: c.u32(),
  action: tag_struct(s_item_action_block, 0x80801979),
  unknown18: c.u32(),
  equipable: tag_struct(s_item_equipable_block, 0x80801a0f),
  scaling: tag_struct(s_item_scaling_block, 0x808018f3),
  stats: tag_struct(s_item_stat_block, 0x80801a1a),
  unknown28: c.u32(),
  // The block sits at the very end of the tag.
  talent_grid: tag_struct(s_item_talent_grid_block, 0x80801a1b),
});

export type s_item_definition = c.infer<typeof s_item_definition>;

// Vendors: a table naming one tag per vendor.
export const k_vendor_table_class = 0x8080189d;
export const k_vendor_table_tag = 0x808e206b;
export const k_vendor_class = 0x80801895;

export const s_vendor_table_entry = s_tag_table_entry;

export type s_vendor_table_entry = s_tag_table_entry;

export const s_vendor_table = c.struct({
  size: c.u32(),
  vendors: tag_block(s_vendor_table_entry, 0x80801897),
});

export type s_vendor_table = c.infer<typeof s_vendor_table>;

// Levels on the expansion level table's progressions, by position. The key
// is 0 when used and 0xFF when not; a level of 0 or less is skipped.
export const s_level_requirement = c.struct({
  key: c.u8({ padAfter: 3 }),
  level: c.i32(),
});

export type s_level_requirement = c.infer<typeof s_level_requirement>;

export const s_vendor_purchase = c.struct({
  // Checked only when buying (sub_836FB9F8).
  purchase_unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  // Unset: the item definition's value list prices it instead.
  explicit_cost: c.u8({ padAfter: 1 }),
  cost_item: c.i16(),
  cost_quantity: c.i32(),
  item: c.i16({ padAfter: 2 }),
  quantity: c.i32(),
  // Authored power: the value of the key 0 stat.
  power_stat_count: c.u32(),
  power_stats: c.array(s_investment_item_stat, 2),
  // Checked by sub_836FB4E8, as is unlock.
  minimum_level_count: c.u32(),
  minimum_levels: c.array(s_level_requirement, 2),
  maximum_level_count: c.u32(),
  maximum_levels: c.array(s_level_requirement, 2),
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
});

export type s_vendor_purchase = c.infer<typeof s_vendor_purchase>;

export const s_vendor = c.struct({
  size: c.u32(),
  name_hash: c.u32(),
  // -1 for vendors with no wares.
  currency_item: c.i16({ padAfter: 2 }),
  purchases: tag_block(s_vendor_purchase, 0x80801891),
});

export type s_vendor = c.infer<typeof s_vendor>;

// Progressions: one table tag holding every definition.
export const k_progression_table_class = 0x808017e4;
export const k_progression_table_tag = 0x808e2058;

export const s_progression_step = c.struct({
  xp_required: c.i32(),
  // 0xFFFF when the step grants nothing.
  granted_item: c.u16(),
  unknown06: c.u16(),
});

export type s_progression_step = c.infer<typeof s_progression_step>;

export const s_progression = c.struct({
  name_hash: c.u32(),
  kind: c.u8(),
  // Past the last step, the last step repeats and the level keeps
  // climbing (sub_8368C748).
  clamp_at_max: c.u8({ padAfter: 2 }),
  steps: tag_block(s_progression_step, 0x808017db),
  // A block of rewards; not decoded.
  rewards: c.array(c.u32(), 2),
});

export type s_progression = c.infer<typeof s_progression>;

export const s_progression_table = c.struct({
  size: c.u32(),
  progressions: tag_block(s_progression, 0x808017df),
});

export type s_progression_table = c.infer<typeof s_progression_table>;

// Material requirements: named sets of items an action costs. Talent steps
// point at a set by index rather than listing their own.
export const k_material_requirement_table_class = 0x80801982;
export const k_material_requirement_table_tag = 0x808e205e;

export const s_material_requirement_set = c.struct({
  name_hash: c.u32(),
  requirements: tag_block(s_investment_material_requirement, 0x8080197a),
});

export type s_material_requirement_set = c.infer<
  typeof s_material_requirement_set
>;

export const s_material_requirement_table = c.struct({
  size: c.u32(),
  sets: tag_block(s_material_requirement_set, 0x8080197c),
});

export type s_material_requirement_table = c.infer<
  typeof s_material_requirement_table
>;

// Talent grids: a table naming one tag per grid.
export const k_talent_grid_table_class = 0x808019a9;
export const k_talent_grid_table_tag = 0x808e205f;
export const k_talent_grid_class = 0x808019a1;

export const s_talent_grid_table_entry = s_tag_table_entry;

export type s_talent_grid_table_entry = s_tag_table_entry;

export const s_talent_grid_table = c.struct({
  size: c.u32(),
  grids: tag_block(s_talent_grid_table_entry, 0x808019a3),
});

export type s_talent_grid_table = c.infer<typeof s_talent_grid_table>;

export const s_talent_grid_prerequisite = c.struct({
  node: c.u8(),
});

export type s_talent_grid_prerequisite = c.infer<
  typeof s_talent_grid_prerequisite
>;

export const s_material_set_index = c.struct({
  set: c.i16(),
});

export type s_material_set_index = c.infer<typeof s_material_set_index>;

// Nothing in the client's talent logic grants it, so the host must.
export const s_talent_step_reward = c.struct({
  // Gates the reward, -1 for none. Shaped like the item action block's
  // unknown04/reward_item pair.
  unknown00: c.i16(),
  // -1 for the owning item's reward_item.
  item: c.i16(),
  // Shown by the node panel (sub_82F39E10).
  unknown04: c.u8(),
  // Fills the panel's second item slot when set.
  unknown05: c.i8(),
  unknown06: c.i16(),
  unknown08: c.u32(),
  unknown0c: c.u32(),
});

export type s_talent_step_reward = c.infer<typeof s_talent_step_reward>;

// Checked on activation by sub_836BDEA8.
export const s_talent_grid_step = c.struct({
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  // Material requirement sets, one picked by the instance (+0x15).
  random_material_sets: tag_block(s_material_set_index, 0x80801980),
  // Used when there are no sets.
  materials: tag_block(s_investment_material_requirement, 0x80801977),
  unknown18: c.i16(),
  // Against the instance's tier (+0x14).
  tier_requirement: c.u8(),
  // Against the level on the grid's progression.
  level_requirement: c.u8(),
  // Previewed for steps not yet bought (sub_836B9E80).
  stats: tag_block(s_investment_item_stat, 0x808018da),
  // 0xFF for none.
  ability_index: c.u8({ padAfter: 3 }),
  override_node: c.u8({ padAfter: 3 }),
  override_step: c.i32(),
  button_slot: c.i8({ padAfter: 3 }),
  // -1 for a global ability mod, else the ability it modifies.
  ability_mod_target: c.i8({ padAfter: 3 }),
  // The empty name hash for none.
  ability_mod_hash: c.u32(),
  // Granted while this is the node's current step. -1 for none.
  perk: c.i16({ padAfter: 2 }),
  reward: s_talent_step_reward,
  // Read instead of the fields above when swapping a binary node
  // (sub_836BB1F0).
  binary_swap_material_set: c.i16({ padAfter: 2 }),
  binary_swap_materials: tag_block(
    s_investment_material_requirement,
    0x80801977
  ),
  binary_swap_tier_requirement: c.u8({ padAfter: 3 }),
});

export type s_talent_grid_step = c.infer<typeof s_talent_grid_step>;

export const s_talent_grid_node = c.struct({
  name_hash: c.u32(),
  prerequisites: tag_block(s_talent_grid_prerequisite, 0x8080004a),
  steps: tag_block(s_talent_grid_step, 0x8080199a),
  // Shared with exactly one other node when the two make a binary node; the
  // empty name hash otherwise.
  binary_pair_hash: c.u32(),
  // Activated on a fresh instance (sub_836BDA50).
  auto_granted: c.u8(),
  // Once maxed, the last step can be bought again.
  last_step_repeats: c.u8({ padAfter: 2 }),
  // One step, picked at random when the instance is made, is the only one
  // that can be active. Otherwise steps activate in order.
  exclusive: c.u8(),
  // An exclusive node can be bought again, re-rolling its step.
  random_repurchasable: c.u8({ padAfter: 0x1a }),
  unknown38: c.u32(),
});

export type s_talent_grid_node = c.infer<typeof s_talent_grid_node>;

export const s_talent_grid = c.struct({
  size: c.u32(),
  name_hash: c.u32(),
  // e.g. "weapon", "ship"; the empty name hash for most.
  category_hash: c.u32(),
  // Where the grid's XP comes from; 0xFF for none.
  progression: c.u8(),
  // With a progression, sets a flag on the grid's UI widget (sub_82998848).
  unknown0d: c.u8(),
  // Matches the highest step level requirement on many grids.
  unknown0e: c.u8(),
  // Copied to the instance (+0x14); true name unknown.
  tier: c.u8(),
  random_material_count: c.u8({ padAfter: 3 }),
  nodes: tag_block(s_talent_grid_node, 0x8080199f),
});

export type s_talent_grid = c.infer<typeof s_talent_grid>;
