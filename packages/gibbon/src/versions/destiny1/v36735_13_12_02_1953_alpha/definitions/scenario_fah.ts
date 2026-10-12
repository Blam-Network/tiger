import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

export const k_scenario_fah_class = 0x80800890;
export const k_scenario_bundle_reference_class = 0x80800534;
export const k_scenario_fah_bubble_class = 0x8080088b;
export const k_scenario_fah_bubble_entry_class = 0x80800889;

export const s_scenario_bundle_reference = c.struct({
  tag: c.u32(),
});

export type s_scenario_bundle_reference = c.infer<
  typeof s_scenario_bundle_reference
>;

export const s_scenario_fah_bubble_entry = c.struct({
  unknown00: c.u32(),
  // Matches a value on the same bubble's scenario_client state.
  unknown04: c.u32({ padAfter: 8 }),
  unknown10: c.u8(),
  unknown11: c.u8({ padAfter: 0x12 }),
  // The bubble's own slice tables (80800533).
  slices: tag_block(
    s_scenario_bundle_reference,
    k_scenario_bundle_reference_class,
    { padAfter: 0x14 }
  ),
});

export type s_scenario_fah_bubble_entry = c.infer<
  typeof s_scenario_fah_bubble_entry
>;

export const s_scenario_fah_bubble = c.struct({
  region_name_hash: c.u32(),
  entries: tag_block(
    s_scenario_fah_bubble_entry,
    k_scenario_fah_bubble_entry_class
  ),
});

export type s_scenario_fah_bubble = c.infer<typeof s_scenario_fah_bubble>;

// The activity host's scenario: where a player starts and which bundles
// make up each bubble.
export const s_scenario_fah = c.struct({
  size: c.u32(),
  // fnv1 of the activity name. The GAS takes it as the default spawn
  // transition name.
  family_checksum: c.u32(),
  unknown08: c.u32(),
  // Also the activity bundles' +0x04.
  unknown0c: c.u32(),
  unknown10: c.u32(),
  // Also scenario_client's +0x08.
  private_checksum: c.u32(),
  unknown18: c.u32(),
  initial_bubble: c.u32(),
  unknown20: c.u32(),
  unknown24: c.u32(),
  unknown28: c.u32(),
  // The activity's hub and binder bundles.
  bundles: tag_block(
    s_scenario_bundle_reference,
    k_scenario_bundle_reference_class
  ),
  bubbles: tag_block(s_scenario_fah_bubble, k_scenario_fah_bubble_class),
});

export type s_scenario_fah = c.infer<typeof s_scenario_fah>;
