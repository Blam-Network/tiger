import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition } from "../tag/tag_block.ts";
import { named_root_tag } from "./manifest.ts";

// The investment globals root, found under the package's named root
// "investment_globals". The engine keeps it in dword_8350CDD0 and hands its
// tables out through virtual getters.
export const k_investment_globals_class = 0x80801750;
export const k_investment_globals_root_name = "investment_globals";

export const s_investment_global = c.struct({
  unknown00: c.u32(),
  // -1 for an empty slot.
  tag: c.u32(),
});

export type s_investment_global = c.infer<typeof s_investment_global>;

export const k_investment_global_count = 66;

export const s_investment_globals = c.struct({
  size: c.u32(),
  unknown04: c.u32(),
  globals: c.array(s_investment_global, k_investment_global_count),
  unknown218: c.u32(),
  unknown21c: c.u32(),
});

export type s_investment_globals = c.infer<typeof s_investment_globals>;

// Slot indices, by the root offset their tag sits at: 0x0C + 8 * index.
export const e_investment_global = {
  records: 0,
  unlock_groups: 1,
  destinations: 2,
  activities: 3,
  character_constants: 5,
  new_character_defaults: 9,
  inventory: 11,
  cooldowns: 12,
  investment_destinations: 16,
  enemies: 17,
  items: 31,
  progressions: 38,
  stat_curves: 49,
  material_requirements: 50,
  talent_grids: 51,
  abilities: 57,
  unlock_values: 58,
  unlock_flag_names: 60,
  unlock_times: 61,
  unlock_slots: 62,
  vendors: 63,
  server_messages: 64,
} as const;

export function investment_global_offset(index: number): number {
  return 0x0c + index * 8;
}

const investment_globals_cache = new WeakMap<
  c_package_set,
  { tag: number; globals: s_investment_globals }
>();

export function find_investment_globals(set: c_package_set): number {
  return find_investment_globals_entry(set).tag;
}

function find_investment_globals_entry(set: c_package_set) {
  let found = investment_globals_cache.get(set);
  if (!found) {
    const tag = named_root_tag(
      set,
      k_investment_globals_root_name,
      k_investment_globals_class
    );
    found = {
      tag,
      globals: read_definition(set.read_tag(tag), s_investment_globals),
    };
    investment_globals_cache.set(set, found);
  }
  return found;
}

// The tag a globals slot points at (an e_investment_global value).
export function investment_global_tag(
  set: c_package_set,
  slot: number
): number {
  const entry = find_investment_globals_entry(set).globals.globals[slot];
  if (entry === undefined || entry.tag === 0xffffffff) {
    throw new Error(`investment globals slot ${slot} is empty`);
  }
  return entry.tag;
}
