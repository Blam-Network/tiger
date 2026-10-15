import { c } from "@craftycodie/cstruct";

export const k_package_version = 24;

// Language packages carry the same id as each other; the file name says
// which language (en, fr, it, de, sp, jpn, pt).
export const e_package_language = {
  none: 0,
  english: 1,
  french: 2,
  italian: 3,
  german: 4,
  spanish: 5,
  japanese: 6,
  portuguese: 7,
} as const;

// The 360's header, little endian. Every table and the block payload start
// on a 0x800 boundary; the header's signature sits at 0x800.
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
  // Which generation of the package this file is: patch 01.29 ships 0-3 of
  // most packages side by side.
  patch: c.u16(),
  language: c.u16(),
  // The build that wrote this generation, e.g. "... 52553.16.09.28.1551.evil".
  tool_string: c.String(128),
  unknowna4: c.u32(),
  unknowna8: c.u32(),
  unknownac: c.u32(),
  header_signature_offset: c.u32(),
  entry_table_size: c.u32(),
  entry_table_offset: c.u32(),
  entry_table_hash: c.array(c.u8(), 20),
  block_table_size: c.u32(),
  block_table_offset: c.u32(),
  block_table_hash: c.array(c.u8(), 20),
  named_tag_table_size: c.u32(),
  named_tag_table_offset: c.u32(),
  named_tag_table_hash: c.array(c.u8(), 20),
  file_size: c.u32({ padBefore: 0x34 }),
});

export type s_package_header = c.infer<typeof s_package_header>;

export const k_package_header_size = c.sizeof(s_package_header);
