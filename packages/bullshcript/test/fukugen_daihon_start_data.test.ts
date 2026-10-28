// How each authored activity starts, per build: the scripts' start decorators
// against the values the consumer used to hold for the builds that have none
// in their packages (41375 ships no scenario_fah) and against the alpha's
// host-only scenario_fah (initial bubble +0x1C, VERIFIED 8/8) with the phases
// the strike runs. A slice is named by its region, the name whose fnv1 the
// scenario client's bubble holds. The state it starts in is the one the named
// startPhase owns there (the packages settle which), none when no phase plays
// in the slice.
//
// The activities with no encounter written yet are a script of only start
// decorators, at the region of the first bubble their scenario client uses
// (state 0) where no capture says otherwise. The PS4 1.33 build (evil) holds
// the same starts for the activities it has, with the captures' region spawns.
import {
  compiledScriptSetOf,
  compileScriptFiles,
  fnv1,
  loadScriptFolder,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ALPHA_BUILD,
  BETATH_BUILD,
  EVIL_BUILD,
  FF_BUILD,
  fukugenDaihonBuildDir,
  PUBALPHA_BUILD,
  TU0_BUILD,
} from "../tools/fukugen-daihon/folder.ts";

interface ExpectedStart {
  destination: string;
  phases?: readonly (readonly [string, string])[];
  // a spawn point's name (fnv1 is the GAS spawn transition), or the hash
  spawnPoint?: string;
  spawnTransition?: number;
  // the phase that owns the start state, by name
  startPhase?: string;
  startSlice?: string;
}

const EMPTY_NAME_HASH = fnv1("");

// A script of only start decorators: the slice, no phases, no spawn point.
function startsIn(destination: string, startSlice: string): ExpectedStart {
  return { destination, startSlice };
}

// Build 41375: every activity the server started from captures.
const TU0_STARTS: Readonly<Record<string, ExpectedStart>> = {
  act_cosmo_m0_5_hangar: {
    destination: "cosmo",
    startSlice: "delta_s",
    startPhase: "cosmo_m0_5_phase00_delta_s",
    phases: [
      ["cosmo_m0_5_phase00_delta_s", "delta_s"],
      ["cosmo_m0_5_phase01_hangar", "hangar"],
      ["cosmo_m0_5_phase02_hangar", "hangar"],
    ],
    spawnTransition: 0x2e_a8_fb_98,
  },
  act_cosmo_m0_highway: {
    destination: "cosmo",
    startSlice: "highway",
    startPhase: "cosmo_m0_phase00_highway_intro",
    phases: [
      ["cosmo_m0_phase00_highway_intro", "highway"],
      ["cosmo_m0_phase00_highway", "highway"],
      ["cosmo_m0_phase01_breach", "breach"],
      ["cosmo_m0_phase01b_breach", "graveyard"],
      ["cosmo_m0_phase02_graveyard", "graveyard"],
      ["cosmo_m0_phase03_hangar", "hangar"],
      ["cosmo_m0_phase04_outro", "hangar"],
    ],
    spawnTransition: 0xea_ec_23_35,
  },
  act_cosmo_m1_dome_a: {
    destination: "cosmo",
    startSlice: "delta_s",
    phases: [
      ["cosmo_m1_phase00_dome_a", "dome_a"],
      ["cosmo_m1_phase01_dome_a", "dome_a"],
      ["cosmo_m1_phase_end", "dome_a"],
    ],
  },
  act_cosmo_m2_dome_c: {
    destination: "cosmo",
    startSlice: "delta_s",
    phases: [
      ["cosmo_m2_phase00_delta_n", "delta_n"],
      ["cosmo_m2_phase01_dry_sea", "dry_sea"],
      ["cosmo_m2_phase02_dome_c", "dome_c"],
      ["cosmo_m2_phase03_dome_c", "dome_c"],
      ["cosmo_m2_phase04_dome_c", "dome_c"],
    ],
  },
  act_cosmo_m4_dome_c: {
    destination: "cosmo",
    startSlice: "delta_n",
    phases: [
      ["cosmo_m4_phase00_array", "array"],
      ["cosmo_m4_phase01_dome_c", "dome_c"],
      ["cosmo_m4_phase02_dome_c", "dome_c"],
      ["cosmo_m4_phase_end", "dome_c"],
    ],
  },
  act_mars_m01_valley: {
    destination: "mars",
    startSlice: "plains",
    startPhase: "phase_plains_cinematic",
    phases: [
      ["phase_plains_cinematic", "plains"],
      ["phase_plains_intro", "plains"],
      ["phase_plains_base", "plains"],
      ["phase_checkpoint", "cabal_checkpoint"],
      ["phase_checkpoint_boss", "cabal_checkpoint"],
      ["phase_valley", "valley"],
    ],
  },
  act_mars_m05_warbase: {
    destination: "mars",
    startSlice: "plains",
    phases: [
      ["phase_1_rubicon_goto", "rubicon"],
      ["phase_3_mesa_goto", "mesa"],
      ["phase_4_mesa", "mesa"],
      ["phase_5_gatehouse_goto", "gatehouse"],
      ["phase_6_gatehouse", "gatehouse"],
      ["phase_7_warbase_goto", "warbase"],
      ["phase_7_5_warbase", "warbase"],
      ["phase_8_warbase", "warbase"],
      ["phase_warbase_complete", "warbase"],
    ],
    spawnPoint: "landing_zone",
  },
  act_mars_m06_subway: {
    destination: "mars",
    startSlice: "plains",
    phases: [
      ["phase_m06_battleground_goto", "battleground"],
      ["phase_m06_battleground", "battleground"],
      ["phase_m06_lobby_goto", "lobby"],
      ["phase_m06_lobby_s", "lobby"],
      ["phase_m06_lobby_n", "lobby"],
      ["phase_m06_subway_goto", "subway"],
      ["phase_m06_subway", "subway"],
      ["phase_m06_subway_close", "subway"],
    ],
    spawnPoint: "landing_zone",
  },
  act_mars_m07_lowergarden: {
    destination: "mars",
    startSlice: "plains",
    startPhase: "phase_plains",
    phases: [
      ["phase_plains", "plains"],
      ["phase_valley", "valley"],
      ["phase_catacombs", "catacombs"],
      ["phase_uppergarden", "uppergarden"],
      ["phase_lowergarden", "lowergarden"],
      ["phase_lowergarden_cinematic", "lowergarden"],
      ["phase_lowergarden_hopdown", "lowergarden"],
      ["phase_lowergarden_darkness", "lowergarden"],
      ["phase_lowergarden_climax", "lowergarden"],
      ["phase_lowergarden_final", "lowergarden"],
    ],
    spawnPoint: "landing_zone",
  },
  act_moon_m1_launchtubes: {
    destination: "moon",
    startSlice: "accelerator",
    startPhase: "phase_intro_cin",
    phases: [
      ["phase_intro_cin", "accelerator"],
      ["phase_1_accelerator", "accelerator"],
      ["phase_moonbase", "moonbase"],
      ["phase_goto_launchtubes", "launchtubes"],
      ["phase_3_launchtubes", "launchtubes"],
      ["phase_4_launchtubes", "launchtubes"],
      ["phase_door_launchtubes", "launchtubes"],
      ["phase_5_launchtubes", "launchtubes"],
      ["phase_launchtubes_complete", "launchtubes"],
    ],
    spawnTransition: 0x87_87_51_58,
  },
  act_moon_m3_lowercitadel: {
    destination: "moon",
    startSlice: "accelerator",
    phases: [
      ["phase_wisdom", "lowercitadel"],
      ["phase_lowercitadel", "lowercitadel"],
      ["phase_strength", "strength"],
      ["phase_strength_b", "strength"],
      ["phase_strength_complete", "strength"],
    ],
    spawnTransition: 0x87_87_51_58,
  },
  act_moon_m5_strength: {
    destination: "moon",
    startSlice: "hellmouth",
    startPhase: "phase_2_hellmouth",
    phases: [
      ["phase_2_hellmouth", "hellmouth"],
      ["phase_goto_launchtubes", "launchtubes"],
      ["phase_3_launchtubes", "launchtubes"],
      ["phase_cinematic", "launchtubes"],
      ["phase_goto_strength", "strength"],
      ["phase_strength_start", "strength"],
      ["phase_4_strength", "strength"],
      ["phase_strength_complete", "strength"],
    ],
    spawnPoint: "default",
  },
  act_venus_m01_engineering: {
    destination: "venus",
    startSlice: "shattered_coast",
    startPhase: "phase_shattered_coast_intro",
    phases: [
      ["phase_shattered_coast_intro", "shattered_coast"],
      ["phase_shattered_coast_sensors", "shattered_coast"],
      ["phase_entrance_goto", "entrance"],
      ["phase_entrance_vex_conflux", "entrance"],
      ["phase_entrance_resist_vex", "entrance"],
      ["phase_engineering_outro", "entrance"],
    ],
  },
  act_venus_m07_northern_tides: {
    destination: "venus",
    startSlice: "baby_shat",
    phases: [
      ["phase_complex_scan_node", "complex"],
      ["phase_southern_tides_goto", "southern_tides"],
      ["phase_northern_tides_ascend_steps", "northern_tides"],
      ["phase_northern_tides_boss", "northern_tides"],
      ["phase_northern_tides_outro", "northern_tides"],
    ],
    spawnTransition: 0xff_ba_6f_9c,
  },
  // Its 2.3.1 capture: baby_shat at the GAS's spawn, the Thieves' Den, the
  // dock and the ketch.
  act_venus_m06_ketch: {
    destination: "venus",
    startSlice: "baby_shat",
    phases: [
      ["phase_thieves_den_hunt_kell", "thieves_den"],
      ["phase_ketch_infiltrate", "dock"],
      ["phase_ketch_goto_throne", "ketch"],
      ["phase_ketch_kill_captain", "ketch"],
      ["phase_ketch_outro", "ketch"],
    ],
    spawnTransition: 0xff_ba_6f_9c,
  },
  // Its 2.3.1 capture: the accelerator at the GAS's spawn, then the launch
  // tubes and Selection (TU0's phases).
  act_moon_m7_selection: {
    destination: "moon",
    startSlice: "accelerator",
    startPhase: "phase_accelerator",
    phases: [
      ["phase_accelerator", "accelerator"],
      ["phase_launchtubes", "launchtubes"],
      ["phase_launchtubes_arena", "launchtubes"],
      ["phase_selection", "selection"],
      ["phase_selection_boss", "selection"],
      ["phase_selection_final", "selection"],
    ],
    spawnTransition: 0x87_87_51_58,
  },
  // Its 2.3.1 capture: baby_shat at the GAS's spawn, phase00 in the
  // headlands and the rest in the southern tides.
  act_venus_m02_southern_tides: {
    destination: "venus",
    startSlice: "baby_shat",
    phases: [
      ["phase00", "headlands"],
      ["phase_goto_tides", "southern_tides"],
      ["phase01", "southern_tides"],
      ["phase02", "southern_tides"],
      ["phase_southern_tides_outro", "southern_tides"],
    ],
    spawnTransition: 0xff_ba_6f_9c,
  },
  act_venus_m09_tower: {
    destination: "venus",
    startSlice: "complex",
    phases: [
      ["phase_lower_tower_goto", "lower_tower"],
      ["phase_lower_tower_elevator", "lower_tower"],
      ["phase_tower_find_boss", "tower"],
      ["phase_tower_kill_boss", "tower"],
      ["phase_tower_outro", "tower"],
    ],
  },
  cine_reveal: {
    destination: "cosmo",
    startSlice: "plaza",
    startPhase: "cine_106_trv_phase",
    phases: [
      ["cine_106_trv_phase", "plaza"],
      ["cine_107_twr_phase", "plaza"],
    ],
  },
  city_tower_default1: { destination: "city_tower", startSlice: "plaza" },
  city_tower_iron_banner: { destination: "city_tower", startSlice: "plaza" },
  city_tower_queen: { destination: "city_tower", startSlice: "plaza" },
  cosmo_portal_1: {
    destination: "cosmo",
    startSlice: "rocketyard",
    startPhase: "phase00",
    phases: [
      ["phase00", "rocketyard"],
      ["phase01", "refinery"],
      ["phase02", "refinery"],
      ["phase03", "refinery"],
      ["phase04", "blast"],
      ["phase05", "ship"],
      ["phase06", "ship"],
      ["phase07", "ship"],
    ],
    spawnPoint: "cosmo_portal_1_phase00",
  },
  cosmo_portal_2: {
    destination: "cosmo",
    startSlice: "dry_sea",
    startPhase: "phase00",
    phases: [
      ["phase00", "dry_sea"],
      ["phase01", "dome_c"],
      ["phase02", "dome_c"],
      ["phase03", "array"],
      ["phase04", "dome_hive"],
      ["phase05", "dome_hive"],
      ["phase06", "dome_hive"],
    ],
  },
  moon_portal_2: {
    destination: "moon",
    startSlice: "hellmouth",
    phases: [
      ["phase00", "0x447E4EB5"],
      ["phase01", "0x447E4EB5"],
      ["phase02", "0x447E4EB5"],
      ["phase03", "lowercitadel"],
      ["phase04", "0xF25CEA8D"],
      ["phase05", "0xF25CEA8D"],
    ],
  },
  venus_portal_1: {
    destination: "venus",
    startSlice: "plaza",
    spawnPoint: "venus_strike_1_phase01",
  },
  // The first bubble each scenario client uses (the moon's bubble 0 holds no
  // state, so its accelerator).
  mars_portal_1: startsIn("mars", "atrium"),
  mars_portal_2: startsIn("mars", "atrium"),
  mars_patrols_1: startsIn("mars", "atrium"),
  act_mars_m03_penthouse: startsIn("mars", "atrium"),
  venus_portal_2: startsIn("venus", "archive"),
  venus_raid_1: startsIn("venus", "archive"),
  venus_patrols_1: startsIn("venus", "archive"),
  act_venus_m03_thieves_den: startsIn("venus", "archive"),
  act_venus_m05_vault: startsIn("venus", "archive"),
  cosmo_patrols_1: startsIn("cosmo", "array"),
  act_cosmo_m5_refinery: startsIn("cosmo", "array"),
  // Its 2.3.1 capture: the lower garden, at the GAS's spawn; the upper
  // garden, then the Hypogeum.
  mars_portal_3: {
    destination: "mars",
    startSlice: "lowergarden",
    startPhase: "phase_lowergarden",
    phases: [
      ["phase_lowergarden", "lowergarden"],
      ["phase_uppergarden", "uppergarden"],
      ["phase_upper_uppergarden", "uppergarden"],
      ["phase_hypogeum", "hypogeum"],
      ["phase_boss", "hypogeum"],
      ["phase_end", "hypogeum"],
    ],
    spawnTransition: 0xfb_76_ec_c4,
  },
  // Its 2.3.1 capture: delta_n, no phase there, at the GAS's spawn; the
  // vendor bunker, then the core.
  act_cosmo_m6_rasputin: {
    destination: "cosmo",
    startSlice: "delta_n",
    phases: [
      ["phase_rasputin_vendor_main", "rasputin_vendor"],
      ["phase_rasputin_intro", "rasputin"],
      ["phase_rasputin_boss", "rasputin"],
      ["phase_rasputin_final", "rasputin"],
    ],
    spawnTransition: 0x2e_a8_fb_98,
  },
  act_cosmo_m7_command: startsIn("cosmo", "array"),
  moon_portal_1: startsIn("moon", "accelerator"),
  moon_patrols_1: startsIn("moon", "accelerator"),
  // Its 2.3.1 capture: the accelerator, the GAS's spawn, then the Hellmouth
  // and the upper citadel.
  act_moon_m4_uppercitadel: {
    destination: "moon",
    startSlice: "accelerator",
    phases: [
      ["phase_m4_hellmouth_goto", "hellmouth"],
      ["phase_m4_hellmouth", "hellmouth"],
      ["phase_m4_uppercitadel_goto", "uppercitadel"],
      ["phase_m4_uppercitadel", "uppercitadel"],
      ["phase_m4_uppercitadel_darkness", "uppercitadel"],
      ["phase_m4_uppercitadel_close", "uppercitadel"],
    ],
    spawnTransition: 0x87_87_51_58,
  },
  act_moon_m6_reactor: startsIn("moon", "accelerator"),
  // Its 2.3.1 capture: bubble 0, state 1, which cine_108_spk_phase owns.
  cine_speaker: {
    destination: "cinematic_trv",
    startSlice: "boulevard",
    startPhase: "cine_108_spk_phase",
    phases: [["cine_108_spk_phase", "boulevard"]],
  },
  // Its 2.3.1 capture: bubble 2, state 1, which cine_123a_end_phase owns.
  cine_end: {
    destination: "cinematic_trv",
    startSlice: "military",
    startPhase: "cine_123a_end_phase",
    phases: [["cine_123a_end_phase", "military"]],
  },
  // Its 2.3.1 capture: bubble 2 (region never cracked), state 1, which
  // phase_cine_1 owns; phase_cine_2 plays in queens_chamber.
  act_cinematic_queen_101: {
    destination: "cinematic_queen",
    startSlice: "0x1A8DC399",
    startPhase: "phase_cine_1",
    phases: [
      ["phase_cine_1", "0x1A8DC399"],
      ["phase_cine_2", "queens_chamber"],
    ],
  },
  // Both 2.3.1 captures: bubble 0, state 1, which phase_cine owns.
  act_cinematic_queen_102: {
    destination: "cinematic_queen",
    startSlice: "queens_chamber",
    startPhase: "phase_cine",
    phases: [["phase_cine", "queens_chamber"]],
  },
  pvp_anomaly: startsIn("pvp_anomaly", "pvp_anomaly"),
  pvp_cabal_camp: startsIn("pvp_cabal_camp", "pvp_cabal_camp"),
  pvp_city_defense: startsIn("pvp_city_defense", "pvp_city_defense"),
  pvp_colony_ship: startsIn("pvp_colony_ship", "pvp_colony_ship"),
  pvp_factory: startsIn("pvp_factory", "pvp_factory"),
  pvp_greenhouse: startsIn("pvp_greenhouse", "pvp_greenhouse"),
  pvp_marsbattle: startsIn("pvp_marsbattle", "pvp_marsbattle"),
  pvp_moonbase: startsIn("pvp_moonbase", "pvp_moonbase"),
  pvp_rooftops: startsIn("pvp_rooftops", "pvp_rooftops"),
  pvp_venus_hcc: startsIn("pvp_venus_hcc", "pvp_venus_hcc"),
  pvp_vex_tube: startsIn("pvp_vex_tube", "pvp_vex_tube"),
};

// The spawn transition the GAS names for a region once a client has been
// there (act_cosmo_m0_highway's captures).
const TU0_REGION_SPAWN_TRANSITIONS: Readonly<
  Record<string, Readonly<Record<number, number>>>
> = {
  act_cosmo_m0_5_hangar: {
    56: 0x2e_a8_fb_98,
    104: 0xd2_fc_7d_b9,
  },
  act_cosmo_m6_rasputin: {
    48: 0x2e_a8_fb_98,
    88: 0x86_30_8f_e4,
    136: 0x0c_de_83_b1,
    144: 0x8d_1b_57_00,
  },
  mars_portal_3: {
    88: 0x14_d6_e8_21,
    104: 0xfb_76_ec_c4,
    200: 0xb7_2b_95_e3,
  },
  act_cosmo_m0_highway: {
    24: 0x68_93_54_72,
    96: 0x10_ff_4a_98,
    104: 0x57_36_5a_42,
    105: EMPTY_NAME_HASH,
    112: 0xea_ec_23_35,
    113: 0xea_ec_23_35,
  },
  act_venus_m02_southern_tides: {
    24: 0xff_ba_6f_9c,
    80: 0xfe_ef_dc_44,
    160: 0x36_8f_3b_79,
    168: 0xf4_6b_e2_ba,
    224: 0x03_85_bd_b2,
  },
  act_venus_m06_ketch: {
    24: 0xff_ba_6f_9c,
    48: 0x23_f1_a6_d9,
    72: 0xff_d8_e6_1d,
    88: 0x4f_6a_4d_44,
    184: 0x4e_5b_00_c1,
  },
  act_moon_m7_selection: {
    8: 0x87_87_51_58,
    24: 0x52_0a_0f_48,
    48: 0x1f_69_d3_87,
    80: 0xf4_7f_84_1d,
    88: 0x5d_a8_69_0d,
  },
  act_venus_m09_tower: {
    96: fnv1("complex_to_tower"),
    192: 0xe4_81_4c_e5,
  },
  act_moon_m4_uppercitadel: {
    8: 0x87_87_51_58,
    16: 0xff_20_d5_87,
    96: 0x76_75_53_f6,
  },
};

const TU0_TIME_OF_DAY: Readonly<Record<string, number>> = {
  act_cosmo_m0_highway: 0.77,
};

// PS4 1.33: the activities its packages hold a scenario for are the TU0 ones
// but moon_portal_1, the patrols (it names them patrol_*), act_cosmo_m7_command,
// act_venus_m03_thieves_den and act_venus_m09_tower, which it does not have.
const EVIL_MISSING = new Set([
  "act_cosmo_m7_command",
  "act_venus_m03_thieves_den",
  "act_venus_m09_tower",
  "cosmo_patrols_1",
  "mars_patrols_1",
  "moon_patrols_1",
  "moon_portal_1",
  "venus_patrols_1",
]);

// Where the 2.3.1 captures (taken on the 1.33 client) differ from TU0's
// starts: act_cosmo_m4_dome_c's spawn is "default".
const EVIL_STARTS: Readonly<Record<string, ExpectedStart>> = {
  ...Object.fromEntries(
    Object.entries(TU0_STARTS).filter(([name]) => !EVIL_MISSING.has(name))
  ),
  act_cosmo_m4_dome_c: {
    ...TU0_STARTS.act_cosmo_m4_dome_c,
    spawnPoint: "default",
  },
  // TU0's spawn from its captures is not carried to 1.33 yet.
  act_cosmo_m0_5_hangar: {
    ...TU0_STARTS.act_cosmo_m0_5_hangar,
    spawnTransition: undefined,
  },
  // TU0's start from its capture is not carried to 1.33 yet.
  cine_speaker: startsIn("cinematic_trv", "boulevard"),
  cine_end: startsIn("cinematic_trv", "boulevard"),
  act_cinematic_queen_101: startsIn("cinematic_queen", "queens_chamber"),
  act_venus_m02_southern_tides: startsIn("venus", "archive"),
  act_moon_m4_uppercitadel: startsIn("moon", "accelerator"),
  act_moon_m7_selection: startsIn("moon", "accelerator"),
  act_venus_m06_ketch: startsIn("venus", "archive"),
  cosmo_portal_2: startsIn("cosmo", "array"),
  act_cosmo_m6_rasputin: startsIn("cosmo", "array"),
  // The DLC missions, authored for 1.33 from their 2.3.1 captures (TU0 has
  // none of them).
  mission_pact: {
    destination: "cosmo",
    startSlice: "hive_shore",
    startPhase: "phase_hive_shore",
    phases: [
      ["phase_hive_shore", "hive_shore"],
      ["phase_refinery", "refinery"],
      ["phase_command", "command"],
      ["phase_command_boss", "command"],
      ["phase_command_end", "command"],
    ],
    spawnTransition: 0x3e_85_c1_54,
  },
  mission_elevator: {
    destination: "cosmo",
    startSlice: "blast",
    startPhase: "goto_ship_phase",
    phases: [
      ["goto_ship_phase", "blast"],
      ["gantry_ball_phase", "ball"],
      ["climb_ball_phase", "ball"],
      ["boss_ball_phase", "ball"],
      ["get_item_ball_phase", "ball"],
    ],
    spawnTransition: 0x33_cb_2e_8e,
  },
  mission_darksnow: {
    destination: "impactsite",
    startSlice: "stronghold",
    startPhase: "intro_cine_stronghold_phase",
    phases: [
      ["intro_cine_stronghold_phase", "stronghold"],
      ["kill_cabal_stronghold_phase", "stronghold"],
      ["enter_base_phase", "base"],
      ["taken_reveal_base_phase", "base"],
      ["goto_airfield_phase", "airfield"],
      ["exfil_airfield_phase", "airfield"],
      ["outro_cine_airfield_phase", "airfield"],
    ],
  },
  mission_touchdown: {
    destination: "hiveship",
    startSlice: "shroud",
    startPhase: "phase_touchdown_cinematic_landing",
    phases: [
      ["phase_touchdown_cinematic_landing", "shroud"],
      ["phase_touchdown_infiltrate_shroud", "shroud"],
      ["phase_touchdown_disable_core", "core"],
      ["phase_touchdown_goto_breech", "breech"],
      ["phase_touchdown_secure_breech", "breech"],
      ["phase_touchdown_outro", "breech"],
    ],
  },
  mission_pursuit: {
    destination: "venus",
    startSlice: "baby_dock",
    startPhase: "phase_baby_dock_main",
    phases: [
      ["phase_baby_dock_main", "baby_dock"],
      ["phase_dock_main", "dock"],
      ["phase_thieves_den_main", "thieves_den"],
      ["phase_thieves_den_boss", "thieves_den"],
      ["phase_thieves_den_end", "thieves_den"],
    ],
    spawnTransition: 0x7d_89_a6_cd,
  },
  mission_traitor: {
    destination: "venus",
    startSlice: "warp_ruins",
    phases: [
      ["phase_lower_tower_main", "lower_tower"],
      ["phase_lower_tower_elevator", "lower_tower"],
      ["phase_tower_cross", "tower"],
      ["phase_tower_find", "tower"],
      ["phase_tower_kill", "tower"],
      ["phase_tower_outro", "tower"],
    ],
    spawnTransition: 0x2e_a8_fb_98,
  },
  quest_bonzo_dlc01: {
    destination: "cosmo",
    startSlice: "blast",
    phases: [
      ["goto_bonzo_phase00", "dry_sea"],
      ["kill_bonzo_phase01", "hive_shore"],
    ],
    spawnTransition: 0xf6_34_92_84,
  },
  quest_infidel: {
    destination: "cosmo",
    startSlice: "graveyard",
    startPhase: "phase_graveyard",
    phases: [
      ["phase_graveyard", "graveyard"],
      ["phase_breach", "breach"],
      ["phase_highway", "highway"],
      ["phase_highway_end", "highway"],
    ],
    spawnTransition: 0x9e_de_08_74,
  },
  quest_safari: {
    destination: "venus",
    startSlice: "headlands",
    startPhase: "phase_headlands",
    phases: [
      ["phase_headlands", "headlands"],
      ["phase_baby_ruins", "baby_ruins"],
      ["phase_raid_bridge", "raid_bridge"],
      ["phase_raid_bridge_boss", "raid_bridge"],
      ["phase_raid_bridge_end", "raid_bridge"],
    ],
    spawnTransition: 0x5f_17_fa_f0,
  },
  social_landing: startsIn("reef", "hangar"),
  strike_vampire: {
    destination: "moon",
    startSlice: "launchtubes",
    startPhase: "phase_launchtubes_main",
    phases: [
      ["phase_launchtubes_main", "launchtubes"],
      ["phase_moonthrone_main", "moonthrone"],
      ["phase_moonbay_eye", "moonbay"],
      ["phase_moonbay_pretank", "moonbay"],
      ["phase_moonbay_tank", "moonbay"],
      ["phase_moonbay_chase", "moonbay"],
      ["phase_moonbay_boss", "moonbay"],
      ["phase_moonbay_end", "moonbay"],
    ],
    spawnTransition: 0x95_bb_61_1a,
  },
};

// The spawn transitions the captures show the GAS naming per region: the
// highway's (96 and 104 differ from TU0's guesses), the strike's refinery,
// blast and ship, the Last Array's, Northern Tides' and the DLC missions'.
const EVIL_REGION_SPAWN_TRANSITIONS: Readonly<
  Record<string, Readonly<Record<number, number>>>
> = {
  act_cosmo_m0_highway: {
    24: 0x68_93_54_72,
    96: 0x10_ff_74_18,
    104: 0x57_35_74_c2,
    105: EMPTY_NAME_HASH,
    112: 0xea_ec_23_35,
    113: 0xea_ec_23_35,
  },
  act_cosmo_m4_dome_c: {
    0: 0x50_a4_da_9a,
    48: 0x2e_a8_fb_98,
    64: 0xf6_b2_4f_f4,
    72: 0xea_3e_dd_0c,
  },
  act_venus_m07_northern_tides: {
    24: 0xff_ba_6f_9c,
    32: 0x39_46_c2_ed,
    72: 0xff_d8_e6_1d,
    104: 0x9a_b8_bd_88,
    168: 0xf4_6b_e2_ba,
    224: 0xee_9a_1f_90,
  },
  cosmo_portal_1: {
    16: 0xf7_0c_99_18,
    152: 0x3b_7e_f6_f6,
    168: 0x37_56_57_30,
  },
  mars_portal_3: {
    88: 0x14_d6_e8_21,
    104: 0xfb_76_ec_c4,
    200: 0xb7_2b_95_e3,
  },
  mission_darksnow: {
    0: 0xad_82_cd_01,
    1: EMPTY_NAME_HASH,
    8: 0x9c_e8_fe_cb,
    24: 0x60_ed_65_61,
  },
  mission_elevator: {
    8: fnv1("ship_to_ball"),
    168: fnv1("blast_to_ship"),
  },
  mission_touchdown: {
    8: 0x76_9d_a2_14,
    72: 0x60_63_12_60,
    128: 0xe3_bc_12_6f,
  },
  mission_pact: {
    32: 0x74_36_19_71,
    152: 0x69_fa_01_6a,
    160: 0x3b_7e_f6_f6,
  },
  mission_pursuit: {
    8: 0x7d_89_a6_cd,
    48: 0xa3_8c_a7_c3,
    184: 0x23_f1_a6_d9,
  },
  mission_traitor: {
    32: 0xee_9a_1f_90,
    96: 0x66_14_a7_d5,
    192: 0x1c_09_20_d0,
    224: 0x2e_a8_fb_98,
  },
  quest_bonzo_dlc01: {
    120: 0x69_fa_01_6a,
    152: 0xf7_0c_99_18,
  },
  quest_infidel: {
    24: 0x10_ff_74_18,
    112: 0x68_93_54_72,
  },
  quest_safari: {
    16: 0x57_5c_33_a4,
    80: 0x5f_17_fa_f0,
    128: 0xd0_08_c7_2e,
    224: 0x03_85_bd_b2,
  },
  strike_vampire: {
    24: 0x95_bb_61_1a,
    56: 0xf3_07_19_4c,
    64: 0xb5_85_79_07,
  },
};

// The PS4 Alpha Trial (40662): the activities its packages hold a scenario
// client for. Those scenarios are TU0's bubble for bubble, so the starts are
// TU0's; the Tower has only its default state.
const PUBALPHA_STARTS: Readonly<Record<string, ExpectedStart>> = {
  act_cosmo_m1_dome_a: TU0_STARTS.act_cosmo_m1_dome_a,
  city_tower_default1: TU0_STARTS.city_tower_default1,
  cosmo_patrols_1: TU0_STARTS.cosmo_patrols_1,
  cosmo_portal_1: TU0_STARTS.cosmo_portal_1,
  pvp_factory: TU0_STARTS.pvp_factory,
  pvp_moonbase: TU0_STARTS.pvp_moonbase,
};

// The PS4 pre-alpha (38464): the activities its packages hold a scenario
// client for. Its regions are TU0's, so the starts are TU0's but the
// strike's and the patrol's: the strike's phases are TU0's, but it starts at
// the default spawn point (no rocketyard spawn point is
// cosmo_portal_1_phase00); the patrol starts in delta_s, as its capture does.
const BETATH_STARTS: Readonly<Record<string, ExpectedStart>> = {
  city_tower_default1: TU0_STARTS.city_tower_default1,
  cosmo_patrols_1: startsIn("cosmo", "delta_s"),
  cosmo_portal_1: {
    destination: "cosmo",
    phases: TU0_STARTS.cosmo_portal_1?.phases,
    startPhase: "phase00",
    startSlice: "rocketyard",
  },
  pvp_factory: TU0_STARTS.pvp_factory,
  pvp_marsbattle: TU0_STARTS.pvp_marsbattle,
};

// The PS4 ff build (39573): the activities its packages hold a scenario
// client for. Its regions are TU0's, and the Cosmodrome holds the strike's
// spawn point, so the starts are TU0's but the patrol's (delta_s, as its
// capture); the DLC test map starts in its only bubble, whose region never
// cracked.
const FF_STARTS: Readonly<Record<string, ExpectedStart>> = {
  city_tower_default1: TU0_STARTS.city_tower_default1,
  cosmo_patrols_1: startsIn("cosmo", "delta_s"),
  cosmo_portal_1: TU0_STARTS.cosmo_portal_1,
  dlc_test_activity: startsIn("dlc_test_destination", "0x9C0CA0DB"),
};

// The alpha's activities: the initial slice of each <name>:scenario_fah, and
// venus_portal_1's four phases.
const ALPHA_STARTS: Readonly<Record<string, ExpectedStart>> = {
  action_mock: { destination: "action_mock", startSlice: "action_mock" },
  city_tower_default1: { destination: "city_tower", startSlice: "plaza" },
  pvp_factory: { destination: "pvp_factory", startSlice: "pvp_factory" },
  pvp_greenhouse: {
    destination: "pvp_greenhouse",
    startSlice: "pvp_greenhouse",
  },
  pvp_marsbattle: {
    destination: "pvp_marsbattle",
    startSlice: "pvp_marsbattle",
  },
  venus_bounty_1: { destination: "venus", startSlice: "shattered_coast" },
  venus_chapter_2: { destination: "venus", startSlice: "plaza" },
  venus_portal_1: {
    destination: "venus",
    startSlice: "plaza",
    startPhase: "engineering_phase",
    phases: [
      ["engineering_phase", "plaza"],
      ["dig_site_phase", "dig_site"],
      ["ruins_phase", "vex_ruins"],
      ["end_phase", "vex_ruins"],
    ],
  },
};

function expectedSpawn(start: ExpectedStart): number | undefined {
  return (
    start.spawnTransition ??
    (start.spawnPoint === undefined ? undefined : fnv1(start.spawnPoint))
  );
}

function check(
  build: string,
  starts: Readonly<Record<string, ExpectedStart>>,
  regions: typeof TU0_REGION_SPAWN_TRANSITIONS,
  timesOfDay: typeof TU0_TIME_OF_DAY
) {
  const folder = loadScriptFolder(fukugenDaihonBuildDir(build));
  const compiled = compileScriptFiles(folder.files);
  const sets = {
    "the compiled set": compiledScriptSetOf(compiled),
    "the source folder": folder,
  };
  it("compiles clean", () => {
    expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
      []
    );
  });
  for (const [where, set] of Object.entries(sets)) {
    it(`gives each authored activity its start from ${where}`, () => {
      for (const [activity, start] of Object.entries(starts)) {
        const got = set.activityStart(activity);
        expect(got, activity).toBeDefined();
        expect(got?.destination, activity).toBe(start.destination);
        expect(got?.startSlice, activity).toBe(start.startSlice);
        expect(got?.startPhase, activity).toEqual(
          start.startPhase === undefined
            ? undefined
            : { hash: fnv1(start.startPhase), name: start.startPhase }
        );
        expect(
          got?.phases.map(({ name, slice }) => [name, slice]),
          activity
        ).toEqual(start.phases ?? []);
        for (const phase of got?.phases ?? []) {
          expect(phase.hash, `${activity} ${phase.name}`).toBe(
            fnv1(phase.name)
          );
        }
        expect(got?.spawnTransition, activity).toBe(expectedSpawn(start));
        expect(got?.regionSpawnTransitions, activity).toEqual(
          regions[activity] ?? {}
        );
        expect(got?.timeOfDay, activity).toBe(timesOfDay[activity]);
        // the script it lives in is a root of the destination's folder
        expect(got?.script, activity).toMatch(
          new RegExp(`^es/${start.destination}/`)
        );
      }
    });
  }
  it("authors nothing for an activity that is not listed", () => {
    expect(compiledScriptSetOf(compiled).activityStart("nothing")).toBe(
      undefined
    );
    const authored = new Set(
      folder.files.flatMap((file) => file.activityStart?.activities ?? [])
    );
    expect([...authored].sort()).toEqual(Object.keys(starts).sort());
  });
}

describe("Fukugen Daihon's alpha start data", () => {
  check(ALPHA_BUILD, ALPHA_STARTS, {}, {});
});

describe("Fukugen Daihon's TU0 start data", () => {
  check(TU0_BUILD, TU0_STARTS, TU0_REGION_SPAWN_TRANSITIONS, TU0_TIME_OF_DAY);
});

describe("Fukugen Daihon's PS4 pre-alpha start data", () => {
  check(BETATH_BUILD, BETATH_STARTS, {}, {});
});

describe("Fukugen Daihon's PS4 ff start data", () => {
  check(FF_BUILD, FF_STARTS, {}, {});
});

describe("Fukugen Daihon's PS4 Alpha Trial start data", () => {
  check(PUBALPHA_BUILD, PUBALPHA_STARTS, {}, {});
});

describe("Fukugen Daihon's PS4 1.33 start data", () => {
  check(
    EVIL_BUILD,
    EVIL_STARTS,
    EVIL_REGION_SPAWN_TRANSITIONS,
    TU0_TIME_OF_DAY
  );
});
