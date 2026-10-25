import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../../v52553_16_09_28_1551_evil/pkg/package_set.ts";
import {
  read_definition,
  tag_block,
  tag_struct,
} from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";
import {
  e_investment_global,
  investment_global_tag,
} from "./investment_globals.ts";

// The investment tables. Element classes are the live build's. Most rows
// are the live build's widened; the item definition, its action and
// equipable blocks and the talent grid's nodes and steps are laid out
// differently, as measured against the live rows of the same name hash.

// Unlock expressions: every sub-expression must hold. Each is RPN over the
// character's unlock flags: op 1 pushes "flag[operand] is set", then 2 not,
// 3 or, 4 and, 5 nor, 6 xor, 7 nand, 8 xnor and 9 xor.
export const s_unlock_token = c.struct({
  op: c.u8({ padAfter: 1 }),
  operand: c.u16(),
});

export type s_unlock_token = c.infer<typeof s_unlock_token>;

export const s_unlock_expression = c.struct({
  tokens: tag_block(s_unlock_token, 0x80801776),
});

export type s_unlock_expression = c.infer<typeof s_unlock_expression>;

export const k_unlock_expression_class = 0x808016e4;

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

// A table row naming a tag by hash: the item, vendor, talent grid and
// destination tables. 24 bytes; +0x08 is zero in the tags.
export const s_tag_table_entry = c.struct({
  name_hash: c.u32({ padAfter: 12 }),
  tag: c.u32({ padAfter: 4 }),
});

export type s_tag_table_entry = c.infer<typeof s_tag_table_entry>;

export const k_perk_index_class = 0x80804628;

export const s_perk_index = c.struct({
  perk: c.i16(),
});

export type s_perk_index = c.infer<typeof s_perk_index>;

// Item definitions, one tag per definition index, in the same order as the
// item table's rows.
export const k_item_definition_class = 0x80801806;

export const k_item_table_class = 0x80801933;

export const s_item_table_entry = s_tag_table_entry;

export type s_item_table_entry = s_tag_table_entry;

export const s_item_table = c.struct({
  size: c.u64(),
  items: tag_block(s_item_table_entry, 0x808016bd),
});

export type s_item_table = c.infer<typeof s_item_table>;

// Item definition tags by definition index, from the item table's rows.
export function item_definition_tags(set: c_package_set): number[] {
  const table = read_definition(
    set.read_tag(investment_global_tag(set, e_investment_global.items)),
    s_item_table
  );
  return table.items.map((item) => item.tag);
}

// Only on consumable actions. The live build has the count first; which of
// the two bytes is its delete_on_action is unknown.
export const s_item_action_requirement = c.struct({
  item: c.u16(),
  unknown02: c.u8(),
  unknown03: c.u8(),
  count: c.i32(),
});

export type s_item_action_requirement = c.infer<
  typeof s_item_action_requirement
>;

// Granted when the action runs.
export const s_item_progression_reward = c.struct({
  progression: c.u16({ padAfter: 2 }),
  amount: c.i32(),
});

export type s_item_progression_reward = c.infer<
  typeof s_item_progression_reward
>;

// What the item can be turned into or used for. 0x50 bytes, reordered
// from the live build's.
export const s_item_action_block = c.struct({
  // e.g. "shard" (dismantle), "decrypt" (engrams).
  action_type_hash: c.u32(),
  // The live build's unknown28, 0xFFFF for none.
  unknown04: c.u16(),
  // The item the action gives, -1 for none.
  reward_item: c.i16(),
  progression_rewards: tag_block(s_item_progression_reward, 0x80801819),
  // Running the action removes consumed_quantity of the item (0 means 1).
  consumed: c.u8(),
  consumed_quantity: c.u8(),
  // The action runs as soon as the item is picked up.
  use_on_acquire: c.u8(),
  unknown1b: c.u8(),
  unknown1c: c.u32(),
  cooldown_seconds: c.u32({ padAfter: 4 }),
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  required_items: tag_block(s_item_action_requirement, 0x80801882),
  unknown48: c.u32({ padAfter: 4 }),
});

export type s_item_action_block = c.infer<typeof s_item_action_block>;

// Keyed 0..2, by character class; true name unknown.
export const s_item_equip_class_value = c.struct({
  key: c.u8({ padAfter: 1 }),
  value: c.u16(),
});

export type s_item_equip_class_value = c.infer<typeof s_item_equip_class_value>;

// 0x68 bytes, reordered from the live build's.
export const s_item_equipable_block = c.struct({
  equip_slot: c.u8({ padAfter: 3 }),
  // The live build's unknown2c, a hash.
  unknown04: c.u32(),
  unknown08: c.u64(),
  // Checked before equipping.
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  art_arrangement: c.u16(),
  pattern: c.u8({ padAfter: 1 }),
  // Zero in every row, as the live build's exclusive_hash.
  unknown24: c.u32(),
  unknown28: tag_block(s_item_equip_class_value, 0x808018ea),
  unknown38: tag_block(s_item_equip_class_value, 0x808018ea),
  // A lone expression, not a list of them.
  unknown48: s_unlock_expression,
  unknown58: tag_block(s_item_equip_class_value, 0x808018ea),
});

export type s_item_equipable_block = c.infer<typeof s_item_equipable_block>;

// Seeds a new instance; a vendor sale can override each value. No
// pointers, so the live build's layout.
export const s_item_level_block = c.struct({
  level: c.i32(),
  unknown04: c.u32(),
  unknown08: c.i16({ padAfter: 2 }),
  level_formula: c.array(c.i32(), 4),
});

export type s_item_level_block = c.infer<typeof s_item_level_block>;

export const s_item_stat_block = c.struct({
  stats: tag_block(s_investment_item_stat, 0x8080190c),
  perks: tag_block(s_perk_index, k_perk_index_class),
});

export type s_item_stat_block = c.infer<typeof s_item_stat_block>;

export const s_item_contents_entry = c.struct({
  item: c.u16({ padAfter: 2 }),
  count: c.i32(),
});

export type s_item_contents_entry = c.infer<typeof s_item_contents_entry>;

// Opening the item removes it and grants these, times its quantity.
export const s_item_contents_block = c.struct({
  count: c.u32(),
  items: c.array(s_item_contents_entry, 5),
});

export type s_item_contents_block = c.infer<typeof s_item_contents_block>;

export const s_item_talent_grid_block = c.struct({
  // Into the talent grid table's rows.
  grid_index: c.u16(),
});

export type s_item_talent_grid_block = c.infer<typeof s_item_talent_grid_block>;

// 0x58 bytes: the scalars first, then the blocks' pointers.
export const s_item_definition = c.struct({
  size: c.u64(),
  // The item table's key.
  name_hash: c.u32(),
  // One of a few values, matched by item filters.
  category_hash: c.u32(),
  bucket: c.u8(),
  // 20 or 0xFF: where an item lands when its own bucket can't take it.
  overflow_bucket: c.u8(),
  instanced: c.u8(),
  // 0..5.
  tier: c.u8(),
  max_stack: c.i32(),
  // The empty name hash when the item doesn't stack with another.
  stack_merge_hash: c.u32(),
  unknown1c: c.u32(),
  action: tag_struct(s_item_action_block, 0x80801916),
  // Zero in every tag.
  unknown28: c.u64(),
  equipable: tag_struct(s_item_equipable_block, 0x80801706),
  level: tag_struct(s_item_level_block, 0x80801875),
  stats: tag_struct(s_item_stat_block, 0x8080178b),
  contents: tag_struct(s_item_contents_block, 0x80801908),
  talent_grid: tag_struct(s_item_talent_grid_block, 0x808017bd),
});

export type s_item_definition = c.infer<typeof s_item_definition>;

// Vendors: a table naming one tag per vendor.
export const k_vendor_table_class = 0x8080193b;
export const k_vendor_class = 0x8080171c;

export const s_vendor_table_entry = s_tag_table_entry;

export type s_vendor_table_entry = s_tag_table_entry;

export const s_vendor_table = c.struct({
  size: c.u64(),
  vendors: tag_block(s_vendor_table_entry, 0x8080172b),
});

export type s_vendor_table = c.infer<typeof s_vendor_table>;

// An 88-byte sale row, the live build's widened.
export const s_vendor_purchase = c.struct({
  purchase_unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  // Unset: the item definition's value list prices it instead.
  explicit_cost: c.u8({ padAfter: 1 }),
  cost_item: c.i16(),
  cost_quantity: c.i32(),
  // Override the item's level block for the new instance; 0 and
  // 0x80000000 keep the definition's.
  level: c.i32(),
  level_formula: c.array(c.i32(), 4),
  item: c.i16({ padAfter: 2 }),
  quantity: c.i32(),
  unknown34: c.i32(),
  // Into the vendor's categories, -1 for none.
  category: c.i8({ padAfter: 3 }),
  unknown3c: c.f32(),
  // Against the expansion level; 0 for no bound.
  minimum_level: c.i32(),
  maximum_level: c.i32(),
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
});

export type s_vendor_purchase = c.infer<typeof s_vendor_purchase>;

export const s_vendor_category = c.struct({
  name_hash: c.u32(),
  unknown04: c.u32(),
  // Rows in the category sell without their offer bit.
  unknown08: c.u8(),
  unknown09: c.u8({ padAfter: 2 }),
});

export type s_vendor_category = c.infer<typeof s_vendor_category>;

// Pairs of small indices, the second 0xFF or shared by several rows.
export const s_vendor_unknown_pair = c.struct({
  unknown00: c.u8(),
  unknown01: c.u8(),
});

export type s_vendor_unknown_pair = c.infer<typeof s_vendor_unknown_pair>;

export const s_vendor = c.struct({
  size: c.u64(),
  name_hash: c.u32(),
  // -1 for vendors with no wares.
  currency_item: c.i16(),
  unknown0e: c.u8({ padAfter: 1 }),
  // In minutes: 10080 is a week, 1440 a day.
  refresh_minutes: c.u32(),
  unknown14: c.u32(),
  categories: tag_block(s_vendor_category, 0x8080171d),
  purchases: tag_block(s_vendor_purchase, 0x808016df),
  unknown38: tag_block(s_vendor_unknown_pair, 0x80801877),
  unknown48: c.u8({ padAfter: 7 }),
});

export type s_vendor = c.infer<typeof s_vendor>;

// Progressions: one table tag holding every definition.
export const k_progression_table_class = 0x80801779;

export const s_progression_step = c.struct({
  xp_required: c.i32(),
  // 0xFFFF when the step grants nothing.
  granted_item: c.u16(),
  unknown06: c.u16(),
});

export type s_progression_step = c.infer<typeof s_progression_step>;

// 64-byte rows, the live build's 52 widened; purpose unknown.
export const s_progression_reward = c.struct({
  unknown00: c.u8({ padAfter: 7 }),
  unlock: s_unlock_expression,
  unknown18: c.i32(),
  unknown1c: c.array(c.u32(), 3),
  // Flags, one byte set at a time.
  unknown28: c.array(c.u8(), 8),
  // A multiplier when set.
  unknown30: c.f32(),
  unknown34: c.array(c.u32(), 2),
  unknown3c: c.i32(),
});

export type s_progression_reward = c.infer<typeof s_progression_reward>;

export const s_progression = c.struct({
  name_hash: c.u32(),
  kind: c.u8(),
  // Past the last step, the last step repeats and the level keeps
  // climbing.
  clamp_at_max: c.u8({ padAfter: 2 }),
  steps: tag_block(s_progression_step, 0x808017fa),
  rewards: tag_block(s_progression_reward, 0x80801812),
});

export type s_progression = c.infer<typeof s_progression>;

export const s_progression_table = c.struct({
  size: c.u64(),
  progressions: tag_block(s_progression, 0x808016e3),
});

export type s_progression_table = c.infer<typeof s_progression_table>;

// Material requirements: named sets of items an action costs.
export const k_material_requirement_table_class = 0x808016c9;

export const s_material_requirement_set = c.struct({
  name_hash: c.u32({ padAfter: 4 }),
  requirements: tag_block(s_investment_material_requirement, 0x808016f7),
});

export type s_material_requirement_set = c.infer<
  typeof s_material_requirement_set
>;

export const s_material_requirement_table = c.struct({
  size: c.u64(),
  sets: tag_block(s_material_requirement_set, 0x8080195f),
});

export type s_material_requirement_table = c.infer<
  typeof s_material_requirement_table
>;

// Talent grids: a table naming one tag per grid. Several rows can share a
// grid.
export const k_talent_grid_table_class = 0x808018c2;
export const k_talent_grid_class = 0x80801963;

export const s_talent_grid_table_entry = s_tag_table_entry;

export type s_talent_grid_table_entry = s_tag_table_entry;

export const s_talent_grid_table = c.struct({
  size: c.u64(),
  grids: tag_block(s_talent_grid_table_entry, 0x808017cb),
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

// A new instance rolls one byte per row; nodes and step stats name a row as
// their random slot.
export const s_talent_grid_random_roll = c.struct({
  name_hash: c.u32(),
  // The roll is 0..maximum; -1 rolls a full byte.
  maximum: c.i8(),
  unknown05: c.u8({ padAfter: 2 }),
});

export type s_talent_grid_random_roll = c.infer<
  typeof s_talent_grid_random_roll
>;

// A chain of (node, step, index) links. True names unknown.
export const s_talent_grid_step_link = c.struct({
  name_hash: c.u32(),
  unknown04: c.u8({ padAfter: 3 }),
  node: c.u8(),
  step: c.u8(),
  index: c.u8(),
  unknown0b: c.u8(),
  unknown0c: c.u32(),
});

export type s_talent_grid_step_link = c.infer<typeof s_talent_grid_step_link>;

export const s_talent_grid_step_stat = c.struct({
  value: c.i32(),
  minimum_scale: c.f32(),
  maximum_scale: c.f32(),
  key: c.u8(),
  random_slot: c.i8({ padAfter: 2 }),
});

export type s_talent_grid_step_stat = c.infer<typeof s_talent_grid_step_stat>;

// 0x70 bytes: the live build's widened, with a word more at +0x5C.
export const s_talent_grid_step = c.struct({
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  random_material_sets: tag_block(s_material_set_index, 0x808045f1),
  // Some node in the group with this binary_pair_hash must be active. The
  // empty name hash for none.
  required_node_hash: c.u32(),
  // Against the level on the grid's progression.
  level_requirement: c.u8({ padAfter: 3 }),
  links: tag_block(s_talent_grid_step_link, 0x808018e8),
  stats: tag_block(s_talent_grid_step_stat, 0x80801787),
  perks: tag_block(s_perk_index, k_perk_index_class),
  unknown58: c.u16({ padAfter: 2 }),
  unknown5c: c.u32(),
  unknown60: c.u32(),
  unknown64: c.i16({ padAfter: 2 }),
  // 0xFFFF for none.
  unknown68: c.u16(),
  // -1 for the owning item's action reward_item.
  reward_item: c.i16(),
  // Non-zero switches the instance to this grid.
  grid_override: c.u16(),
  // Activating the step removes the item.
  consumes_item: c.u8({ padAfter: 1 }),
});

export type s_talent_grid_step = c.infer<typeof s_talent_grid_step>;

// 0x68 bytes: the live build's widened, with a word more at +0x5C.
export const s_talent_grid_node = c.struct({
  name_hash: c.u32({ padAfter: 4 }),
  prerequisites: tag_block(s_talent_grid_prerequisite, 0x80800005),
  steps: tag_block(s_talent_grid_step, 0x80801758),
  // Shared by the nodes of one group, of which only one can be active; the
  // empty name hash otherwise.
  binary_pair_hash: c.u32({ padAfter: 4 }),
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  random_material_sets: tag_block(s_material_set_index, 0x808045f1),
  required_node_hash: c.u32(),
  level_requirement: c.u8({ padAfter: 3 }),
  // Which random roll picks an exclusive node's step, -1 for none.
  random_slot: c.i8(),
  // One step, picked by the roll, is the only one that can be active.
  exclusive: c.u8(),
  unknown5a: c.u8({ padAfter: 1 }),
  unknown5c: c.u32(),
  // Activated on a fresh instance.
  auto_granted: c.u8(),
  unknown61: c.u8({ padAfter: 6 }),
});

export type s_talent_grid_node = c.infer<typeof s_talent_grid_node>;

export const s_talent_grid = c.struct({
  size: c.u64(),
  // The empty name hash for many.
  category_hash: c.u32({ padAfter: 4 }),
  nodes: tag_block(s_talent_grid_node, 0x80801728),
  random_rolls: tag_block(s_talent_grid_random_roll, 0x8080177f),
  // Where the grid's XP comes from, -1 for none.
  progression: c.i16(),
  unknown32: c.u8(),
  unknown33: c.u8({ padAfter: 4 }),
});

export type s_talent_grid = c.infer<typeof s_talent_grid>;
