import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

export const k_activity_bundle_class = 0x80800533;
export const k_activity_bundle_row_class = 0x80800489;
export const k_activity_bundle_reference_class = 0x8080047c;

// A row's index is its position in the table; it isn't stored.
export const s_activity_bundle_row = c.struct({
  type: c.u8({ padAfter: 3 }),
  name_hash: c.u32(),
});

export type s_activity_bundle_row = c.infer<typeof s_activity_bundle_row>;

export const s_activity_bundle_reference = c.struct({
  tag: c.u32(),
});

export type s_activity_bundle_reference = c.infer<
  typeof s_activity_bundle_reference
>;

export const s_activity_bundle = c.struct({
  size: c.u32(),
  // The same value sits in the activity's scenario_fah (+0x0C) and
  // scenario_client (+0x14).
  unknown04: c.u32(),
  bundle: c.u32(),
  unknown0c: c.u16(),
  unknown0e: c.u16(),
  rows: tag_block(s_activity_bundle_row, k_activity_bundle_row_class),
  unknown18: c.u32(),
  // The bundle's row lookup (8080047B); always exactly one.
  lookups: tag_block(
    s_activity_bundle_reference,
    k_activity_bundle_reference_class
  ),
});

export type s_activity_bundle = c.infer<typeof s_activity_bundle>;
