import { c } from "@craftycodie/cstruct";

export const k_package_version = 11;

export const s_package_header = c.struct({
  version: c.MagicNumber(k_package_version, c.u16()),
  // 3 on the 360.
  platform: c.u16(),
  pkg_id: c.u16(),
  patch: c.u16(),
  unknown08: c.u64(),
  build_time: c.u64(),
  unknown18: c.u32(),
  unknown1c: c.u16(),
  language: c.u16(),
  tool_string: c.String(128),
  entry2_table_size: c.u32({ padBefore: 4 }),
  entry2_table_offset: c.u32(),
  named_tag_table_size: c.u32(),
  named_tag_table_offset: c.u32(),
  entry2_table_hash: c.array(c.u8(), 20),
  entry_table_size: c.u32({ padBefore: 0x38 }),
  entry_table_offset: c.u32(),
  entry_table_hash: c.array(c.u8(), 20),
  block_table_size: c.u32(),
  block_table_offset: c.u32(),
  block_table_hash: c.array(c.u8(), 20),
});

export type s_package_header = c.infer<typeof s_package_header>;

export const k_package_header_size = c.sizeof(s_package_header);
