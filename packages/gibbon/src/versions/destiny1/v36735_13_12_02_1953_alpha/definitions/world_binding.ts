import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";
import { read_tag_string } from "../tag/tag_string.ts";

// scenario_client bubble state -> slice descriptor -> client blueprint set
// -> bundle references. The blueprint set is what sub_835FE610 reads when a
// slice set loads.
export const k_blueprint_reference_class = 0x80800868;
export const k_blueprint_bundle_class = 0x80800867;
export const k_slice_descriptor_class = 0x80800896;
// Blueprint sets are type 0x80 entries, whose class word names an 808001AC
// companion tag instead; the companion's +0x08 holds this.
export const k_client_blueprint_set_class = 0x80800893;

// The slice set a bubble loads (sub_835FE610 reads its bubble index). The
// activity name follows as a tag string, class hash first.
export const s_slice_descriptor = c.struct({
  size: c.u32(),
  unknown04: c.u32(),
  // Also the owning scenario_client's +0x24.
  unknown08: c.u32(),
  bubble_index: c.u32(),
  blueprint_set: c.u32(),
});

export type s_slice_descriptor = c.infer<typeof s_slice_descriptor>;

export const k_slice_descriptor_name_offset = 0x18;

export function read_slice_descriptor_name(buffer: Buffer): string {
  return read_tag_string(buffer, k_slice_descriptor_name_offset);
}

export const s_blueprint_reference = c.struct({
  tag: c.u32(),
});

export type s_blueprint_reference = c.infer<typeof s_blueprint_reference>;

// Instantiated by sub_835FE110. The last two lists are never both filled:
// content exclusive to the activity is private, shared world content goes to
// whichever instance is authoritative.
export const s_client_blueprint_set = c.struct({
  size: c.u32(),
  // The "global client blueprint set": built in the private world once per
  // activity and kept across slice set switches.
  global_bundles: tag_block(s_blueprint_reference, k_blueprint_reference_class),
  // Built in the authoritative instance's world (FAH or GAH) per slice set.
  authoritative_bundles: tag_block(
    s_blueprint_reference,
    k_blueprint_reference_class
  ),
  // Built in the private (FAH) world per slice set.
  private_bundles: tag_block(
    s_blueprint_reference,
    k_blueprint_reference_class
  ),
});

export type s_client_blueprint_set = c.infer<typeof s_client_blueprint_set>;

// What a blueprint reference points at: one bundle, logged by sub_835FC1D8
// as "activity bundle '<namespace>.<bundle>'".
export const s_blueprint_bundle = c.struct({
  size: c.u32(),
  unknown04: c.u32(),
  // e.g. "city_tower", also the scenario_client's +0x14.
  namespace_hash: c.u32(),
  bundle: c.u32(),
});

export type s_blueprint_bundle = c.infer<typeof s_blueprint_bundle>;
