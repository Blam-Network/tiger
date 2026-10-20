import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";
import { tag_relative_string } from "../tag/tag_string.ts";

export const k_activity_bundle_class = 0x8080076e;
export const k_activity_bundle_row_class = 0x808007d3;
export const k_activity_bundle_lookup_group_class = 0x808005e9;
export const k_activity_bundle_reference_class = 0x80804222;

// A row's index is its position in the table; it isn't stored. The name is
// the row's full name, e.g. "patrol_beacons[0]".
export const s_activity_bundle_row = c.struct({
  type: c.u8({ padAfter: 3 }),
  name: tag_relative_string(),
});

export type s_activity_bundle_row = c.infer<typeof s_activity_bundle_row>;

export const s_activity_bundle_reference = c.struct({
  tag: c.u32(),
});

export type s_activity_bundle_reference = c.infer<
  typeof s_activity_bundle_reference
>;

// The sensor classes to load for one slice set. The lookup tags (808003F6)
// carry no row entries; each sensor definition names its own row
// (activity_lookup.ts). +0x08..+0x17 is handed to the loader as a unit.
export const s_activity_bundle_lookup_group = c.struct({
  // -1: always loaded; otherwise the slice set (sub_82586828 takes
  // 0..127). Every sensor definition in the group has the same slice_set.
  slice_set: c.i32(),
  // A name hash.
  unknown04: c.u32(),
  unknown08: c.u32(),
  // Objects placed with no row (808009A2), -1 for none.
  placement_set: c.u32(),
  lookups: tag_block(
    s_activity_bundle_reference,
    k_activity_bundle_reference_class
  ),
});

export type s_activity_bundle_lookup_group = c.infer<
  typeof s_activity_bundle_lookup_group
>;

export const s_activity_bundle = c.struct({
  size: c.u32(),
  // The same value sits in the activity's scenario_client (+0x18).
  unknown04: c.u32(),
  bundle: c.u32(),
  // The two add up to the row count.
  unknown0c: c.u16(),
  unknown0e: c.u16(),
  rows: tag_block(s_activity_bundle_row, k_activity_bundle_row_class),
  // A localized strings tag (8080035A), sometimes -1.
  unknown18: c.u32(),
  lookup_groups: tag_block(
    s_activity_bundle_lookup_group,
    k_activity_bundle_lookup_group_class
  ),
});

export type s_activity_bundle = c.infer<typeof s_activity_bundle>;
