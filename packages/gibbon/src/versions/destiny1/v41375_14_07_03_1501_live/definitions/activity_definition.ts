import { c } from "@craftycodie/cstruct";
import {
  read_definition,
  tag_block,
  tag_struct,
  tag_variant,
} from "../tag/tag_block.ts";
import {
  k_string_hash_class,
  s_string_hash,
  tag_relative_string,
} from "../tag/tag_string.ts";
import {
  k_unlock_expression_class,
  s_unlock_expression,
} from "./investment.ts";

// Activity ids index the investment globals' activity table (80A58036,
// globals root +0x24): entry i names the definition tag for id i.
export const k_activity_table_class = 0x80801915;
export const k_activity_table_entry_class = 0x808018a7;
export const k_activity_table_tag = 0x80a58036;
export const k_activity_definition_tag_class = 0x80801872;
export const k_activity_definition_class = 0x8080181e;

export const s_activity_table_entry = c.struct({
  activity_hash: c.u32(),
  unknown04: c.u32(),
  definition: c.u32(),
});

export type s_activity_table_entry = c.infer<typeof s_activity_table_entry>;

export const s_activity_table = c.struct({
  size: c.u32(),
  activities: tag_block(s_activity_table_entry, k_activity_table_entry_class),
});

export type s_activity_table = c.infer<typeof s_activity_table>;

export const s_playlist_entry = c.struct({
  // An activity options tag (8080182E), -1 for none.
  options: c.u32(),
  weight: c.f32(),
  activity_index: c.u16({ padAfter: 2 }),
});

export type s_playlist_entry = c.infer<typeof s_playlist_entry>;

export const s_playlist = c.struct({
  unknown00: c.u32(),
  entries: tag_block(s_playlist_entry, 0x8080175e),
  unknown0c: c.u32(),
});

export type s_playlist = c.infer<typeof s_playlist>;

export const s_activity_matchmaking = c.struct({
  // An 808016FF tag, -1 for none.
  hopper: c.u32(),
  min_players: c.u32(),
  max_fireteam: c.u32(),
  max_players: c.u32(),
  unknown10: c.u8({ padAfter: 3 }),
});

export type s_activity_matchmaking = c.infer<typeof s_activity_matchmaking>;

export const s_activity_enemy = c.struct({
  // Sorted, with repeats, in the range of the investment globals' enemy
  // table (80A58044); true name unknown.
  value: c.u16(),
});

export type s_activity_enemy = c.infer<typeof s_activity_enemy>;

export const s_activity_enemies = c.struct({
  enemies: tag_block(s_activity_enemy, 0x808017e9),
});

export type s_activity_enemies = c.infer<typeof s_activity_enemies>;

export const s_enemy_index = c.struct({
  index: c.u8(),
});

export type s_enemy_index = c.infer<typeof s_enemy_index>;

export const s_activity_enemy_indices = c.struct({
  enemies: tag_block(s_enemy_index, 0x8080478c),
  unknown08: c.u32(),
});

export type s_activity_enemy_indices = c.infer<typeof s_activity_enemy_indices>;

// Set only on the prologue activities; true name unknown.
export const s_activity_unknown18 = c.struct({
  unknown00: c.u8(),
});

export type s_activity_unknown18 = c.infer<typeof s_activity_unknown18>;

// Each list holds when every expression in it does; an empty list holds.
// launchable gates the launching leader, joinable every fireteam member
// and visible whether the activity shows (when empty, the other two stand
// in).
export const s_activity_unlocks = c.struct({
  launchable: tag_block(s_unlock_expression, k_unlock_expression_class),
  joinable: tag_block(s_unlock_expression, k_unlock_expression_class),
  visible: tag_block(s_unlock_expression, k_unlock_expression_class),
});

export type s_activity_unlocks = c.infer<typeof s_activity_unlocks>;

// The first gate whose requirement holds picks the reward.
export const s_activity_reward_gate = c.struct({
  requirement: s_unlock_expression,
  reward: c.u16({ padAfter: 2 }),
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

// An options tag picked by an expression; true name unknown.
export const s_activity_option_set = c.struct({
  requirement: s_unlock_expression,
  options: c.u32(),
});

export type s_activity_option_set = c.infer<typeof s_activity_option_set>;

export const s_activity_definition = c.struct({
  activity_hash: c.u32(),
  // Unlock groups (investment globals root +0x14, unlock_flags.ts) whose
  // lists also gate this activity.
  unlock_groups: tag_block(s_string_hash, k_string_hash_class),
  playlist: tag_struct(s_playlist, 0x808018c0),
  matchmaking: tag_struct(s_activity_matchmaking, 0x80801700),
  enemies: tag_struct(s_activity_enemies, 0x8080193f),
  unknown18: tag_struct(s_activity_unknown18, 0x8080191f),
  enemy_indices: tag_struct(s_activity_enemy_indices, 0x80801844),
  unlocks: tag_struct(s_activity_unlocks, 0x8080177b),
  rewards: tag_struct(s_activity_rewards, 0x80801712),
  checkpoints: tag_struct(s_activity_checkpoints, 0x808017ee),
  // The activity's bundle name; resolves to a named 808008BA tag.
  name: tag_relative_string(),
  fallback_name: tag_relative_string(),
  active_flags: tag_block(s_unlock_flag_value, k_unlock_flag_value_class),
  option_sets: tag_block(s_activity_option_set, 0x808019a4),
  // An activity options tag (8080182E), -1 for none.
  options: c.u32(),
  // The level the activity requires (sub_831AC150).
  activity_level: c.i32(),
  // The light stat curve at activity_level (30 -> 120, 28 -> 97.8).
  unknown4c: c.f32(),
  // Launched after this one, -1 for none (the prologue chain 125 -> 126 ->
  // 127 -> 0).
  next_activity: c.i16(),
  // A character flag set when the activity is completed, -1 for none.
  completion_flag: c.i16(),
  // 255 for none.
  activity_type: c.u8(),
  // 1 cosmodrome, 10 mars, 11 moon, 12 crucible, 14 tower, 15 venus.
  destination_index: c.u8({ padAfter: 2 }),
});

export type s_activity_definition = c.infer<typeof s_activity_definition>;

// Activity options (8080182E): named, typed values. The tag holds a block
// of self-relative pointers, each to {name hash, value} with its type's
// class just before it.
export const k_activity_options_class = 0x8080182e;
export const k_activity_option_bool = 0x808007cb;
export const k_activity_option_int = 0x80800347;
export const k_activity_option_float = 0x808008cc;
export const k_activity_option_string_hash = 0x8080034c;
// 16 bytes.
export const k_activity_option_integer_array = 0x808007ee;
// Four string hashes.
export const k_activity_option_string_hash_array = 0x80800443;
// A word read like a bool (one name is also an int elsewhere); true type
// unknown.
export const k_activity_option_unknown = 0x80800d7b;

export interface activity_option {
  name_hash: number;
  type: number;
  value: boolean | number | number[];
}

const option = <T extends c.StructFields[string]>(value: T) =>
  c.struct({ name_hash: c.u32(), value });

export const s_activity_options = c.struct({
  size: c.u32(),
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
    })
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
  size: c.u32(),
  definition: tag_struct(s_activity_definition, k_activity_definition_class),
});

export type s_activity_definition_tag = c.infer<
  typeof s_activity_definition_tag
>;
