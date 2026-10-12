import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";
import { read_tag_string, tag_relative_string } from "../tag/tag_string.ts";

// scenario_client bubble state -> slice descriptor -> client blueprint set
// -> activity bundles (8080076E). Every bundle is named by some set.
export const k_blueprint_reference_class = 0x808040d3;
export const k_slice_descriptor_class = 0x808008f0;
// Blueprint sets are type 0x80 entries, whose class word names a manifest
// tag instead; the manifest's +0x08 holds this.
export const k_client_blueprint_set_class = 0x808008ce;

// The slice set a bubble loads.
export const s_slice_descriptor = c.struct({
  size: c.u32(),
  // The activity's name, e.g. "city_tower".
  name: tag_relative_string(),
  // Also the owning scenario_client's +0x28.
  unknown08: c.u32(),
  bubble_index: c.u32(),
  blueprint_set: c.u32(),
});

export type s_slice_descriptor = c.infer<typeof s_slice_descriptor>;

// The name's length-prefixed string, class 80800065 just before it.
export const k_slice_descriptor_name_offset = 0x18;

export function read_slice_descriptor_name(buffer: Buffer): string {
  return read_tag_string(buffer, k_slice_descriptor_name_offset);
}

export const s_blueprint_reference = c.struct({
  // An activity bundle (activity_bundle.ts).
  tag: c.u32(),
});

export type s_blueprint_reference = c.infer<typeof s_blueprint_reference>;

// The last two lists can both be filled.
export const s_client_blueprint_set = c.struct({
  size: c.u32(),
  // The "global client blueprint set": built in the private world once per
  // activity and kept across slice set switches.
  global_bundles: tag_block(s_blueprint_reference, k_blueprint_reference_class),
  // Built in the authoritative instance's world per slice set.
  authoritative_bundles: tag_block(
    s_blueprint_reference,
    k_blueprint_reference_class
  ),
  // Built in the private world per slice set.
  private_bundles: tag_block(
    s_blueprint_reference,
    k_blueprint_reference_class
  ),
});

export type s_client_blueprint_set = c.infer<typeof s_client_blueprint_set>;
