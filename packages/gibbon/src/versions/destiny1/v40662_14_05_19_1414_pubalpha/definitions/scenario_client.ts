import { c } from "@craftycodie/cstruct";
import { tag_block } from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";
import { tag_relative_string } from "../../v52553_16_09_28_1551_evil/tag/tag_string.ts";

// 64-bit like patch 01.29's, with two words fewer before the destination
// name and a block more after the bubbles.
export const k_scenario_client_class = 0x80800616;
export const k_scenario_client_bubble_class = 0x8080060c;
export const k_scenario_client_bubble_state_class = 0x808006a8;
export const k_scenario_client_unknown50_class = 0x8080073f;

// No pointers, so the live build's layout.
export const s_scenario_client_bubble_state = c.struct({
  valid: c.u8({ padAfter: 3 }),
  unknown04: c.u32({ padAfter: 4 }),
  // Nonzero: a public region, which needs a GAH bound on entry. Zero:
  // private, FAH only.
  mode: c.u8({ padAfter: 0x23 }),
  region_name_hash: c.u32(),
  // The bubble's slice descriptor (808008F0, world_binding.ts).
  descriptor: c.u32(),
  unknown38: c.u32(),
});

export type s_scenario_client_bubble_state = c.infer<
  typeof s_scenario_client_bubble_state
>;

// A bubble with no states is an index the activity never uses.
export const s_scenario_client_bubble = c.struct({
  region_name_hash: c.u32({ padAfter: 4 }),
  states: tag_block(
    s_scenario_client_bubble_state,
    k_scenario_client_bubble_state_class
  ),
});

export type s_scenario_client_bubble = c.infer<typeof s_scenario_client_bubble>;

// A hash and a small count; true names unknown.
export const s_scenario_client_unknown50 = c.struct({
  unknown00: c.u32(),
  unknown04: c.u32(),
});

export type s_scenario_client_unknown50 = c.infer<
  typeof s_scenario_client_unknown50
>;

export const s_scenario_client = c.struct({
  size: c.u64(),
  // fnv1 of the activity name.
  family_checksum: c.u32(),
  private_checksum: c.u32(),
  public_checksum: c.u32(),
  unknown14: c.u32(),
  unknown18: c.u32(),
  // The activity bundles' world_hash.
  unknown1c: c.u32(),
  unknown20: c.u32(),
  // A localized strings tag (8080035A).
  unknown24: c.u32(),
  // The destination, e.g. "cosmo".
  destination_name: tag_relative_string(),
  // Also every slice descriptor's world_hash.
  world_hash: c.u32({ padAfter: 4 }),
  // A package group root (real class 80800341).
  unknown38: c.u32({ padAfter: 4 }),
  bubbles: tag_block(s_scenario_client_bubble, k_scenario_client_bubble_class),
  unknown50: tag_block(
    s_scenario_client_unknown50,
    k_scenario_client_unknown50_class
  ),
  unknown60: c.u64(),
});

export type s_scenario_client = c.infer<typeof s_scenario_client>;
