import { c } from "@craftycodie/cstruct";
import { tag_block } from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";

// Abilities (investment globals slot 57). Row order is the ability
// index; names are fnv1 hashes of the ability_* names.
export const k_ability_table_class = 0x808017ac;
export const k_ability_class = 0x80801771;

export const s_ability = c.struct({
  name_hash: c.u32(),
});

export type s_ability = c.infer<typeof s_ability>;

export const s_ability_table = c.struct({
  size: c.u64(),
  abilities: tag_block(s_ability, k_ability_class),
});

export type s_ability_table = c.infer<typeof s_ability_table>;
