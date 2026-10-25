import { c } from "@craftycodie/cstruct";
import { tag_block } from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";
import { s_tag_table_entry, s_unlock_expression } from "./investment.ts";

// The orbit director's destinations (globals slot 2): one tag per
// destination, each a list of nodes. The live build's rows, widened. True
// Bungie names unknown.
export const k_destination_table_class = 0x80801868;
export const k_destination_table_entry_class = 0x80801841;
export const k_destination_class = 0x808017ae;
export const k_destination_node_class = 0x80801918;
export const k_destination_node_activity_class = 0x8080177d;
export const k_destination_node_state_class = 0x80801791;

export const s_destination_table_entry = s_tag_table_entry;

export type s_destination_table_entry = s_tag_table_entry;

export const s_destination_table = c.struct({
  size: c.u64(),
  destinations: tag_block(
    s_destination_table_entry,
    k_destination_table_entry_class
  ),
});

export type s_destination_table = c.infer<typeof s_destination_table>;

// An activity a node offers. A node is locked when none of its activities
// passes the activity gates.
export const s_destination_node_activity = c.struct({
  node_hash: c.u32(),
  activity_index: c.i16({ padAfter: 2 }),
  requirement: s_unlock_expression,
});

export type s_destination_node_activity = c.infer<
  typeof s_destination_node_activity
>;

// 0 hidden, 1 and 2 teasers, 3 available, 4 completed.
export const s_destination_node_state = c.struct({
  state: c.u8({ padAfter: 7 }),
  requirement: s_unlock_expression,
});

export type s_destination_node_state = c.infer<typeof s_destination_node_state>;

export const s_destination_node = c.struct({
  hash: c.u32({ padAfter: 4 }),
  activities: tag_block(
    s_destination_node_activity,
    k_destination_node_activity_class
  ),
  // The last row whose requirement is empty or holds wins.
  states: tag_block(s_destination_node_state, k_destination_node_state_class),
});

export type s_destination_node = c.infer<typeof s_destination_node>;

export const s_destination = c.struct({
  size: c.u64(),
  nodes: tag_block(s_destination_node, k_destination_node_class),
});

export type s_destination = c.infer<typeof s_destination>;

// The state a node shows: the last passing row's, or 0.
export function destination_node_state(
  node: s_destination_node,
  holds: (requirement: s_unlock_expression) => boolean
): number {
  let state = 0;
  for (const row of node.states) {
    if (row.requirement.tokens.length === 0 || holds(row.requirement)) {
      state = row.state;
    }
  }
  return state;
}
