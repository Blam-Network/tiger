import { c } from "@craftycodie/cstruct";

// The investment globals root (80A58001, in 360_investment_globals_012c;
// the package's named root is 80A58000). The engine keeps it in
// dword_8350CDD0 and hands its tables out through virtual getters.
export const k_investment_globals_class = 0x80801750;
export const k_investment_globals_tag = 0x80a58001;

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
  cooldowns: 12,
  investment_destinations: 16,
  enemies: 17,
  items: 31,
  progressions: 38,
  stat_curves: 49,
  material_requirements: 50,
  talent_grids: 51,
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
