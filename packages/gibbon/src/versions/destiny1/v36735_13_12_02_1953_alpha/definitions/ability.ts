import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

// Abilities (investment globals slot 55). Row order is the ability index and
// matches the client's sandbox ability table; names are fnv1 hashes of the
// ability_* names.
export const k_ability_table_class = 0x80801987;
export const k_ability_class = 0x80801983;

export const s_ability = c.struct({
  name_hash: c.u32(),
});

export type s_ability = c.infer<typeof s_ability>;

export const s_ability_table = c.struct({
  size: c.u32(),
  abilities: tag_block(s_ability, k_ability_class),
});

export type s_ability_table = c.infer<typeof s_ability_table>;
