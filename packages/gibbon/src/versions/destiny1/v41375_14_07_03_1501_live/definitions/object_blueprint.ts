import { c } from "@craftycodie/cstruct";
import {
  find_tag_blocks,
  read_tag_block_at,
  tag_block,
} from "../tag/tag_block.ts";
import {
  checked_host_offsets,
  k_object_placement_class,
  k_object_sensor_definition_type,
  s_object_placement,
} from "./activity_lookup.ts";

// An object's archetype ("blueprint") tag and its component list. True
// field names unknown.
export const k_blueprint_class = 0x80800734;
export const k_blueprint_component_class = 0x80800370;

// 0x1C bytes. resource_tag is always a bare host (80800861) and
// resource_offset lands on an interface record (s_owner_reference) whose
// owner is, in most, the host's definition, e.g. a Capturable definition
// (find_capturable_definitions).
export const s_blueprint_component = c.struct({
  unknown00: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  // The component's instance type.
  resource_class: c.u32(),
  resource_tag: c.u32(),
  resource_offset: c.u32(),
  // The record's interface, an 8080058A tag.
  definition_class: c.u32(),
});

export type s_blueprint_component = c.infer<typeof s_blueprint_component>;

// Every component in a blueprint tag's component array: one per blueprint,
// found by its class like any tag block, since nothing
// points at the header.
export function read_blueprint_components(
  buffer: Buffer
): s_blueprint_component[] {
  for (const header of find_tag_blocks(buffer, k_blueprint_component_class)) {
    return read_tag_block_at(
      buffer,
      header,
      s_blueprint_component,
      k_blueprint_component_class
    );
  }
  return [];
}

// The placements block's offset in an Object definition, and the bytes up
// to its end.
const k_object_placements_offset = 0x44;
const k_object_placements_end = 0x4c;

// The blueprint tags an Object row places, one per placement. Empty for a
// host that isn't an Object row's.
export function read_object_blueprint_tags(host: Buffer): number[] {
  const offsets = checked_host_offsets(
    host,
    k_object_placements_end,
    k_object_sensor_definition_type
  );
  if (!offsets) {
    return [];
  }
  return tag_block(s_object_placement, k_object_placement_class)
    .read(host, offsets.definition + k_object_placements_offset, "big")
    .map((placement) => placement.blueprint.tag);
}

// Objects a bundle lookup group places without a row (its 808009A2 tag).
// True class name unknown.
export const k_object_placement_set_class = 0x808009a2;

export const s_object_placement_set = c.struct({
  size: c.u32(),
  placements: tag_block(s_object_placement, k_object_placement_class),
});

export type s_object_placement_set = c.infer<typeof s_object_placement_set>;
