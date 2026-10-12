import { c } from "@craftycodie/cstruct";
import {
  read_definition,
  tag_block,
  tag_struct,
  tag_variant,
} from "../tag/tag_block.ts";
import { tag_relative_string } from "../tag/tag_string.ts";
import {
  k_unlock_expression_class,
  s_unlock_expression,
} from "./investment.ts";

// Activity ids index the investment globals' activity table (sub_83634E30):
// entry i names the definition tag for id i.
export const k_activity_table_class = 0x8080196e;
export const k_activity_table_entry_class = 0x80801968;
export const k_activity_definition_tag_class = 0x808018be;
export const k_activity_definition_class = 0x808018bc;

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
  activity_index: c.u16({ padAfter: 2 }),
  weight: c.f32(),
  unknown08: c.u32(),
});

export type s_playlist_entry = c.infer<typeof s_playlist_entry>;

export const s_playlist = c.struct({
  unknown00: c.u32(),
  entries: tag_block(s_playlist_entry, 0x808018a9),
  unknown0c: c.u32(),
  unknown10: c.u32(),
});

export type s_playlist = c.infer<typeof s_playlist>;

export const s_activity_matchmaking = c.struct({
  min_players: c.u32(),
  max_fireteam: c.u32(),
  max_players: c.u32(),
  unknown0c: c.u32(),
  hopper: c.u32(),
});

export type s_activity_matchmaking = c.infer<typeof s_activity_matchmaking>;

// Enemy indices run into the investment globals' enemy table
// (investment_rewards.ts).
export const s_activity_enemy = c.struct({
  enemy_index: c.u8({ padAfter: 1 }),
  unknown02: c.u16(),
  unknown04: c.u16(),
});

export type s_activity_enemy = c.infer<typeof s_activity_enemy>;

export const s_activity_enemies = c.struct({
  unknown00: c.u16({ padAfter: 2 }),
  enemies: tag_block(s_activity_enemy, 0x80801871),
});

export type s_activity_enemies = c.infer<typeof s_activity_enemies>;

export const s_enemy_index = c.struct({
  index: c.u8(),
});

export type s_enemy_index = c.infer<typeof s_enemy_index>;

export const s_activity_enemy_indices = c.struct({
  enemies: tag_block(s_enemy_index, 0x8080189b),
  unknown08: c.u32(),
});

export type s_activity_enemy_indices = c.infer<typeof s_activity_enemy_indices>;

// Each list holds when every expression in it does (sub_837045A0,
// sub_83704718, sub_83704860).
export const s_activity_unlocks = c.struct({
  // With unknown10, whether the activity can be launched.
  launchable: tag_block(s_unlock_expression, k_unlock_expression_class),
  // Whether it shows; when empty the launch lists are used instead.
  visible: tag_block(s_unlock_expression, k_unlock_expression_class),
  unknown10: tag_block(s_unlock_expression, k_unlock_expression_class),
});

export type s_activity_unlocks = c.infer<typeof s_activity_unlocks>;

// sub_82B5D788. The items themselves are in a parallel client table.
export const s_activity_reward_gate = c.struct({
  // Indexes the reward mapping table.
  unknown00: c.u16({ padAfter: 2 }),
  requirement: s_unlock_expression,
});

export type s_activity_reward_gate = c.infer<typeof s_activity_reward_gate>;

export const s_activity_rewards = c.struct({
  gates: tag_block(s_activity_reward_gate, 0x808018a2),
});

export type s_activity_rewards = c.infer<typeof s_activity_rewards>;

// sub_83743858.
export const s_activity_checkpoint = c.struct({
  hash: c.u32(),
  unlock_flag: c.u16({ padAfter: 2 }),
});

export type s_activity_checkpoint = c.infer<typeof s_activity_checkpoint>;

export const s_activity_checkpoints = c.struct({
  checkpoints: tag_block(s_activity_checkpoint, 0x80801853),
});

export type s_activity_checkpoints = c.infer<typeof s_activity_checkpoints>;

export const s_activity_definition = c.struct({
  activity_hash: c.u32(),
  // Into the activity type table.
  activity_type: c.u8(),
  // 0xFF for none.
  destination_index: c.u8(),
  unknown06: c.u8({ padAfter: 1 }),
  activity_level: c.u32(),
  // An 808018B1 activity options tag, -1 for none.
  options: c.u32(),
  // The grognok activity name; fnv1 of it is the scenario_client's family
  // checksum. sub_82AFA6D8 can pick fallback_name instead.
  name: tag_relative_string(),
  fallback_name: tag_relative_string(),
  playlist: tag_struct(s_playlist, 0x808018ac),
  matchmaking: tag_struct(s_activity_matchmaking, 0x80801870),
  enemies: tag_struct(s_activity_enemies, 0x80801873),
  unknown24: c.i32(),
  enemy_indices: tag_struct(s_activity_enemy_indices, 0x8080189f),
  unlocks: tag_struct(s_activity_unlocks, 0x808018a1),
  rewards: tag_struct(s_activity_rewards, 0x808018a4),
  checkpoints: tag_struct(s_activity_checkpoints, 0x80801855),
});

export type s_activity_definition = c.infer<typeof s_activity_definition>;

// Activity options (808018B1): named, typed values loaded into the activity
// options game state (sub_83631A90), which scripts read and set.
export const k_activity_options_class = 0x808018b1;
export const k_activity_option_bool = 0x80800a57;
export const k_activity_option_int = 0x80800a58;
export const k_activity_option_string_hash = 0x80800a5a;
// 16 bytes (sub_835CC238).
export const k_activity_option_integer_array = 0x80800a5d;

export interface activity_option {
  name_hash: number;
  type: number;
  value: boolean | number | number[];
}

const option = <T extends c.StructFields[string]>(value: T) =>
  c.struct({ name_hash: c.u32(), value });

// The tag holds a block of pointers, each to {name hash, value} with its
// type's class just before it.
export const s_activity_options = c.struct({
  size: c.u32(),
  options: tag_block(
    c.struct({
      option: tag_variant(
        {
          [k_activity_option_bool]: option(c.bool()),
          [k_activity_option_int]: option(c.i32()),
          [k_activity_option_string_hash]: option(c.u32()),
          [k_activity_option_integer_array]: option(c.array(c.u8(), 16)),
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
