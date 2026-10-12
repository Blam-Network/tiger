import { describe, expect, it } from "vitest";
import { py2DictOrder, py2StringHash } from "../../src/bungiescript/pydict.ts";

// Reference values from CPython 2.7.18 (hash(s) & 0xffffffff and list(d)),
// crossing the 8 -> 32 -> 128 slot resizes.

const HASHES: readonly [string, number][] = [
  ["bundlelib", 3_962_745_460],
  ["mathlib", 4_228_493_224],
  ["print", 3_047_772_856],
  ["__coro_yield", 942_420_467],
  ["predicate_pack", 3_324_737_407],
  ["a", 3_826_102_752],
  ["e_command_script_state", 3_600_573_899],
  ["", 0],
];

const ORDERS: readonly { keys: string[]; order: string[] }[] = [
  {
    keys: [
      "e_sandbox_character_gear_slot",
      "e_biped_stat",
      "s_damage_attacker_list",
    ],
    order: [
      "s_damage_attacker_list",
      "e_sandbox_character_gear_slot",
      "e_biped_stat",
    ],
  },
  {
    keys: [
      "c_sandbox_configuration",
      "i_weapon_content",
      "e_sandbox_weapon_gear_slot",
      "c_player_script_utilities",
      "i_weapon",
    ],
    order: [
      "i_weapon",
      "c_sandbox_configuration",
      "e_sandbox_weapon_gear_slot",
      "c_player_script_utilities",
      "i_weapon_content",
    ],
  },
  {
    // the sixth key resizes the table to 32 slots
    keys: [
      "c_player_datum",
      "e_weapon_magazine_stat",
      "c_sandbox_configuration",
      "c_sobject_binding",
      "e_weapon_barrel_stat",
      "s_damage_response_spawns_garbage",
    ],
    order: [
      "e_weapon_magazine_stat",
      "c_sobject_binding",
      "s_damage_response_spawns_garbage",
      "c_player_datum",
      "e_weapon_barrel_stat",
      "c_sandbox_configuration",
    ],
  },
  {
    keys: [
      "e_activity_lifetime_state",
      "e_damageable_stat",
      "s_custom_damage_scalar_behavior",
      "event_error",
      "i_weapon_trigger",
      "e_sniper_rifle_type",
      "vector4",
      "c_player_script_iterator",
      "print",
      "e_perk_type",
      "e_assault_rifle_type",
      "e_rocket_launcher_type",
    ],
    order: [
      "e_rocket_launcher_type",
      "e_damageable_stat",
      "e_assault_rifle_type",
      "e_activity_lifetime_state",
      "i_weapon_trigger",
      "vector4",
      "event_error",
      "e_perk_type",
      "c_player_script_iterator",
      "e_sniper_rifle_type",
      "print",
      "s_custom_damage_scalar_behavior",
    ],
  },
  {
    // 22 keys: the last insert resizes to 128 slots
    keys: [
      "predicate_pack",
      "e_activity_lifetime_state",
      "e_submachine_gun_type",
      "s_damage_impulse_behavior_death_hopon",
      "e_assault_rifle_type",
      "e_weapon_stat",
      "c_player_datum",
      "s_cosmetic_garbage_response",
      "s_damage_component_behavior_tracks_recent_attackers",
      "i_weapon_barrel",
      "s_damage_impulse_behavior_performs_restoration",
      "e_machine_gun_type",
      "nativemathlib",
      "i_weapon",
      "i_channel_manager",
      "e_shotgun_type",
      "allocate",
      "s_damage_impulse_behavior_performs_acceleration",
      "s_hop_on_instance_state",
      "i_weapon_content",
      "c_player_script_iterator",
      "i_weapon_input",
    ],
    order: [
      "s_cosmetic_garbage_response",
      "e_assault_rifle_type",
      "s_damage_component_behavior_tracks_recent_attackers",
      "s_damage_impulse_behavior_performs_restoration",
      "e_weapon_stat",
      "e_shotgun_type",
      "s_damage_impulse_behavior_death_hopon",
      "s_damage_impulse_behavior_performs_acceleration",
      "i_weapon_content",
      "e_submachine_gun_type",
      "c_player_datum",
      "i_channel_manager",
      "allocate",
      "c_player_script_iterator",
      "i_weapon",
      "i_weapon_barrel",
      "nativemathlib",
      "s_hop_on_instance_state",
      "e_activity_lifetime_state",
      "i_weapon_input",
      "e_machine_gun_type",
      "predicate_pack",
    ],
  },
  {
    keys: [
      "s_damage_attacker_list",
      "predicate_pack",
      "s_damage_impulse_behavior_precision_target_behavior",
      "e_machine_gun_type",
      "e_sequence_suppression_behavior",
      "s_custom_routing_behavior",
      "c_lifetime_script_utilities",
      "e_weapon_barrel_stat",
      "e_biped_stat",
      "e_abilities",
      "c_player_script_utilities",
      "s_damage_component_behavior_scaled_physics_response",
      "is_instance",
      "e_damage_type",
      "e_sandbox_gear_dye_slot",
      "s_damage_impulse_behavior_death_hopon",
      "c_sandbox_configuration",
      "event_error",
      "e_weapon_perks",
      "s_damage_impulse_behavior_aim_deflection",
      "__coro_yield",
      "s_damage_component_behavior_provides_game_channels",
      "print",
      "e_rocket_launcher_type",
      "e_laser_blaster_type",
      "s_damage_impulse_behavior_performs_restoration",
      "s_damage_component_behavior_tracks_recent_attackers",
      "assert",
      "e_activity_lifetime_state",
      "e_character_perks",
      "s_damage_component_behavior_shared_ping_bucket",
      "weapon_utils",
      "e_sniper_rifle_type",
      "e_command_script_state",
      "bundlelib",
      "s_damage_impulse_behavior_intercept_only",
      "e_damageable_stat",
      "e_sandbox_ship_gear_slot",
      "i_weapon_trigger",
      "e_submachine_gun_type",
    ],
    order: [
      "e_rocket_launcher_type",
      "e_character_perks",
      "e_biped_stat",
      "s_damage_impulse_behavior_performs_restoration",
      "c_lifetime_script_utilities",
      "s_damage_impulse_behavior_aim_deflection",
      "e_weapon_perks",
      "event_error",
      "weapon_utils",
      "e_sniper_rifle_type",
      "s_damage_impulse_behavior_death_hopon",
      "e_damageable_stat",
      "e_damage_type",
      "e_submachine_gun_type",
      "e_laser_blaster_type",
      "s_damage_component_behavior_tracks_recent_attackers",
      "e_weapon_barrel_stat",
      "c_sandbox_configuration",
      "i_weapon_trigger",
      "print",
      "e_sandbox_ship_gear_slot",
      "s_custom_routing_behavior",
      "s_damage_component_behavior_provides_game_channels",
      "s_damage_impulse_behavior_intercept_only",
      "e_command_script_state",
      "is_instance",
      "assert",
      "e_abilities",
      "s_damage_component_behavior_scaled_physics_response",
      "e_sequence_suppression_behavior",
      "s_damage_component_behavior_shared_ping_bucket",
      "s_damage_impulse_behavior_precision_target_behavior",
      "e_sandbox_gear_dye_slot",
      "e_activity_lifetime_state",
      "__coro_yield",
      "bundlelib",
      "c_player_script_utilities",
      "e_machine_gun_type",
      "s_damage_attacker_list",
      "predicate_pack",
    ],
  },
];

describe("the CPython 2 dict model", () => {
  it("hashes strings as string_hash() does", () => {
    for (const [key, hash] of HASHES) {
      expect(py2StringHash(key), key).toBe(hash);
    }
  });

  it("iterates as Python 2.7 does across resizes", () => {
    for (const { keys, order } of ORDERS) {
      expect(py2DictOrder(keys)).toEqual(order);
    }
  });

  it("ignores repeated keys", () => {
    expect(py2DictOrder(["print", "assert", "print"])).toEqual(
      py2DictOrder(["print", "assert"])
    );
  });

  // c_damage_impulse's upvalue_provider, which only comes out right when
  // the chunk's other globals (schema, print...) are keys too
  it("orders c_damage_impulse's imports by its global keys", () => {
    const keys = [
      "s_custom_routing_behavior",
      "e_damage_scalar",
      "schema",
      "s_damage_impulse_behavior_precision_target_behavior",
      "e_damage_scalar_modifier_operation",
      "s_custom_damage_scalar_behavior",
      "s_damage_impulse_behavior_intercept_only",
      "s_damage_impulse_behavior_custom_shield_behavior",
      "s_damage_impulse_behavior_performs_restoration",
      "s_damage_impulse_behavior_performs_acceleration",
      "s_damage_impulse_behavior_named_ping",
      "s_damage_impulse_behavior_death_hopon",
      "s_damage_impulse_behavior_makes_custom_audio",
      "s_damage_impulse_behavior_player_feedback_modifier",
      "s_damage_impulse_behavior_aim_deflection",
    ];
    expect(py2DictOrder(keys).filter((key) => key !== "schema")).toEqual([
      "s_custom_routing_behavior",
      "e_damage_scalar",
      "s_damage_impulse_behavior_death_hopon",
      "s_damage_impulse_behavior_precision_target_behavior",
      "s_damage_impulse_behavior_makes_custom_audio",
      "s_damage_impulse_behavior_performs_restoration",
      "e_damage_scalar_modifier_operation",
      "s_damage_impulse_behavior_player_feedback_modifier",
      "s_damage_impulse_behavior_performs_acceleration",
      "s_damage_impulse_behavior_custom_shield_behavior",
      "s_damage_impulse_behavior_aim_deflection",
      "s_damage_impulse_behavior_named_ping",
      "s_damage_impulse_behavior_intercept_only",
      "s_custom_damage_scalar_behavior",
    ]);
  });
});
