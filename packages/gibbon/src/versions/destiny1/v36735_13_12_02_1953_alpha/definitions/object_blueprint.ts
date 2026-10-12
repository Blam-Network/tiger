import { c } from "@craftycodie/cstruct";
import {
  find_tag_blocks,
  k_tag_block_header_size,
  read_tag_block_at,
} from "../tag/tag_block.ts";

// An Object row's archetype ("blueprint") tag and its component list. True
// field and class names unknown; the comments say what is read.

// A blueprint's component array (8080056A, 0x1C bytes per element). A
// component's definition sits at resource_offset in resource_tag; a
// Capturable definition (80802E53), for one, is embedded in one of the
// 808004C5 tags a component points at (find_capturable_definitions).
export const k_blueprint_component_class = 0x8080056a;

export const s_blueprint_component = c.struct({
  unknown00: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  resource_class: c.u32(),
  resource_tag: c.u32(),
  resource_offset: c.u32(),
  definition_class: c.u32(),
});

export type s_blueprint_component = c.infer<typeof s_blueprint_component>;

// Every component in a blueprint tag's component array: one per blueprint,
// found by its class like any other tag block, since nothing points at the
// header.
export function read_blueprint_components(
  buffer: Buffer
): s_blueprint_component[] {
  for (const header of find_tag_blocks(buffer, k_blueprint_component_class)) {
    return read_tag_block_at(
      buffer,
      header,
      s_blueprint_component,
      k_blueprint_component_class
    );
  }
  return [];
}

// An Object slot record's blueprint array: a tag block field past the
// record's 0x44-byte s_sensor_slot head, of 0x80-byte elements that each
// start with their archetype blueprint tag. Only that first word is read.
// Followed by hand rather than through tag_block_header: a record
// find_object_slot_records matched by shape alone has no marker here, and
// callers expect a list, not a throw.
const k_blueprint_array_count_offset = 0x44;
const k_blueprint_array_pointer_offset = 0x48;
const k_blueprint_element_size = 0x80;

export function read_object_blueprint_tags(
  host: Buffer,
  record: number
): number[] {
  const pointer_at = record + k_blueprint_array_pointer_offset;
  if (pointer_at + 4 > host.length) {
    return [];
  }
  const count = host.readUInt32BE(record + k_blueprint_array_count_offset);
  const header = pointer_at + host.readInt32BE(pointer_at);
  const tags: number[] = [];
  for (let i = 0; i < count; i++) {
    const element =
      header + k_tag_block_header_size + i * k_blueprint_element_size;
    // A shape-matched false positive can point anywhere, backwards too.
    if (element < 0 || element + 4 > host.length) {
      break;
    }
    tags.push(host.readUInt32BE(element));
  }
  return tags;
}

// An Object row's slot record inside a bare 808004C5 tag: a 0x6C-byte
// structure, not the 80800608 sensor slot. Nothing points at these, so
// they're found by scanning for a bundle hash with the record's shape
// around it; the constant at +8 is the check. True field and class names
// unknown.
const k_object_slot_marker = 0x808005fc;
const k_object_slot_name_hash_offset = 0x24;
const k_object_slot_bundle_offset = 0x28;
const k_object_slot_type_offset = 0x2c;
const k_object_slot_index_offset = 0x2e;

export interface s_object_slot_record {
  bundle: number;
  // fnv1 of the row's full name, as in the bundle's row table. Several
  // records can share a (bundle, type_index) when a bundle hash is reused
  // across packages; the name hash picks the row's own.
  name_hash: number;
  record: number;
  type_id: number;
  type_index: number;
}

export function find_object_slot_records(host: Buffer): s_object_slot_record[] {
  const found: s_object_slot_record[] = [];
  for (let at = k_object_slot_bundle_offset; at + 4 <= host.length; at += 4) {
    const bundle = host.readUInt32BE(at);
    if (bundle === 0 || bundle === 0xffffffff) {
      continue;
    }
    const record = at - k_object_slot_bundle_offset;
    if (
      record + k_object_slot_index_offset + 2 > host.length ||
      host.readUInt32BE(record + 8) !== k_object_slot_marker
    ) {
      continue;
    }
    found.push({
      bundle,
      name_hash: host.readUInt32BE(record + k_object_slot_name_hash_offset),
      record,
      type_id: host[record + k_object_slot_type_offset],
      type_index: host.readUInt16BE(record + k_object_slot_index_offset),
    });
  }
  return found;
}
