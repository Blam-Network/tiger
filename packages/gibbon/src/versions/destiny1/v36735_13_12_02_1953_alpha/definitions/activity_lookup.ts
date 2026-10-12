import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import {
  find_tag_blocks,
  read_definition,
  read_tag_block_at,
  tag_block,
  tag_format_error,
  tag_pointer,
} from "../tag/tag_block.ts";
import { tag_relative_string } from "../tag/tag_string.ts";

// A bundle's row lookup (a "bundle class" to the engine): row name hash to
// the record that describes the row, which lives in a 808004C5 host tag.
// The bundle names its lookup (s_activity_bundle.lookups).
export const k_activity_lookup_class = 0x8080047b;
export const k_activity_lookup_entry_class = 0x80800479;
export const k_activity_host_class = 0x808004c5;

export const s_activity_lookup_entry = c.struct({
  // The engine never reads it, but no lookup repeats a name, so rows can be
  // joined on it.
  name_hash: c.u32(),
  host_tag: c.u32(),
  // The row's sensor host instance, absolute into host_tag.
  record_offset: c.u32(),
  // The row's instance type. For an Encounter row that's the script's
  // instance class tag, which ends in the script's debug path
  // (`es\...\<decl_name>.esu`).
  record_class: c.u32(),
});

export type s_activity_lookup_entry = c.infer<typeof s_activity_lookup_entry>;

// Read by the bundle manager (sub_835D7EC8). Only bundle lookups have
// entries; the rest are bare client class specs (empty decl name, class tag
// == host tag). 0x30 bytes, the rest is padding.
export const s_activity_lookup = c.struct({
  size: c.u32(),
  // Usually the bundle hash, but not always; don't join on it.
  decl_name_hash: c.u32(),
  // The 808004C5 class tag instances are made from.
  class_tag: c.u32(),
  host_tag: c.u32(),
  // Where the instance starts in host_tag.
  base_offset: c.u32(),
  // Always the host's schema_tag; the client doesn't read it.
  instance_schema: c.u32(),
  // Records that aren't rows (record class 80800473).
  records: tag_block(s_activity_lookup_entry, k_activity_lookup_entry_class),
  // Encounter bundles nested in this one: each entry names a child bundle
  // and points at the phase script field (a handle, type 80800A5F) the host
  // fills with the child's instance. The client never reads them.
  child_bundles: tag_block(
    s_activity_lookup_entry,
    k_activity_lookup_entry_class
  ),
  // The bundle's rows, in no particular order.
  rows: tag_block(s_activity_lookup_entry, k_activity_lookup_entry_class),
});

export type s_activity_lookup = c.infer<typeof s_activity_lookup>;

// `{tag, offset, type}`, resolved at load.
export const s_typed_pointer = c.struct({
  tag: c.u32(),
  offset: c.u32(),
  type: c.u32(),
});

export type s_typed_pointer = c.infer<typeof s_typed_pointer>;

export const s_tag_dependency = c.struct({
  tag: c.u32(),
});

export type s_tag_dependency = c.infer<typeof s_tag_dependency>;

// A member with routines run when an instance is set up and torn down
// (sub_828A7FB0); -1 for none.
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

// A bs class tag. Lookups, rows and sensor slots all point into these.
export const s_activity_host = c.struct({
  size: c.u32(),
  // Written at runtime.
  runtime_state: c.u32(),
  // A tag reference, never set.
  unknown08: c.u32(),
  // The platform the stored sizes were laid out for; rewritten to the
  // running one at load (sub_828A8A00).
  layout_platform: c.u8(),
  // Bit 1: imported (sub_828A7630).
  flags: c.u8({ padAfter: 2 }),
  unknown10: tag_relative_string(),
  unknown14: tag_relative_string(),
  // The native object's type, 808003A8 for none (script classes).
  native_type: c.u32(),
  schema_tag: c.u32(),
  definition_schema: c.u32(),
  // Relative to themselves; 0 for none.
  native_object: c.i32(),
  instance: c.i32(),
  definition_data: c.i32(),
  unknown30: s_typed_pointer,
  definition: s_typed_pointer,
  // Copied to make an instance (sub_828A8368).
  default_instance: s_typed_pointer,
  instance_size: c.u32(),
  instance_alignment: c.u32(),
  // Written at load, never read.
  native_size: c.u32(),
  native_alignment: c.u32(),
  // The bundle's script (80800B48), -1 for none. Nothing in the client
  // reads it; it's for the host.
  script: c.u32(),
  // Loaded alongside (sub_828A9F80).
  dependencies: tag_block(s_tag_dependency),
  routines: tag_block(s_member_routines, 0x808004b8),
  // Owner references in the definition, bound at load (sub_828AA298).
  owner_references: tag_block(s_relative_reference, 0x808004c1),
  // Typed pointers in the default instance, rebased for each copy.
  instance_pointers: tag_block(s_relative_reference, 0x808004c3),
});

export type s_activity_host = c.infer<typeof s_activity_host>;

// A named field in this same host tag: {name hash, tag (always this host),
// offset, field type}. field_type 80800001 means the byte at offset is the
// field's authored initial value (a bool or small int); other field types
// name a nested schema instead of a scalar. Nothing points at the block, so
// it's found by marker. The AI objective task tree resolves a condition's
// name hash through it to a bool field.
export const k_host_field_binding_class = 0x80801281;

export const s_host_field_binding = c.struct({
  name_hash: c.u32(),
  tag: c.u32(),
  offset: c.u32(),
  field_type: c.u32(),
});

export type s_host_field_binding = c.infer<typeof s_host_field_binding>;

export function read_host_field_bindings(
  buffer: Buffer
): s_host_field_binding[] {
  const bindings: s_host_field_binding[] = [];
  for (const header of find_tag_blocks(buffer, k_host_field_binding_class)) {
    bindings.push(
      ...read_tag_block_at(
        buffer,
        header,
        s_host_field_binding,
        k_host_field_binding_class
      )
    );
  }
  return bindings;
}

// A lookup entry's record is the row's sensor host instance
// (c_<x>_sensor_host_instance) in the host tag. It and its definition point
// at each other; the definition holds the authored data. Only the
// instance's head is mapped.
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

const k_row_reference_class = 0x8080046b;

// Every native definition starts with these 0x30 bytes. The client reads
// the same fields off the sensor slot (80800608).
const k_sensor_host_definition_fields = {
  // Back at the instance, typed as the instance's class.
  default_instance: s_typed_pointer,
  // fnv1("<bundle root script>.<row name>").
  name: c.u32(),
  row_name_hash: c.u32(),
  sensor: s_row_reference,
  // -1 for none.
  slice_set: c.i32(),
  // Where the sensor lives (sub_835CA7C0): 0 domain, 1 bubble, 2 and 3
  // bubble when there's a slice set, 4 always. True name unknown.
  authority: c.u8({ padAfter: 3 }),
  // The import_only_bind group label, registered as a slot identifier
  // (sub_835CA090).
  identifier: c.u32(),
  sense_schema: c.u32(),
  auth_schema: c.u32(),
};

export const s_sensor_host_definition = c.struct(
  k_sensor_host_definition_fields
);

export type s_sensor_host_definition = c.infer<typeof s_sensor_host_definition>;

// Instance types, which sit in each definition's default_instance.
export const k_squad_sensor_instance_type = 0x808012e3;
export const k_object_sensor_instance_type = 0x808012a6;
export const k_encounter_binding_sensor_instance_type = 0x808012c5;
export const k_loot_sensor_instance_type = 0x808037d2;
export const k_nav_point_sensor_instance_type = 0x808012bf;
// Definition types, which sit in each instance's definition pointer.
export const k_nav_point_sensor_definition_type = 0x808012be;

export const s_squad_cell = c.struct({
  count: c.i32(),
});

export type s_squad_cell = c.infer<typeof s_squad_cell>;

export const s_squad_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // SquadAuth ref1.
  firing_area_set: s_row_reference,
  // SquadAuth ref0.
  objective: s_row_reference,
  // The squad's Actor rows.
  actors: tag_block(s_row_reference, k_row_reference_class),
  // Default bodies per cell. The count is the roster length the client
  // asserts SquadAuth against. True name unknown.
  cells: tag_block(s_squad_cell, 0x80800048),
  // The cells' sum, the squad's default body count.
  cell_total: c.u32(),
  // Set only on warp gate squads.
  unknown54: c.u8({ padAfter: 3 }),
  x: c.f32(),
  y: c.f32(),
  z: c.f32(),
});

export type s_squad_sensor_host_definition = c.infer<
  typeof s_squad_sensor_host_definition
>;

export const s_actor_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  squad: s_row_reference,
});

export type s_actor_sensor_host_definition = c.infer<
  typeof s_actor_sensor_host_definition
>;

export const s_type_index = c.struct({
  type: c.u32(),
  index: c.i32(),
});

export type s_type_index = c.infer<typeof s_type_index>;

// An AI objective task (808015F0). Its schema's member names are stripped,
// so most fields are unnamed.
export const s_objective_task = c.struct({
  // e.g. "task", "sniper", "captain".
  name: c.u32(),
  unknown04: c.u32(),
  unknown08: c.u8({ padAfter: 3 }),
  // -1 on the root task; the parent's index.
  unknown0c: c.i32(),
  unknown10: c.u8({ padAfter: 3 }),
  unknown14: c.u32({ padAfter: 0x10 }),
  // A Squad or SquadGroup row, in any bundle.
  squad: s_row_reference,
  unknown30: c.u32(),
  unknown34: c.i32(),
  unknown38: c.i32(),
  unknown3c: c.i32(),
  unknown40: c.u32(),
  unknown44: c.u32(),
  unknown48: c.u32(),
  unknown4c: c.i32(),
  unknown50: c.i32(),
  unknown54: c.f32(),
  unknown58: s_type_index,
  // A script condition's name hash, e.g. "can_advance".
  condition: c.u32(),
  unknown64: c.u32(),
  unknown68: s_type_index,
  unknown70: c.u32(),
  unknown74: s_type_index,
  unknown7c: c.u32(),
  unknown80: s_type_index,
});

export type s_objective_task = c.infer<typeof s_objective_task>;

export const s_objective_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // fnv1 of the row name's last segment.
  leaf_name_hash: c.u32(),
  // The first is the unnamed root.
  tasks: tag_block(s_objective_task, 0x808015f0),
});

export type s_objective_sensor_host_definition = c.infer<
  typeof s_objective_sensor_host_definition
>;

export const s_object_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  x: c.f32(),
  y: c.f32(),
  z: c.f32(),
  // Two {min, max} ranges in seconds, -1 when scripts drive them.
  unknown3c: c.array(c.f32(), 4),
});

export type s_object_sensor_host_definition = c.infer<
  typeof s_object_sensor_host_definition
>;

// A Capturable component's definition: a bare 808004C5 host tag whose own
// `definition` typed pointer resolves to this 0x260-byte struct instead of
// a row's sensor host definition. Only the fields the host reads are named.
export const k_capturable_definition_class = 0x80802e53;
export const k_capturable_definition_size = 0x260;

export const s_capturable_definition = c.struct({
  // The 0x190-byte companion definition (80802E54).
  companion: s_typed_pointer,
  unknown0c: c.u8({ padAfter: 0x23 }),
  // An array header of class 80802E4C.
  unknown30: c.u8({ padAfter: 0x13 }),
  // bit0 lock the zone on capture; bit1 delete the sobject on capture.
  flags: c.u8({ padAfter: 3 }),
  // Seconds to fill from empty.
  capture_seconds: c.f32(),
  // Rate table indices for 1..6 occupants. The table itself (27 floats at
  // 0x821C1B50) is client memory, not tag data.
  occupant_rate_indices: c.array(c.i8(), 6),
  // Same table: the rate while nobody is inside, often negative (decay).
  empty_rate_index: c.i8({ padAfter: 1 }),
  // Two {u32 string hash, u32, u32 bank tag} marker text records.
  unknown54: c.u8({ padAfter: 0x17 }),
  // fnv1 of the capture incident's name; 0x811C9DC5 (unset) falls back to
  // "capture" client-side (sub_838E9860).
  capture_incident_name: c.u32(),
  unknown70: c.u8({ padAfter: 0x1ef }),
});

export type s_capturable_definition = c.infer<typeof s_capturable_definition>;

// Every 808004C5 tag in the set whose own definition is a Capturable, keyed
// by the tag's own hash. An Object row reaches one through its blueprint's
// components (object_blueprint.ts).
export function find_capturable_definitions(
  set: c_package_set
): Map<number, s_capturable_definition> {
  const found = new Map<number, s_capturable_definition>();
  for (const { hash: tag } of set.entries_of_class(k_activity_host_class)) {
    const host = set.try_read_tag(tag);
    if (!host || host.length < 0x48) {
      continue;
    }
    const { definition } = read_definition(host, s_activity_host, 0);
    if (
      definition.type !== k_capturable_definition_class ||
      definition.tag !== tag ||
      definition.offset + k_capturable_definition_size > host.length
    ) {
      continue;
    }
    found.set(
      tag,
      read_definition(host, s_capturable_definition, definition.offset)
    );
  }
  return found;
}

export const s_sequence_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // Seconds. The client also takes it as how late the sequence may still
  // start (sub_8381A448).
  duration: c.f32(),
  // A PlayerObjective that suppresses the sequence.
  suppression: s_row_reference,
  // What suppression does: 1 skip, 2 postpone (sub_8381A448).
  suppression_mode: c.u8(),
  // Set when the client's definition has a sequence asset. True name
  // unknown.
  has_sequence: c.u8({ padAfter: 2 }),
});

export type s_sequence_sensor_host_definition = c.infer<
  typeof s_sequence_sensor_host_definition
>;

export const s_player_objective_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // 0 mission, 1 public event, 2 bounty.
  kind: c.u8(),
  // How progress shows: 0 none, 1 counter, 6 countdown. The HUD reads
  // PlayerObjectiveAuth's progress style this way.
  progress_style: c.u8(),
  counts_down: c.u8({ padAfter: 1 }),
  unknown34: c.u32(),
});

export type s_player_objective_sensor_host_definition = c.infer<
  typeof s_player_objective_sensor_host_definition
>;

// A method bound when the owner loads (sub_828B2528 fills the runtime
// words).
export const s_method_binding = c.struct({
  type: c.u32(),
  method_index: c.u32(),
  // Written at runtime.
  runtime_function: c.u32(),
  runtime_object: c.u32(),
});

export type s_method_binding = c.infer<typeof s_method_binding>;

// A definition's implementation of an interface (the 8080038D family),
// bound at load; the host lists them all in owner_references. True name
// unknown.
export const s_owner_reference = c.struct({
  // Relative to itself, back at the implementing definition.
  owner: c.i32(),
  // An interface type, e.g. 8080059C (derives from 80800397).
  interface: c.u32(),
  methods: tag_block(s_method_binding, 0x8080038a),
});

export type s_owner_reference = c.infer<typeof s_owner_reference>;

export const s_cinematic_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  unknown30: s_owner_reference,
  unknown40: s_owner_reference,
});

export type s_cinematic_sensor_host_definition = c.infer<
  typeof s_cinematic_sensor_host_definition
>;

export const s_loot_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // The loot's import_only_bind label; the identifier is empty on loot.
  material_hash: c.u32(),
  owner: s_owner_reference,
});

export type s_loot_sensor_host_definition = c.infer<
  typeof s_loot_sensor_host_definition
>;

export const s_player_trigger_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // TriggerVolume rows.
  bindings: tag_block(s_row_reference, k_row_reference_class),
  owner: s_owner_reference,
});

export type s_player_trigger_sensor_host_definition = c.infer<
  typeof s_player_trigger_sensor_host_definition
>;

// PlayerMonitor (a TriggerVolume, Location or Object), SafeZone (a
// TriggerVolume), Lifetime (a Timer), Actor (its Squad).
export const s_area_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  area: s_row_reference,
});

export type s_area_sensor_host_definition = c.infer<
  typeof s_area_sensor_host_definition
>;

// A ControlPoint row is a compiled command script: a list of atoms, each a
// command and the condition that ends it. The host sends the atoms whole
// (ActorAuth's command script); the client never reads this list. Both are
// self-relative, landing on class-prefixed native objects.
export const k_control_point_command_class = 0x808012ce;

export const s_control_point_command = c.struct({
  command: tag_pointer(),
  end_condition: tag_pointer(),
});

export type s_control_point_command = c.infer<typeof s_control_point_command>;

export const s_control_point_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  commands: tag_block(s_control_point_command, k_control_point_command_class),
  unknown38: c.u32(),
});

export type s_control_point_sensor_host_definition = c.infer<
  typeof s_control_point_sensor_host_definition
>;

// Command classes by wire kind (sub_837AC458).
export const k_command_classes = [
  0x80800692, 0x80800693, 0x80800694, 0x80800697, 0x80800698, 0x80800691,
  0x80800699, 0x8080068f, 0x8080069a, 0x8080069b,
] as const;

// End condition classes by wire kind (sub_837ACA08).
export const k_end_condition_classes = [
  0x80800686, 0x80800687, 0x80800688,
] as const;

// A command aimed at a point: snap_to (kind 0) and face (kind 8) share it.
export const s_point_command = c.struct({
  point: s_row_reference,
  index: c.u32(),
});

export type s_point_command = c.infer<typeof s_point_command>;

export const s_snap_to_command = s_point_command;

export type s_snap_to_command = s_point_command;

export const s_face_command = s_point_command;

export type s_face_command = s_point_command;

// Kind 1: an AI property set by name. True name unknown.
export const s_named_command = c.struct({
  name: c.u32(),
});

export type s_named_command = c.infer<typeof s_named_command>;

export const s_sleep_command = c.struct({
  seconds: c.f32(),
});

export type s_sleep_command = c.infer<typeof s_sleep_command>;

// Move to a point; a run of moves ends at the one with stop set.
export const s_move_command = c.struct({
  point: s_row_reference,
  index: c.u32(),
  stop: c.u8(),
});

export type s_move_command = c.infer<typeof s_move_command>;

// Kind 5: sets or clears one of two combatant flag bits. True name unknown.
export const s_flag_command = c.struct({
  which: c.u8(),
  value: c.u8(),
});

export type s_flag_command = c.infer<typeof s_flag_command>;

// Kind 6: adds or removes a temperament. True name unknown.
export const s_temperament_command = c.struct({
  temperament: c.i32(),
  add: c.u8(),
});

export type s_temperament_command = c.infer<typeof s_temperament_command>;

// set_channel_scalar(name, v) is {name, [v, v, v, v]}; "doors" opens and
// closes a dropship.
export const s_set_channel_command = c.struct({
  channel: c.u32(),
  values: c.array(c.f32(), 4),
});

export type s_set_channel_command = c.infer<typeof s_set_channel_command>;

// ability(name, argument), with a target point when point targeted.
export const s_ability_command = c.struct({
  name: c.u32(),
  argument: c.u32(),
  point: s_row_reference,
  slot: c.i8(),
  index: c.i8(),
});

export type s_ability_command = c.infer<typeof s_ability_command>;

// End condition kind 2: after this many seconds. Kind 0 waits the
// command's own duration, kind 1 until the AI moves on.
export const s_timed_end_condition = c.struct({
  seconds: c.f32(),
});

export type s_timed_end_condition = c.infer<typeof s_timed_end_condition>;

export interface command_script_atom {
  // Wire kinds; -1 for a class this build doesn't know.
  command_kind: number;
  // Where the command's fields start in the host tag.
  command_offset: number;
  condition_kind: number;
  condition_offset: number;
}

export function read_command_script(
  host: Buffer,
  definition_offset: number
): command_script_atom[] {
  const commands = tag_block(
    s_control_point_command,
    k_control_point_command_class
  ).read(host, definition_offset + 0x30, "big");
  return commands.map(({ command, end_condition }) => {
    if (command === undefined || end_condition === undefined) {
      throw new tag_format_error("command script atom without both halves");
    }
    return {
      command_kind: (k_command_classes as readonly number[]).indexOf(
        command.class
      ),
      command_offset: command.offset,
      condition_kind: (k_end_condition_classes as readonly number[]).indexOf(
        end_condition.class
      ),
      condition_offset: end_condition.offset,
    };
  });
}

// No schema exists for it.
export const s_new_mission_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  unknown30: c.u32(),
  // "new_mission".
  name_hash: c.u32(),
  unknown38: c.u32(),
});

export type s_new_mission_sensor_host_definition = c.infer<
  typeof s_new_mission_sensor_host_definition
>;

export const s_encounter_binding_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // Always 0x04000000; the client returns it from an interface method
  // (sub_83832F38).
  unknown30: c.u32(),
});

export type s_encounter_binding_sensor_host_definition = c.infer<
  typeof s_encounter_binding_sensor_host_definition
>;

export const s_nav_point_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  x: c.f32(),
  y: c.f32(),
  z: c.f32(),
  w: c.f32(),
});

export type s_nav_point_sensor_host_definition = c.infer<
  typeof s_nav_point_sensor_host_definition
>;

export const s_script_thread = c.struct({
  tag: c.u32(),
  offset: c.u32(),
});

export type s_script_thread = c.infer<typeof s_script_thread>;

// Encounter and Phase rows' definitions are script classes (the
// instance's definition pointer names the class tag, whose member table
// lays out the rest). Declared fields follow as embedded native definitions.
// Every row with a lookup entry is a field of the bundle's root definition
// (the host's definition), named fnv1 of its dotted path (`field[i]` for
// array elements).
export const s_script_sensor_host_definition = c.struct({
  default_instance: s_typed_pointer,
  name: c.u32(),
  // The rows the script's fields are bound to: its row fields depth first
  // by offset, nested scripts' fields inline.
  slot_bindings: tag_block(s_row_reference, k_row_reference_class),
  threads: tag_block(s_script_thread),
});

export type s_script_sensor_host_definition = c.infer<
  typeof s_script_sensor_host_definition
>;

// The embedded native definitions of an Encounter or Phase row's declared
// fields, found by scanning for their shape. A heuristic: thread, listener
// and device heads look the same, so many rows come back wrong or not at
// all. The definition class's schema members, or slot_bindings, are the
// reliable route.
export const k_row_slot_list_offset = 0x20;
export const k_row_slot_list_max = 64;

export const s_row_slot = c.struct({
  host_tag: c.u32(),
  back_offset: c.u32(),
  // The field's instance type, e.g. 808037DC for a PlayerObjective.
  slot_class: c.u32(),
  name: c.u32(),
  // The target row's name hash.
  name_hash: c.u32(),
  bundle: c.u32(),
  row: c.u32(),
});

export type s_row_slot = c.infer<typeof s_row_slot>;

const k_row_slot_size = 0x1c;

export function read_row_slots(
  host: Buffer,
  host_tag: number,
  definition_offset: number
): s_row_slot[] | undefined {
  if (definition_offset + k_row_slot_list_offset > host.length) {
    return;
  }
  const count = host.readUInt32BE(definition_offset + 0x10);
  if (count === 0 || count > k_row_slot_list_max) {
    return;
  }
  const slots: s_row_slot[] = [];
  let at = definition_offset + k_row_slot_list_offset;
  while (slots.length < count && at + k_row_slot_size <= host.length) {
    if (
      host.readUInt32BE(at) === host_tag &&
      host.readUInt32BE(at + 8) >>> 16 === 0x8080
    ) {
      slots.push(c.read(s_row_slot, host, at, "big"));
      at += k_row_slot_size;
    } else {
      at += 4;
    }
  }
  return slots.length === count ? slots : undefined;
}

// The debug source path a record class tag (or a compiled script) ends
// with, e.g. `es\utility_scripts\kill_squad_objective.esu`.
export function find_script_source_path(
  buffer: Buffer,
  extension = ".esu"
): string | undefined {
  const needle = Buffer.from(extension, "latin1");
  let from = 0;
  for (;;) {
    const end = buffer.indexOf(needle, from);
    if (end < 0) {
      return;
    }
    let start = end;
    while (
      start > 0 &&
      buffer[start - 1] >= 0x20 &&
      buffer[start - 1] <= 0x7e
    ) {
      start--;
    }
    const path = buffer.toString("latin1", start, end + needle.length);
    const base = path.slice(path.lastIndexOf("\\") + 1);
    if (base.length > needle.length) {
      return path;
    }
    from = end + needle.length;
  }
}
