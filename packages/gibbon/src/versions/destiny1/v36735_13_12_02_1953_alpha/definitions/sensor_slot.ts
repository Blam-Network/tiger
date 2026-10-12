import { c } from "@craftycodie/cstruct";
import { is_tag_hash } from "../pkg/tag_hash.ts";

// A bundle row's sensor slot: its sense and auth schemas. Kept in the
// 808004C5 host tags and found through the `{80800608, tag, offset}`
// triples that point at them.
export const k_sensor_slot_class = 0x80800608;

export const s_sensor_slot = c.struct({
  bundle: c.u32({ padBefore: 0x28 }),
  type: c.u8({ padAfter: 1 }),
  index: c.u16(),
  bubble: c.u16({ padAfter: 6 }),
  name_hash: c.u32(),
  sense_schema: c.u32(),
  auth_schema: c.u32(),
});

export type s_sensor_slot = c.infer<typeof s_sensor_slot>;

const k_sensor_slot_size = c.sizeof(s_sensor_slot);

// Offsets of the records a host tag's triples point at, each once, in the
// order first seen.
export function find_sensor_slots(host: Buffer): number[] {
  const found = new Set<number>();
  for (let at = 0; at + 12 <= host.length; at += 4) {
    if (
      host.readUInt32BE(at) === k_sensor_slot_class &&
      is_tag_hash(host.readUInt32BE(at + 4))
    ) {
      const record = host.readUInt32BE(at + 8);
      if (record + k_sensor_slot_size <= host.length) {
        found.add(record);
      }
    }
  }
  return [...found];
}
