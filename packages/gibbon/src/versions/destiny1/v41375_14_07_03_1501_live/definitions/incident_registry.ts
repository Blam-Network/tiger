import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition, tag_block } from "../tag/tag_block.ts";
import { named_root_tag } from "./manifest.ts";

// The incident registry. Both the client and server roots hold one; client
// incident indices index the client's, found under "client_startup_globals".
export const k_incident_registry_class = 0x80800659;
export const k_incident_class = 0x808003d3;
export const k_incident_registry_root_name = "client_startup_globals";

export const s_incident = c.struct({
  name_hash: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  unknown0c: c.u32(),
  unknown10: c.u32(),
  unknown14: c.u32(),
  unknown18: c.u32(),
  unknown1c: c.u32(),
  unknown20: c.u32(),
  unknown24: c.u32(),
  unknown28: c.u32(),
  unknown2c: c.u32(),
  unknown30: c.u32(),
});

export type s_incident = c.infer<typeof s_incident>;

export const s_incident_registry = c.struct({
  size: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u32(),
  unknown0c: c.u32(),
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
