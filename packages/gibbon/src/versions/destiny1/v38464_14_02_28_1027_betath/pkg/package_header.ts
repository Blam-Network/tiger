import { c } from "@craftycodie/cstruct";

export { e_package_language } from "../../v52553_16_09_28_1551_evil/pkg/package_header.ts";

export const k_package_version = 18;

// The PS4's header as of version 18: as version 24's up to the tool string,
// then two words before the tables where version 24 has four (its last is
// the signature offset), and no file size at 0x13C. A 0x100-byte signature
// sits at 0x140; the named tag table, when there is one, at 0x800, where
// version 24 keeps its signature. Every table is 0x800-aligned.
// Languages are numbered as in 01.29; this build has none, en, fr, it, de
// and sp.
export const s_package_header = c.struct({
  version: c.MagicNumber(k_package_version, c.u16()),
  // 7 on the PS4.
  platform: c.u16(),
  pkg_id: c.u16(),
  unknown06: c.u16(),
  unknown08: c.u64(),
  build_time: c.u64(),
  unknown18: c.u32(),
  unknown1c: c.u32(),
  // Every package of the build is generation 0.
  patch: c.u16(),
  language: c.u16(),
  // "betath tool_lib test pc_x64 38464.14.02.28.1027.betath ...".
  tool_string: c.String(128),
  unknowna4: c.u32(),
  unknowna8: c.u32(),
  entry_table_size: c.u32(),
  entry_table_offset: c.u32(),
  entry_table_hash: c.array(c.u8(), 20),
  block_table_size: c.u32(),
  block_table_offset: c.u32(),
  block_table_hash: c.array(c.u8(), 20),
  named_tag_table_size: c.u32(),
  named_tag_table_offset: c.u32(),
  named_tag_table_hash: c.array(c.u8(), 20),
});

export type s_package_header = c.infer<typeof s_package_header>;

export const k_package_header_size = c.sizeof(s_package_header);
