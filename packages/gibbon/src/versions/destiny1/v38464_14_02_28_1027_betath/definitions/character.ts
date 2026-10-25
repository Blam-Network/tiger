import { c } from "@craftycodie/cstruct";
import { tag_block, tag_struct } from "../tag/tag_block.ts";
import {
  k_unlock_flag_value_class,
  s_unlock_flag_value,
} from "./activity_definition.ts";
import { s_investment_item_stat } from "./investment.ts";

// Character tables in the investment globals. True Bungie names unknown
// throughout.

// Two of these follow the header; what the flags set is unknown. 0x48
// bytes: where the Alpha Trial has a block of pairs, a counted array of
// four keyed values.
export const s_character_constant_flags = c.struct({
  unknown00: c.u32(),
  // How many of unknown08 are used.
  unknown04: c.u32(),
  unknown08: c.array(s_investment_item_stat, 4),
  flags: tag_block(s_unlock_flag_value, k_unlock_flag_value_class),
  unknown38: c.u32({ padAfter: 4 }),
  unknown40: c.u32({ padAfter: 4 }),
});

export type s_character_constant_flags = c.infer<
  typeof s_character_constant_flags
>;

// Character constants (globals slot 5, 808F607E).
export const k_character_constants_class = 0x8080191a;

export const s_character_constants = c.struct({
  size: c.u64(),
  unknown08: c.u64(),
  unknown10: c.u64(),
  unknown18: c.u64(),
  unknown20: s_character_constant_flags,
  unknown68: s_character_constant_flags,
  unknownb0: c.array(c.u8(), 8),
  // Stat indices by role; [0] is the light stat. Two fewer than the Alpha
  // Trial's, which has a role this build lacks after [3].
  stats: c.array(c.u8(), 30),
  // Progression indices by role, 0xFF for none; [1] is the character
  // level. Bytes, not the Alpha Trial's i16s: [0..2] match its roles, then
  // its [4] and [5] (its [3] is missing) and a 0.
  progressions: c.array(c.u8(), 6),
  // 1440 each.
  unknowndc: c.array(c.u32(), 7),
  unknownf8: c.i16(),
  // A flag.
  unknownfa: c.i16(),
  unknownfc: c.i16(),
  unknownfe: c.i16(),
  unknown100: c.u32(),
  unknown104: c.u32(),
});

export type s_character_constants = c.infer<typeof s_character_constants>;

// The level progression's index in s_character_constants.progressions.
export const k_character_level_progression_role = 1;

export const s_new_character_value = c.struct({
  value: c.i16(),
});

export type s_new_character_value = c.infer<typeof s_new_character_value>;

// Per class and race (3 x 3 keys). 0x68 bytes: the Alpha Trial's with a
// counted array of four keyed values where it has two words.
export const s_new_character_default = c.struct({
  // 0 titan, 1 hunter, 2 warlock.
  class: c.u8(),
  // 0 human, 1 awoken, 2 exo.
  race: c.u8({ padAfter: 2 }),
  unknown04: c.u32(),
  // One value per class.
  unknown08: c.u16({ padAfter: 2 }),
  // How many of unknown10 are used.
  unknown0c: c.u32(),
  unknown10: c.array(s_investment_item_stat, 4),
  flags: tag_block(s_unlock_flag_value, k_unlock_flag_value_class),
  unknown40: c.u64(),
  unknown48: c.u64(),
  // A run of consecutive values.
  unknown50: tag_block(s_new_character_value, 0x808017b1),
  unknown60: c.i32(),
  unknown64: c.i32(),
});

export type s_new_character_default = c.infer<typeof s_new_character_default>;

// Per class. Both lists are in item definition index range, the starting
// gear; true names unknown.
export const s_new_character_list = c.struct({
  class: c.u8({ padAfter: 7 }),
  unknown08: tag_block(s_new_character_value, 0x8080432e),
  unknown18: tag_block(s_new_character_value, 0x8080432e),
});

export type s_new_character_list = c.infer<typeof s_new_character_list>;

// New-character defaults (globals slot 9, 808F6082).
export const k_new_character_defaults_class = 0x808018e1;

export const s_new_character_defaults = c.struct({
  size: c.u64(),
  defaults: tag_block(s_new_character_default, 0x80801841),
  unknown18: tag_block(s_new_character_list, 0x8080189f),
});

export type s_new_character_defaults = c.infer<typeof s_new_character_defaults>;

export const s_stat_curve_point = c.struct({
  x: c.i32(),
  y: c.i32(),
});

export type s_stat_curve_point = c.infer<typeof s_stat_curve_point>;

// The item quality curve, e.g. (-100,-10) (250,25).
export const s_stat_curve_quality_point = c.struct({
  x: c.i32(),
  y: c.f32(),
});

export type s_stat_curve_quality_point = c.infer<
  typeof s_stat_curve_quality_point
>;

// Per equip slot weights; unused rows are {0, 0xFF, 0}.
export const s_stat_curve_slot_weight = c.struct({
  unknown00: c.u8(),
  equip_slot: c.u8(),
  weight: c.u16(),
});

export type s_stat_curve_slot_weight = c.infer<typeof s_stat_curve_slot_weight>;

export const k_stat_curve_capacity = 20;

// Piecewise linear, the Alpha Trial's layout. Curve 0 pairs level with
// light: (0,50) (20,1050) (200,10050).
export const s_stat_curve = c.struct({
  point_count: c.u32(),
  points: c.array(s_stat_curve_point, k_stat_curve_capacity),
  quality_point_count: c.u32(),
  quality_points: c.array(s_stat_curve_quality_point, k_stat_curve_capacity),
  slot_weight_count: c.u32(),
  slot_weights: c.array(s_stat_curve_slot_weight, k_stat_curve_capacity),
});

export type s_stat_curve = c.infer<typeof s_stat_curve>;

export const s_stat_curve_entry = c.struct({
  name_hash: c.u32(),
  unknown04: c.u8({ padAfter: 3 }),
  curve: tag_struct(s_stat_curve, 0x80801720),
});

export type s_stat_curve_entry = c.infer<typeof s_stat_curve_entry>;

// Stat curves (globals slot 49, 808F60A5).
export const k_stat_curve_table_class = 0x808017cc;

export const s_stat_curve_table = c.struct({
  size: c.u64(),
  curves: tag_block(s_stat_curve_entry, 0x80801771),
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

// Grimoire cards and achievements (globals slot 0, 808F6079): owning the
// flag awards the record.
export const k_record_table_class = 0x8080182e;

export const s_record = c.struct({
  name_hash: c.u32(),
  flag: c.i16({ padAfter: 2 }),
  score: c.u32(),
  progress: c.i16({ padAfter: 2 }),
  unknown10: c.u32(),
});

export type s_record = c.infer<typeof s_record>;

export const s_record_table = c.struct({
  size: c.u64(),
  records: tag_block(s_record, 0x808018c6),
});

export type s_record_table = c.infer<typeof s_record_table>;
