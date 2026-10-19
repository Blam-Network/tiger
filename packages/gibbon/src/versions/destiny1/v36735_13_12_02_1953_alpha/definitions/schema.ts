import { c } from "@craftycodie/cstruct";
import { read_definition } from "../tag/tag_block.ts";
import { tag_relative_string } from "../tag/tag_string.ts";

// bs type schemas. Script classes ship as tags of this class; native types
// use the same record format in the executable (registered by
// sub_828063C8). Record 80800000 itself describes the header.
export const k_schema_class = 0x80800000;

// A type's kind, as its type info and its members report it.
export const k_schema_kind = {
  i32: 0x01,
  i16: 0x02,
  typed_pointer: 0x04,
  self_reference: 0x05,
  // A native struct held by pointer (attacker_list, hop_on_state). True name
  // unknown.
  unknown06: 0x06,
  pointer: 0x07,
  // 8 bytes, default {0, 0xffffffff}.
  tag_reference: 0x08,
  f32: 0x09,
  bool: 0x0b,
  delegate: 0x0c,
  // 24 bytes on an instance class (magazine_interface, heat_interface).
  interface_instance: 0x0e,
  // 28 bytes, always the same type (inventory, channel_manager,
  // weapon_*_interface). True name unknown.
  generic_interface_instance: 0x0f,
  // A 4-byte key: a table pair's key, and the name-like fields of
  // s_cosmetic_garbage_response. True name unknown.
  table_key: 0x11,
  string_hash: 0x12,
  handle: 0x13,
  // A member's offset is its method index.
  method: 0x14,
  static_array: 0x15,
  script_static_array: 0x16,
  dynamic_array: 0x17,
  table: 0x18,
  script_struct: 0x19,
  c_array: 0x1a,
  script_instance: 0x1b,
  script_definition: 0x1c,
  // 20 bytes on a definition class (24 for a message handler).
  interface_definition: 0x1d,
  // A member's offset is its value.
  enum_value: 0x1f,
  enum: 0x20,
  // A native enum or flags field, 1, 2 or 4 bytes wide; the member doesn't
  // say which.
  native_enum: 0x21,
  native_flags: 0x22,
  vector2: 0x28,
  // 16 bytes at a 16-aligned offset. The fourth float's use is unknown.
  aligned_vector3: 0x29,
  vector3: 0x2a,
} as const;

export const s_schema = c.struct({
  size: c.u32(),
  // Compared by the is-a check (sub_82805240) when handles differ.
  checksum: c.u32(),
  unknown08: c.u32(),
  name: tag_relative_string(),
  parent: c.u32(),
  // Per platform; the first is the 360.
  sizes: c.array(c.u32(), 4),
  alignments: c.array(c.u32(), 4),
  flags: c.u32(),
  // Bit 2: has a parent.
  flags2: c.u16(),
  // 0 enum, 1 primitive, 3 c array, 4 struct or class, 6 container.
  category: c.u8({ padAfter: 1 }),
  unknown3c: c.u32(),
  unknown40: c.u32(),
  // Relative to themselves; each lands just past its data's class hash.
  type_info: c.i32(),
  unknown48: c.i32(),
  fixups: c.i32(),
  default_value: c.i32(),
  native_members: c.i32(),
});

export type s_schema = c.infer<typeof s_schema>;

export const s_schema_type_info = c.struct({
  count: c.u32(),
  // The length for arrays, the value count for enums.
  size: c.u32(),
  kind: c.u32(),
  // The element type for arrays; the instance class for a definition and
  // the definition class for an instance.
  other: c.u32(),
});

export type s_schema_type_info = c.infer<typeof s_schema_type_info>;

// Sorted by name.
export const s_schema_member = c.struct({
  name: tag_relative_string(),
  type: c.u32(),
  offset: c.u32(),
  kind: c.u32(),
});

export type s_schema_member = c.infer<typeof s_schema_member>;

export const s_schema_fixup = c.struct({
  offset: c.u32(),
  // 1 relative string, 2 back offset, 3 relative object or block, 5 and 6
  // schema handles, 8 type hash, 0xA typed pointer, 0xB repeat, 0xC string
  // hash. 0, 4 and 9 unknown.
  kind: c.u8({ padAfter: 3 }),
});

export type s_schema_fixup = c.infer<typeof s_schema_fixup>;

export interface schema {
  fixups: s_schema_fixup[];
  header: s_schema;
  info: s_schema_type_info;
  members: s_schema_member[];
}

const k_type_info_offset = 0x44;
const k_fixups_offset = 0x4c;
// "fast init data" (schema_fast_init.ts). Relative like type_info/fixups.
export const k_default_value_offset = 0x50;

export function read_schema(buffer: Buffer): schema {
  const header = read_definition(buffer, s_schema);
  const info_at = k_type_info_offset + header.type_info;
  const info = read_definition(buffer, s_schema_type_info, info_at);
  const members: s_schema_member[] = [];
  for (let i = 0; i < info.count; i++) {
    members.push(
      read_definition(buffer, s_schema_member, info_at + 0x10 + i * 0x10)
    );
  }
  const fixups: s_schema_fixup[] = [];
  if (header.fixups !== 0) {
    const at = k_fixups_offset + header.fixups;
    const count = buffer.readUInt32BE(at);
    for (let i = 0; i < count; i++) {
      fixups.push(read_definition(buffer, s_schema_fixup, at + 4 + i * 8));
    }
  }
  return { header, info, members, fixups };
}
