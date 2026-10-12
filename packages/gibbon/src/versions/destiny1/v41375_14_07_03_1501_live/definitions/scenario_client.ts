import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

export const k_scenario_client_class = 0x80800616;
export const k_scenario_client_bubble_class = 0x8080060c;
export const k_scenario_client_bubble_state_class = 0x808006a8;

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
  region_name_hash: c.u32(),
  states: tag_block(
    s_scenario_client_bubble_state,
    k_scenario_client_bubble_state_class
  ),
});

export type s_scenario_client_bubble = c.infer<typeof s_scenario_client_bubble>;

export const s_scenario_client = c.struct({
  size: c.u32(),
  // fnv1 of the activity name.
  family_checksum: c.u32(),
  private_checksum: c.u32(),
  public_checksum: c.u32(),
  unknown10: c.f32(),
  unknown14: c.u32(),
  // The activity bundles' +0x04 in most.
  unknown18: c.u32(),
  unknown1c: c.u32(),
  // A string list tag (8080035A), sometimes -1.
  unknown20: c.u32(),
  unknown24: c.u32(),
  // Also every slice descriptor's +0x08.
  unknown28: c.u32(),
  // A package group root (real class 80800341).
  unknown2c: c.u32(),
  bubbles: tag_block(s_scenario_client_bubble, k_scenario_client_bubble_class),
});

export type s_scenario_client = c.infer<typeof s_scenario_client>;
