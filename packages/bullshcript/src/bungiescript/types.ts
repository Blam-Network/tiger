// Names a BungieScript body may use without declaring them, with the kind and
// module path the compiler puts in the import: every import of every alpha
// upvalue_provider.

export type BsImportKind = "class" | "enum" | "schema";

export interface BsRegistryEntry {
  readonly kind: BsImportKind;
  readonly name: string;
  readonly path: string;
}

export const IMPORT_REGISTRY: readonly BsRegistryEntry[] = [
  { name: "bundlelib", kind: "class", path: "native.bundlelib.bundlelib" },
  {
    name: "c_incident_utilities",
    kind: "class",
    path: "native.spasahalib.c_incident_utilities",
  },
  {
    name: "c_lifetime_script_utilities",
    kind: "class",
    path: "native.activitylib.c_lifetime_script_utilities",
  },
  {
    name: "c_player_datum",
    kind: "class",
    path: "players.player_datum.c_player_datum",
  },
  {
    name: "c_player_script_iterator",
    kind: "class",
    path: "native.activitylib.c_player_script_iterator",
  },
  {
    name: "c_player_script_utilities",
    kind: "class",
    path: "native.activitylib.c_player_script_utilities",
  },
  {
    name: "c_sandbox_configuration",
    kind: "class",
    path: "sandbox.sandbox_configuration.c_sandbox_configuration",
  },
  {
    name: "c_scoreboard_script_utilities",
    kind: "class",
    path: "native.spasahalib.c_scoreboard_script_utilities",
  },
  {
    name: "c_sobject_binding",
    kind: "class",
    path: "native.sobjectslib.c_sobject_binding",
  },
  {
    name: "c_sobject_blueprint_instance",
    kind: "schema",
    path: "native.sobjectslib.c_sobject_blueprint_instance",
  },
  {
    name: "e_abilities",
    kind: "enum",
    path: "sandbox.ability_enums.e_abilities",
  },
  {
    name: "e_activity_lifetime_state",
    kind: "enum",
    path: "native.activitylib.e_activity_lifetime_state",
  },
  {
    name: "e_armor_perks",
    kind: "enum",
    path: "sandbox.perk_enums.e_armor_perks",
  },
  {
    name: "e_assault_rifle_type",
    kind: "enum",
    path: "weapons.weapon_translation_assault_rifles.e_assault_rifle_type",
  },
  {
    name: "e_biped_stat",
    kind: "enum",
    path: "native.spasahalib.e_biped_stat",
  },
  {
    name: "e_character_perks",
    kind: "enum",
    path: "sandbox.perk_enums.e_character_perks",
  },
  {
    name: "e_command_script_state",
    kind: "enum",
    path: "native.activitylib.e_command_script_state",
  },
  {
    name: "e_damage_channel_provider_type",
    kind: "enum",
    path: "native.spasahalib.e_damage_channel_provider_type",
  },
  {
    name: "e_damage_scalar",
    kind: "enum",
    path: "native.spasahalib.e_damage_scalar",
  },
  {
    name: "e_damage_scalar_modifier_operation",
    kind: "enum",
    path: "native.spasahalib.e_damage_scalar_modifier_operation",
  },
  {
    name: "e_damage_type",
    kind: "enum",
    path: "native.spasahalib.e_damage_type",
  },
  {
    name: "e_damageable_stat",
    kind: "enum",
    path: "native.spasahalib.e_damageable_stat",
  },
  {
    name: "e_hand_cannon_type",
    kind: "enum",
    path: "weapons.weapon_translation_hand_cannons.e_hand_cannon_type",
  },
  {
    name: "e_investment_character_stats",
    kind: "enum",
    path: "native.spasahalib.e_investment_character_stats",
  },
  {
    name: "e_investment_weapon_stats",
    kind: "enum",
    path: "native.spasahalib.e_investment_weapon_stats",
  },
  {
    name: "e_laser_blaster_type",
    kind: "enum",
    path: "weapons.weapon_translation_laser_blasters.e_laser_blaster_type",
  },
  {
    name: "e_machine_gun_type",
    kind: "enum",
    path: "weapons.weapon_translation_machine_guns.e_machine_gun_type",
  },
  { name: "e_perk_type", kind: "enum", path: "native.spasahalib.e_perk_type" },
  {
    name: "e_resource_pool_stat",
    kind: "enum",
    path: "native.spasahalib.e_resource_pool_stat",
  },
  {
    name: "e_rocket_launcher_type",
    kind: "enum",
    path: "weapons.weapon_translation_rocket_launchers.e_rocket_launcher_type",
  },
  {
    name: "e_sandbox_character_gear_slot",
    kind: "enum",
    path: "native.spasahalib.e_sandbox_character_gear_slot",
  },
  {
    name: "e_sandbox_gear_dye_slot",
    kind: "enum",
    path: "native.spasahalib.e_sandbox_gear_dye_slot",
  },
  {
    name: "e_sandbox_ship_gear_slot",
    kind: "enum",
    path: "native.spasahalib.e_sandbox_ship_gear_slot",
  },
  {
    name: "e_sandbox_weapon_dye_slot",
    kind: "enum",
    path: "native.spasahalib.e_sandbox_weapon_dye_slot",
  },
  {
    name: "e_sandbox_weapon_gear_slot",
    kind: "enum",
    path: "native.spasahalib.e_sandbox_weapon_gear_slot",
  },
  {
    name: "e_sequence_suppression_behavior",
    kind: "enum",
    path: "native.spasahalib.e_sequence_suppression_behavior",
  },
  {
    name: "e_shotgun_type",
    kind: "enum",
    path: "weapons.weapon_translation_shotguns.e_shotgun_type",
  },
  {
    name: "e_sniper_rifle_type",
    kind: "enum",
    path: "weapons.weapon_translation_sniper_rifles.e_sniper_rifle_type",
  },
  {
    name: "e_submachine_gun_type",
    kind: "enum",
    path: "weapons.weapon_translation_submachine_guns.e_submachine_gun_type",
  },
  {
    name: "e_trigger_behavior",
    kind: "enum",
    path: "native.spasahalib.e_trigger_behavior",
  },
  {
    name: "e_weapon_barrel_stat",
    kind: "enum",
    path: "native.spasahalib.e_weapon_barrel_stat",
  },
  {
    name: "e_weapon_magazine_stat",
    kind: "enum",
    path: "native.spasahalib.e_weapon_magazine_stat",
  },
  {
    name: "e_weapon_perks",
    kind: "enum",
    path: "sandbox.perk_enums.e_weapon_perks",
  },
  {
    name: "e_weapon_reload_stat",
    kind: "enum",
    path: "native.spasahalib.e_weapon_reload_stat",
  },
  {
    name: "e_weapon_stat",
    kind: "enum",
    path: "native.spasahalib.e_weapon_stat",
  },
  {
    name: "e_weapon_trigger_charge_stat",
    kind: "enum",
    path: "native.spasahalib.e_weapon_trigger_charge_stat",
  },
  {
    name: "i_channel_manager",
    kind: "schema",
    path: "native.sobjectslib.i_channel_manager",
  },
  {
    name: "i_inventory",
    kind: "schema",
    path: "native.spasahalib.i_inventory",
  },
  { name: "i_weapon", kind: "schema", path: "native.spasahalib.i_weapon" },
  {
    name: "i_weapon_barrel",
    kind: "schema",
    path: "native.spasahalib.i_weapon_barrel",
  },
  {
    name: "i_weapon_content",
    kind: "schema",
    path: "native.spasahalib.i_weapon_content",
  },
  {
    name: "i_weapon_input",
    kind: "schema",
    path: "native.spasahalib.i_weapon_input",
  },
  {
    name: "i_weapon_magazine",
    kind: "schema",
    path: "native.spasahalib.i_weapon_magazine",
  },
  {
    name: "i_weapon_reload",
    kind: "schema",
    path: "native.spasahalib.i_weapon_reload",
  },
  {
    name: "i_weapon_trigger",
    kind: "schema",
    path: "native.spasahalib.i_weapon_trigger",
  },
  {
    name: "i_weapon_trigger_charge",
    kind: "schema",
    path: "native.spasahalib.i_weapon_trigger_charge",
  },
  { name: "mathlib", kind: "class", path: "util.mathlib.mathlib" },
  {
    name: "nativemathlib",
    kind: "class",
    path: "native.spasahalib.nativemathlib",
  },
  {
    name: "s_cosmetic_garbage_response",
    kind: "schema",
    path: "object_bs.damage.damage_component.s_cosmetic_garbage_response",
  },
  {
    name: "s_custom_damage_scalar_behavior",
    kind: "schema",
    path: "object_bs.damage.damage_impulse.s_custom_damage_scalar_behavior",
  },
  {
    name: "s_custom_routing_behavior",
    kind: "schema",
    path: "object_bs.damage.damage_impulse.s_custom_routing_behavior",
  },
  {
    name: "s_damage_attacker_list",
    kind: "schema",
    path: "native.spasahalib.s_damage_attacker_list",
  },
  {
    name: "s_damage_component_behavior_hop_on",
    kind: "schema",
    path: "native.spasahalib.s_damage_component_behavior_hop_on",
  },
  {
    name: "s_damage_component_behavior_provides_game_channels",
    kind: "schema",
    path: "native.spasahalib.s_damage_component_behavior_provides_game_channels",
  },
  {
    name: "s_damage_component_behavior_scaled_physics_response",
    kind: "schema",
    path: "native.spasahalib.s_damage_component_behavior_scaled_physics_response",
  },
  {
    name: "s_damage_component_behavior_shared_ping_bucket",
    kind: "schema",
    path: "native.spasahalib.s_damage_component_behavior_shared_ping_bucket",
  },
  {
    name: "s_damage_component_behavior_tracks_recent_attackers",
    kind: "schema",
    path: "native.spasahalib.s_damage_component_behavior_tracks_recent_attackers",
  },
  {
    name: "s_damage_impulse_behavior_aim_deflection",
    kind: "schema",
    path: "native.spasahalib.s_damage_impulse_behavior_aim_deflection",
  },
  {
    name: "s_damage_impulse_behavior_custom_shield_behavior",
    kind: "schema",
    path: "native.spasahalib.s_damage_impulse_behavior_custom_shield_behavior",
  },
  {
    name: "s_damage_impulse_behavior_death_hopon",
    kind: "schema",
    path: "native.spasahalib.s_damage_impulse_behavior_death_hopon",
  },
  {
    name: "s_damage_impulse_behavior_intercept_only",
    kind: "schema",
    path: "native.spasahalib.s_damage_impulse_behavior_intercept_only",
  },
  {
    name: "s_damage_impulse_behavior_makes_custom_audio",
    kind: "schema",
    path: "native.spasahalib.s_damage_impulse_behavior_makes_custom_audio",
  },
  {
    name: "s_damage_impulse_behavior_named_ping",
    kind: "schema",
    path: "native.spasahalib.s_damage_impulse_behavior_named_ping",
  },
  {
    name: "s_damage_impulse_behavior_performs_acceleration",
    kind: "schema",
    path: "native.spasahalib.s_damage_impulse_behavior_performs_acceleration",
  },
  {
    name: "s_damage_impulse_behavior_performs_restoration",
    kind: "schema",
    path: "native.spasahalib.s_damage_impulse_behavior_performs_restoration",
  },
  {
    name: "s_damage_impulse_behavior_player_feedback_modifier",
    kind: "schema",
    path: "native.spasahalib.s_damage_impulse_behavior_player_feedback_modifier",
  },
  {
    name: "s_damage_impulse_behavior_precision_target_behavior",
    kind: "schema",
    path: "native.spasahalib.s_damage_impulse_behavior_precision_target_behavior",
  },
  {
    name: "s_damage_response_cosmetic",
    kind: "schema",
    path: "native.spasahalib.s_damage_response_cosmetic",
  },
  {
    name: "s_damage_response_spawns_garbage",
    kind: "schema",
    path: "native.spasahalib.s_damage_response_spawns_garbage",
  },
  {
    name: "s_hop_on_instance_state",
    kind: "schema",
    path: "native.spasahalib.s_hop_on_instance_state",
  },
  {
    name: "weapon_utils",
    kind: "class",
    path: "weapons.weapon_utils.weapon_utils",
  },
];
