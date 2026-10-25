import { c } from "@craftycodie/cstruct";
import {
  checked_host_offsets,
  k_activity_host_class,
  k_row_reference_class,
  s_row_reference,
  s_typed_pointer,
} from "../../v52553_16_09_28_1551_evil/definitions/activity_lookup.ts";
import type { c_package_set } from "../../v52553_16_09_28_1551_evil/pkg/package_set.ts";
import {
  read_definition,
  tag_block,
} from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";
import { tag_relative_string } from "../../v52553_16_09_28_1551_evil/tag/tag_string.ts";
import { k_object_placement_class } from "./spawn_point.ts";

// Lookups, bare hosts and the sensor definitions patch 01.29's reader maps
// (head, squad, actor, objective, sequence) are laid out as 01.29's: every
// sensor head's row name reads back as its bundle row's own, with the row's
// type and the lookup group's slice set, on every bundle in the packages.
// The definitions below are the live build's others, widened the same way.
export * from "../../v52553_16_09_28_1551_evil/definitions/activity_lookup.ts";

// 01.29's sensor head, field for field, for the definitions that extend it.
const k_sensor_host_definition_fields = {
  default_instance: s_typed_pointer,
  name: c.u32({ padAfter: 4 }),
  unknown20: c.u32(),
  unknown24: c.u32(),
  unknown28: s_typed_pointer,
  sensor: s_row_reference,
  slice_set: c.i32(),
  authority: c.u8({ padAfter: 3 }),
  identifier: c.u32(),
  sense_schema: c.u32(),
  auth_schema: c.u32({ padAfter: 4 }),
  row_name: tag_relative_string(),
};

// The head of the host's instance: a pointer at its definition.
export const s_sensor_host_instance = c.struct({
  definition: s_typed_pointer,
});

export type s_sensor_host_instance = c.infer<typeof s_sensor_host_instance>;

export const k_object_sensor_instance_type = 0x8080092e;
export const k_player_trigger_sensor_definition_type = 0x80800360;
export const k_player_monitor_sensor_definition_type = 0x808005b9;
export const k_lifetime_sensor_definition_type = 0x8080074c;
export const k_control_point_sensor_definition_type = 0x80800748;
export const k_loot_sensor_definition_type = 0x808024d9;

// Where one object sits: the blueprint (object_blueprint.ts) and its
// transform. 0x90 bytes; the same element fills the 808009A2 placement
// tags a bundle lookup group names.
export const s_object_placement = c.struct({
  // Always {blueprint, 0x18, 80800906}.
  blueprint: s_typed_pointer,
  unknown18: c.u64(),
  // A unit quaternion, x y z w.
  rotation: c.array(c.f32(), 4),
  // x y z, w.
  position: c.array(c.f32(), 4),
  // Runtime handles and hashes, -1 or zero in most.
  unknown40: c.u8({ padAfter: 0x2f }),
  unknown70: c.u32(),
  unknown74: c.u32(),
  unknown78: c.u32({ padAfter: 4 }),
  unknown80: c.u32(),
  unknown84: c.u32(),
  // Relative to itself: a spawn point placement's spawn point set
  // reference (spawn_point.ts), else zero.
  unknown88: c.i64(),
});

export type s_object_placement = c.infer<typeof s_object_placement>;

// An Object row: where its objects sit.
export const s_object_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  placements: tag_block(s_object_placement, k_object_placement_class),
  unknown78: c.u64(),
  // The same few generic blueprints.
  unknown80: c.u32({ padAfter: 4 }),
  unknown88: c.u64(),
  // -1 or a tag.
  unknown90: c.u32({ padAfter: 4 }),
  unknown98: c.u32(),
  unknown9c: c.u32(),
  unknowna0: c.f32(),
  unknowna4: c.u32(),
});

export type s_object_sensor_host_definition = c.infer<
  typeof s_object_sensor_host_definition
>;

// An interface implementation: a definition's owner reference, with its
// interface tag and a word.
export const s_owner_reference = c.struct({
  // Relative to itself, back at the implementing definition.
  owner: c.i64(),
  // An 8080058A tag.
  interface: c.u32(),
  unknown0c: c.u32(),
});

export type s_owner_reference = c.infer<typeof s_owner_reference>;

export const s_player_trigger_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // TriggerVolume rows.
  bindings: tag_block(s_row_reference, k_row_reference_class),
  // Always zero here.
  owner: s_owner_reference,
});

export type s_player_trigger_sensor_host_definition = c.infer<
  typeof s_player_trigger_sensor_host_definition
>;

// PlayerMonitor (a TriggerVolume) and Lifetime (a Timer).
export const s_area_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  area: s_row_reference,
});

export type s_area_sensor_host_definition = c.infer<
  typeof s_area_sensor_host_definition
>;

// A ControlPoint row: the path the client gets. The scoreboard's bytecode
// constants carry the same element class with a 4-byte stride.
export const k_path_point_class = 0x80800090;

export const s_path_point = c.struct({
  x: c.f32(),
  y: c.f32(),
  z: c.f32(),
  w: c.f32(),
});

export type s_path_point = c.infer<typeof s_path_point>;

export const s_control_point_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // fnv1 of row_name.
  name_hash: c.u32(),
  unknown6c: c.u32(),
  unknown70: c.f32({ padAfter: 4 }),
  points: tag_block(s_path_point, k_path_point_class),
  unknown88: c.f32({ padAfter: 4 }),
  // As many as points.
  unknown90: tag_block(s_path_point, k_path_point_class),
  // Rising values from 0.
  unknowna0: tag_block(c.struct({ value: c.f32() }), 0x8080000f),
  unknownb0: c.f32({ padAfter: 4 }),
});

export type s_control_point_sensor_host_definition = c.infer<
  typeof s_control_point_sensor_host_definition
>;

// Rows with no sensor share one host per bundle and kind (firing areas,
// trigger volumes, nav points, points). The definition lists its rows; the
// kind's own data follows in a block not mapped here.
export const k_row_group_entry_class = 0x808003e0;

export const s_row_group_entry = c.struct({
  name: tag_relative_string(),
  row: s_row_reference,
  // As in s_sensor_host_definition.
  slice_set: c.i32({ padAfter: 4 }),
});

export type s_row_group_entry = c.infer<typeof s_row_group_entry>;

export const s_row_group_definition = c.struct({
  default_instance: s_typed_pointer,
  // Always the empty name hash.
  name: c.u32(),
  // The first entry's row.
  row: s_row_reference,
  unknown24: c.u32(),
  unknown28: c.u32({ padAfter: 4 }),
  entries: tag_block(s_row_group_entry, k_row_group_entry_class),
  // The kind's per-row data, one element per entry (808005DA for nav
  // points).
  unknown40: c.u64(),
  unknown48: c.u64(),
});

export type s_row_group_definition = c.infer<typeof s_row_group_definition>;

// A Capturable component's definition: the definition of a bare host that
// an object blueprint's component points at. Three in the packages, all in
// the pvp worlds.
export const k_capturable_definition_class = 0x808028fb;
export const k_capturable_definition_size = 0xd0;

export const s_capturable_definition = c.struct({
  // Back at the instance (808026F4).
  companion: s_typed_pointer,
  unknown18: c.u8({ padAfter: 0x47 }),
  owner: s_owner_reference,
  // bit2 set on pvp dominion; the rest as the live build's.
  flags: c.u8({ padAfter: 3 }),
  // Seconds to fill from empty.
  capture_seconds: c.f32(),
  // Rate table indices for 1..6 occupants.
  occupant_rate_indices: c.array(c.i8(), 6),
  // The rate while nobody is inside.
  empty_rate_index: c.i8({ padAfter: 1 }),
  // Three {u32 string hash, u64, u32 bank tag} marker text records.
  unknown80: c.u8({ padAfter: 0x47 }),
  // fnv1 of the capture incident's name; the empty hash for the default.
  capture_incident_name: c.u32(),
  unknowncc: c.u32(),
});

export type s_capturable_definition = c.infer<typeof s_capturable_definition>;

// Every host in the set whose own definition is a Capturable, keyed by
// the host tag.
export function find_capturable_definitions(
  set: c_package_set
): Map<number, s_capturable_definition> {
  const found = new Map<number, s_capturable_definition>();
  for (const { hash: tag } of set.entries_of_class(k_activity_host_class)) {
    const host = set.try_read_tag(tag);
    const offsets = host
      ? checked_host_offsets(
          host,
          k_capturable_definition_size,
          k_capturable_definition_class
        )
      : undefined;
    if (!(host && offsets)) {
      continue;
    }
    found.set(
      tag,
      read_definition(host, s_capturable_definition, offsets.definition)
    );
  }
  return found;
}
