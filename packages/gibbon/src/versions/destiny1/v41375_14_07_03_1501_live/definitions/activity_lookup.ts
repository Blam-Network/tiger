import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition, tag_block } from "../tag/tag_block.ts";
import {
  k_string_hash_class,
  s_string_hash,
  tag_relative_string,
} from "../tag/tag_string.ts";

// A bundle's sensor class: the class spec a bundle lookup group lists, one
// per row (or per row group, s_row_group_definition), always its own bare
// host tag. Rows don't resolve through the lookup, whose three entry
// blocks are always empty: each definition names its own row
// (s_sensor_host_definition.sensor).
export const k_activity_lookup_class = 0x808003f6;
export const k_activity_host_class = 0x80800861;

// Never filled, so the element class is unknown.
export const s_activity_lookup_entry = c.struct({
  name_hash: c.u32(),
  host_tag: c.u32(),
  record_offset: c.u32(),
  record_class: c.u32(),
});

export type s_activity_lookup_entry = c.infer<typeof s_activity_lookup_entry>;

export const s_activity_lookup = c.struct({
  size: c.u32(),
  // Always the empty name hash.
  decl_name_hash: c.u32(),
  // Always host_tag.
  class_tag: c.u32(),
  host_tag: c.u32(),
  // Where the instance starts in host_tag (the host's own instance).
  base_offset: c.u32(),
  // The instance's type, the class word before base_offset.
  instance_schema: c.u32(),
  records: tag_block(s_activity_lookup_entry),
  child_bundles: tag_block(s_activity_lookup_entry),
  rows: tag_block(s_activity_lookup_entry),
});

export type s_activity_lookup = c.infer<typeof s_activity_lookup>;

// `{tag, offset, type}`, resolved at load.
export const s_typed_pointer = c.struct({
  tag: c.u32(),
  offset: c.u32(),
  type: c.u32(),
});

export type s_typed_pointer = c.infer<typeof s_typed_pointer>;

// A member with routines run when an instance is set up and torn down.
export const s_member_routines = c.struct({
  // Relative to itself.
  member: c.i32(),
  type: c.u32(),
  initialize: c.u16(),
  teardown: c.u16(),
});

export type s_member_routines = c.infer<typeof s_member_routines>;

// Relative to itself.
export const s_relative_reference = c.struct({
  offset: c.i32(),
});

export type s_relative_reference = c.infer<typeof s_relative_reference>;

// A bs class tag. The instance and definition are self-relative, with
// their types in the class words before them, and every host's instance
// and definition point at each other.
export const s_activity_host = c.struct({
  size: c.u32(),
  // Relative to themselves; 0 for none.
  native_object: c.i32(),
  instance: c.i32(),
  definition: c.i32(),
  // Typed pointers in the default instance, rebased for each copy; every
  // one lands on a pointer into this tag.
  instance_pointers: tag_block(s_relative_reference, 0x8080423f),
  routines: tag_block(s_member_routines, 0x80800930),
  // The bundle's script, -1 for none. Never a tag the packages ship; it's
  // for the host.
  script: c.u32(),
  unknown24: c.u32(),
  instance_size: c.u32(),
  native_size: c.u32(),
  instance_alignment: c.u16(),
  native_alignment: c.u16(),
  // Always 5.
  layout_platform: c.u8(),
  flags: c.u8({ padAfter: 2 }),
});

export type s_activity_host = c.infer<typeof s_activity_host>;

const k_activity_host_size = c.sizeof(s_activity_host);

// Absolute offsets of a host's instance and definition.
export function host_offsets(host: Buffer): {
  definition: number;
  instance: number;
} {
  return {
    definition: 0x0c + host.readInt32BE(0x0c),
    instance: 0x08 + host.readInt32BE(0x08),
  };
}

// The same, only when the host is big enough for a `size`-byte definition
// there and, when `type` is given, the definition's class word is `type`.
// Bare hosts holding something else come back undefined.
export function checked_host_offsets(
  host: Buffer,
  size: number,
  type?: number
): { definition: number; instance: number } | undefined {
  if (host.length < k_activity_host_size) {
    return;
  }
  const offsets = host_offsets(host);
  if (
    offsets.definition < 4 ||
    offsets.instance < 4 ||
    offsets.definition + size > host.length
  ) {
    return;
  }
  if (
    type !== undefined &&
    host.readUInt32BE(offsets.definition - 4) !== type
  ) {
    return;
  }
  return offsets;
}

// The head of the host's instance: a pointer at its definition.
export const s_sensor_host_instance = c.struct({
  definition: s_typed_pointer,
});

export type s_sensor_host_instance = c.infer<typeof s_sensor_host_instance>;

// `{bundle, type << 24 | index}`; an unset one is {empty name hash, FF00FFFF}.
export const s_row_reference = c.struct({
  bundle: c.u32(),
  row: c.u32(),
});

export type s_row_reference = c.infer<typeof s_row_reference>;

// Row reference blocks carry one of two classes; true meaning of the split
// unknown.
export const k_row_reference_class = 0x808004b1;
export const k_row_reference_alt_class = 0x8080047c;

// Every sensor row's definition starts with these 0x44 bytes: the sensor
// slot (sensor_slot.ts) with the row's name appended as a string.
const k_sensor_host_definition_fields = {
  // Back at the instance, typed as the instance's class.
  default_instance: s_typed_pointer,
  // Always the empty name hash.
  name: c.u32(),
  // {type, 0, typed pointer}: unset ({-1, -1, -1, 0, -1}) except on Actor
  // and row type 36 definitions, which point at themselves. True name
  // unknown.
  unknown10: c.u32(),
  unknown14: c.u32(),
  unknown18: s_typed_pointer,
  // The row this definition is for; its row name matches `row_name`.
  sensor: s_row_reference,
  // The slice set the sensor loads with, -1 for always: the index of the
  // bundle lookup group that lists this host.
  slice_set: c.i32(),
  // Where the sensor lives: 0 domain, 1 bubble, 4 always. True name
  // unknown.
  authority: c.u8({ padAfter: 3 }),
  // The import_only_bind group label, the empty hash for most.
  identifier: c.u32(),
  // -1 for none.
  sense_schema: c.u32(),
  auth_schema: c.u32(),
  // The row's full name, as in the bundle's row table.
  row_name: tag_relative_string(),
};

export const s_sensor_host_definition = c.struct(
  k_sensor_host_definition_fields
);

export type s_sensor_host_definition = c.infer<typeof s_sensor_host_definition>;

// Definition classes by row type, each one to one with the instance class
// (the lookup's instance_schema). Only the ones read here are named.
export const k_squad_sensor_definition_type = 0x808005a7;
export const k_actor_sensor_definition_type = 0x80800904;
export const k_objective_sensor_definition_type = 0x80800688;
export const k_object_sensor_definition_type = 0x808007dd;
export const k_sequence_sensor_definition_type = 0x808028da;
export const k_player_trigger_sensor_definition_type = 0x80800360;
export const k_player_monitor_sensor_definition_type = 0x808005b9;
export const k_lifetime_sensor_definition_type = 0x8080074c;
export const k_control_point_sensor_definition_type = 0x80800748;
export const k_loot_sensor_definition_type = 0x808024d9;
export const k_object_sensor_instance_type = 0x8080092e;

export const s_squad_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // The squad's own definition (squad_definition.ts): cells, members and
  // spawn points.
  squad: c.u32(),
  unknown48: c.array(c.u32(), 4),
});

export type s_squad_sensor_host_definition = c.infer<
  typeof s_squad_sensor_host_definition
>;

export const s_actor_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  squad: s_row_reference,
  unknown4c: c.u32(),
  // A small index, the actor's cell.
  unknown50: c.u32(),
  unknown54: c.u32(),
});

export type s_actor_sensor_host_definition = c.infer<
  typeof s_actor_sensor_host_definition
>;

// One option of an AI objective task (0x24 bytes; the client strides 36,
// sub_824594E0). Every tick the squads linked under the task are handed one
// option each (sub_824A5900: squad +0x350 the option index, +0x1D4 the
// resolved firing area set), and the set is what the AI positions on
// (sub_825A42D0). Field names past what the reader says are unknown.
export const s_objective_task_option = c.struct({
  // No reader found.
  unknown00: c.f32(),
  // No reader found.
  unknown04: c.u32(),
  // Live bodies the option takes, -1 for no limit.
  max_live: c.i32(),
  // The option closes once its death count (capped at 40) reaches this; -1
  // never.
  death_limit: c.i32(),
  min_live: c.i32(),
  // Read by the rebalance compare.
  unknown14: c.u32(),
  unknown18: c.u32(),
  // `__influencer_firing_area_set_N` (row type 42) of the task's bundle.
  firing_area_set: s_row_reference,
});

export type s_objective_task_option = c.infer<typeof s_objective_task_option>;

// An AI objective task, split across the definition's parallel blocks. A
// squad is linked under one task by its SquadAuth [10] (sub_82572890); the
// task's name sits in the definition's task_names block one past the
// unnamed root (tasks[i] is task_names[i + 1]). Fields other than the
// options are not read by the option allocator; true names unknown.
export const s_objective_task = c.struct({
  unknown00: c.u8({ padAfter: 3 }),
  unknown04: c.f32(),
  unknown08: c.f32(),
  // Sent by the host beside the task index (SquadAuth [12]); the client
  // does not read it.
  unknown0c: c.u32(),
  options: tag_block(s_objective_task_option, 0x8080057d),
  unknown18: c.u32(),
});

export type s_objective_task = c.infer<typeof s_objective_task>;

export const s_objective_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // Name hashes: the unnamed root, then one per task (e.g. `gating`,
  // `drop_1`). True name unknown.
  task_names: tag_block(s_string_hash, k_string_hash_class),
  tasks: tag_block(s_objective_task, 0x8080050b),
  // One row reference per task name, nearly always unset; the set ones are
  // TriggerVolumes, not squads. True meaning unknown.
  squads: tag_block(s_row_reference, k_row_reference_alt_class),
});

export type s_objective_sensor_host_definition = c.infer<
  typeof s_objective_sensor_host_definition
>;

// Where one object sits: the blueprint (object_blueprint.ts) and its
// transform. The same element fills the 808009A2 placement tags a bundle
// lookup group names.
export const k_object_placement_class = 0x80800406;

export const s_object_placement = c.struct({
  // Always {blueprint, 0x0C, 80800906}.
  blueprint: s_typed_pointer,
  unknown0c: c.u32(),
  // A unit quaternion, x y z w.
  rotation: c.array(c.f32(), 4),
  // x y z, w.
  position: c.array(c.f32(), 4),
  // Runtime handles, unset in the tags.
  unknown30: c.u8({ padAfter: 0x37 }),
  unknown68: c.u32({ padAfter: 4 }),
  // Hashes or -1.
  unknown70: c.u32(),
  unknown74: c.u32(),
  unknown78: c.u32({ padAfter: 4 }),
});

export type s_object_placement = c.infer<typeof s_object_placement>;

// An Object row (object_ball0 and the like): where its objects sit. Most
// rows have one placement, some a few dozen.
export const s_object_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  placements: tag_block(s_object_placement, k_object_placement_class),
  unknown4c: c.u32(),
  // Always the same generic blueprint.
  unknown50: c.u32(),
  unknown54: c.u32(),
  // -1 or an 808005CB tag.
  unknown58: c.u32(),
  unknown5c: c.u32(),
  unknown60: c.u32(),
  unknown64: c.f32(),
});

export type s_object_sensor_host_definition = c.infer<
  typeof s_object_sensor_host_definition
>;

export const s_sequence_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // The sequence asset (an 80800734 tag), -1 for none.
  sequence: c.u32(),
  // Seconds; 0 when there is no sequence.
  duration: c.f32(),
  // Rows that suppress the sequence.
  suppressions: tag_block(s_row_reference, k_row_reference_class),
  // 1 skip, 2 postpone; 0 when nothing suppresses it.
  suppression_mode: c.u8({ padAfter: 3 }),
  // A block of 80803367 on some rows, whose elements vary in length:
  // {count, offset}.
  unknown58: c.u32(),
  unknown5c: c.i32(),
});

export type s_sequence_sensor_host_definition = c.infer<
  typeof s_sequence_sensor_host_definition
>;

// An interface implementation: a definition's owner reference, with its
// interface tag and a word.
export const s_owner_reference = c.struct({
  // Relative to itself, back at the implementing definition.
  owner: c.i32(),
  // An 8080058A tag.
  interface: c.u32(),
  // Zero, or a small packed pair.
  unknown08: c.u32(),
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

// A ControlPoint row. The compiled command script is host data and isn't
// shipped; the client gets the path. The point lists read as {x, y, z, 1}
// positions and {0, 0, 0, -1} or similar directions.
// The scoreboard's bytecode constants (scoreboard_definition.ts) carry the
// same element class with a 4-byte stride.
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
  unknown48: c.u32(),
  // The last of unknown64, 0 for a lone point.
  unknown4c: c.f32(),
  points: tag_block(s_path_point, k_path_point_class),
  unknown58: c.f32(),
  // As many as points.
  unknown5c: tag_block(s_path_point, k_path_point_class),
  // Rising values from 0, one per segment or so.
  unknown64: tag_block(c.struct({ value: c.f32() }), 0x8080000f),
  unknown6c: c.f32(),
});

export type s_control_point_sensor_host_definition = c.infer<
  typeof s_control_point_sensor_host_definition
>;

// Rows with no sensor share one host per bundle and kind: firing areas and
// influencers (80800633), trigger volumes (8080067A), nav points (808008B0)
// and row type 45 points (808007CF). The definition lists its rows; the
// kind's own data follows in blocks not mapped here.
export const k_firing_area_set_definition_type = 0x80800633;
export const k_trigger_volume_set_definition_type = 0x8080067a;
export const k_nav_point_set_definition_type = 0x808008b0;
export const k_point_set_definition_type = 0x808007cf;
export const k_row_group_definition_types = [
  k_firing_area_set_definition_type,
  k_trigger_volume_set_definition_type,
  k_nav_point_set_definition_type,
  k_point_set_definition_type,
] as const;
export const k_row_group_entry_class = 0x808003e0;

export const s_row_group_entry = c.struct({
  name: tag_relative_string(),
  row: s_row_reference,
  // As in s_sensor_host_definition.
  slice_set: c.i32(),
});

export type s_row_group_entry = c.infer<typeof s_row_group_entry>;

export const s_row_group_definition = c.struct({
  default_instance: s_typed_pointer,
  // Always the empty name hash.
  name: c.u32(),
  // The first entry's row.
  row: s_row_reference,
  unknown18: c.u32(),
  unknown1c: c.u32(),
  entries: tag_block(s_row_group_entry, k_row_group_entry_class),
});

export type s_row_group_definition = c.infer<typeof s_row_group_definition>;

// A Capturable component's definition: the definition of a bare host that
// an object blueprint's component points at. Only the fields the host reads
// are named.
export const k_capturable_definition_class = 0x808028fb;
export const k_capturable_definition_size = 0x78;

export const s_capturable_definition = c.struct({
  // Back at the instance (808026F4).
  companion: s_typed_pointer,
  unknown0c: c.u8({ padAfter: 0x23 }),
  // {rel, tag, 0}.
  unknown30: c.u8({ padAfter: 0x0b }),
  // bit0 lock the zone on capture; bit1 delete the sobject on capture;
  // bit2 set on pvp dominion. True names unknown.
  flags: c.u8({ padAfter: 3 }),
  // Seconds to fill from empty.
  capture_seconds: c.f32(),
  // Rate table indices for 1..6 occupants.
  occupant_rate_indices: c.array(c.i8(), 6),
  // The rate while nobody is inside.
  empty_rate_index: c.i8({ padAfter: 1 }),
  // Three {u32 string hash, u32, u32 bank tag} marker text records.
  unknown4c: c.u8({ padAfter: 0x23 }),
  // fnv1 of the capture incident's name; the empty hash for the default.
  capture_incident_name: c.u32(),
  unknown74: c.u32(),
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
