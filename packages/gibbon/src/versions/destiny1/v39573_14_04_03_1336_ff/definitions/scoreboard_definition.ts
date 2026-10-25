import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../../v38464_14_02_28_1027_betath/pkg/package_set.ts";
import {
  read_definition,
  tag_block,
} from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";
import {
  k_string_hash_class,
  s_string_hash,
} from "../../v52553_16_09_28_1551_evil/tag/tag_string.ts";

// A scoreboard definition, class 8080099C: the activity mode record. Each
// is a whole, self contained tag, so entries_of_class finds every one. The
// live build's, widened, with a word more at the end.
export const k_scoreboard_definition_class = 0x8080099c;

// A column shown in the scoreboard: its name and how the client presents
// it. 8 bytes: the live build's without its trailing string hash.
export const k_scoreboard_column_class = 0x808004e7;

export const s_scoreboard_column = c.struct({
  name_hash: c.u32(),
  unknown04: c.u8(),
  // 0, 1, 2, 3 or 255; 3 is a HUD int, 255 the score column.
  type: c.u8(),
  unknown06: c.u8(),
  unknown07: c.u8(),
});

export type s_scoreboard_column = c.infer<typeof s_scoreboard_column>;

// A scoreboard notification: a name, an icon, and one text variant per
// audience. 24 bytes, as on the live build.
export const k_scoreboard_notification_class = 0x808006aa;

export const s_scoreboard_notification = c.struct({
  name_hash: c.u32(),
  icon: c.u32(),
  text_everyone: c.u32(),
  text_me: c.u32(),
  text_my_team: c.u32(),
  text_enemy: c.u32(),
});

export type s_scoreboard_notification = c.infer<
  typeof s_scoreboard_notification
>;

// Stack bytecode shared by derived stats and rules, one byte per element:
// 3C n push var n, 34 n push const n, 01 add, 02 sub, 3E end. 09 and 04
// appear together computing a ratio (kills / max(deaths, 1)), so they read
// as max and divide.
export const k_scoreboard_op_class = 0x80800009;

const s_scoreboard_op = c.struct({ op: c.u8() });

// A bytecode constant, read as one f32 per element. The control point path
// points (activity_lookup.ts) carry the same class as 16-byte elements.
export const k_scoreboard_const_class = 0x80800090;

const s_scoreboard_const = c.struct({ value: c.f32() });

// A stat name the bytecode reads as a var, one string hash per element.
export const k_scoreboard_stat_ref_class = k_string_hash_class;

// A derived stat: a column computed from others rather than accumulated by
// incidents, e.g. accuracy = precision_kills / kills (operands[0] /
// operands[1] via var0 / var1). 72 bytes.
export const k_scoreboard_derived_stat_class = 0x808003e7;

export const s_scoreboard_derived_stat = c.struct({
  // This derived stat's own column name_hash.
  stat_name: c.u32(),
  // Scope mask (1 player, 2 team, 4 global), as a rule's flags, but in the
  // first byte of this word rather than the second.
  flags: c.u8({ padAfter: 3 }),
  bytecode: tag_block(s_scoreboard_op, k_scoreboard_op_class),
  consts: tag_block(s_scoreboard_const, k_scoreboard_const_class),
  unknown28: c.u8({ padAfter: 0xf }),
  operands: tag_block(s_string_hash, k_scoreboard_stat_ref_class),
});

export type s_scoreboard_derived_stat = c.infer<
  typeof s_scoreboard_derived_stat
>;

// An incident -> stat rule: when `incident_name` fires for `audience`,
// apply `bytecode` to `stat_name`. 80 bytes.
export const k_scoreboard_rule_class = 0x808003da;

export const s_scoreboard_rule = c.struct({
  // e.g. "kill" (0x790C2A95) or a capture incident's own name.
  incident_name: c.u32(),
  // Which of the incident's players or teams the rule applies to, e.g.
  // "killing_player", "dead_player", "participant_player".
  audience: c.u32(),
  // The column this rule writes: a player, team or global column's own
  // name_hash.
  stat_name: c.u32(),
  unknown0c: c.u8(),
  // Scope mask: 1 player, 2 team, 4 global, ORed.
  flags: c.u8(),
  unknown0e: c.u16(),
  bytecode: tag_block(s_scoreboard_op, k_scoreboard_op_class),
  consts: tag_block(s_scoreboard_const, k_scoreboard_const_class),
  // The first word is 1 when the bytecode pushes a var, else 0.
  unknown30: c.u8({ padAfter: 0xf }),
  // The rule's own current stat value as a named ref (the same name as
  // `stat_name`), what bytecode op 3C 00 pushes.
  vars: tag_block(s_string_hash, k_scoreboard_stat_ref_class),
});

export type s_scoreboard_rule = c.infer<typeof s_scoreboard_rule>;

export const s_scoreboard_definition = c.struct({
  // Repeats the tag's own byte size.
  unknown00: c.u64(),
  // The same tag in every one.
  unknown08: c.u32(),
  // The mode's own name hash.
  unknown0c: c.u32(),
  // A string hash.
  unknown10: c.u32(),
  // The notification icon's hash where there is one.
  unknown14: c.u32(),
  unknown18: c.u32({ padAfter: 4 }),
  global: tag_block(s_scoreboard_column, k_scoreboard_column_class),
  player: tag_block(s_scoreboard_column, k_scoreboard_column_class),
  team: tag_block(s_scoreboard_column, k_scoreboard_column_class),
  notifications: tag_block(
    s_scoreboard_notification,
    k_scoreboard_notification_class
  ),
  derived_stats: tag_block(
    s_scoreboard_derived_stat,
    k_scoreboard_derived_stat_class
  ),
  rules: tag_block(s_scoreboard_rule, k_scoreboard_rule_class),
  unknown80: c.u64(),
});

export type s_scoreboard_definition = c.infer<typeof s_scoreboard_definition>;

// Every scoreboard definition in the set, keyed by its own tag hash.
export function find_scoreboard_definitions(
  set: c_package_set
): Map<number, s_scoreboard_definition> {
  const found = new Map<number, s_scoreboard_definition>();
  for (const { hash } of set.entries_of_class(k_scoreboard_definition_class)) {
    const buffer = set.try_read_tag(hash);
    if (buffer) {
      found.set(hash, read_definition(buffer, s_scoreboard_definition));
    }
  }
  return found;
}
