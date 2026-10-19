import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

// The investment globals' unlock flag tables. Same row shapes as the live
// build's; alpha has no unlock value table and its unlock group table is a
// 12-byte stub. True Bungie names unknown throughout.

// A flag and the value to set it to, 2 being "set".
export const k_unlock_flag_value_class = 0x80801768;

export const s_unlock_flag_value = c.struct({
  flag: c.i16(),
  value: c.u8({ padAfter: 1 }),
});

export type s_unlock_flag_value = c.infer<typeof s_unlock_flag_value>;

// Server slot -> flag, per storage type (investment globals slot 60). The
// server sends one value per row, in row order.
export const k_unlock_slot_table_class = 0x80801767;
export const k_unlock_slot_class = 0x8080175a;

export const s_unlock_slot = c.struct({
  // FNV-1 of the flag's name.
  name_hash: c.u32(),
  flag: c.i16({ padAfter: 2 }),
});

export type s_unlock_slot = c.infer<typeof s_unlock_slot>;

export const s_unlock_slot_table = c.struct({
  size: c.u32(),
  account: tag_block(s_unlock_slot, k_unlock_slot_class),
  offer: tag_block(s_unlock_slot, k_unlock_slot_class),
  character: tag_block(s_unlock_slot, k_unlock_slot_class),
});

export type s_unlock_slot_table = c.infer<typeof s_unlock_slot_table>;

// Every named flag, by flag index (investment globals slot 58).
export const k_unlock_flag_name_table_class = 0x80801754;
export const k_unlock_flag_name_class = 0x8080174e;

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

// A row applies once the clock reaches its time (investment globals slot
// 59). Rows are not in time order here, unlike the live build's.
export const k_unlock_time_table_class = 0x80801bc2;
export const k_unlock_time_class = 0x80801bbf;

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

// Cooldowns (investment globals slot 12). The live build's third list, a
// gate, is an empty pair of words here.
export const k_cooldown_table_class = 0x80801796;
export const k_cooldown_class = 0x8080178c;

export const s_cooldown = c.struct({
  name_hash: c.u32(),
  unknown04: c.i16({ padAfter: 2 }),
});

export type s_cooldown = c.infer<typeof s_cooldown>;

export const s_cooldown_table = c.struct({
  size: c.u32(),
  unknown04: tag_block(s_cooldown, k_cooldown_class),
  cooldowns: tag_block(s_cooldown, k_cooldown_class),
  unknown14: c.u32(),
  unknown18: c.u32(),
});

export type s_cooldown_table = c.infer<typeof s_cooldown_table>;
