import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";
import { tag_relative_string } from "../tag/tag_string.ts";

// The Alpha Trial's layout but one word shorter before the destination
// name: the trial's unknown14 (zero there) isn't here, so its next four
// words sit 4 lower.
export const k_scenario_client_class = 0x80800719;
export const k_scenario_client_bubble_class = 0x808005e8;
export const k_scenario_client_bubble_state_class = 0x80800685;
export const k_scenario_client_unknown50_class = 0x80800720;

export const s_scenario_client_bubble_state = c.struct({
  valid: c.u8({ padAfter: 3 }),
  unknown04: c.u32({ padAfter: 4 }),
  // Nonzero: a public region, which needs a GAH bound on entry. Zero:
  // private, FAH only.
  mode: c.u8({ padAfter: 0x23 }),
  region_name_hash: c.u32(),
  // The bubble's slice descriptor (808008CA, world_binding.ts).
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

// A hash and a small count.
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
  // The activity bundles' world_hash.
  unknown18: c.u32(),
  unknown1c: c.u32(),
  // A localized strings tag (80800337), -1 for none.
  unknown20: c.u32({ padAfter: 4 }),
  // The destination, e.g. "cosmo".
  destination_name: tag_relative_string(),
  // Also every slice descriptor's world_hash.
  world_hash: c.u32({ padAfter: 4 }),
  // A package group root (real class 80800321).
  unknown38: c.u32({ padAfter: 4 }),
  bubbles: tag_block(s_scenario_client_bubble, k_scenario_client_bubble_class),
  unknown50: tag_block(
    s_scenario_client_unknown50,
    k_scenario_client_unknown50_class
  ),
  unknown60: c.u64(),
});

export type s_scenario_client = c.infer<typeof s_scenario_client>;
