import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition, tag_block } from "../tag/tag_block.ts";
import {
  e_investment_global,
  investment_global_tag,
} from "./investment_globals.ts";

// The incident registry (investment globals slot 23). Every hostonly
// activity package carries a copy too; the rows are sorted by name hash.
export const k_incident_registry_class = 0x808004e0;
export const k_incident_class = 0x808004d9;
export const k_incident_type_table_ref_class = 0x808004de;
export const k_incident_type_table_class = 0x808004db;

// One per incident type; the table is the type's name list.
export const s_incident_type_table_ref = c.struct({
  unknown00: c.u32(),
  tag: c.u32(),
});

export type s_incident_type_table_ref = c.infer<
  typeof s_incident_type_table_ref
>;

// 36 bytes.
export const s_incident = c.struct({
  name_hash: c.u32(),
  // Relative to itself; lands past the table.
  unknown04: c.i32(),
  unknown08: c.u32(),
  unknown0c: c.u32(),
  // Index into the type tables.
  type_index: c.u8({ padAfter: 3 }),
  unknown14: c.u32(),
  unknown18: c.u32(),
  unknown1c: c.u32(),
  unknown20: c.u32(),
});

export type s_incident = c.infer<typeof s_incident>;

export const s_incident_registry = c.struct({
  size: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  unknown0c: c.u32(),
  unknown10: c.u32(),
  type_tables: tag_block(
    s_incident_type_table_ref,
    k_incident_type_table_ref_class
  ),
  incidents: tag_block(s_incident, k_incident_class),
  unknown24: c.u32(),
  unknown28: c.u32(),
});

export type s_incident_registry = c.infer<typeof s_incident_registry>;

// Incident name hashes, by incident index.
export function read_incident_names(set: c_package_set): number[] {
  const tag = investment_global_tag(set, e_investment_global.incident_registry);
  return read_definition(set.read_tag(tag), s_incident_registry).incidents.map(
    (incident) => incident.name_hash
  );
}
