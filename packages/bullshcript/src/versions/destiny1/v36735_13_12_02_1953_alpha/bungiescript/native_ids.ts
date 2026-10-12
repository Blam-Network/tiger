// The alpha's schema ids for the native bases and types in
// bungiescript/native_types.ts: what the lifter and the schema gate join a
// tag's parent and member types to. TU0 renumbers them.
import {
  type BsNativeBase,
  type BsNativeType,
  nativeBaseNamed,
  nativeTypeNamed,
} from "../../../../bungiescript/native_types.ts";

export interface BsNativeBaseIds {
  readonly definition: number;
  readonly instance: number;
  readonly name: string;
}

export interface BsNativeTypeIds {
  // definition and instance ids for a definition/instance pair, else the one id
  readonly ids: readonly number[];
  readonly name: string;
}

export const NATIVE_BASE_IDS: readonly BsNativeBaseIds[] = [
  { definition: 0x808012f0, instance: 0x808012f1, name: "c_activity_script" },
  { definition: 0x808012ed, instance: 0x808012ee, name: "c_mission_phase" },
  { definition: 0x80801282, instance: 0x80801284, name: "c_encounter" },
  { definition: 0x808003a5, instance: 0x808003a7, name: "c_library" },
  { definition: 0x808033a9, instance: 0x808033aa, name: "nativemathlib" },
  { definition: 0x808033f3, instance: 0x808033fa, name: "c_weapon" },
  { definition: 0x808024c7, instance: 0x808024c8, name: "c_component" },
  {
    definition: 0x80802eec,
    instance: 0x80802eed,
    name: "c_damage_impulse_base",
  },
  {
    definition: 0x80802f84,
    instance: 0x80802f90,
    name: "c_damage_component_base",
  },
  {
    definition: 0x80802aae,
    instance: 0x80802aaf,
    name: "c_weapon_stat_translator",
  },
  {
    definition: 0x80802aa6,
    instance: 0x80802aa7,
    name: "c_biped_stat_translator",
  },
  { definition: 0x80802ae1, instance: 0x80802ae2, name: "c_player_datum_base" },
  { definition: 0x8080346c, instance: 0x8080346d, name: "c_game_manager_base" },
];

export const NATIVE_TYPE_IDS: readonly BsNativeTypeIds[] = [
  { ids: [0x8080126d, 0x8080126e], name: "c_activity_player_sensor_host" },
  { ids: [0x8080127a, 0x8080127d], name: "c_fireteam_sensor_host" },
  { ids: [0x8080128f, 0x80801290], name: "c_trigger_volume_slot_host" },
  { ids: [0x808012a5, 0x808012a6], name: "c_object_sensor_host" },
  { ids: [0x808012a9, 0x808012aa], name: "c_object_filter_sensor_host" },
  { ids: [0x808012e2, 0x808012e3], name: "c_squad_sensor_host" },
  { ids: [0x808037a2, 0x808037a3], name: "c_device_host" },
  { ids: [0x808037c6, 0x808037c7], name: "c_capturable_host" },
  { ids: [0x808037ca, 0x808037cc], name: "c_cinematic_sensor_host" },
  { ids: [0x808037d9, 0x808037dc], name: "c_player_objective_sensor_host" },
  { ids: [0x80801271, 0x80801272], name: "c_player_script_iterator" },
  { ids: [0x808005a0, 0x808005a2], name: "c_incident_listener" },
  { ids: [0x80801273, 0x80801274], name: "c_timer_sensor_host" },
  { ids: [0x80801275, 0x80801276], name: "c_lifetime_sensor_host" },
  { ids: [0x8080128d, 0x8080128e], name: "c_activity_flag" },
  { ids: [0x8080129d, 0x8080129e], name: "c_hard_wipe_globals_host" },
  { ids: [0x808012ab, 0x808012ac], name: "c_health_sensor_host" },
  { ids: [0x808012b4, 0x808012b5], name: "c_hop_on_sensor_host" },
  { ids: [0x808012b7, 0x808012b8], name: "c_player_monitor_sensor_host" },
  { ids: [0x808012bb, 0x808012bd], name: "c_player_trigger_sensor_host" },
  { ids: [0x808012be, 0x808012bf], name: "c_nav_point_host" },
  { ids: [0x808012c0, 0x808012c1], name: "c_safe_zone_sensor_host" },
  { ids: [0x808012c2, 0x808012c3], name: "c_location_sensor_host" },
  { ids: [0x808012c4, 0x808012c5], name: "c_encounter_binding_host" },
  { ids: [0x808012c8, 0x808012c9], name: "c_control_point_sensor_host" },
  { ids: [0x808012ca, 0x808012cb], name: "c_command_script" },
  { ids: [0x808012d0, 0x808012d1], name: "c_control_point_set_sensor_host" },
  { ids: [0x808012d3, 0x808012d5], name: "c_squad_member_sensor_host" },
  { ids: [0x808012d8, 0x808012d9], name: "c_objective_sensor_host" },
  { ids: [0x808012df, 0x808012e0], name: "c_squad_group_sensor_host" },
  { ids: [0x808012e7, 0x808012e8], name: "c_new_mission_sensor_host" },
  { ids: [0x808025a1, 0x808025a3], name: "c_kill_incident_listener" },
  { ids: [0x808025a6, 0x808025a7], name: "c_engagement_incident_listener" },
  { ids: [0x808037ef, 0x808037f0], name: "c_interactable_incident_listener" },
  { ids: [0x8080259d, 0x8080259e], name: "c_capturable_incident_listener" },
  { ids: [0x80800d60, 0x80800d62], name: "c_incident_player_iterator" },
  { ids: [0x808037a6, 0x808037a7], name: "c_interactable_host" },
  { ids: [0x808037ac, 0x808037ad], name: "c_objective_timer_host" },
  { ids: [0x808037ae, 0x808037b8], name: "c_encounter_manager" },
  { ids: [0x808037c8, 0x808037c9], name: "c_faction_host" },
  { ids: [0x808037d1, 0x808037d2], name: "c_loot_host" },
  { ids: [0x808037e0, 0x808037e3], name: "c_scoreboard_host" },
  { ids: [0x808037e6, 0x808037e7], name: "c_sequence_host" },
  { ids: [0x808037ea, 0x808037eb], name: "c_team_picker_host" },
  { ids: [0x80803429, 0x8080342c], name: "c_weapon_magazine" },
  { ids: [0x8080342f, 0x80803430], name: "c_weapon_reloader" },
  { ids: [0x80803431, 0x80803432], name: "c_weapon_continuous_reloader" },
  { ids: [0x80803433, 0x80803434], name: "c_weapon_heat" },
  { ids: [0x80803435, 0x80803436], name: "c_weapon_battery" },
  { ids: [0x808003b7, 0x808003b8], name: "c_component_slot" },
  { ids: [0x8080098f, 0x80800991], name: "c_marker_list" },
  { ids: [0x8080276c, 0x8080276e], name: "c_hop_on_pattern" },
  { ids: [0x80800a5f], name: "c_encounter_handle" },
  { ids: [0x808003ec], name: "c_class_tag_handle" },
  { ids: [0x80800034], name: "c_blueprint_handle" },
  { ids: [0x8080045a], name: "c_component_handle" },
  { ids: [0x80800003], name: "c_common_reference" },
  { ids: [0x8080013b], name: "c_tag_reference" },
  { ids: [0x808003dd], name: "c_interface_reference" },
  { ids: [0x80802ee6], name: "c_damage_impulse_description_pointer" },
  { ids: [0x80802ee7], name: "c_damage_impulse_exemptions_pointer" },
  { ids: [0x80802ee9], name: "c_damage_impulse_victim_response_pointer" },
  { ids: [0x80802eea], name: "c_damage_impulse_attacker_responses_pointer" },
  { ids: [0x80802f8e], name: "c_filtered_property_block_pointer" },
  { ids: [0x80802f8c], name: "c_damage_attacker_list_block" },
  { ids: [0x80802f8d], name: "c_hop_on_state_block" },
  { ids: [0x80803674], name: "s_ability_configuration" },
  { ids: [0x80803675], name: "s_perk_configuration" },
  { ids: [0x80802582], name: "s_damage_scalar_values" },
  { ids: [0x80802ed6], name: "s_damage_impulse_description" },
  { ids: [0x80800850], name: "s_damage_labels_spec" },
  { ids: [0x80802eda], name: "s_damage_impulse_exemptions" },
  { ids: [0x80802ee2], name: "s_damage_impulse_victim_response" },
  { ids: [0x80802edf], name: "s_damage_impulse_attacker_responses" },
  { ids: [0x80802ef2], name: "s_ping_damage_memory_definition" },
  { ids: [0x80802ef3], name: "s_ping_damage_memory_instance" },
  { ids: [0x80802f69], name: "s_damage_state" },
  { ids: [0x80800972], name: "s_damage_part_selection" },
  { ids: [0x808026f3], name: "s_damage_acceleration_scale" },
  { ids: [0x80802501], name: "s_biped_sheet" },
  { ids: [0x80802eba], name: "s_damage_impulse_behavior" },
  { ids: [0x80802ef8], name: "s_damage_response" },
  { ids: [], name: "s_damage_section_definition" },
  { ids: [], name: "s_damage_section_instance" },
  { ids: [], name: "s_damage_meter_channel_provider_definition" },
  { ids: [], name: "s_damage_meter_channel_provider_instance" },
  { ids: [0x80802f86], name: "f_damage_component_local_flags" },
  { ids: [0x80802585], name: "e_damage_type" },
  { ids: [0x80802581], name: "e_damage_scalar" },
  { ids: [0x80802ee4], name: "e_damage_scalar_modifier_operation" },
  {
    ids: [0x80802ee8],
    name: "dynamic_array<s_damage_impulse_behavior_element>",
  },
  { ids: [0x80802eeb], name: "dynamic_array<s_damage_scalar_modifier>" },
  { ids: [0x80802f7a], name: "dynamic_array<s_damage_section_definition>" },
  { ids: [0x80802f8f], name: "dynamic_array<s_damage_section_instance>" },
  {
    ids: [0x80802f7b],
    name: "dynamic_array<s_damage_component_behavior_element>",
  },
  { ids: [0x80802f7c], name: "dynamic_array<s_damage_routing>" },
  { ids: [0x80802f7d], name: "dynamic_array<s_damage_intercept>" },
  { ids: [0x80802f7e], name: "dynamic_array<s_shield_section>" },
  { ids: [0x80802f7f], name: "dynamic_array<s_damage_meter_definition>" },
  { ids: [0x80802f80], name: "dynamic_array<s_damage_region_definition>" },
  { ids: [0x80802f81], name: "dynamic_array<s_damage_garbage_region>" },
  {
    ids: [0x80802f82],
    name: "dynamic_array<s_damage_meter_channel_provider_definition>",
  },
  {
    ids: [0x80802f88],
    name: "dynamic_array<s_damage_meter_channel_provider_instance>",
  },
  { ids: [0x80802f83], name: "dynamic_array<s_ping_region_definition>" },
  { ids: [0x80802f87], name: "dynamic_array<s_damage_meter_instance>" },
  { ids: [0x80802f89], name: "dynamic_array<s_damage_region_instance>" },
  { ids: [0x80802f8a], name: "dynamic_array<c_sequence_handle>" },
  { ids: [0x8080018f], name: "dynamic_array<int>" },
  { ids: [0x80802ab2], name: "dynamic_array<s_perk_list_entry>" },
  { ids: [0x80802add], name: "dynamic_array<s_preset_debug_build>" },
  { ids: [0x80802ae0], name: "dynamic_array<s_character_settings>" },
  { ids: [0x80802a86], name: "dynamic_array<string_hash>" },
  { ids: [0x80802aa0], name: "dynamic_array<s_grouped_translation_table>" },
  { ids: [0x80802aa1], name: "dynamic_array<real>" },
  { ids: [0x80802aac], name: "dynamic_array<s_translation_channel>" },
  { ids: [0x80802aad], name: "dynamic_array<s_translation_group>" },
  { ids: [0x80802adf], name: "static_array<c_common_reference, 3>" },
  { ids: [0x80802f79], name: "static_array<s_stat_definition, 16>" },
  { ids: [0x80802f85], name: "static_array<s_stat_instance, 16>" },
  { ids: [0x8080321a], name: "static_array<int, 4>" },
  { ids: [0x808006d4], name: "static_array<int, 4>" },
  { ids: [0x80802ade], name: "static_stack<s_weapon_settings, 16>" },
  { ids: [0x80802f8b], name: "static_stack<s_damage_multiplier, 16>" },
  { ids: [0x8080063b], name: "c_effect_handle" },
  { ids: [0x80800385], name: "delegate" },
  { ids: [0x80800386], name: "native_delegate" },
  { ids: [0x80802a94], name: "native_delegate" },
  { ids: [0x80802ad2], name: "native_delegate" },
  { ids: [0x80800472, 0x80800473], name: "thread" },
  { ids: [0x8080057d], name: "i_finalize" },
  { ids: [0x80800581], name: "i_render_debug" },
  { ids: [0x80800588], name: "i_update_prephysics" },
  { ids: [0x8080058a], name: "i_update_postmove" },
  { ids: [0x80800810], name: "i_network_manual_update" },
  { ids: [0x8080083b], name: "i_message_handler" },
  { ids: [0x8080096e], name: "i_selector" },
  { ids: [0x80800970], name: "i_part_owner" },
  { ids: [0x808026f5], name: "i_damageable" },
  { ids: [0x80802a98], name: "i_weapon_stats" },
  { ids: [0x80802a9a], name: "i_biped_stat_translator" },
  { ids: [0x80802a9c], name: "i_weapon_stat_translator" },
  { ids: [0x80802aa4], name: "i_player_biped_sheet_instance" },
  { ids: [0x80802aaa], name: "i_weapon_stat_translator_instance" },
  { ids: [0x80802f77], name: "i_damage_component_instance" },
];

export function nativeBaseById(
  id: number
): (BsNativeBase & BsNativeBaseIds) | undefined {
  const entry = NATIVE_BASE_IDS.find(
    (base) => base.definition === id || base.instance === id
  );
  const base = entry && nativeBaseNamed(entry.name);
  return base && { ...base, ...entry };
}

export function nativeTypeById(
  id: number
): (BsNativeType & BsNativeTypeIds) | undefined {
  const entry = NATIVE_TYPE_IDS.find((type) => type.ids.includes(id));
  const type = entry && nativeTypeNamed(entry.name);
  return type && { ...type, ...entry };
}
