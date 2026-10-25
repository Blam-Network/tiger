import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

// The bungie access protocol's messages (investment globals slot 64,
// 808F60B4). The Alpha Trial's table and rows.
export const k_server_message_table_class = 0x808017dd;
export const k_server_message_class = 0x808017fc;

// 64 bytes; the hash is fnv1 of the message name.
export const s_server_message = c.struct({
  name_hash: c.u32({ padAfter: 4 }),
  unknown08: c.u64(),
  network_id: c.u16(),
  unknown12: c.u16(),
  request_schema: c.u32(),
  response_schema: c.u32({ padAfter: 4 }),
  unknown20: c.u64(),
  unknown28: c.u64(),
  unknown30: c.u64(),
  unknown38: c.u64(),
});

export type s_server_message = c.infer<typeof s_server_message>;

export const s_server_message_table = c.struct({
  size: c.u64(),
  unknown08: c.u64(),
  unknown10: c.u64(),
  messages: tag_block(s_server_message, k_server_message_class),
});

export type s_server_message_table = c.infer<typeof s_server_message_table>;
