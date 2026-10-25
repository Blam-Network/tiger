import { c } from "@craftycodie/cstruct";
import { checked_host_offsets } from "./activity_lookup.ts";

// A bundle row's sensor slot: its row, slice set and sense and auth
// schemas. Every sensor row's host definition starts with one
// (s_sensor_host_definition names the same head field by field), so a host
// has at most one.
export const s_sensor_slot = c.struct({
  bundle: c.u32({ padBefore: 0x40 }),
  type: c.u8({ padAfter: 1 }),
  index: c.u16(),
  // -1 for always.
  slice_set: c.i32(),
  authority: c.u8({ padAfter: 3 }),
  // The identifier (import_only_bind label).
  name_hash: c.u32(),
  sense_schema: c.u32(),
  auth_schema: c.u32({ padAfter: 4 }),
  // Relative to itself, at the row's name.
  row_name: c.i64(),
});

export type s_sensor_slot = c.infer<typeof s_sensor_slot>;

const k_sensor_slot_size = c.sizeof(s_sensor_slot);
const k_sensor_slot_row_name_offset = 0x60;

// The host's slot offset (its definition), or nothing when the host isn't
// a sensor row's: row group, blueprint component and other bare hosts.
export function find_sensor_slots(host: Buffer): number[] {
  const offsets = checked_host_offsets(host, k_sensor_slot_size);
  if (!offsets) {
    return [];
  }
  const { definition, instance } = offsets;
  const slot = c.read(s_sensor_slot, host, definition, "little");
  const name =
    definition + k_sensor_slot_row_name_offset + Number(slot.row_name);
  const valid =
    slot.bundle !== 0 &&
    slot.bundle !== 0xffffffff &&
    slot.bundle !== 0x811c9dc5 &&
    slot.type > 0 &&
    slot.type < 128 &&
    host[definition + 0x45] === 0 &&
    name >= definition + k_sensor_slot_size &&
    name < host.length &&
    host.readUInt32LE(definition + 0x10) === host.readUInt32LE(instance - 4);
  return valid ? [definition] : [];
}
