import { c } from "@craftycodie/cstruct";
import { tag_block, tag_struct } from "../tag/tag_block.ts";

// Stat curves (investment globals slot 47): one row per stat, in stat index
// order. Only the power (0) and weapon power (5) stats have a scaling block;
// the rest are bare names. Unlike the live build's rows there are no
// quality points or slot weights.
export const k_stat_curve_table_class = 0x808018e1;
export const k_stat_curve_class = 0x808018dc;
export const k_stat_curve_scaling_class = 0x808018d7;

export const k_stat_curve_point_capacity = 20;
export const k_stat_curve_weight_capacity = 20;

export const s_stat_curve_point = c.struct({
  x: c.i32(),
  y: c.i32(),
});

export type s_stat_curve_point = c.infer<typeof s_stat_curve_point>;

// Piecewise linear, inline: only the first `count` points are used.
export const s_stat_curve_points = c.struct({
  count: c.u32(),
  points: c.array(s_stat_curve_point, k_stat_curve_point_capacity),
});

export type s_stat_curve_points = c.infer<typeof s_stat_curve_points>;

// A damage type's share of the curve; unused entries are {0, 0xFF, 0}.
export const s_stat_curve_damage_weight = c.struct({
  unknown00: c.u8(),
  damage_type: c.u8(),
  weight: c.i16(),
});

export type s_stat_curve_damage_weight = c.infer<
  typeof s_stat_curve_damage_weight
>;

export const s_stat_curve_damage_weights = c.struct({
  count: c.u32(),
  weights: c.array(s_stat_curve_damage_weight, k_stat_curve_weight_capacity),
});

export type s_stat_curve_damage_weights = c.infer<
  typeof s_stat_curve_damage_weights
>;

// Power is run through pre_curve, then curve (see evaluate_stat_scaling);
// the damage type weights scale the result.
export const s_stat_curve_scaling = c.struct({
  curve: s_stat_curve_points,
  pre_curve: s_stat_curve_points,
  damage_weights: s_stat_curve_damage_weights,
});

export type s_stat_curve_scaling = c.infer<typeof s_stat_curve_scaling>;

export const s_stat_curve_entry = c.struct({
  name_hash: c.u32(),
  scaling: tag_struct(s_stat_curve_scaling, k_stat_curve_scaling_class),
});

export type s_stat_curve_entry = c.infer<typeof s_stat_curve_entry>;

export const s_stat_curve_table = c.struct({
  size: c.u32(),
  curves: tag_block(s_stat_curve_entry, k_stat_curve_class),
});

export type s_stat_curve_table = c.infer<typeof s_stat_curve_table>;

// The points a curve uses.
export function stat_curve_points(
  curve: s_stat_curve_points
): s_stat_curve_point[] {
  return curve.points.slice(0, curve.count);
}

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

// The displayed value of a scaled stat (sub_8368DB28). `bias` is the item
// instance's scaling bias (i16) and `value` the key 0 value of its scaling
// slots; `damage_type` is the item's. The sum runs through pre_curve, then
// curve; the damage type weights then take the item's share of the total
// (the whole of it when there are none, nothing when its type is absent).
export function evaluate_stat_scaling(
  scaling: s_stat_curve_scaling,
  bias: number,
  value: number,
  damage_type: number
): number {
  const biased = evaluate_stat_curve(
    stat_curve_points(scaling.pre_curve),
    bias
  );
  const scaled = evaluate_stat_curve(
    stat_curve_points(scaling.curve),
    biased + value
  );
  const weights = scaling.damage_weights.weights.slice(
    0,
    scaling.damage_weights.count
  );
  if (weights.length === 0) {
    return Math.trunc(scaled);
  }
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  const own = weights.find((entry) => entry.damage_type === damage_type);
  return Math.trunc(own && total ? (scaled * own.weight) / total : 0);
}
