import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../../v38464_14_02_28_1027_betath/pkg/package_set.ts";
import {
  read_definition,
  tag_block,
  tag_block_header,
  tag_struct,
} from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";
import { tag_relative_string } from "../../v52553_16_09_28_1551_evil/tag/tag_string.ts";
import { k_manifest_class, s_manifest } from "./manifest.ts";

// Where a slice's spawn points live, as on the live 360. The
// scenario_client's world_hash (and every slice descriptor's) names a
// destination's static world, a manifest root; the descriptor's
// bubble_index picks one of its bubbles:
//
//   world (8080052E) -> bubble (80800580) -> placement set lists (80800343)
//   -> placement sets (808009A2) -> placements of the spawn point blueprint,
//   each with a spawn point set (80800701) -> spawn points (80800500)
//
// A bubble loads its own set plus ones every bubble shares.
export const k_world_class = 0x8080052e;
export const k_world_bubble_reference_class = 0x8080410a;
export const k_world_layout_class = 0x80800636;
export const k_world_bubble_class = 0x80800580;
export const k_world_bubble_list_reference_class = 0x80800767;
export const k_placement_set_list_class = 0x80800343;
export const k_placement_set_reference_class = 0x80804109;
export const k_object_placement_class = 0x80800406;
export const k_spawn_point_set_reference_class = 0x808003de;
export const k_spawn_point_set_class = 0x80800701;
export const k_spawn_point_class = 0x80800500;

const s_tag_reference = c.struct({
  tag: c.u32(),
});

// The world's bubble regions and bounds, and the links between them.
export const s_world_layout = c.struct({
  size: c.u64(),
  // The world's name, e.g. "marathon_warlock".
  name: tag_relative_string(),
  // The scenario_client's world_hash.
  world_hash: c.u32(),
});

export type s_world_layout = c.infer<typeof s_world_layout>;

export const s_world = c.struct({
  size: c.u64(),
  // A world layout (80800636).
  layout: c.u32(),
  // A package group root (80800341).
  unknown0c: c.u32(),
  // Manifest roots (80800580), by slice descriptor bubble_index.
  bubbles: tag_block(s_tag_reference, k_world_bubble_reference_class),
});

export type s_world = c.infer<typeof s_world>;

export const s_world_bubble = c.struct({
  size: c.u64(),
  // Placement set lists (80800343).
  lists: tag_block(s_tag_reference, k_world_bubble_list_reference_class),
});

export type s_world_bubble = c.infer<typeof s_world_bubble>;

export const s_placement_set_list = c.struct({
  size: c.u64(),
  unknown08: c.u32(),
  unknown0c: c.u32(),
  unknown10: c.u32(),
  unknown14: c.u32(),
  // Object placement sets (808009A2).
  placement_sets: tag_block(s_tag_reference, k_placement_set_reference_class),
});

export type s_placement_set_list = c.infer<typeof s_placement_set_list>;

// What a spawn point placement's +0x88 points at.
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
// sends, else `default` (2EA8FB98). Several often share a name. Unchanged
// from the 360.
export const s_spawn_point = c.struct({
  // A unit quaternion, x y z w.
  rotation: c.array(c.f32(), 4),
  // x y z, w.
  position: c.array(c.f32(), 4),
  // fnv1 of the name, e.g. `array_to_dome_c`.
  name_hash: c.u32({ padAfter: 12 }),
});

export type s_spawn_point = c.infer<typeof s_spawn_point>;

export const s_spawn_point_set = c.struct({
  size: c.u64(),
  points: tag_block(s_spawn_point, k_spawn_point_class),
});

export type s_spawn_point_set = c.infer<typeof s_spawn_point_set>;

// The placement element's size and its +0x88 member, an i64 pointer: the
// 360's 0x80-byte element with its blueprint pointer widened to 0x18.
const k_object_placement_size = 0x90;
const k_object_placement_extension_offset = 0x88;
const k_object_placement_set_placements_offset = 0x08;

const spawn_point_set_reference = tag_struct(
  s_spawn_point_set_reference,
  k_spawn_point_set_reference_class
);

// The spawn point sets an object placement set (808009A2) places, in order.
export function read_spawn_point_set_tags(placement_set: Buffer): number[] {
  const header = tag_block_header(
    placement_set,
    k_object_placement_set_placements_offset
  );
  if (
    header === undefined ||
    placement_set.readUInt32LE(header + 8) !== k_object_placement_class
  ) {
    return [];
  }
  const tags: number[] = [];
  const count = Number(placement_set.readBigUInt64LE(header));
  for (let i = 0; i < count; i++) {
    const member =
      header +
      16 +
      i * k_object_placement_size +
      k_object_placement_extension_offset;
    const relative = Number(placement_set.readBigInt64LE(member));
    if (relative === 0) {
      continue;
    }
    if (
      placement_set.readUInt32LE(member + relative - 4) !==
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
