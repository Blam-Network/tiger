import { c } from "@craftycodie/cstruct";
import { tag_block, tag_struct } from "../tag/tag_block.ts";
import {
  k_unlock_flag_value_class,
  s_unlock_flag_value,
} from "./activity_definition.ts";

// Character tables in the investment globals. Fields are named from their
// readers where one was found; true Bungie names unknown throughout.

// 8 bytes; true name unknown.
export const s_character_constant_pair = c.struct({
  unknown00: c.i16({ padAfter: 2 }),
  unknown04: c.i32(),
});

export type s_character_constant_pair = c.infer<
  typeof s_character_constant_pair
>;

// Two of these follow the header; what the flags set is unknown.
export const s_character_constant_flags = c.struct({
  unknown00: c.i16({ padAfter: 2 }),
  unknown04: tag_block(s_character_constant_pair, 0x80801819),
  flags: tag_block(s_unlock_flag_value, k_unlock_flag_value_class),
  unknown14: c.u32(),
  unknown18: c.u32(),
});

export type s_character_constant_flags = c.infer<
  typeof s_character_constant_flags
>;

// Character constants (globals root +0x34, 80A58038).
export const k_character_constants_class = 0x80801950;

export const s_character_constants = c.struct({
  size: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  unknown0c: c.u32(),
  unknown10: c.u32(),
  unknown14: c.u32(),
  unknown18: c.u32(),
  unknown1c: c.u32(),
  unknown20: s_character_constant_flags,
  unknown3c: s_character_constant_flags,
  unknown58: c.array(c.u8(), 8),
  // Stat indices by role; [0] is the light stat (sub_831C9E90).
  stats: c.array(c.u8(), 32),
  // Progression indices by role; [1] is the character level (sub_831B2C60
  // reads levels[constants + 122]).
  progressions: c.array(c.i16(), 6),
  // Past it, the level is the light-derived level if higher (sub_831B2C60).
  level_cap: c.i32(),
});

export type s_character_constants = c.infer<typeof s_character_constants>;

// The level progression's index in s_character_constants.progressions.
export const k_character_level_progression_role = 1;

export const s_new_character_value = c.struct({
  value: c.i16(),
});

export type s_new_character_value = c.infer<typeof s_new_character_value>;

// Per race and class (3 x 3 keys). Every row sets the same flags, applied
// on create.
export const s_new_character_default = c.struct({
  // 0..2 each.
  race: c.u8(),
  class: c.u8({ padAfter: 2 }),
  // One value per race.
  unknown04: c.u16({ padAfter: 2 }),
  unknown08: c.u32(),
  unknown0c: c.u32(),
  flags: tag_block(s_unlock_flag_value, k_unlock_flag_value_class),
  unknown18: c.u32(),
  unknown1c: c.u32(),
  // A run of consecutive values.
  unknown20: tag_block(s_new_character_value, 0x808017d1),
  unknown28: c.i32(),
  unknown2c: c.i32(),
});

export type s_new_character_default = c.infer<typeof s_new_character_default>;

// Per class. Both lists are in item definition index range, the starting
// gear; true names unknown.
export const s_new_character_list = c.struct({
  class: c.u8({ padAfter: 3 }),
  unknown04: tag_block(s_new_character_value, 0x8080432f),
  unknown0c: tag_block(s_new_character_value, 0x8080432f),
});

export type s_new_character_list = c.infer<typeof s_new_character_list>;

// New-character defaults (globals root +0x54, 80A5803C).
export const k_new_character_defaults_class = 0x8080190d;

export const s_new_character_defaults = c.struct({
  size: c.u32(),
  defaults: tag_block(s_new_character_default, 0x8080170f),
  unknown0c: tag_block(s_new_character_list, 0x808018c9),
});

export type s_new_character_defaults = c.infer<typeof s_new_character_defaults>;

export const s_stat_curve_point = c.struct({
  x: c.i32(),
  y: c.i32(),
});

export type s_stat_curve_point = c.infer<typeof s_stat_curve_point>;

export const s_stat_curve_unknown08 = c.struct({
  unknown00: c.i32(),
  unknown04: c.f32(),
});

export type s_stat_curve_unknown08 = c.infer<typeof s_stat_curve_unknown08>;

export const s_stat_curve_unknown10 = c.struct({
  unknown00: c.u16(),
  unknown02: c.u16(),
});

export type s_stat_curve_unknown10 = c.infer<typeof s_stat_curve_unknown10>;

// Piecewise linear. Curve 0 pairs level with light: (1,0) (20,1) (20,8)
// (21,20) (30,120) (40,240) (50,400) (sub_831CA8A8); the activity
// definition's +0x4C is it evaluated at the required level.
export const s_stat_curve = c.struct({
  points: tag_block(s_stat_curve_point, 0x808046ea),
  unknown08: tag_block(s_stat_curve_unknown08, 0x80804731),
  unknown10: tag_block(s_stat_curve_unknown10, 0x80804698),
});

export type s_stat_curve = c.infer<typeof s_stat_curve>;

export const s_stat_curve_entry = c.struct({
  name_hash: c.u32(),
  unknown04: c.u8({ padAfter: 3 }),
  curve: tag_struct(s_stat_curve, 0x8080173d),
});

export type s_stat_curve_entry = c.infer<typeof s_stat_curve_entry>;

// Stat curves (globals root +0x194, 80A5805C).
export const k_stat_curve_table_class = 0x808017ec;

export const s_stat_curve_table = c.struct({
  size: c.u32(),
  curves: tag_block(s_stat_curve_entry, 0x80801870),
});

export type s_stat_curve_table = c.infer<typeof s_stat_curve_table>;

// Linear between the points, clamped at the ends.
export function evaluate_stat_curve(
  points: s_stat_curve_point[],
  x: number
): number {
  if (points.length === 0) {
    return 0;
  }
  if (x <= points[0].x) {
    return points[0].y;
  }
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (x <= b.x) {
      return b.x === a.x ? b.y : a.y + ((x - a.x) * (b.y - a.y)) / (b.x - a.x);
    }
  }
  return points.at(-1)?.y ?? 0;
}

// Grimoire cards and achievements (globals root +0x0C, 80A58033,
// sub_82814640): owning the flag awards the record.
export const k_record_table_class = 0x808016f1;

export const s_record = c.struct({
  name_hash: c.u32(),
  flag: c.i16({ padAfter: 2 }),
  score: c.u32(),
  progress: c.i16({ padAfter: 2 }),
  unknown10: c.u32(),
});

export type s_record = c.infer<typeof s_record>;

export const s_record_table = c.struct({
  size: c.u32(),
  records: tag_block(s_record, 0x808018f5),
});

export type s_record_table = c.infer<typeof s_record_table>;
