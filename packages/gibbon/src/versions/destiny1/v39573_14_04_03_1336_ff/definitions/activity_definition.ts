import { c } from "@craftycodie/cstruct";
import { tag_variant } from "../../v40662_14_05_19_1414_pubalpha/tag/tag_variant.ts";
import {
  read_definition,
  tag_block,
  tag_struct,
} from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";
import { tag_relative_string } from "../../v52553_16_09_28_1551_evil/tag/tag_string.ts";
import {
  k_unlock_expression_class,
  s_unlock_expression,
} from "./investment.ts";

// Activity ids index the investment globals' activity table: entry i names
// the definition tag for id i. Laid out as the pre-alpha's throughout, with
// the Alpha Trial's classes.
export const k_activity_table_class = 0x80801915;
export const k_activity_table_entry_class = 0x808018a7;
export const k_activity_definition_tag_class = 0x80801872;
export const k_activity_definition_class = 0x8080181e;

export const s_activity_table_entry = c.struct({
  activity_hash: c.u32({ padAfter: 4 }),
  // Zero in the tags.
  unknown08: c.u64(),
  definition: c.u32({ padAfter: 4 }),
});

export type s_activity_table_entry = c.infer<typeof s_activity_table_entry>;

export const s_activity_table = c.struct({
  size: c.u64(),
  activities: tag_block(s_activity_table_entry, k_activity_table_entry_class),
});

export type s_activity_table = c.infer<typeof s_activity_table>;

export const s_playlist_entry = c.struct({
  activity_index: c.u16({ padAfter: 2 }),
  weight: c.f32(),
  // An activity options tag (8080182E), -1 for none.
  options: c.u32(),
});

export type s_playlist_entry = c.infer<typeof s_playlist_entry>;

export const s_playlist = c.struct({
  unknown00: c.u32({ padAfter: 4 }),
  entries: tag_block(s_playlist_entry, 0x8080175e),
  unknown18: c.u32({ padAfter: 4 }),
});

export type s_playlist = c.infer<typeof s_playlist>;

// The hopper last, as in the Alpha Trial.
export const s_activity_matchmaking = c.struct({
  min_players: c.u32(),
  max_fireteam: c.u32(),
  max_players: c.u32(),
  unknown0c: c.u8({ padAfter: 3 }),
  // A hopper tag, -1 for none.
  hopper: c.u32(),
});

export type s_activity_matchmaking = c.infer<typeof s_activity_matchmaking>;

// The alpha's row, not the Alpha Trial's sorted u16s.
export const s_activity_enemy = c.struct({
  // Into the investment globals' enemy table.
  enemy_index: c.u8({ padAfter: 1 }),
  unknown02: c.u16(),
  unknown04: c.u16(),
});

export type s_activity_enemy = c.infer<typeof s_activity_enemy>;

export const s_activity_enemies = c.struct({
  unknown00: c.u32({ padAfter: 4 }),
  enemies: tag_block(s_activity_enemy, 0x808017e9),
});

export type s_activity_enemies = c.infer<typeof s_activity_enemies>;

export const s_enemy_index = c.struct({
  index: c.u8(),
});

export type s_enemy_index = c.infer<typeof s_enemy_index>;

export const s_activity_enemy_indices = c.struct({
  enemies: tag_block(s_enemy_index, 0x8080478c),
  unknown10: c.u32({ padAfter: 4 }),
});

export type s_activity_enemy_indices = c.infer<typeof s_activity_enemy_indices>;

// On three activities.
export const s_activity_unknown50 = c.struct({
  unknown00: c.u32(),
  unknown04: c.u8({ padAfter: 3 }),
});

export type s_activity_unknown50 = c.infer<typeof s_activity_unknown50>;

// Each list holds when every expression in it does; an empty list holds.
export const s_activity_unlocks = c.struct({
  launchable: tag_block(s_unlock_expression, k_unlock_expression_class),
  joinable: tag_block(s_unlock_expression, k_unlock_expression_class),
  visible: tag_block(s_unlock_expression, k_unlock_expression_class),
});

export type s_activity_unlocks = c.infer<typeof s_activity_unlocks>;

// The first gate whose requirement holds picks the reward.
export const s_activity_reward_gate = c.struct({
  reward: c.u16({ padAfter: 6 }),
  requirement: s_unlock_expression,
});

export type s_activity_reward_gate = c.infer<typeof s_activity_reward_gate>;

export const s_activity_rewards = c.struct({
  gates: tag_block(s_activity_reward_gate, 0x808016e1),
});

export type s_activity_rewards = c.infer<typeof s_activity_rewards>;

export const s_activity_checkpoint = c.struct({
  hash: c.u32(),
  unlock_flag: c.i16(),
  // Another flag, -1 for none.
  unknown06: c.i16(),
});

export type s_activity_checkpoint = c.infer<typeof s_activity_checkpoint>;

export const s_activity_checkpoints = c.struct({
  checkpoints: tag_block(s_activity_checkpoint, 0x808017f8),
});

export type s_activity_checkpoints = c.infer<typeof s_activity_checkpoints>;

// Storage type 2 ("activity"): flags forced to a value while in the
// activity.
export const s_unlock_flag_value = c.struct({
  flag: c.i16(),
  value: c.u8({ padAfter: 1 }),
});

export type s_unlock_flag_value = c.infer<typeof s_unlock_flag_value>;

export const k_unlock_flag_value_class = 0x8080185c;

// 0x78 bytes: the Alpha Trial's definition without its option sets.
export const s_activity_definition = c.struct({
  activity_hash: c.u32(),
  // 255 for none.
  activity_type: c.u8(),
  // Into the investment globals' destination rows (slot 16), not the client
  // destination table.
  destination_index: c.u8(),
  // 0xFF in every definition.
  unknown06: c.u8({ padAfter: 1 }),
  // The level the activity requires.
  activity_level: c.i32(),
  // The light stat curve at activity_level, as the Alpha Trial's.
  unknown0c: c.f32(),
  // Launched after this one, -1 for none.
  next_activity: c.i16(),
  // A character flag set when the activity is completed, -1 for none.
  completion_flag: c.i16(),
  // An activity options tag (8080182E), -1 for none.
  options: c.u32(),
  // The activity's bundle name.
  name: tag_relative_string(),
  fallback_name: tag_relative_string(),
  // Empty in every definition, so its element class is unchecked; where the
  // Alpha Trial has its active flags.
  active_flags: tag_block(s_unlock_flag_value),
  playlist: tag_struct(s_playlist, 0x808018c0),
  matchmaking: tag_struct(s_activity_matchmaking, 0x80801700),
  enemies: tag_struct(s_activity_enemies, 0x8080193f),
  unknown50: tag_struct(s_activity_unknown50, 0x8080191f),
  enemy_indices: tag_struct(s_activity_enemy_indices, 0x80801844),
  unlocks: tag_struct(s_activity_unlocks, 0x8080177b),
  rewards: tag_struct(s_activity_rewards, 0x80801712),
  checkpoints: tag_struct(s_activity_checkpoints, 0x808017ee),
});

export type s_activity_definition = c.infer<typeof s_activity_definition>;

// Activity options (8080182E): named, typed values. The tag holds a block
// of self-relative pointers, each to {name hash, value} with its type's
// class just before it.
export const k_activity_options_class = 0x8080182e;
export const k_activity_option_pointer_class = 0x80800408;
export const k_activity_option_bool = 0x808007cb;
export const k_activity_option_int = 0x80800347;
export const k_activity_option_float = 0x808008cc;
export const k_activity_option_string_hash = 0x8080034c;
// 16 bytes.
export const k_activity_option_integer_array = 0x808007ee;
// Four string hashes.
export const k_activity_option_string_hash_array = 0x80800443;
// A word read like a bool; true type unknown.
export const k_activity_option_unknown = 0x80800d7b;

export interface activity_option {
  name_hash: number;
  type: number;
  value: boolean | number | number[];
}

const option = <T extends c.StructFields[string]>(value: T) =>
  c.struct({ name_hash: c.u32(), value });

export const s_activity_options = c.struct({
  size: c.u64(),
  options: tag_block(
    c.struct({
      option: tag_variant(
        {
          [k_activity_option_bool]: option(c.bool()),
          [k_activity_option_int]: option(c.i32()),
          [k_activity_option_float]: option(c.f32()),
          [k_activity_option_string_hash]: option(c.u32()),
          [k_activity_option_integer_array]: option(c.array(c.u8(), 16)),
          [k_activity_option_string_hash_array]: option(c.array(c.u32(), 4)),
        },
        option(c.u32())
      ),
    }),
    k_activity_option_pointer_class
  ),
});

export type s_activity_options = c.infer<typeof s_activity_options>;

export function read_activity_options(buffer: Buffer): activity_option[] {
  const definition = read_definition(buffer, s_activity_options);
  const options: activity_option[] = [];
  for (const { option } of definition.options) {
    if (option) {
      const { name_hash, value } = option.value;
      options.push({ name_hash, type: option.class, value });
    }
  }
  return options;
}

export const s_activity_definition_tag = c.struct({
  size: c.u64(),
  definition: tag_struct(s_activity_definition, k_activity_definition_class),
});

export type s_activity_definition_tag = c.infer<
  typeof s_activity_definition_tag
>;
