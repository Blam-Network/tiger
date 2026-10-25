import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";
import type { s_unlock_expression } from "./investment.ts";

// The investment globals' unlock flag tables, the Alpha Trial's rows. The
// flag space is 4096 bytes; a flag is set when its byte is 2. Each storage
// type fills it from its own source. True Bungie names unknown throughout.

// Server slot -> flag, per storage type (globals slot 62, 808F60B2).
// The server sends one value per row, in row order.
export const k_unlock_slot_table_class = 0x808017b8;
export const k_unlock_slot_class = 0x80801817;

export const s_unlock_slot = c.struct({
  // FNV-1 of the flag's name.
  name_hash: c.u32(),
  flag: c.i16({ padAfter: 2 }),
});

export type s_unlock_slot = c.infer<typeof s_unlock_slot>;

export const s_unlock_slot_table = c.struct({
  size: c.u64(),
  // Storage type 4.
  account: tag_block(s_unlock_slot, k_unlock_slot_class),
  // Storage type 3 (bans, ownership, platform, announcements).
  offer: tag_block(s_unlock_slot, k_unlock_slot_class),
  // Storage type 5.
  character: tag_block(s_unlock_slot, k_unlock_slot_class),
});

export type s_unlock_slot_table = c.infer<typeof s_unlock_slot_table>;

// Every named flag, by flag index (globals slot 60, 808F60B0). World
// objects look their flag up by name hash.
export const k_unlock_flag_name_table_class = 0x8080177e;
export const k_unlock_flag_name_class = 0x8080188c;

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
  size: c.u64(),
  flags: tag_block(s_unlock_flag_name, k_unlock_flag_name_class),
});

export type s_unlock_flag_name_table = c.infer<typeof s_unlock_flag_name_table>;

// Storage type 10 (global): a row applies once the clock (unix seconds)
// reaches its time. Rows are in time order, so a later row for the same
// flag wins (globals slot 61, 808F60B1).
export const k_unlock_time_table_class = 0x808017bf;
export const k_unlock_time_class = 0x808018b6;

export const s_unlock_time = c.struct({
  flag: c.i16(),
  value: c.u8({ padAfter: 1 }),
  unknown04: c.u32(),
  // Unix seconds.
  time: c.i64(),
});

export type s_unlock_time = c.infer<typeof s_unlock_time>;

export const s_unlock_time_table = c.struct({
  size: c.u64(),
  times: tag_block(s_unlock_time, k_unlock_time_class),
});

export type s_unlock_time_table = c.infer<typeof s_unlock_time_table>;

// Unlock values (globals slot 58, 808F60AE): flags set by owning an item
// whose definition lists the row, and by cooldowns (storage types 7 and 8).
// -1 for rows with no flag.
export const k_unlock_value_table_class = 0x8080170b;
export const k_unlock_value_class = 0x8080176e;

export const s_unlock_value = c.struct({
  name_hash: c.u32(),
  flag: c.i16({ padAfter: 2 }),
});

export type s_unlock_value = c.infer<typeof s_unlock_value>;

export const s_unlock_value_table = c.struct({
  size: c.u64(),
  values: tag_block(s_unlock_value, k_unlock_value_class),
});

export type s_unlock_value_table = c.infer<typeof s_unlock_value_table>;

// Unlock groups (globals slot 1, 808F607A): a bare 0x18-byte tag. None of
// the Alpha Trial's hash, prologue activity or group lists exist yet.
export const k_unlock_group_table_class = 0x8080183a;

export const s_unlock_group_table = c.struct({
  size: c.u64(),
  // -1.
  unknown08: c.i16({ padAfter: 2 }),
  // 0xFF.
  unknown0c: c.u8({ padAfter: 1 }),
  unknown0e: c.u16(),
  // Hashes, the empty one in the tag.
  unknown10: c.u32(),
  unknown14: c.u32(),
});

export type s_unlock_group_table = c.infer<typeof s_unlock_group_table>;

// Cooldowns (globals slot 12, 808F6085). A character's cooldown expiry
// slots are indexed by the second list's rows; each sets its unlock value
// flag while it hasn't expired. No gate list after them, unlike the Alpha
// Trial's.
export const k_cooldown_table_class = 0x8080185c;
export const k_cooldown_class = 0x8080169f;

export const s_cooldown = c.struct({
  name_hash: c.u32(),
  unknown04: c.i16({ padAfter: 2 }),
});

export type s_cooldown = c.infer<typeof s_cooldown>;

export const s_cooldown_table = c.struct({
  size: c.u64(),
  unknown08: tag_block(s_cooldown, k_cooldown_class),
  cooldowns: tag_block(s_cooldown, k_cooldown_class),
});

export type s_cooldown_table = c.infer<typeof s_cooldown_table>;

// A flag byte of 2 is "set".
export const k_unlock_flag_set = 2;
export const k_unlock_flag_count = 0x1000;

// RPN over the flag bytes. 1 pushes "flag[operand] is set",
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

// A list holds when every expression in it does; an empty list holds.
export function evaluate_unlock_expressions(
  expressions: s_unlock_expression[],
  flags: Uint8Array
): boolean {
  return expressions.every((expression) =>
    evaluate_unlock_expression(expression, flags)
  );
}
