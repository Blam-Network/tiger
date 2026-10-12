import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

// A squad template, class 808012D9. Bundle rows don't reference theirs:
// match by name hash, then by space hash where a template name is reused.
export const k_squad_definition_class = 0x808012d9;
export const k_squad_member_class = 0x808014d6;
export const k_squad_member_variant_class = 0x80801348;
export const k_squad_spawn_point_class = 0x8080132b;
export const k_squad_spawn_volume_class = 0x80801465;

// 12 bytes. True names unknown.
export const s_squad_member_variant = c.struct({
  // Relative to itself, landing on an 80800406 struct (layout unknown)
  // that nests 80802A4E blocks.
  definition: c.i32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
});

export type s_squad_member_variant = c.infer<typeof s_squad_member_variant>;

// 28 bytes. The three variant lists always hold the same count; what picks
// between them is unknown.
export const s_squad_member = c.struct({
  archetype: c.u32(),
  variants: c.array(
    tag_block(s_squad_member_variant, k_squad_member_variant_class),
    3
  ),
});

export type s_squad_member = c.infer<typeof s_squad_member>;

// The position is what a kill incident reports for a squad that never
// moves (a warp gate's victim position is exactly this point).
export const s_squad_spawn_point = c.struct({
  x: c.f32(),
  y: c.f32(),
  z: c.f32(),
  unknown0c: c.u32(),
  orientation: c.array(c.f32(), 4),
  unknown20: c.u32(),
  cell: c.i32(),
  unknown28: c.u8({ padAfter: 7 }),
});

export type s_squad_spawn_point = c.infer<typeof s_squad_spawn_point>;

// Field names unknown past what they plainly hold.
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
  size: c.u32(),
  name_hash: c.u32(),
  // fnv1 of the phase, bubble or zone the template belongs to.
  space_hash: c.u32(),
  unknown0c: c.u32(),
  unknown10: c.u32(),
  unknown14: c.u32(),
  // Seats the squad in a vehicle (alpha sub_8375DEF0).
  vehicle: c.u32(),
  members: tag_block(s_squad_member, k_squad_member_class),
  spawn_points: tag_block(s_squad_spawn_point, k_squad_spawn_point_class),
  spawn_volumes: tag_block(s_squad_spawn_volume, k_squad_spawn_volume_class),
});

export type s_squad_definition = c.infer<typeof s_squad_definition>;
