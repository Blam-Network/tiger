import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

export const k_scenario_client_class = 0x808008a4;
export const k_scenario_client_bubble_class = 0x8080089f;
export const k_scenario_client_bubble_state_class = 0x8080089d;

export const s_scenario_client_bubble_state = c.struct({
  valid: c.u8({ padAfter: 3 }),
  unknown04: c.u32({ padAfter: 4 }),
  // Nonzero: a public region, which needs a GAH bound on entry. Zero:
  // private, FAH only. Read by the transition manager (sub_829127F0).
  mode: c.u8({ padAfter: 0x23 }),
  region_name_hash: c.u32(),
  // The bubble's slice descriptor (world_binding.ts).
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
  // fnv1 of the activity name, as in scenario_fah.
  family_checksum: c.u32(),
  private_checksum: c.u32(),
  public_checksum: c.u32(),
  unknown10: c.u32(),
  unknown14: c.u32(),
  unknown18: c.u32(),
  unknown1c: c.u32(),
  unknown20: c.u32(),
  // Also every slice descriptor's +0x08.
  unknown24: c.u32(),
  // A tag in the activity's ambient package.
  unknown28: c.u32(),
  bubbles: tag_block(s_scenario_client_bubble, k_scenario_client_bubble_class),
});

export type s_scenario_client = c.infer<typeof s_scenario_client>;
