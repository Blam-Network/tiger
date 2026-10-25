import { c } from "@craftycodie/cstruct";
import { tag_block } from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";
import { s_object_placement } from "./activity_lookup.ts";
import { k_object_placement_class } from "./spawn_point.ts";

// A squad template, widened. A Squad row's sensor host names its own
// (s_squad_sensor_host_definition.squad). The head, spawn points and spawn
// volumes are laid out as patch 01.29's; a member is the pre-alpha's: one
// variant list rather than three, each variant holding its bodies'
// placements inline.
export const k_squad_definition_class = 0x808012d9;
export const k_squad_member_class = 0x808014d6;
export const k_squad_member_variant_class = 0x80801348;
export const k_squad_spawn_point_class = 0x8080132b;
export const k_squad_spawn_volume_class = 0x80801465;

// 0x18 bytes: the body a variant spawns, as a placement of its blueprint
// (one in every variant).
export const s_squad_member_variant = c.struct({
  placements: tag_block(s_object_placement, k_object_placement_class),
  // Relative odds among the member's variants (80/20, 25/75, 1 alone).
  weight: c.u32(),
  unknown14: c.u32(),
});

export type s_squad_member_variant = c.infer<typeof s_squad_member_variant>;

// 0x18 bytes: one cell of the squad.
export const s_squad_member = c.struct({
  // The member's name hash (dreg, vandal_shock, thrall_1).
  archetype: c.u32({ padAfter: 4 }),
  variants: tag_block(s_squad_member_variant, k_squad_member_variant_class),
});

export type s_squad_member = c.infer<typeof s_squad_member>;

// 0x30 bytes, as on the 360.
export const s_squad_spawn_point = c.struct({
  x: c.f32(),
  y: c.f32(),
  z: c.f32(),
  unknown0c: c.u32(),
  orientation: c.array(c.f32(), 4),
  unknown20: c.u32(),
  unknown24: c.u32(),
  unknown28: c.u32({ padAfter: 4 }),
});

export type s_squad_spawn_point = c.infer<typeof s_squad_spawn_point>;

// 0x90 bytes, as on the 360.
export const s_squad_spawn_volume = c.struct({
  position_radius: c.array(c.f32(), 4),
  axis_height: c.array(c.f32(), 4),
  search_extent: c.array(c.f32(), 4, { padBefore: 0x30, padAfter: 0x20 }),
  unknown80: c.u32(),
  unknown84: c.u32(),
  unknown88: c.u8({ padAfter: 7 }),
});

export type s_squad_spawn_volume = c.infer<typeof s_squad_spawn_volume>;

export const s_squad_definition = c.struct({
  size: c.u64(),
  name_hash: c.u32(),
  // fnv1 of the phase, bubble or zone the template belongs to.
  space_hash: c.u32(),
  // An 80800894 tag on every squad.
  unknown10: c.u32(),
  unknown14: c.u32(),
  unknown18: c.u32(),
  // A blueprint (80800714), -1 for none.
  vehicle: c.u32(),
  members: tag_block(s_squad_member, k_squad_member_class),
  spawn_points: tag_block(s_squad_spawn_point, k_squad_spawn_point_class),
  spawn_volumes: tag_block(s_squad_spawn_volume, k_squad_spawn_volume_class),
});

export type s_squad_definition = c.infer<typeof s_squad_definition>;
