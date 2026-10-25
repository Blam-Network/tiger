import { c } from "@craftycodie/cstruct";
import { tag_block } from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";

// The bungie access protocol's messages (investment globals slot 64,
// 80A7606D).
export const k_server_message_table_class = 0x808018a0;
export const k_server_message_class = 0x80801820;

// 64 bytes: the live build's 36 with its five zero words widened to 8 bytes
// (pointer slots, zero in every row). The hash is fnv1 of the message name.
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
