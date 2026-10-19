import { CFieldType, c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition, tag_format_error } from "../tag/tag_block.ts";
import {
  e_investment_client_global,
  investment_client_global_tag,
} from "./investment_client_globals.ts";

// The investment globals (client globals slot 0): the server tables, by slot.
// The engine hands them out through virtual getters.
export const k_investment_globals_class = 0x80801b2d;

// A u32 the file stores little-endian inside the big-endian tag.
class c_u32_le extends CFieldType<number> {
  getSize(): number {
    return 4;
  }

  read(buffer: Buffer, offset: number): number {
    return buffer.readUInt32LE(offset);
  }

  write(): void {
    throw new tag_format_error("tag fields are read-only");
  }
}

export const s_investment_global = c.struct({
  unknown00: c.u32(),
  // -1 for an empty slot.
  tag: c.u32(),
});

export type s_investment_global = c.infer<typeof s_investment_global>;

export const k_investment_global_count = 64;

export const s_investment_globals = c.struct({
  size: c.u32(),
  // fnv1("alpha"), the build's name; a string list holds the same hash.
  unknown04: c.u32(),
  globals: c.array(s_investment_global, k_investment_global_count),
  // The rsat schema and content checksums the server states at sign-in.
  schema_checksum: new c_u32_le(),
  content_checksum: new c_u32_le(),
});

export type s_investment_globals = c.infer<typeof s_investment_globals>;

// Slot indices, by the root offset their tag sits at: 0x0C + 8 * index.
// Alpha has 64 slots against the live build's 66, so everything after the
// empty run at 40..46 sits one or two lower. Slots with no name here exist
// but aren't identified.
export const e_investment_global = {
  achievements: 0,
  unlock_groups: 1,
  destinations: 2,
  activities: 3,
  character_constants: 5,
  new_character_defaults: 9,
  inventory: 11,
  cooldowns: 12,
  investment_destinations: 16,
  enemies: 17,
  incident_registry: 23,
  items: 30,
  progressions: 37,
  reward_mappings: 42,
  stat_curves: 47,
  material_requirements: 48,
  talent_grids: 49,
  abilities: 55,
  unlock_flag_names: 58,
  unlock_times: 59,
  unlock_slots: 60,
  vendors: 61,
  server_messages: 62,
} as const;

export function investment_global_offset(index: number): number {
  return 0x0c + index * 8;
}

const investment_globals_cache = new WeakMap<
  c_package_set,
  { tag: number; globals: s_investment_globals }
>();

function find_investment_globals_entry(set: c_package_set) {
  let found = investment_globals_cache.get(set);
  if (!found) {
    const tag = investment_client_global_tag(
      set,
      e_investment_client_global.investment_globals
    );
    if (set.entry(tag)?.class_hash !== k_investment_globals_class) {
      throw new Error("client globals slot 0 is not the investment globals");
    }
    found = {
      tag,
      globals: read_definition(set.read_tag(tag), s_investment_globals),
    };
    investment_globals_cache.set(set, found);
  }
  return found;
}

export function find_investment_globals(set: c_package_set): number {
  return find_investment_globals_entry(set).tag;
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
