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
  mars_portal_3: startsIn("mars", "atrium"),
  mars_patrols_1: startsIn("mars", "atrium"),
  act_mars_m03_penthouse: startsIn("mars", "atrium"),
  venus_portal_2: startsIn("venus", "archive"),
  venus_raid_1: startsIn("venus", "archive"),
  venus_patrols_1: startsIn("venus", "archive"),
  act_venus_m02_southern_tides: startsIn("venus", "archive"),
  act_venus_m03_thieves_den: startsIn("venus", "archive"),
  act_venus_m05_vault: startsIn("venus", "archive"),
  act_venus_m06_ketch: startsIn("venus", "archive"),
  cosmo_portal_2: startsIn("cosmo", "array"),
  cosmo_patrols_1: startsIn("cosmo", "array"),
  act_cosmo_m5_refinery: startsIn("cosmo", "array"),
  act_cosmo_m6_rasputin: startsIn("cosmo", "array"),
  act_cosmo_m7_command: startsIn("cosmo", "array"),
  moon_portal_1: startsIn("moon", "accelerator"),
  moon_patrols_1: startsIn("moon", "accelerator"),
  act_moon_m4_uppercitadel: startsIn("moon", "accelerator"),
  act_moon_m6_reactor: startsIn("moon", "accelerator"),
  act_moon_m7_selection: startsIn("moon", "accelerator"),
  cine_speaker: startsIn("cinematic_trv", "boulevard"),
  cine_end: startsIn("cinematic_trv", "boulevard"),
  act_cinematic_queen_101: startsIn("cinematic_queen", "queens_chamber"),
  // The one capture of a cinematic: bubble 0, state 1, which phase_cine owns.
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
  act_cosmo_m0_highway: {
    24: 0x68_93_54_72,
    96: 0x10_ff_4a_98,
    104: 0x57_36_5a_42,
    105: EMPTY_NAME_HASH,
    112: 0xea_ec_23_35,
    113: 0xea_ec_23_35,
  },
  act_venus_m09_tower: {
    96: fnv1("complex_to_tower"),
    192: 0xe4_81_4c_e5,
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
};

// The spawn transitions the captures show the GAS naming per region: the
// highway's (96 and 104 differ from TU0's guesses), the strike's refinery,
// blast and ship, the Last Array's and Northern Tides'.
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
