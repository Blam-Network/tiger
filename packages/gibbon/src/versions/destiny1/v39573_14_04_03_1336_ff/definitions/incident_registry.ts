import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../../v38464_14_02_28_1027_betath/pkg/package_set.ts";
import {
  read_definition,
  tag_block,
} from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";
import { tag_relative_string } from "../../v52553_16_09_28_1551_evil/tag/tag_string.ts";
import { named_root_tag } from "./manifest.ts";

// The incident registry. Both the client and server roots hold one; client
// incident indices index the client's, found under "client_startup_globals".
export const k_incident_registry_class = 0x80800659;
export const k_incident_class = 0x808003d3;
export const k_incident_registry_root_name = "client_startup_globals";

// 104 bytes: the live build's 52, its pointer and blocks widened. Only the
// name is read.
export const s_incident = c.struct({
  name_hash: c.u32({ padAfter: 4 }),
  // Relative to itself; the class before it varies.
  unknown08: c.u64(),
  // Blocks of 8080053C and 80800070, the latter string hashes.
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

// A block the live build's registry lacks sits before the incidents.
export const s_incident_registry = c.struct({
  size: c.u64(),
  // e.g. "content\incidents\kill_incident_globals.kill_incident_global".
  name: tag_relative_string(),
  unknown10: c.u32({ padAfter: 4 }),
  unknown18: c.u32({ padAfter: 4 }),
  unknown20: c.u64(),
  unknown28: c.u64(),
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
