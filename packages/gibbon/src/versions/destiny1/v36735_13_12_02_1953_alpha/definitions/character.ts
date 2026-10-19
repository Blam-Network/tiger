import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";
import {
  k_unlock_flag_value_class,
  s_unlock_flag_value,
} from "./unlock_flags.ts";

// Character tables in the investment globals. Fields are named from their
// readers where one was found; true Bungie names unknown throughout. Offsets
// are tag offsets; the client reads them 8 lower.

// Character constants (investment globals slot 5).
export const k_character_constants_class = 0x80801b56;

export const s_character_constants = c.struct({
  size: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  unknown0c: c.u32(),
  unknown10: c.u32(),
  unknown14: c.u32(),
  unknown18: c.u32(),
  unknown1c: c.u32(),
  // Filler of -1s.
  unknown20: c.array(c.u8(), 0x60),
  // Set on a new character, all character-source flags.
  flags: tag_block(s_unlock_flag_value, k_unlock_flag_value_class),
  unknown88: c.u32(),
  unknown8c: c.u32(),
  // 0 1 2 1 0 1 0 2; read by sub_82B5EE10 at +0x93.
  unknown90: c.array(c.u8(), 8),
  // Stat indices by role; [0] is the light stat (power), [11] weapon power.
  stats: c.array(c.u8(), 24),
  unknownb0: c.array(c.u32(), 7),
  // The progression index of the character level (sub_8368CA08). The live
  // build lists a progression per role; alpha keeps this one.
  level_progression: c.u8(),
  unknowncd: c.u8(),
  unknownce: c.u16(),
  // The flag gating the new-character auto-launch, 0xFFFF for none.
  unknownd0: c.u16(),
  unknownd2: c.u8(),
  // Read by sub_82E6E828, meaning unknown.
  unknownd3: c.u8(),
  // Not read through the accessor; 50. Not proven to be a level cap, which
  // has no field: it is the level progression's step count.
  unknownd4: c.u8({ padAfter: 3 }),
  unknownd8: c.u32(),
});

export type s_character_constants = c.infer<typeof s_character_constants>;

// The level progression's index, as the live build's role lookup gives it.
export function character_level_progression(
  constants: s_character_constants
): number {
  return constants.level_progression;
}

// Flag indices, each set to 2 on create.
export const s_new_character_flag = c.struct({
  flag: c.i16(),
});

export type s_new_character_flag = c.infer<typeof s_new_character_flag>;

// Per class and race (3 x 3 keys). The flags are the same across races.
export const s_new_character_default = c.struct({
  // 0..2 in the character class table's order.
  class: c.u8(),
  // Presumably the race.
  race: c.u8(),
  // 0x24..0x26 by class.
  unknown02: c.u16(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  flags: tag_block(s_new_character_flag, 0x80801b57),
  unknown14: c.i32(),
  unknown18: c.i32(),
});

export type s_new_character_default = c.infer<typeof s_new_character_default>;

export const s_new_character_item = c.struct({
  item: c.i16(),
});

export type s_new_character_item = c.infer<typeof s_new_character_item>;

// Per class: the starting gear as item definition indices, five armour
// pieces (gauntlets, chest, class item, helmet, legs) and a primary weapon.
export const s_new_character_kit = c.struct({
  class: c.u8({ padAfter: 3 }),
  items: tag_block(s_new_character_item, 0x808017eb),
});

export type s_new_character_kit = c.infer<typeof s_new_character_kit>;

// New-character defaults (investment globals slot 9).
export const k_new_character_defaults_class = 0x80801b60;

export const s_new_character_defaults = c.struct({
  size: c.u32(),
  defaults: tag_block(s_new_character_default, 0x80801b5a),
  kits: tag_block(s_new_character_kit, 0x80801b5c),
});

export type s_new_character_defaults = c.infer<typeof s_new_character_defaults>;
