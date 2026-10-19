import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";

// The bungie access protocol's messages (investment globals slot 62). Rows
// are not sorted by network id.
export const k_server_message_table_class = 0x808018c8;
export const k_server_message_class = 0x808018c3;

// 36 bytes. The hash is fnv1 of the message name.
export const s_server_message = c.struct({
  name_hash: c.u32(),
  unknown04: c.u32(),
  network_id: c.u16(),
  unknown0a: c.u16(),
  request_schema: c.u32(),
  response_schema: c.u32(),
  unknown14: c.u32(),
  unknown18: c.u32(),
  unknown1c: c.u32(),
  unknown20: c.u32(),
});

export type s_server_message = c.infer<typeof s_server_message>;

export const s_server_message_table = c.struct({
  size: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  messages: tag_block(s_server_message, k_server_message_class),
});

export type s_server_message_table = c.infer<typeof s_server_message_table>;
