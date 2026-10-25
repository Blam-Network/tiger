import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition, tag_block, tag_struct } from "../tag/tag_block.ts";
import { tag_relative_string } from "../tag/tag_string.ts";
import {
  k_object_placement_class,
  s_object_placement,
} from "./activity_lookup.ts";
import { k_manifest_class, s_manifest } from "./manifest.ts";

// Where a slice's spawn points live. The scenario_client's world_hash (and
// every slice descriptor's) names a destination's static world, a manifest
// root; the descriptor's bubble_index picks one of its bubbles:
//
//   world (80800506) -> bubble (80800557) -> placement set lists (80800323)
//   -> placement sets (808006E1) -> placements of the spawn point blueprint,
//   each with a spawn point set reference (808003AF) -> spawn point set
//   (808006DF) -> spawn points (808004D6)
//
// As patch 01.29's down to the placement sets, which here chain their
// placements rather than holding a block of them.
export const k_world_class = 0x80800506;
export const k_world_bubble_reference_class = 0x80804106;
export const k_world_layout_class = 0x80800611;
export const k_world_bubble_class = 0x80800557;
export const k_world_bubble_list_reference_class = 0x80800749;
export const k_placement_set_list_class = 0x80800323;
export const k_placement_set_reference_class = 0x80804105;
export const k_spawn_point_set_reference_class = 0x808003af;
export const k_spawn_point_set_class = 0x808006df;
export const k_spawn_point_class = 0x808004d6;

const s_tag_reference = c.struct({
  tag: c.u32(),
});

// The world's bubble regions and bounds, and the links between them.
export const s_world_layout = c.struct({
  size: c.u64(),
  // The world's name, e.g. "cosmo".
  name: tag_relative_string(),
  // The scenario_client's world_hash.
  world_hash: c.u32(),
});

export type s_world_layout = c.infer<typeof s_world_layout>;

export const s_world = c.struct({
  size: c.u64(),
  // A world layout (80800611).
  layout: c.u32(),
  // A package group root (80800321).
  unknown0c: c.u32(),
  // Manifest roots (80800557), by slice descriptor bubble_index.
  bubbles: tag_block(s_tag_reference, k_world_bubble_reference_class),
});

export type s_world = c.infer<typeof s_world>;

export const s_world_bubble = c.struct({
  size: c.u64(),
  // Placement set lists (80800323).
  lists: tag_block(s_tag_reference, k_world_bubble_list_reference_class),
});

export type s_world_bubble = c.infer<typeof s_world_bubble>;

export const s_placement_set_list = c.struct({
  size: c.u64(),
  unknown08: c.u32(),
  unknown0c: c.u32(),
  unknown10: c.u32(),
  unknown14: c.u32(),
  // Object placement sets (808006E1).
  placement_sets: tag_block(s_tag_reference, k_placement_set_reference_class),
});

export type s_placement_set_list = c.infer<typeof s_placement_set_list>;

// What a spawn point placement's extension points at.
export const s_spawn_point_set_reference = c.struct({
  unknown00: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  spawn_point_set: c.u32(),
});

export type s_spawn_point_set_reference = c.infer<
  typeof s_spawn_point_set_reference
>;

// The client picks among them by name hash: the transition name the server
// sends, else `default` (2EA8FB98). Unchanged from the 360.
export const s_spawn_point = c.struct({
  // A unit quaternion, x y z w.
  rotation: c.array(c.f32(), 4),
  // x y z, w.
  position: c.array(c.f32(), 4),
  // fnv1 of the name.
  name_hash: c.u32({ padAfter: 12 }),
});

export type s_spawn_point = c.infer<typeof s_spawn_point>;

export const s_spawn_point_set = c.struct({
  size: c.u64(),
  points: tag_block(s_spawn_point, k_spawn_point_class),
});

export type s_spawn_point_set = c.infer<typeof s_spawn_point_set>;

// The placement set's head: its first placement, which chains to the
// rest through `next`. An empty set is the head alone.
export const k_object_placement_set_class = 0x808006e1;

export const s_object_placement_set = c.struct({
  size: c.u64(),
  // Relative to itself, zero for none.
  first: c.i64(),
});

export type s_object_placement_set = c.infer<typeof s_object_placement_set>;

const k_object_placement_set_first_offset = 0x08;
const k_object_placement_next_offset = 0x90;
const k_object_placement_extension_offset = 0x88;

// The placements of an object placement set (808006E1), in order, with
// each one's offset in the tag.
export function read_object_placements(
  placement_set: Buffer
): { offset: number; placement: s_object_placement }[] {
  const found: { offset: number; placement: s_object_placement }[] = [];
  let member = k_object_placement_set_first_offset;
  let relative =
    placement_set.length > member
      ? Number(placement_set.readBigInt64LE(member))
      : 0;
  while (relative !== 0) {
    const offset = member + relative;
    if (placement_set.readUInt32LE(offset - 4) !== k_object_placement_class) {
      throw new Error(`no placement at 0x${offset.toString(16)}`);
    }
    found.push({
      offset,
      placement: read_definition(placement_set, s_object_placement, offset),
    });
    member = offset + k_object_placement_next_offset;
    relative = Number(placement_set.readBigInt64LE(member));
  }
  return found;
}

const spawn_point_set_reference = tag_struct(
  s_spawn_point_set_reference,
  k_spawn_point_set_reference_class
);

// The spawn point sets an object placement set places, in order.
export function read_spawn_point_set_tags(placement_set: Buffer): number[] {
  const tags: number[] = [];
  for (const { offset, placement } of read_object_placements(placement_set)) {
    const member = offset + k_object_placement_extension_offset;
    if (
      placement.extension === 0n ||
      placement_set.readUInt32LE(member + Number(placement.extension) - 4) !==
        k_spawn_point_set_reference_class
    ) {
      continue;
    }
    const reference = spawn_point_set_reference.read(
      placement_set,
      member,
      "little"
    );
    if (reference) {
      tags.push(reference.spawn_point_set);
    }
  }
  return tags;
}

// Every world root in the set, keyed by its world hash. Worlds are only
// reachable as manifest roots, so this reads every manifest.
export function find_worlds(set: c_package_set): Map<number, number> {
  const found = new Map<number, number>();
  for (const { hash } of set.entries_of_class(k_manifest_class)) {
    const buffer = set.try_read_tag(hash);
    if (!buffer) {
      continue;
    }
    const manifest = read_definition(buffer, s_manifest);
    if (manifest.contained_class !== k_world_class) {
      continue;
    }
    const world = set.try_read_tag(manifest.root);
    const layout = world
      ? set.try_read_tag(read_definition(world, s_world).layout)
      : undefined;
    if (layout) {
      found.set(
        read_definition(layout, s_world_layout).world_hash,
        manifest.root
      );
    }
  }
  return found;
}

// The spawn point set tags one world bubble loads, shared ones included,
// each once.
export function find_world_bubble_spawn_point_sets(
  set: c_package_set,
  bubble: number
): number[] {
  const placement_sets = new Set<number>();
  const { lists } = read_definition(set.read_tag(bubble), s_world_bubble);
  for (const { tag: list } of lists) {
    const read = read_definition(set.read_tag(list), s_placement_set_list);
    for (const { tag } of read.placement_sets) {
      placement_sets.add(tag);
    }
  }
  const tags = new Set<number>();
  for (const tag of placement_sets) {
    for (const spawn_points of read_spawn_point_set_tags(set.read_tag(tag))) {
      tags.add(spawn_points);
    }
  }
  return [...tags];
}
