import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition, tag_block, tag_struct } from "../tag/tag_block.ts";
import {
  e_investment_global,
  investment_global_tag,
} from "./investment_globals.ts";

// Unlock expressions: every sub-expression must hold. Each is RPN over the
// character's unlock flags (sub_831A9850): op 1 pushes "flag[operand] is
// set", then 2 not, 3 or, 4 and, 5 nor, 6 xor, 7 nand, 8 xnor and 9 xor.
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
// destination tables.
export const s_tag_table_entry = c.struct({
  name_hash: c.u32({ padAfter: 4 }),
  tag: c.u32(),
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
  size: c.u32(),
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

// Laid out like a material requirement but count first. Only on consumable
// actions (e.g. 2 of the item itself); true names unknown.
export const s_item_action_requirement = c.struct({
  count: c.i32(),
  item: c.u16(),
  delete_on_action: c.u8(),
  unknown07: c.u8(),
});

export type s_item_action_requirement = c.infer<
  typeof s_item_action_requirement
>;

// Granted when the action runs (sub_831B6718 -> sub_831DC140).
export const s_item_progression_reward = c.struct({
  progression: c.u16({ padAfter: 2 }),
  amount: c.i32(),
});

export type s_item_progression_reward = c.infer<
  typeof s_item_progression_reward
>;

// What the item can be turned into or used for. Run by sub_831B6718.
export const s_item_action_block = c.struct({
  // Always 0; added to cooldown_seconds when the cooldown is stored.
  unknown00: c.u32(),
  cooldown_seconds: c.u32(),
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  required_items: tag_block(s_item_action_requirement, 0x80801882),
  progression_rewards: tag_block(s_item_progression_reward, 0x80801819),
  // e.g. "shard" (dismantle), "decrypt" (engrams).
  action_type_hash: c.u32(),
  unknown24: c.u32(),
  // Handed with reward_item to the reward resolver (sub_831B6368 ->
  // sub_831DE790, investment vtable +488); 0xFFFF for none.
  unknown28: c.u16(),
  // The item the action gives, -1 for none. Talent step rewards fall back
  // to it (sub_831BED68).
  reward_item: c.i16(),
  unknown2c: c.u8(),
  // Running the action removes consumed_quantity of the item (0 means 1).
  consumed: c.u8(),
  consumed_quantity: c.u8(),
  // The action runs as soon as the item is picked up; the item is kept only
  // when it isn't consumed (sub_831C38A0).
  use_on_acquire: c.u8(),
});

export type s_item_action_block = c.infer<typeof s_item_action_block>;

// Keyed 0..2, by character class; true name unknown.
export const s_item_equip_class_value = c.struct({
  key: c.u8({ padAfter: 1 }),
  value: c.u16(),
});

export type s_item_equip_class_value = c.infer<typeof s_item_equip_class_value>;

export const s_item_equipable_block = c.struct({
  // Checked before equipping (sub_831C4C88, failure bit 4).
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  unknown08: tag_block(s_item_equip_class_value, 0x808018ea),
  unknown10: tag_block(s_item_equip_class_value, 0x808018ea),
  // A lone expression, not a list of them.
  unknown18: s_unlock_expression,
  unknown20: tag_block(s_item_equip_class_value, 0x808018ea),
  art_arrangement: c.u16(),
  pattern: c.u8({ padAfter: 1 }),
  unknown2c: c.u32(),
  // Two equipped items with the same non-zero hash conflict (sub_831C4C88,
  // failure bit 2).
  exclusive_hash: c.u32(),
  equip_slot: c.u8({ padAfter: 3 }),
});

export type s_item_equipable_block = c.infer<typeof s_item_equipable_block>;

// Seeds a new instance (sub_831B6C88); a vendor sale can override each
// value. True names unknown.
export const s_item_level_block = c.struct({
  // Copied to the instance (+0x18).
  level: c.i32(),
  unknown04: c.u32(),
  // Copied to the instance (+0x20) unless the grant supplies one.
  unknown08: c.i16({ padAfter: 2 }),
  // With level, gives the instance's required level (+0x1C, sub_831E0BB8),
  // which equipping checks.
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

// Opening the item removes it and grants these, times its quantity
// (sub_831CAD08). Named after what it does; true name unknown.
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

export const s_item_definition = c.struct({
  size: c.u32(),
  action: tag_struct(s_item_action_block, 0x80801916),
  unknown08: c.u32(),
  equipable: tag_struct(s_item_equipable_block, 0x80801706),
  level: tag_struct(s_item_level_block, 0x80801875),
  stats: tag_struct(s_item_stat_block, 0x8080178b),
  contents: tag_struct(s_item_contents_block, 0x80801908),
  talent_grid: tag_struct(s_item_talent_grid_block, 0x808017bd),
  // The item table's key.
  name_hash: c.u32(),
  // One of a few values, matched by item filters (sub_828177C8). True name
  // unknown.
  category_hash: c.u32(),
  // The empty name hash when the item doesn't stack with another.
  stack_merge_hash: c.u32(),
  max_stack: c.i32(),
  bucket: c.u8(),
  // 20 or 0xFF: where an item lands when its own bucket can't take it
  // (sub_831BE538). True name unknown.
  overflow_bucket: c.u8(),
  // 0..5; indexes a hashed table that item filters match on. True name
  // unknown.
  tier: c.u8(),
  instanced: c.u8(),
  unknown34: c.u8({ padAfter: 3 }),
});

export type s_item_definition = c.infer<typeof s_item_definition>;

// Vendors: a table naming one tag per vendor.
export const k_vendor_table_class = 0x8080193b;
export const k_vendor_class = 0x8080171c;

export const s_vendor_table_entry = s_tag_table_entry;

export type s_vendor_table_entry = s_tag_table_entry;

export const s_vendor_table = c.struct({
  size: c.u32(),
  vendors: tag_block(s_vendor_table_entry, 0x8080172b),
});

export type s_vendor_table = c.infer<typeof s_vendor_table>;

// A 72-byte sale row, checked by sub_831CB340 and bought by sub_831CB858.
export const s_vendor_purchase = c.struct({
  purchase_unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  // Unset: the item definition's value list prices it instead.
  explicit_cost: c.u8({ padAfter: 1 }),
  cost_item: c.i16(),
  cost_quantity: c.i32(),
  // Override the item's level block for the new instance; 0 and
  // 0x80000000 keep the definition's (sub_831E0B30, sub_831E0A50).
  level: c.i32(),
  level_formula: c.array(c.i32(), 4),
  item: c.i16({ padAfter: 2 }),
  quantity: c.i32(),
  unknown2c: c.i32(),
  // Into the vendor's categories, -1 for none. A category can let the row
  // sell without its offer bit.
  category: c.i8({ padAfter: 3 }),
  unknown34: c.f32(),
  // Against the expansion level; 0 for no bound (error 5).
  minimum_level: c.i32(),
  maximum_level: c.i32(),
  // Failing it is vendor error 6.
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
});

export type s_vendor_purchase = c.infer<typeof s_vendor_purchase>;

export const s_vendor_category = c.struct({
  name_hash: c.u32(),
  unknown04: c.u32(),
  // Rows in the category sell without their offer bit (sub_831CB340).
  unknown08: c.u8(),
  // Rows in the category must also pass sub_831CB220 (error 3).
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
  size: c.u32(),
  name_hash: c.u32(),
  // -1 for vendors with no wares.
  currency_item: c.i16(),
  unknown0a: c.u8({ padAfter: 1 }),
  // In minutes: 10080 is a week, 1440 a day.
  refresh_minutes: c.u32(),
  unknown10: c.u32(),
  categories: tag_block(s_vendor_category, 0x8080171d),
  purchases: tag_block(s_vendor_purchase, 0x808016df),
  unknown24: tag_block(s_vendor_unknown_pair, 0x80801877),
  unknown2c: c.u8({ padAfter: 3 }),
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

// 52-byte rows. Another table's rows index one progression's list
// (sub_831CCE20); purpose unknown.
export const s_progression_reward = c.struct({
  unknown00: c.u8({ padAfter: 3 }),
  unlock: s_unlock_expression,
  unknown0c: c.i32(),
  unknown10: c.array(c.u32(), 3),
  // Flags, one byte set at a time.
  unknown1c: c.array(c.u8(), 8),
  // A multiplier (1.05 .. 3.0) when set.
  unknown24: c.f32(),
  unknown28: c.array(c.u32(), 2),
  unknown30: c.i32(),
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
  size: c.u32(),
  progressions: tag_block(s_progression, 0x808016e3),
});

export type s_progression_table = c.infer<typeof s_progression_table>;

// Material requirements: named sets of items an action costs. Talent steps
// point at a set by index rather than listing their own.
export const k_material_requirement_table_class = 0x808016c9;

export const s_material_requirement_set = c.struct({
  name_hash: c.u32(),
  requirements: tag_block(s_investment_material_requirement, 0x808016f7),
});

export type s_material_requirement_set = c.infer<
  typeof s_material_requirement_set
>;

export const s_material_requirement_table = c.struct({
  size: c.u32(),
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
  size: c.u32(),
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

// A new instance rolls one byte per row (sub_831C1F08); nodes and step
// stats name a row as their random slot.
export const s_talent_grid_random_roll = c.struct({
  name_hash: c.u32(),
  // The roll is 0..maximum; -1 rolls a full byte (a 0..1 stat scale).
  maximum: c.i8(),
  unknown05: c.u8({ padAfter: 2 }),
});

export type s_talent_grid_random_roll = c.infer<
  typeof s_talent_grid_random_roll
>;

// A chain of (node, step, index) links, followed while all four bytes are
// set (sub_831C0C40). True names unknown.
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

// A step's stat (sub_831BEAB0).
export const s_talent_grid_step_stat = c.struct({
  value: c.i32(),
  // With a random slot the scale is lerped between these by the slot's
  // roll / 255, else it is minimum_scale.
  minimum_scale: c.f32(),
  maximum_scale: c.f32(),
  key: c.u8(),
  random_slot: c.i8({ padAfter: 2 }),
});

export type s_talent_grid_step_stat = c.infer<typeof s_talent_grid_step_stat>;

export const s_talent_grid_step = c.struct({
  // Checked on activation (sub_831BFBA0 -> sub_831AA050).
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  random_material_sets: tag_block(s_material_set_index, 0x808045f1),
  // Some node in the group with this binary_pair_hash must be active
  // (sub_831BF0E8). The empty name hash for none.
  required_node_hash: c.u32(),
  // Against the level on the grid's progression.
  level_requirement: c.u8({ padAfter: 3 }),
  links: tag_block(s_talent_grid_step_link, 0x808018e8),
  stats: tag_block(s_talent_grid_step_stat, 0x80801787),
  perks: tag_block(s_perk_index, k_perk_index_class),
  unknown30: c.u16({ padAfter: 2 }),
  unknown34: c.u32(),
  unknown38: c.i16({ padAfter: 2 }),
  // Handed with reward_item to the reward resolver on activation, like the
  // item action's unknown28 (sub_831C19B0). 0xFFFF for none.
  unknown3c: c.u16(),
  // -1 for the owning item's action reward_item.
  reward_item: c.i16(),
  // Non-zero switches the instance to this grid.
  grid_override: c.u16(),
  // Activating the step removes the item (sub_831C3C10).
  consumes_item: c.u8({ padAfter: 1 }),
});

export type s_talent_grid_step = c.infer<typeof s_talent_grid_step>;

export const s_talent_grid_node = c.struct({
  name_hash: c.u32(),
  prerequisites: tag_block(s_talent_grid_prerequisite, 0x80800005),
  steps: tag_block(s_talent_grid_step, 0x80801758),
  // Shared by the nodes of one group, of which only one can be active; the
  // empty name hash otherwise.
  binary_pair_hash: c.u32(),
  // +0x18..+0x2C is read as a step (sub_831BF398) while an exclusive node is
  // unbought: these four fields line up with a step's first four.
  unlock: tag_block(s_unlock_expression, k_unlock_expression_class),
  random_material_sets: tag_block(s_material_set_index, 0x808045f1),
  required_node_hash: c.u32(),
  level_requirement: c.u8({ padAfter: 3 }),
  // Which random roll picks an exclusive node's step, -1 for none.
  random_slot: c.i8(),
  // One step, picked by the roll, is the only one that can be active.
  // Otherwise steps activate in order.
  exclusive: c.u8(),
  // An exclusive node can be bought again.
  random_repurchasable: c.u8({ padAfter: 1 }),
  // Activated on a fresh instance (sub_831C1C40).
  auto_granted: c.u8(),
  // Once maxed, the last step can be bought again.
  last_step_repeats: c.u8({ padAfter: 2 }),
});

export type s_talent_grid_node = c.infer<typeof s_talent_grid_node>;

export const s_talent_grid = c.struct({
  size: c.u32(),
  // e.g. the subclass's progression hash; the empty name hash for many.
  // Matched by item filters (sub_826389F0).
  category_hash: c.u32(),
  nodes: tag_block(s_talent_grid_node, 0x80801728),
  random_rolls: tag_block(s_talent_grid_random_roll, 0x8080177f),
  // Where the grid's XP comes from, -1 for none. Copied to the instance
  // (+0x0C).
  progression: c.i16(),
  // Above 1, a new instance rolls a byte below it (+0x4E).
  unknown1a: c.u8(),
  unknown1b: c.u8(),
});

export type s_talent_grid = c.infer<typeof s_talent_grid>;
