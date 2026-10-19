import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition } from "../tag/tag_block.ts";
import { named_root_manifest } from "./named_roots.ts";

// The named root "investment_globals": the manifest root's own data is the
// client globals, the tables the client loads (class 0x80803xxx). Slot 0 is
// the investment globals (80801B2D) the server tables hang off. Consumers
// start here rather than at tag ids.
export const k_investment_globals_root_name = "investment_globals";
export const k_investment_client_globals_class = 0x80803ae7;

export const k_investment_client_global_count = 49;

export const s_investment_client_global = c.struct({
  unknown00: c.u32(),
  // -1 for an empty slot.
  tag: c.u32(),
});

export type s_investment_client_global = c.infer<
  typeof s_investment_client_global
>;

export const s_investment_client_globals = c.struct({
  size: c.u32(),
  globals: c.array(
    s_investment_client_global,
    k_investment_client_global_count
  ),
});

export type s_investment_client_globals = c.infer<
  typeof s_investment_client_globals
>;

// Slot indices, by the root offset their tag sits at: 0x08 + 8 * index. Names
// are the client loader's category names (sub_82993740); slots 3 and 13 have
// none.
export const e_investment_client_global = {
  investment_globals: 0,
  achievements: 1,
  activities: 2,
  activity_types: 4,
  character_constants: 5,
  character_classes: 6,
  character_customization_categories: 7,
  character_customization_options: 8,
  character_genders: 9,
  character_races: 10,
  character_inventory: 11,
  cooldowns: 12,
  director_panes: 14,
  places: 15,
  enemies: 16,
  enemy_races: 17,
  destinations: 18,
  equipment_categories: 19,
  equipment_slots: 20,
  factions: 21,
  inventory_buckets: 22,
  item_constants: 23,
  item_tiers: 24,
  item_displays: 25,
  offer_consumables: 26,
  offer_entitlements: 27,
  expansion_levels: 28,
  progressions: 29,
  progression_mappings: 30,
  reward_constants: 31,
  reward_indicators: 32,
  stat_types: 33,
  stat_groups: 34,
  talent_grids: 35,
  audio: 36,
  art_arrangement_regions: 37,
  art_dye_channels: 38,
  art_arrangements: 39,
  art_dyes: 40,
  abilities: 41,
  sandbox_patterns: 42,
  sandbox_perks: 43,
  string_lists: 44,
  ui_triggers: 45,
  unlock_flags: 46,
  vendors: 47,
  server_messages: 48,
} as const;

export function investment_client_global_offset(index: number): number {
  return 0x08 + index * 8;
}

const client_globals_cache = new WeakMap<
  c_package_set,
  s_investment_client_globals
>();

function find_investment_client_globals(
  set: c_package_set
): s_investment_client_globals {
  let found = client_globals_cache.get(set);
  if (!found) {
    const { root } = named_root_manifest(set, k_investment_globals_root_name);
    found = read_definition(set.read_tag(root), s_investment_client_globals);
    client_globals_cache.set(set, found);
  }
  return found;
}

// The tag a client globals slot points at (an e_investment_client_global
// value).
export function investment_client_global_tag(
  set: c_package_set,
  slot: number
): number {
  const entry = find_investment_client_globals(set).globals[slot];
  if (entry === undefined || entry.tag === 0xffffffff) {
    throw new Error(`investment client globals slot ${slot} is empty`);
  }
  return entry.tag;
}
