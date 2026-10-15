import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";
import { tag_relative_string } from "../tag/tag_string.ts";

// scenario_client bubble state -> slice descriptor -> client blueprint set
// -> activity bundles (8080076E). Every bundle is named by some set.
export const k_blueprint_reference_class = 0x808040d3;
export const k_slice_descriptor_class = 0x808008f0;
// Blueprint sets are manifest roots, whose class word names a manifest tag
// instead; the manifest's contained_class holds this.
export const k_client_blueprint_set_class = 0x808008ce;

// The slice set a bubble loads.
export const s_slice_descriptor = c.struct({
  size: c.u64(),
  // The destination's name, e.g. "cosmo".
  name: tag_relative_string(),
  // The owning scenario_client's world_hash: which world's bubbles these are.
  world_hash: c.u32({ padAfter: 4 }),
  bubble_index: c.u32(),
  blueprint_set: c.u32(),
});

export type s_slice_descriptor = c.infer<typeof s_slice_descriptor>;

export const s_blueprint_reference = c.struct({
  // An activity bundle (8080076E).
  tag: c.u32(),
});

export type s_blueprint_reference = c.infer<typeof s_blueprint_reference>;

// The last two lists can both be filled.
export const s_client_blueprint_set = c.struct({
  size: c.u64(),
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
