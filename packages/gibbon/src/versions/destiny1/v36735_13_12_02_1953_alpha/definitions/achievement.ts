import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

// Achievements (investment globals slot 0): owning the account flag awards
// the achievement. The live build's record table is a different, wider row.
export const k_achievement_table_class = 0x80801b35;
export const k_achievement_class = 0x80801b31;

export const s_achievement = c.struct({
  name_hash: c.u32(),
  // An account unlock flag.
  flag: c.u16(),
  // -1 for none.
  progress_flag: c.i16(),
});

export type s_achievement = c.infer<typeof s_achievement>;

export const s_achievement_table = c.struct({
  size: c.u32(),
  achievements: tag_block(s_achievement, k_achievement_class),
});

export type s_achievement_table = c.infer<typeof s_achievement_table>;
