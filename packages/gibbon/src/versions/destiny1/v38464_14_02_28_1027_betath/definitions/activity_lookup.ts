import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition, tag_block } from "../tag/tag_block.ts";
import {
  k_string_hash_class,
  s_string_hash,
  tag_relative_string,
} from "../tag/tag_string.ts";

// A bundle lookup group lists one lookup per row (or per row group), each
// naming its own bare host tag; the host's definition names the row it is
// for. Lookups and the sensor head are laid out as patch 01.29's. The host
// header is the 360 alpha's, widened to 64-bit, and a few definitions are
// older than the Alpha Trial's (sequence, player trigger). Measured on
// every host in the packages: each sensor head's row name reads back as its
// bundle row's own, with the row's type and the lookup group's slice set.
export const k_activity_lookup_class = 0x808003cb;
export const k_activity_host_class = 0x80800907;

// Never filled, so the element's layout is unknown; the 360's is kept.
export const s_activity_lookup_entry = c.struct({
  name_hash: c.u32(),
  host_tag: c.u32(),
  record_offset: c.u32(),
  record_class: c.u32(),
});

export type s_activity_lookup_entry = c.infer<typeof s_activity_lookup_entry>;

export const s_activity_lookup = c.struct({
  size: c.u64(),
  // Always the empty name hash.
  decl_name_hash: c.u32(),
  // Always host_tag.
  class_tag: c.u32(),
  host_tag: c.u32({ padAfter: 4 }),
  // Where the instance starts in host_tag (the host's own instance).
  base_offset: c.u32({ padAfter: 4 }),
  // The instance's type, the class word before base_offset.
  instance_schema: c.u32({ padAfter: 4 }),
  records: tag_block(s_activity_lookup_entry),
  child_bundles: tag_block(s_activity_lookup_entry),
  rows: tag_block(s_activity_lookup_entry),
});

export type s_activity_lookup = c.infer<typeof s_activity_lookup>;

// `{tag, offset, type}`, resolved at load. The offset is a u64.
export const s_typed_pointer = c.struct({
  tag: c.u32({ padAfter: 4 }),
  offset: c.u32({ padAfter: 4 }),
  type: c.u32({ padAfter: 4 }),
});

export type s_typed_pointer = c.infer<typeof s_typed_pointer>;

// An i64 relative to itself.
export const s_relative_reference = c.struct({
  offset: c.i32({ padAfter: 4 }),
});

export type s_relative_reference = c.infer<typeof s_relative_reference>;

// A member with routines run when an instance is set up and torn down.
export const s_member_routines = c.struct({
  // An i64 relative to itself.
  member: c.i32({ padAfter: 4 }),
  type: c.u32(),
  initialize: c.u16(),
  teardown: c.u16(),
});

export type s_member_routines = c.infer<typeof s_member_routines>;

export const k_member_routines_class = 0x80800908;
export const k_instance_pointer_class = 0x8080423f;
// The native type of a host with no native object.
export const k_no_native_type = 0x808008d1;

// A bs class tag, 0xD8 bytes: the 360 alpha's header with every pointer and
// relative offset an i64. The native object, instance and definition carry
// their types in the class words before them.
export const s_activity_host = c.struct({
  size: c.u64(),
  // Written at runtime.
  runtime_state: c.u32(),
  // Always -1.
  unknown0c: c.u32(),
  // Always 5.
  layout_platform: c.u8(),
  // Always 1.
  flags: c.u8({ padAfter: 2 }),
  // k_no_native_type for none.
  native_type: c.u32(),
  instance_schema: c.u32(),
  definition_schema: c.u32(),
  // Relative to themselves; 0 for none.
  native_object: c.i32({ padAfter: 4 }),
  instance: c.i32({ padAfter: 4 }),
  definition_data: c.i32({ padAfter: 4 }),
  // Always unset.
  unknown38: s_typed_pointer,
  definition: s_typed_pointer,
  default_instance: s_typed_pointer,
  instance_size: c.u32({ padAfter: 4 }),
  instance_alignment: c.u32({ padAfter: 4 }),
  native_size: c.u32({ padAfter: 4 }),
  native_alignment: c.u32({ padAfter: 4 }),
  // The bundle's script, -1 for none.
  script: c.u32({ padAfter: 4 }),
  // A block that is always empty; the alpha's dependencies sit here.
  unknowna8: c.array(c.u64(), 2),
  routines: tag_block(s_member_routines, k_member_routines_class),
  // Typed pointers in the default instance, rebased for each copy.
  instance_pointers: tag_block(s_relative_reference, k_instance_pointer_class),
});

export type s_activity_host = c.infer<typeof s_activity_host>;

const k_activity_host_size = c.sizeof(s_activity_host);
const k_host_instance_offset = 0x28;
const k_host_definition_offset = 0x30;

// Absolute offsets of a host's instance and definition.
export function host_offsets(host: Buffer): {
  definition: number;
  instance: number;
} {
  return {
    definition:
      k_host_definition_offset +
      Number(host.readBigInt64LE(k_host_definition_offset)),
    instance:
      k_host_instance_offset +
      Number(host.readBigInt64LE(k_host_instance_offset)),
  };
}

// The same, only when the host is big enough for a `size`-byte definition
// there and, when `type` is given, the definition's class word is `type`.
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
    host.readUInt32LE(offsets.definition - 4) !== type
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

// A bundle row: `{bundle, type, index}`; an unset one is {empty name hash,
// FF, FFFF}.
export const s_row_reference = c.struct({
  bundle: c.u32(),
  type: c.u8({ padAfter: 1 }),
  index: c.u16(),
});

export type s_row_reference = c.infer<typeof s_row_reference>;

export const k_row_reference_class = 0x80800486;
export const k_row_reference_alt_class = 0x80800451;

// Every sensor row's definition starts with these 0x68 bytes, as on 01.29.
// Row group definitions (k_row_group_definition_types) don't.
const k_sensor_host_definition_fields = {
  // Back at the instance, typed as the instance's class.
  default_instance: s_typed_pointer,
  // Always the empty name hash.
  name: c.u32({ padAfter: 4 }),
  // -1 on every host.
  unknown20: c.u32(),
  unknown24: c.u32(),
  unknown28: s_typed_pointer,
  // The row this definition is for; its row name matches `row_name`.
  sensor: s_row_reference,
  // The slice set the sensor loads with, -1 for always.
  slice_set: c.i32(),
  // Where the sensor lives: 0 domain, 1 bubble, 4 always.
  authority: c.u8({ padAfter: 3 }),
  // The import_only_bind group label, the empty hash for most.
  identifier: c.u32(),
  // -1 for none.
  sense_schema: c.u32(),
  auth_schema: c.u32({ padAfter: 4 }),
  // The row's full name, as in the bundle's row table.
  row_name: tag_relative_string(),
};

export const s_sensor_host_definition = c.struct(
  k_sensor_host_definition_fields
);

export type s_sensor_host_definition = c.infer<typeof s_sensor_host_definition>;

export const k_sensor_host_definition_size = c.sizeof(s_sensor_host_definition);

// Definition classes by row type. Row types are numbered as on 01.29.
export const k_squad_sensor_definition_type = 0x8080057e;
export const k_actor_sensor_definition_type = 0x808008dd;
export const k_objective_sensor_definition_type = 0x80800667;
export const k_object_sensor_definition_type = 0x808007b9;
export const k_sequence_sensor_definition_type = 0x80802a7a;
export const k_player_objective_sensor_definition_type = 0x80802622;
export const k_player_trigger_sensor_definition_type = 0x8080033c;
export const k_player_monitor_sensor_definition_type = 0x8080058f;
export const k_lifetime_sensor_definition_type = 0x8080072e;
export const k_control_point_sensor_definition_type = 0x8080072a;
export const k_loot_sensor_definition_type = 0x808024e0;
export const k_object_sensor_instance_type = 0x80800905;

export const s_squad_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // The squad's own definition (squad_definition.ts).
  squad: c.u32(),
  unknown6c: c.u32(),
  unknown70: c.array(c.u32(), 4),
});

export type s_squad_sensor_host_definition = c.infer<
  typeof s_squad_sensor_host_definition
>;

export const s_actor_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  squad: s_row_reference,
  // The empty name hash on every actor.
  unknown70: c.u32(),
  // A small index, the actor's cell.
  unknown74: c.u32(),
  unknown78: c.u32({ padAfter: 4 }),
});

export type s_actor_sensor_host_definition = c.infer<
  typeof s_actor_sensor_host_definition
>;

// One option of an AI objective task (0x24 bytes).
export const s_objective_task_option = c.struct({
  unknown00: c.f32(),
  unknown04: c.u32(),
  // Live bodies the option takes, -1 for no limit.
  max_live: c.i32(),
  // The option closes once its death count reaches this; -1 never.
  death_limit: c.i32(),
  min_live: c.i32(),
  unknown14: c.u32(),
  unknown18: c.u32(),
  // `__influencer_firing_area_set_N` of the task's bundle.
  firing_area_set: s_row_reference,
});

export type s_objective_task_option = c.infer<typeof s_objective_task_option>;

export const k_objective_task_class = 0x808004e2;
export const k_objective_task_option_class = 0x80800554;

// An AI objective task (0x28 bytes). Its name sits in the definition's
// task_names block one past the unnamed root (tasks[i] is task_names[i + 1]).
export const s_objective_task = c.struct({
  unknown00: c.u8({ padAfter: 3 }),
  unknown04: c.f32(),
  unknown08: c.f32(),
  unknown0c: c.u32(),
  options: tag_block(s_objective_task_option, k_objective_task_option_class),
  unknown20: c.u32({ padAfter: 4 }),
});

export type s_objective_task = c.infer<typeof s_objective_task>;

export const s_objective_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // Name hashes: the unnamed root, then one per task.
  task_names: tag_block(s_string_hash, k_string_hash_class),
  tasks: tag_block(s_objective_task, k_objective_task_class),
  // One row reference per task name, nearly always unset.
  squads: tag_block(s_row_reference, k_row_reference_alt_class),
});

export type s_objective_sensor_host_definition = c.infer<
  typeof s_objective_sensor_host_definition
>;

// Older than 01.29's: one suppressing row rather than a list.
export const s_sequence_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // The sequence asset (80800714), -1 for none.
  sequence: c.u32(),
  // Seconds; 0 on most.
  duration: c.f32(),
  // A PlayerObjective that suppresses the sequence, unset for none.
  suppression: s_row_reference,
  // 1 skip, 2 postpone; 0 when nothing suppresses it.
  suppression_mode: c.u8({ padAfter: 7 }),
});

export type s_sequence_sensor_host_definition = c.infer<
  typeof s_sequence_sensor_host_definition
>;

// Where one object sits: the blueprint (object_blueprint.ts) and its
// transform. 0xA0 bytes, 16 more than the Alpha Trial's: placements also
// chain through `next`, which is how a placement set (808006E1) holds them.
export const k_object_placement_class = 0x80800454;

export const s_object_placement = c.struct({
  // Always {blueprint, 0x18, 808006AC}.
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
  // Relative to itself: the blueprint's own data, its class just before it
  // (a spawn point's is a spawn point set reference, spawn_point.ts), else
  // zero.
  extension: c.i64(),
  // Relative to itself: the next placement of a placement set, else zero.
  next: c.i64(),
  unknown98: c.u64(),
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
  interface: c.u32(),
  unknown0c: c.u32(),
});

export type s_owner_reference = c.infer<typeof s_owner_reference>;

// No owner reference after the bindings, unlike the Alpha Trial's.
export const s_player_trigger_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // TriggerVolume rows.
  bindings: tag_block(s_row_reference, k_row_reference_class),
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

// A ControlPoint row: the path the client gets.
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
export const k_firing_area_set_definition_type = 0x8080060e;
export const k_trigger_volume_set_definition_type = 0x80800659;
export const k_nav_point_set_definition_type = 0x8080088a;
export const k_point_set_definition_type = 0x808007a9;
export const k_row_group_definition_types = [
  k_firing_area_set_definition_type,
  k_trigger_volume_set_definition_type,
  k_nav_point_set_definition_type,
  k_point_set_definition_type,
] as const;

export const k_row_group_entry_class = 0x808003b1;

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
  // The kind's per-row data, one element per entry.
  unknown40: c.u64(),
  unknown48: c.u64(),
});

export type s_row_group_definition = c.infer<typeof s_row_group_definition>;

// A Capturable component's definition: the definition of a bare host that
// an object blueprint's component points at. Five in the packages, one per
// capture zone; laid out as the Alpha Trial's.
export const k_capturable_definition_class = 0x808028ea;
export const k_capturable_definition_size = 0xd0;

export const s_capturable_definition = c.struct({
  // Back at the instance (808026E8).
  companion: s_typed_pointer,
  unknown18: c.u8({ padAfter: 0x47 }),
  owner: s_owner_reference,
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
