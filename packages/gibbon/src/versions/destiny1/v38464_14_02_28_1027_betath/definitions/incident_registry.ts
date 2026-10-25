import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition, tag_block } from "../tag/tag_block.ts";
import { tag_relative_string } from "../tag/tag_string.ts";
import { named_root_tag } from "./manifest.ts";

// The incident registry, under "client_startup_globals"; client incident
// indices index it. The investment globals' slot 23 holds another.
export const k_incident_registry_class = 0x808007ad;
export const k_incident_class = 0x80800614;
export const k_incident_registry_root_name = "client_startup_globals";

// 104 bytes, the Alpha Trial's. Only the name is read.
export const s_incident = c.struct({
  // Small numbers rather than fnv1 hashes; the Alpha Trial's ids.
  name_hash: c.u32({ padAfter: 4 }),
  // Relative to itself; the class before it varies.
  unknown08: c.u64(),
  unknown10: c.u64(),
  unknown18: c.u64(),
  unknown20: c.u64(),
  unknown28: c.u64(),
  unknown30: c.u64(),
  unknown38: c.u64(),
  unknown40: c.u32({ padAfter: 4 }),
  unknown48: c.u64(),
  unknown50: c.u64(),
  unknown58: c.u64(),
  unknown60: c.u64(),
});

export type s_incident = c.infer<typeof s_incident>;

// Two globals file names, each with a tag after it, then a block of
// 80804310 rows and the incidents.
export const s_incident_registry = c.struct({
  size: c.u64(),
  // e.g. "content\activities\incidents\kill_incident_globals...".
  name: tag_relative_string(),
  unknown10: c.u32({ padAfter: 4 }),
  // e.g. "content\activities\incidents\incident_heat...".
  unknown18: tag_relative_string(),
  unknown20: c.u32({ padAfter: 4 }),
  unknown28: c.u64(),
  unknown30: c.u64(),
  incidents: tag_block(s_incident, k_incident_class),
});

export type s_incident_registry = c.infer<typeof s_incident_registry>;

// Incident name hashes, by client incident index.
export function read_client_incident_names(set: c_package_set): number[] {
  const tag = named_root_tag(
    set,
    k_incident_registry_root_name,
    k_incident_registry_class
  );
  return read_definition(set.read_tag(tag), s_incident_registry).incidents.map(
    (incident) => incident.name_hash
  );
}
