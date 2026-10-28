import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  bundleHashOf,
  fnv1,
  type ItemChange,
  type NavPointPosition,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ACT_COSMO_M1_DOME_A_NAV_POINTS,
  ACT_COSMO_M1_DOME_A_ROWS,
} from "./tu0_act_cosmo_m1_dome_a_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

interface Bundle {
  bundle: number;
  key: string;
  path: string;
  tag: number;
}

// act_cosmo_m1_dome_a (The Dark Within) on TU0: the bundles dome_a's bubble
// loads (their TU0 tags there) and the script each runs.
const BUNDLES: Bundle[] = [
  {
    bundle: 0x47_86_c0_e0,
    key: "STORY_COMMON",
    path: "bs/activities/common/story_common.bs",
    tag: 0x80_cc_b7_c8,
  },
  {
    bundle: 0xff_4a_0c_1a,
    key: "ACT_COSMO_M1_DOME_A",
    path: "es/cosmo/act_cosmo_m1_dome_a/act_cosmo_m1_dome_a.es",
    tag: 0x80_cb_93_4e,
  },
  {
    bundle: 0x8b_d8_0d_be,
    key: "AUDIO",
    path: "es/cosmo/act_cosmo_m1_dome_a/unknown_8bd80dbe.es",
    tag: 0x80_cb_93_4f,
  },
  {
    bundle: 0x41_d6_16_14,
    key: "DOME_A",
    path: "es/cosmo/dome_a/enc_dome_a_m1.es",
    tag: 0x80_cb_93_50,
  },
];

// the native base each kind of file sits on
const BASES: Readonly<Record<string, string>> = {
  bs: "c_encounter",
  es: "c_encounter",
  esp: "c_mission_phase",
  esu: "c_activity_script",
};

const MISSIONS = [1, 2, 3].map(
  (n) => `es/cosmo/act_cosmo_m1_dome_a/act_cosmo_m1_dome_a_mission${n}.esp`
);

const ARCHETYPES = [
  "generic_objective",
  "interactable_objective",
  "interactable_placement",
  "trigger_volume_objective",
];

// the scan console's import identifier, which the interaction names
const CONSOLE = 0x3e_a6_0d_3d;

type Rows = Readonly<
  Record<string, readonly [string, number, number, object?][]>
>;

function tagsOf(bundles: Bundle[], rows: Rows): ActivityBundleTag[] {
  return bundles.map(({ bundle, key, tag }) => ({
    bundle,
    rows: (rows[key] ?? []).map(([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })),
    tag,
  }));
}

function host(
  tags: ActivityBundleTag[],
  navPoints: readonly NavPointPosition[]
) {
  const log: string[] = [];
  const changes: ItemChange[] = [];
  const players: ActivityPlayer[] = [];
  let progress = 0;
  let completed = 0;
  const runtime = new ScriptRuntime({
    bundles: tags,
    clock: { activityTicks: () => 0 },
    log: (line) => log.push(line),
    navPoints,
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
    scripts: tu0ScriptSource(tags, "cosmo"),
    tickSeconds: 1,
  });
  runtime.start();
  runtime.setActiveBundles(new Set(tags.map((tag) => tag.bundle)));
  const rowOf = (name: string) => {
    const tag = tags.find((entry) => entry.rows.some((r) => r.name === name));
    const row = tag?.rows.find((entry) => entry.name === name);
    if (!(tag && row)) {
      throw new Error(`${name} missing`);
    }
    return { bundle: tag.bundle, typeId: row.typeId, typeIndex: row.typeIndex };
  };
  const all = (kind: ItemChange["kind"], name: string) => {
    const row = rowOf(name);
    return changes.filter(
      (change) =>
        change.kind === kind &&
        change.item.bundle === row.bundle &&
        change.item.typeIndex === row.typeIndex
    );
  };
  return {
    all,
    completed: () => completed,
    last: (kind: ItemChange["kind"], name: string) => all(kind, name).at(-1),
    players,
    rowOf,
    runtime,
    said: (text: string) => log.some((line) => line.includes(text)),
    ticks: (n: number) => {
      for (let i = 0; i < n; i++) {
        runtime.tick();
      }
    },
  };
}

describe("TU0 act_cosmo_m1_dome_a scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "cosmo")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    expect(bundleHashOf("act_cosmo_m1_dome_a")).toBe(0xff_4a_0c_1a);
    expect(bundleHashOf("enc_dome_a_m1")).toBe(0x41_d6_16_14);
    // the music and Ghost lines' bundle name never cracked
    expect(bundleHashOf("unknown_8bd80dbe")).toBe(0x8b_d8_0d_be);
    const root = tu0Scripts.scriptByPath(BUNDLES[1]?.path ?? "");
    expect(
      root && tu0Scripts.missionScripts(root).map((file) => file.path)
    ).toEqual(MISSIONS);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
      ...ARCHETYPES.map((name) => `es/utility_scripts/${name}.esu`),
    ];
    for (const path of new Set(paths)) {
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

  it("runs the mission on the TU0 host from the steppes to end_game", () => {
    const tags = tagsOf(BUNDLES, ACT_COSMO_M1_DOME_A_ROWS);
    const h = host(tags, ACT_COSMO_M1_DOME_A_NAV_POINTS);
    const fire = (name: string) => h.runtime.reportTriggerFired(h.rowOf(name));
    const spent = (name: string) =>
      h.runtime.reportActorBound(h.rowOf(name), true, true);
    const squad = (name: string) => {
      const change = h.last("squad", name);
      return change?.kind === "squad" ? change.state : undefined;
    };
    const objective = (name: string) => {
      const change = h.last("playerObjective", name);
      return change?.kind === "playerObjective"
        ? change.state.state
        : undefined;
    };
    const playing = (name: string) => {
      const change = h.last("sequence", name);
      return change?.kind === "sequence" ? change.state : undefined;
    };
    const device = (name: string) => {
      const change = h.last("object", name);
      return change?.kind === "object"
        ? change.state.device?.position
        : undefined;
    };
    const placements = (name: string) =>
      h
        .all("actor", name)
        .filter((change) => change.kind === "actor" && change.state.placed)
        .length;
    const placed = (name: string) => {
      const change = h.last("actor", name);
      return change?.kind === "actor" && change.state.placed;
    };

    // The root sets pregame; mission 1 waits for the players, then the
    // lifetime goes active with the approach lines and the first objective.
    h.ticks(3);
    expect(h.said("mission act_cosmo_m1_dome_a_mission1 starting")).toBe(true);
    expect(h.runtime.unresolvedBindings).toEqual([
      "obj_m1_o1b._incident_listener",
    ]);
    h.players.push({ characterKey: "c0", powerLevel: 1, ready: true });
    h.runtime.reportPlayerSpawned();
    h.ticks(6);
    expect(h.said("lifetime set_state(active)")).toBe(true);
    for (const line of ["seq_d_o1_s018", "seq_m_intro", "seq_m_cue1"]) {
      expect(playing(line), line).toBeDefined();
    }
    expect(h.said("seq_m_cue1 t5#13 set_switch_mask(3)")).toBe(true);
    expect(playing("seq_d_o1_s015")).toBeDefined();
    // the first objective goes straight to active 12.1 s in
    const o1a = "cosmo_m1_phase00_dome_a.obj_m1_o1a._player_objective";
    expect(objective(o1a)).toBeUndefined();
    h.ticks(8);
    expect(objective(o1a)).toBe(2);

    // At the dome: the scan objective comes up 5 s after the first one ends,
    // and the approach lines stop with it.
    fire("cosmo_m1_phase00_dome_a.obj_m1_o1a._player_trigger");
    h.ticks(2);
    expect(objective(o1a)).toBe(0);
    expect(playing("seq_d_o2_s02")).toBeDefined();
    h.ticks(5);
    const o1b = "cosmo_m1_phase00_dome_a.obj_m1_o1b._player_objective";
    expect(objective(o1b)).toBeGreaterThan(0);
    expect(h.said("seq_d_o1_s018 t5#1 sequence stopped")).toBe(true);

    // The scan: device 0.4, then 1 after 4.8 s, and the basement wakes frozen
    // with six of its seven thralls; the door opens 3 s later.
    h.runtime.reportInteraction((name) => name === CONSOLE);
    h.ticks(2);
    expect(device("obj_placement_m1_o1b._object")).toBeCloseTo(0.4);
    expect(placed("sq_hive_basement_thrall01__thrall1")).toBe(false);
    h.ticks(6);
    expect(device("obj_placement_m1_o1b._object")).toBe(1);
    expect(placed("sq_hive_basement_thrall01__thrall1")).toBe(true);
    expect(placed("sq_hive_basement_thrall01__thrall6")).toBe(false);
    expect(squad("sq_hive_basement_thrall01")?.task).toBe(0);
    expect(squad("sq_hive_basement_troopers01")?.task).toBe(2);
    expect(h.said("player objective cleared")).toBe(true);
    expect(objective(o1b)).toBe(0);
    h.ticks(4);
    expect(device("o_door01")).toBe(1);

    // The scare thralls flicker until the player reaches the corridor.
    h.ticks(12);
    const o1c = "cosmo_m1_phase00_dome_a.obj_m1_o1c._player_objective";
    expect(objective(o1c)).toBeGreaterThan(0);
    const before = placements("sq_hive_scare02b__thrall");
    expect(before).toBeGreaterThanOrEqual(2);
    fire("pt_spawn_hive_scare02");
    h.ticks(6);
    expect(placed("sq_hive_scare02b__thrall")).toBe(false);
    h.ticks(6);
    expect(placements("sq_hive_scare02b__thrall")).toBeLessThanOrEqual(
      before + 1
    );

    // The basement thaws: the thralls charge and their seventh comes up,
    // the troopers follow 1.5 s on with the Ghost's line; they push on once
    // one of them falls, and the second troopers come as a player forces
    // them (or 9 s on).
    fire("pt_spawn_hive_intro01");
    h.ticks(2);
    expect(squad("sq_hive_basement_thrall01")?.task).toBe(1);
    expect(placed("sq_hive_basement_thrall01__thrall6")).toBe(true);
    expect(playing("seq_hive_wave_announce")).toBeDefined();
    expect(h.said("set_switch_mask(7)")).toBe(true);
    h.ticks(2);
    expect(squad("sq_hive_basement_troopers01")?.task).toBe(3);
    expect(playing("seq_d_o3_s01")).toBeDefined();
    spent("sq_hive_basement_troopers01__trooper3");
    h.ticks(2);
    expect(squad("sq_hive_basement_troopers01")?.task).toBe(4);
    fire("pt_spawn_hive_intro02_force");
    h.ticks(2);
    expect(squad("sq_hive_basement_troopers02")?.task).toBe(6);

    // The far stairs: the objective's trigger cues the next line; the phase
    // ends, and the upper floor wakes, as a player reaches the top.
    fire("cosmo_m1_phase00_dome_a.obj_m1_o1c._player_trigger");
    h.ticks(2);
    expect(playing("seq_d_o3_s012")).toBeDefined();
    expect(objective(o1c)).toBeGreaterThan(0);
    fire("pt_thrall_unfreeze");
    h.ticks(4);
    expect(objective(o1c)).toBe(0);
    expect(h.said("mission act_cosmo_m1_dome_a_mission2 starting")).toBe(true);
    expect(h.said("set_switch_mask(15)")).toBe(true);
    expect(squad("sq_hive_upper_front03")?.task).toBe(17);
    expect(squad("sq_hive_upper_back01")?.task).toBe(22);
    expect(squad("sq_hive_upper_front02")?.task).toBe(16);
    expect(squad("sq_hive_upper_wizard01")?.task).toBe(10);
    expect(placed("sq_hive_upper_wizard01__wizard")).toBe(true);
    h.ticks(3);
    const o2 = "cosmo_m1_phase01_dome_a.obj_m1_o2._player_objective";
    expect(objective(o2)).toBeGreaterThan(0);

    // The ledge thralls are let loose 4 s after the wizard steps forward;
    // the front troopers move up as the two squads lose two, then five, of
    // their seven; the second count waits 3 s for the first move to settle.
    expect(squad("sq_hive_upper_front01")?.task).toBe(14);
    const front02 = h.rowOf("sq_hive_upper_front02");
    const front03 = h.rowOf("sq_hive_upper_front03");
    h.runtime.reportSquadAlive(front02, 1);
    h.runtime.reportSquadTally(front02, [1]);
    h.ticks(3);
    expect(squad("sq_hive_upper_front02")?.task).toBe(16);
    h.runtime.reportSquadTally(front03, [1]);
    h.ticks(2);
    expect(squad("sq_hive_upper_front02")?.task).toBe(19);
    expect(squad("sq_hive_upper_front03")?.task).toBe(19);
    h.runtime.reportSquadTally(front02, [2]);
    h.runtime.reportSquadTally(front03, [3]);
    h.ticks(1);
    expect(squad("sq_hive_upper_front02")?.task).toBe(19);
    h.ticks(2);
    expect(squad("sq_hive_upper_front02")?.task).toBe(20);
    // the first rush when the ledge thralls are dead too, its line when it
    // is nearly done
    const front01 = h.rowOf("sq_hive_upper_front01");
    h.runtime.reportSquadAlive(front01, 1);
    h.runtime.reportSquadTally(front01, [1, 1, 1]);
    h.runtime.reportSquadAlive(front01, 0);
    h.ticks(2);
    expect(squad("sq_hive_upper_rush01")?.task).toBe(8);
    const rush01 = h.rowOf("sq_hive_upper_rush01");
    h.runtime.reportSquadAlive(rush01, 4);
    h.runtime.reportSquadTally(rush01, [2, 1]);
    h.runtime.reportSquadAlive(rush01, 1);
    h.ticks(2);
    expect(playing("seq_d_o3_s016")).toBeDefined();

    // The wizard's death (or the far end) brings the second rush; it ends
    // the fight and the phase, and the last one completes the activity with
    // the way-out line a second later.
    spent("sq_hive_upper_wizard01__wizard");
    h.runtime.reportSquadAlive(h.rowOf("sq_hive_upper_wizard01"), 0);
    h.ticks(2);
    expect(squad("sq_hive_upper_rush02")?.task).toBe(9);
    expect(squad("sq_hive_upper_back02")?.task).toBe(21);
    expect(h.said("sq_hive_upper_back01 t1#40 killed by host")).toBe(true);
    expect(objective(o2)).toBe(0);
    h.ticks(5);
    expect(h.said("mission act_cosmo_m1_dome_a_mission3 starting")).toBe(true);
    expect(playing("seq_m_outro")).toBeDefined();
    expect(h.completed()).toBe(1);
    h.ticks(2);
    expect(playing("seq_d_o3_s05")).toBeDefined();
    h.ticks(32);
    expect(h.said("lifetime end_game (results, 30 s)")).toBe(true);
    expect(h.said("activity ended - scripts stopped")).toBe(true);
  });
});
