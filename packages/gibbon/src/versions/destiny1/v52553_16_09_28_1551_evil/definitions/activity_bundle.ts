import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition, tag_block } from "../tag/tag_block.ts";
import { tag_relative_string } from "../tag/tag_string.ts";
import { s_scenario_client } from "./scenario_client.ts";
import { s_client_blueprint_set, s_slice_descriptor } from "./world_binding.ts";

// The live 360 build's activity bundle (a sensor group record), widened.
export const k_activity_bundle_class = 0x8080076e;
export const k_activity_bundle_row_class = 0x808007d3;
export const k_activity_bundle_lookup_group_class = 0x808005e9;
export const k_activity_bundle_reference_class = 0x80804222;

// A row's index is its position in the table (the sensor row's sub); it
// isn't stored. The name is the row's full name, e.g. "patrol_beacons[0]".
export const s_activity_bundle_row = c.struct({
  type: c.u8({ padAfter: 7 }),
  name: tag_relative_string(),
});

export type s_activity_bundle_row = c.infer<typeof s_activity_bundle_row>;

export const s_activity_bundle_reference = c.struct({
  tag: c.u32(),
});

export type s_activity_bundle_reference = c.infer<
  typeof s_activity_bundle_reference
>;

// What the client registers for one (bubble, phase), in its own slot order.
export const s_activity_bundle_lookup_group = c.struct({
  // -1: every bubble; otherwise the bubble index.
  slice_set: c.i32(),
  // fnv1 of the phase's name, or fnv1("") (811C9DC5) for none.
  phase_hash: c.u32(),
  // 0x20 everywhere.
  unknown08: c.u32(),
  unknown0c: c.u32(),
  // -1 for none.
  placement_set: c.u32(),
  unknown14: c.u32(),
  lookups: tag_block(
    s_activity_bundle_reference,
    k_activity_bundle_reference_class
  ),
});

export type s_activity_bundle_lookup_group = c.infer<
  typeof s_activity_bundle_lookup_group
>;

export const s_activity_bundle = c.struct({
  size: c.u64(),
  // fnv1 of the world name, or fnv1("") on a group every world shares.
  world_hash: c.u32(),
  // fnv1 of the bundle's name, e.g. act_cosmo_m1_dome_a.
  bundle: c.u32(),
  // Rows from slotted_row_count on never get a sensor slot; the two add up
  // to the row count.
  slotted_row_count: c.u16(),
  unknown12: c.u16({ padAfter: 4 }),
  rows: tag_block(s_activity_bundle_row, k_activity_bundle_row_class),
  // A localized strings tag (8080035A).
  unknown28: c.u32({ padAfter: 4 }),
  lookup_groups: tag_block(
    s_activity_bundle_lookup_group,
    k_activity_bundle_lookup_group_class
  ),
});

export type s_activity_bundle = c.infer<typeof s_activity_bundle>;

// The head alone: which bundle a tag is, without reading its rows.
export const s_activity_bundle_head = c.struct({
  size: c.u64(),
  world_hash: c.u32(),
  bundle: c.u32(),
});

export type s_activity_bundle_head = c.infer<typeof s_activity_bundle_head>;

export interface scenario_bubble_bundles {
  bubble: number;
  // Activity bundle tags, global then authoritative then private: the
  // client's registration order.
  bundles: number[];
}

// The bundles each bubble a scenario can choose (one with a state) loads,
// from its first state's slice descriptor.
export function read_scenario_bubble_bundles(
  set: c_package_set,
  scenario: number
): scenario_bubble_bundles[] {
  const client = read_definition(set.read_tag(scenario), s_scenario_client);
  const found: scenario_bubble_bundles[] = [];
  client.bubbles.forEach(({ states }, bubble) => {
    if (states.length === 0) {
      return;
    }
    const descriptor = read_definition(
      set.read_tag(states[0].descriptor),
      s_slice_descriptor
    );
    const blueprints = read_definition(
      set.read_tag(descriptor.blueprint_set),
      s_client_blueprint_set
    );
    found.push({
      bubble,
      bundles: [
        ...blueprints.global_bundles,
        ...blueprints.authoritative_bundles,
        ...blueprints.private_bundles,
      ].map(({ tag }) => tag),
    });
  });
  return found;
}
