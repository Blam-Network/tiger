import { c } from "@craftycodie/cstruct";
import { tag_block } from "../tag/tag_block.ts";
import {
  k_string_hash_class,
  s_string_hash,
  tag_relative_string,
} from "../tag/tag_string.ts";

// The live 360 build's sensor hosts, widened. A bundle lookup group lists
// one lookup per row (or per row group), each naming its own bare host tag;
// the host's definition names the row it is for. Offsets below are measured
// on every host of every 01.29 and 1.33 scenario: each sensor head's row
// name reads back as its bundle row's own name, with the row's type.
export const k_activity_lookup_class = 0x808003f6;
export const k_activity_host_class = 0x80800861;

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

// A bs class tag. The instance and definition are self-relative i64s, with
// their types in the class words before them.
export const s_activity_host = c.struct({
  size: c.u64(),
  // Relative to themselves; 0 for none.
  native_object: c.i32({ padAfter: 4 }),
  instance: c.i32({ padAfter: 4 }),
  definition: c.i32({ padAfter: 4 }),
  instance_pointers: tag_block(s_relative_reference, 0x8080423f),
  routines: tag_block(s_member_routines, 0x80800930),
  // The bundle's script, -1 for none.
  script: c.u32(),
  unknown44: c.u32(),
  // The instance runs from `instance` to the definition.
  instance_size: c.u32({ padAfter: 4 }),
  native_size: c.u32({ padAfter: 4 }),
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
    definition: 0x18 + Number(host.readBigInt64LE(0x18)),
    instance: 0x10 + Number(host.readBigInt64LE(0x10)),
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

// A bundle row: `{bundle, type, index}`. The 360's `type << 24 | index`
// word, little endian; an unset one is {empty name hash, FF, FFFF}.
export const s_row_reference = c.struct({
  bundle: c.u32(),
  type: c.u8({ padAfter: 1 }),
  index: c.u16(),
});

export type s_row_reference = c.infer<typeof s_row_reference>;

export const k_row_reference_class = 0x808004b1;
export const k_row_reference_alt_class = 0x8080047c;

// Every sensor row's definition starts with these 0x68 bytes. Row group
// definitions (k_row_group_definition_types) don't.
const k_sensor_host_definition_fields = {
  // Back at the instance, typed as the instance's class.
  default_instance: s_typed_pointer,
  // Always the empty name hash.
  name: c.u32({ padAfter: 4 }),
  // True names unknown; -1 on the hosts measured.
  unknown20: c.u32(),
  unknown24: c.u32(),
  unknown28: s_typed_pointer,
  // The row this definition is for; its row name matches `row_name`.
  sensor: s_row_reference,
  // The slice set the sensor loads with, -1 for always.
  slice_set: c.i32(),
  // Where the sensor lives: 0 domain, 1 bubble, 4 always. True name
  // unknown.
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

// Definition classes by row type; the 360's.
export const k_squad_sensor_definition_type = 0x808005a7;
export const k_actor_sensor_definition_type = 0x80800904;
export const k_objective_sensor_definition_type = 0x80800688;
export const k_object_sensor_definition_type = 0x808007dd;
export const k_sequence_sensor_definition_type = 0x808028da;
export const k_player_objective_sensor_definition_type = 0x80802993;

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
  // The empty name hash on every actor measured.
  unknown70: c.u32(),
  // A small index (0 to 7 on 1.33), the actor's cell.
  unknown74: c.u32(),
  unknown78: c.u32({ padAfter: 4 }),
});

export type s_actor_sensor_host_definition = c.infer<
  typeof s_actor_sensor_host_definition
>;

// One option of an AI objective task. No pointers, so unchanged from the
// 360 (0x24 bytes).
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
  // `__influencer_firing_area_set_N` (row type 42) of the task's bundle.
  firing_area_set: s_row_reference,
});

export type s_objective_task_option = c.infer<typeof s_objective_task_option>;

// An AI objective task (0x28 bytes). Its name sits in the definition's
// task_names block one past the unnamed root (tasks[i] is task_names[i + 1]).
export const s_objective_task = c.struct({
  unknown00: c.u8({ padAfter: 3 }),
  unknown04: c.f32(),
  unknown08: c.f32(),
  // Sent by the host beside the task index (SquadAuth [12]).
  unknown0c: c.u32(),
  options: tag_block(s_objective_task_option, 0x8080057d),
  unknown20: c.u32({ padAfter: 4 }),
});

export type s_objective_task = c.infer<typeof s_objective_task>;

export const s_objective_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // Name hashes: the unnamed root, then one per task. Can run past the
  // tasks. True name unknown.
  task_names: tag_block(s_string_hash, k_string_hash_class),
  tasks: tag_block(s_objective_task, 0x8080050b),
  // One row reference per task name, nearly always unset. True meaning
  // unknown.
  squads: tag_block(s_row_reference, k_row_reference_alt_class),
});

export type s_objective_sensor_host_definition = c.infer<
  typeof s_objective_sensor_host_definition
>;

export const s_sequence_sensor_host_definition = c.struct({
  ...k_sensor_host_definition_fields,
  // The sequence asset, -1 for none.
  sequence: c.u32(),
  // Seconds; 0 when there is no sequence.
  duration: c.f32(),
  // Rows that suppress the sequence.
  suppressions: tag_block(s_row_reference, k_row_reference_class),
  // 1 skip, 2 postpone; 0 when nothing suppresses it.
  suppression_mode: c.u8({ padAfter: 7 }),
  // A block of 808030C9 on some rows, whose elements vary in length.
  unknown88: c.array(c.u32(), 4),
});

export type s_sequence_sensor_host_definition = c.infer<
  typeof s_sequence_sensor_host_definition
>;

// Rows with no sensor share one host per bundle and kind; their
// definitions have no sensor head.
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
