import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ACT_MARS_M06_SUBWAY_ROWS,
  ACT_MARS_M06_SUBWAY_TAGS,
} from "./tu0_act_mars_m06_subway_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_mars_m06_subway (A Rising Tide) on TU0: its own bundles and the
// binder (TU0 disc tags), and the script each one runs. One 2.3.1 run
// (2026-11-01) checked: every wait below is unconfirmed.
const BUNDLES = [
  {
    bundle: 0x0c_4f_db_f5,
    key: "ROOT",
    path: "es/mars/act_mars_m06_subway/act_mars_m06_subway.es",
  },
  {
    bundle: 0x04_e6_ac_69,
    key: "AUDIO",
    path: "es/mars/act_mars_m06_subway/unknown_04e6ac69.es",
  },
  {
    bundle: 0xf2_d4_11_3c,
    key: "LOBBY",
    path: "es/mars/lobby/enc_lobby_m06.es",
  },
  {
    bundle: 0xc3_8f_32_43,
    key: "SUBWAY",
    path: "es/mars/subway/enc_subway_m06.es",
  },
  {
    bundle: 0x47_86_c0_e0,
    key: "STORY_COMMON",
    path: "bs/activities/common/story_common.bs",
  },
];

// the native base each kind of file sits on
const BASES: Readonly<Record<string, string>> = {
  bs: "c_encounter",
  es: "c_encounter",
  esp: "c_mission_phase",
  esu: "c_activity_script",
};

const MISSIONS = [1, 2, 3, 4, 5, 6, 7, 8].map(
  (n) => `es/mars/act_mars_m06_subway/act_mars_m06_subway_mission${n}.esp`
);

// the two scans' interaction identifiers
const BATTLEGROUND_SCAN = 0x1a_58_bf_cd;
const CONFLUX_SCAN = 0xb0_32_7a_81;
// the warp gates' kill identifier
const WARP_GATE = 0xf9_3f_fc_2a;

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key }) => ({
  bundle,
  rows: (ACT_MARS_M06_SUBWAY_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag: ACT_MARS_M06_SUBWAY_TAGS[key] ?? 0,
}));

function rowOf(key: string, name: string) {
  const bundle = BUNDLES.find((b) => b.key === key)?.bundle;
  const tag = TAGS.find((entry) => entry.bundle === bundle);
  const row = tag?.rows.find((entry) => entry.name === name);
  if (!(tag && row)) {
    throw new Error(`${key} ${name} missing`);
  }
  return { bundle: tag.bundle, typeId: row.typeId, typeIndex: row.typeIndex };
}

describe("TU0 act_mars_m06_subway scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES.slice(0, 4)) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "mars")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    const root = tu0Scripts.scriptByPath(BUNDLES[0]!.path);
    expect(
      root && tu0Scripts.missionScripts(root).map((file) => file.path)
    ).toEqual(MISSIONS);
  });

  it("starts on the plains at the landing zone, its phases in the battleground, the lobby and the subway", () => {
    const start = tu0Scripts.activityStart("act_mars_m06_subway");
    expect(start?.startSlice).toBe("plains");
    expect(start?.startPhase).toBeUndefined();
    expect(start?.spawnTransition).toBe(fnv1("landing_zone"));
    expect(start?.phases.map(({ slice }) => slice)).toEqual([
      "battleground",
      "battleground",
      "lobby",
      "lobby",
      "lobby",
      "subway",
      "subway",
      "subway",
    ]);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
      ...[
        "generic_objective",
        "interactable_objective",
        "interactable_placement",
        "kill_squad_objective",
        "trigger_bubble_objective",
        "trigger_volume_objective",
        "vex_warp_gate",
      ].map((name) => `es/utility_scripts/${name}.esu`),
    ];
    for (const path of paths) {
      const file = tu0Scripts.scriptByPath(path);
      if (!file) {
        throw new Error(`${path} missing`);
      }
      const compiled = tu0Compiled().compiledDecl(file.path);
      expect(compiled.chunkName).toBe(file.chunkName);
      expect(compiled.schema.parent).toBe(BASES[file.kind]);
      expect(tu0Compiled().chunkFor(file.path).length).toBeGreaterThan(0);
    }
  });

  it("runs the mission on the TU0 host from the landing zone to the conflux", () => {
    const log: string[] = [];
    const changes: ItemChange[] = [];
    const players: ActivityPlayer[] = [
      { characterKey: "c0", powerLevel: 1, ready: true },
    ];
    let progress = 0;
    let completed = 0;
    const runtime = new ScriptRuntime({
      bundles: TAGS,
      clock: { activityTicks: () => 0 },
      log: (line) => log.push(line),
      onActivityComplete: () => {
        completed += 1;
      },
      onItemChange: (change) => changes.push(change),
      phaseProgress: {
        read: () => progress,
        write: (index) => {
          progress = index;
        },
      },
      players: () => players,
      scriptFor: (bundleTag) => bundleTag,
      scripts: tu0ScriptSource(TAGS, "mars"),
      tickSeconds: 1,
    });
    runtime.start();
    runtime.setActiveBundles(new Set(TAGS.map((tag) => tag.bundle)));
    const ticks = (n: number) => {
      for (let i = 0; i < n; i++) {
        runtime.tick();
      }
    };
    const said = (text: string) => log.some((line) => line.includes(text));
    const fire = (key: string, name: string) =>
      runtime.reportTriggerFired(rowOf(key, name));
    const objective = (name: string, state: string) =>
      said(`${name}._player_objective t32#`) &&
      log.some(
        (line) =>
          line.includes(`${name}._player_objective t32#`) &&
          line.includes(`player objective ${state}`)
      );
    // A squad placed, then all dead.
    const dead = (key: string, ...names: string[]) => {
      for (const name of names) {
        runtime.reportSquadAlive(rowOf(key, name), 1);
      }
      ticks(1);
      for (const name of names) {
        runtime.reportSquadAlive(rowOf(key, name), 0);
      }
    };
    const squadOf = (key: string, name: string) => {
      const row = rowOf(key, name);
      const writes = changes.filter(
        (change) =>
          change.kind === "squad" &&
          change.item.bundle === row.bundle &&
          change.item.typeIndex === row.typeIndex
      );
      const last = writes.at(-1);
      return last?.kind === "squad" ? last.state : undefined;
    };
    const taskOf = (key: string, name: string) => squadOf(key, name)?.task;
    const objectiveOf = (key: string, name: string) =>
      squadOf(key, name)?.objective?.typeIndex;
    const deviceOf = (key: string, name: string) => {
      const row = rowOf(key, name);
      const writes = changes.filter(
        (change) =>
          change.kind === "object" &&
          change.item.bundle === row.bundle &&
          change.item.typeIndex === row.typeIndex
      );
      const last = writes.at(-1);
      return last?.kind === "object" ? last.state.device?.position : undefined;
    };

    // The landing zone: active at the spawn with the intro, the goto ten
    // seconds later and straight to active. Every bundle is loaded here, so
    // the subway's platform squads and gates go up at once.
    ticks(1);
    expect(said("mission act_mars_m06_subway_mission1 starting")).toBe(true);
    expect(taskOf("SUBWAY", "sq_plat_wide_support1")).toBe(3);
    expect(taskOf("SUBWAY", "sq_plat_thin_support2")).toBe(4);
    expect(objectiveOf("SUBWAY", "sq_plat_wide_cloud")).toBe(0);
    expect(said("pf_warp_gate5._squad")).toBe(true);
    runtime.reportPlayerSpawned();
    ticks(2);
    expect(said("lifetime set_state(active)")).toBe(true);
    expect(said("seq_m_intro_s01 t5#0 sequence play")).toBe(true);
    ticks(5);
    expect(
      objective(
        "phase_m06_battleground_goto.pf_objective_battleground_goto",
        "active"
      )
    ).toBe(false);
    ticks(6);
    expect(
      objective(
        "phase_m06_battleground_goto.pf_objective_battleground_goto",
        "active"
      )
    ).toBe(true);
    expect(
      objective(
        "phase_m06_battleground_goto.pf_objective_battleground_goto",
        "incoming"
      )
    ).toBe(false);

    // The battleground: the scan, the Ghost's line, the lobby goto.
    fire(
      "ROOT",
      "phase_m06_battleground_goto.pf_objective_battleground_goto._player_trigger"
    );
    ticks(5);
    expect(said("mission act_mars_m06_subway_mission2 starting")).toBe(true);
    ticks(3);
    runtime.reportInteraction((hash) => hash === BATTLEGROUND_SCAN);
    ticks(3);
    expect(said("seq_d_bg_obj_s01 t5#6 sequence play")).toBe(true);
    ticks(10);
    expect(said("mission act_mars_m06_subway_mission3 starting")).toBe(true);
    fire(
      "ROOT",
      "phase_m06_lobby_goto.pf_objective_lobby_goto._player_trigger"
    );
    ticks(3);
    expect(said("mission act_mars_m06_subway_mission4 starting")).toBe(true);

    // The south lobby: every squad on its half's objective, clouds included;
    // the first cloud's drop a tick after it is placed.
    expect(objectiveOf("LOBBY", "sq_s_cloud1")).toBe(0);
    expect(objectiveOf("LOBBY", "sq_n_cloud2")).toBe(1);
    expect(objectiveOf("LOBBY", "sq_n_pit_turret")).toBe(1);
    fire("LOBBY", "pt_s_cloud_spawn");
    ticks(3);
    expect(taskOf("LOBBY", "sq_s_cloud2_support2")).toBe(5);
    expect(said("sq_s_cloud1__vex_cloud t2#")).toBe(true);
    expect(taskOf("LOBBY", "sq_s_cloud1_support1")).toBe(0);
    ticks(2);
    expect(taskOf("LOBBY", "sq_s_cloud2_support1")).toBe(1);
    dead("LOBBY", "sq_s_cloud1_support1");
    ticks(2);
    expect(taskOf("LOBBY", "sq_s_cloud1_support1")).toBe(3);
    expect(taskOf("LOBBY", "sq_s_cloud2_support1")).toBe(3);
    fire("LOBBY", "pt_s_back_spawn");
    ticks(2);
    expect(taskOf("LOBBY", "sq_s_back_support1")).toBe(9);
    fire(
      "ROOT",
      "phase_m06_lobby_s.pf_objective_lobby_s_trigger._player_trigger"
    );
    ticks(3);
    expect(said("mission act_mars_m06_subway_mission5 starting")).toBe(true);

    // The north platform, then the pit's clouds: the first drops its three
    // squads in one drop.
    fire("LOBBY", "pt_n_plat_spawn");
    ticks(2);
    expect(taskOf("LOBBY", "sq_n_plat_support1")).toBe(1);
    fire("LOBBY", "pt_n_pit_approach");
    ticks(3);
    expect(taskOf("LOBBY", "sq_n_cloud1_support1")).toBe(2);
    expect(taskOf("LOBBY", "sq_n_cloud1_support2")).toBe(3);
    expect(taskOf("LOBBY", "sq_n_cloud1_support3")).toBe(4);
    expect(said("sq_n_cloud1__vex_cloud t2#19 drop #1 queue 3")).toBe(true);
    fire(
      "ROOT",
      "phase_m06_lobby_n.pf_objective_lobby_n_trigger._player_trigger"
    );
    ticks(3);
    expect(said("mission act_mars_m06_subway_mission6 starting")).toBe(true);
    // the Vex block, shut, once its components attach
    ticks(1);
    expect(deviceOf("ROOT", "o_m06_subway_vexblock_a")).toBe(1);

    // The subway: the gates turn vulnerable two seconds after the first
    // gate's trigger, with the kill objective.
    ticks(1);
    fire(
      "ROOT",
      "phase_m06_subway_goto.pf_objective_subway_goto._player_trigger"
    );
    fire("SUBWAY", "pt_warpgate1");
    ticks(4);
    expect(said("mission act_mars_m06_subway_mission7 starting")).toBe(true);
    expect(said("of_warpgate t33#52 remove(pf_warp_gate5._squad)")).toBe(true);
    expect(taskOf("SUBWAY", "sq_warpgate1_support1")).toBe(5);
    ticks(2);
    expect(taskOf("SUBWAY", "sq_warpgate1_support3")).toBe(5);
    ticks(1);
    expect(
      objective("phase_m06_subway.pf_objective_kill_warp_gates", "active")
    ).toBe(true);

    // Five gates down: the clear clears at once with the tracks empty, the
    // Ghost's line a second on, the scan phase five seconds after the clear.
    dead(
      "SUBWAY",
      "sq_plat_wide_support1",
      "sq_plat_wide_support2",
      "sq_plat_wide_support3",
      "sq_plat_wide_support4",
      "sq_plat_thin_support1",
      "sq_plat_thin_support2",
      "sq_warpgate1_support1",
      "sq_warpgate1_support2",
      "sq_warpgate1_support3",
      "sq_warpgate1_support4",
      "sq_warpgate2_support1",
      "sq_warpgate2_support2",
      "sq_warpgate2_support3",
      "sq_warpgate2_support4",
      "sq_warpgate3_anchor1",
      "sq_warpgate3_support1",
      "sq_warpgate3_support2",
      "sq_warpgate4_major_anchor1",
      "sq_warpgate4_support1",
      "sq_warpgate4_support2",
      "sq_warpgate5_anchor1",
      "sq_warpgate5_support1",
      "sq_warpgate5_support2"
    );
    for (const gate of [1, 2, 3, 4, 5]) {
      runtime.reportKill({
        assists: [],
        killer: { characterKey: "c0" },
        victim: {},
      });
      runtime.reportSquadKill(WARP_GATE);
      runtime.reportActorBound(
        rowOf("SUBWAY", `pf_warp_gate${gate}._squad__gate`),
        true,
        true
      );
    }
    ticks(5);
    expect(
      objective("phase_m06_subway.pf_objective_generic_clear", "active")
    ).toBe(true);
    ticks(2);
    expect(said("seq_d_subway_clear_s01 t5#11 sequence play")).toBe(true);
    expect(said("mission act_mars_m06_subway_mission8 starting")).toBe(false);
    ticks(5);
    expect(said("mission act_mars_m06_subway_mission8 starting")).toBe(true);

    // The conflux: the pulse with the objective, the scan, the activity
    // complete ten seconds on, the block open and the results half a
    // minute later.
    expect(said("m06_subway_ghost_pulse t4#25 object present")).toBe(true);
    ticks(3);
    expect(said("seq_d_subway_clear_s02 t5#12 sequence play")).toBe(true);
    runtime.reportInteraction((hash) => hash === CONFLUX_SCAN);
    ticks(2);
    expect(said("seq_m_ascent_s01 t5#2 sequence play")).toBe(true);
    expect(
      deviceOf(
        "ROOT",
        "phase_m06_subway_close.pf_placement_subway_interact._object"
      )
    ).toBeCloseTo(0.1);
    ticks(3);
    expect(completed).toBe(1);
    ticks(11);
    expect(deviceOf("ROOT", "o_m06_subway_vexblock_a")).toBe(0);
    ticks(32);
    expect(said("lifetime end_game")).toBe(true);
  });
});
