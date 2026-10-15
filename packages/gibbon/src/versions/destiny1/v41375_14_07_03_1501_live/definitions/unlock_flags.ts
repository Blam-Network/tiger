import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";
import { k_string_hash_class, s_string_hash } from "../tag/tag_string.ts";
import {
  k_unlock_expression_class,
  s_unlock_expression,
} from "./investment.ts";

// The investment globals' unlock flag tables. The flag space is 4096 bytes;
// a flag is set when its byte is 2 (sub_831A9850), and flags below 1988
// have names. Each storage type fills it from its own source. True Bungie
// names unknown throughout.

// Server slot -> flag, per storage type (globals root +0x1FC, 80A58069).
// The server sends one value per row, in row order.
export const k_unlock_slot_table_class = 0x8080189f;
export const k_unlock_slot_class = 0x8080183e;

export const s_unlock_slot = c.struct({
  // FNV-1 of the flag's name.
  name_hash: c.u32(),
  flag: c.i16({ padAfter: 2 }),
});

export type s_unlock_slot = c.infer<typeof s_unlock_slot>;

export const s_unlock_slot_table = c.struct({
  size: c.u32(),
  // Storage type 4.
  account: tag_block(s_unlock_slot, k_unlock_slot_class),
  // Storage type 3 (bans, ownership, platform, announcements).
  offer: tag_block(s_unlock_slot, k_unlock_slot_class),
  // Storage type 5.
  character: tag_block(s_unlock_slot, k_unlock_slot_class),
});

export type s_unlock_slot_table = c.infer<typeof s_unlock_slot_table>;

// Every named flag, by flag index (globals root +0x1EC, 80A58067). World
// objects look their flag up by name hash (sub_83254748).
export const k_unlock_flag_name_table_class = 0x8080179c;
export const k_unlock_flag_name_class = 0x808018b8;

export const e_unlock_flag_source = {
  none: 0,
  account: 1,
  offer: 2,
  character: 3,
} as const;

export const s_unlock_flag_name = c.struct({
  name_hash: c.u32(),
  // e_unlock_flag_source.
  source: c.u8({ padAfter: 1 }),
  // The row in that source's slot table.
  slot: c.u16(),
});

export type s_unlock_flag_name = c.infer<typeof s_unlock_flag_name>;

export const s_unlock_flag_name_table = c.struct({
  size: c.u32(),
  flags: tag_block(s_unlock_flag_name, k_unlock_flag_name_class),
});

export type s_unlock_flag_name_table = c.infer<typeof s_unlock_flag_name_table>;

// Storage type 10 (global, sub_831A9B70): a row applies once the clock
// (universe server object +8, unix seconds) reaches its time. Rows are in
// time order, so a later row for the same flag wins (globals root +0x1F4,
// 80A58068).
export const k_unlock_time_table_class = 0x808017de;
export const k_unlock_time_class = 0x808018e4;

export const s_unlock_time = c.struct({
  flag: c.i16(),
  value: c.u8({ padAfter: 1 }),
  unknown04: c.u32(),
  // Unix seconds.
  time: c.i64(),
});

export type s_unlock_time = c.infer<typeof s_unlock_time>;

export const s_unlock_time_table = c.struct({
  size: c.u32(),
  times: tag_block(s_unlock_time, k_unlock_time_class),
});

export type s_unlock_time_table = c.infer<typeof s_unlock_time_table>;

// Unlock values (globals root +0x1DC, 80A58065, vfunc +0x20C): flags set by
// owning an item whose definition lists the row, and by cooldowns (storage
// types 7 and 8, sub_831A9CA0). -1 for rows with no flag.
export const k_unlock_value_table_class = 0x808017fe;
export const k_unlock_value_class = 0x8080178d;

export const s_unlock_value = c.struct({
  name_hash: c.u32(),
  flag: c.i16({ padAfter: 2 }),
});

export type s_unlock_value = c.infer<typeof s_unlock_value>;

export const s_unlock_value_table = c.struct({
  size: c.u32(),
  values: tag_block(s_unlock_value, k_unlock_value_class),
});

export type s_unlock_value_table = c.infer<typeof s_unlock_value_table>;

// Unlock groups and the new-character prologue pick (globals root +0x14,
// 80A58034).
export const k_unlock_group_table_class = 0x80801864;
export const k_unlock_group_class = 0x80801778;
export const k_prologue_activity_class = 0x808019a9;

// Activities list the groups they belong to (activity definition +0x04);
// every group's lists gate them as well as their own. launchable and
// joinable are equal in every group.
export const s_unlock_group = c.struct({
  launchable: tag_block(s_unlock_expression, k_unlock_expression_class),
  joinable: tag_block(s_unlock_expression, k_unlock_expression_class),
  hash: c.u32(),
});

export type s_unlock_group = c.infer<typeof s_unlock_group>;

// World state 23 (character:prologue) launches the first activity whose
// requirement holds, or goes to orbit (sub_831BB4C0).
export const s_prologue_activity = c.struct({
  activity_index: c.u16({ padAfter: 2 }),
  requirement: s_unlock_expression,
});

export type s_prologue_activity = c.infer<typeof s_prologue_activity>;

export const s_unlock_group_table = c.struct({
  size: c.u32(),
  unknown04: c.i16({ padAfter: 2 }),
  unknown08: c.u8({ padAfter: 3 }),
  // Hashes.
  unknown0c: tag_block(s_string_hash, k_string_hash_class),
  prologue_activities: tag_block(
    s_prologue_activity,
    k_prologue_activity_class
  ),
  groups: tag_block(s_unlock_group, k_unlock_group_class),
});

export type s_unlock_group_table = c.infer<typeof s_unlock_group_table>;

// Cooldowns (globals root +0x6C, 80A5803F). A character's cooldown expiry
// slots (80804707, 32 x u64) are indexed by the second list's rows; each
// sets its unlock value flag while it hasn't expired.
export const k_cooldown_table_class = 0x8080176f;
export const k_cooldown_class = 0x808016be;

export const s_cooldown = c.struct({
  name_hash: c.u32(),
  unknown04: c.i16({ padAfter: 2 }),
});

export type s_cooldown = c.infer<typeof s_cooldown>;

// Same shape as an activity reward gate; true name unknown.
export const s_cooldown_gate = c.struct({
  requirement: s_unlock_expression,
  unknown08: c.u16({ padAfter: 2 }),
});

export type s_cooldown_gate = c.infer<typeof s_cooldown_gate>;

export const s_cooldown_table = c.struct({
  size: c.u32(),
  unknown04: tag_block(s_cooldown, k_cooldown_class),
  cooldowns: tag_block(s_cooldown, k_cooldown_class),
  unknown14: tag_block(s_cooldown_gate, 0x808019a7),
});

export type s_cooldown_table = c.infer<typeof s_cooldown_table>;

// A flag byte of 2 is "set".
export const k_unlock_flag_set = 2;
export const k_unlock_flag_count = 0x1000;

// sub_831A9850: RPN over the flag bytes. 1 pushes "flag[operand] is set",
// then 2 not, 3 or, 4 and, 5 nor, 6 xor, 7 nand, 8 xnor, 9 xor. An empty
// expression, a malformed one or one that leaves more than one value is
// false; the stack is 32 deep.
export function evaluate_unlock_expression(
  expression: s_unlock_expression,
  flags: Uint8Array
): boolean {
  const stack: boolean[] = [];
  for (const { op, operand } of expression.tokens) {
    if (op === 1) {
      if (stack.length >= 32) {
        return false;
      }
      const flag = (operand << 16) >> 16;
      stack.push(
        flag >= 0 &&
          flag < k_unlock_flag_count &&
          flags[flag] === k_unlock_flag_set
      );
      continue;
    }
    if (op === 2) {
      if (stack.length < 1) {
        return false;
      }
      stack.push(!stack.pop());
      continue;
    }
    if (stack.length < 2 || op < 3 || op > 9) {
      return false;
    }
    const b = stack.pop() as boolean;
    const a = stack.pop() as boolean;
    const results: Record<number, boolean> = {
      3: a || b,
      4: a && b,
      5: !(a || b),
      6: a !== b,
      7: !(a && b),
      8: a === b,
      9: a !== b,
    };
    stack.push(results[op]);
  }
  return stack.length === 1 && stack[0];
}

// A list holds when every expression in it does; an empty list holds
// (sub_831A9A50).
export function evaluate_unlock_expressions(
  expressions: s_unlock_expression[],
  flags: Uint8Array
): boolean {
  return expressions.every((expression) =>
    evaluate_unlock_expression(expression, flags)
  );
}
