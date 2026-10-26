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
  ACT_VENUS_M01_ENGINEERING_NAV_POINTS,
  ACT_VENUS_M01_ENGINEERING_ROWS,
} from "./tu0_act_venus_m01_engineering_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

interface Bundle {
  bundle: number;
  key: string;
  path: string;
  tag: number;
}

// act_venus_m01_engineering (A Stranger's Call) on TU0: the bundles the
// Academy entrance's bubble loads (their TU0 tags there) and the script each
// runs.
const BUNDLES: Bundle[] = [
  {
    bundle: 0x47_86_c0_e0,
    key: "STORY_COMMON",
    path: "bs/activities/common/story_common.bs",
    tag: 0x80_ff_50_f7,
  },
  {
    bundle: 0x7b_7a_e5_f8,
    key: "ACT_VENUS_M01_ENGINEERING",
    path: "es/venus/act_venus_m01_engineering/act_venus_m01_engineering.es",
    tag: 0x80_fe_01_97,
  },
  {
    bundle: 0x52_9d_4b_dc,
    key: "AUDIO",
    path: "es/venus/act_venus_m01_engineering/unknown_529d4bdc.es",
    tag: 0x80_fe_01_98,
  },
  {
    bundle: 0x28_81_28_f1,
    key: "ENTRANCE",
    path: "es/venus/academy_entrance/enc_entrance_m01.es",
    tag: 0x80_fe_01_99,
  },
];

// the native base each kind of file sits on
const BASES: Readonly<Record<string, string>> = {
  bs: "c_encounter",
  es: "c_encounter",
  esp: "c_mission_phase",
  esu: "c_activity_script",
};

const MISSIONS = [1, 2, 3, 4, 5, 6].map(
  (n) =>
    `es/venus/act_venus_m01_engineering/act_venus_m01_engineering_mission${n}.esp`
);

const ARCHETYPES = [
  "cinematic_midmission",
  "generic_objective",
  "interactable_objective",
  "interactable_placement",
];

// the interactables' import identifiers, which the interactions name
const SENSOR01 = fnv1("sensor01");
const SENSOR02 = fnv1("sensor02");
const VEX_BLOCK = fnv1("vex_block");

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
    scripts: tu0ScriptSource(tags, "venus"),
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

describe("TU0 act_venus_m01_engineering scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "venus")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    expect(bundleHashOf("act_venus_m01_engineering")).toBe(0x7b_7a_e5_f8);
    expect(bundleHashOf("enc_entrance_m01")).toBe(0x28_81_28_f1);
    // the music and Ghost lines' bundle name never cracked
    expect(bundleHashOf("unknown_529d4bdc")).toBe(0x52_9d_4b_dc);
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

  it("runs the mission on the TU0 host from the arrival to end_game", () => {
    const tags = tagsOf(BUNDLES, ACT_VENUS_M01_ENGINEERING_ROWS);
    const h = host(tags, ACT_VENUS_M01_ENGINEERING_NAV_POINTS);
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
    const trigger = (name: string) => {
      const change = h.last("playerTrigger", name);
      return change?.kind === "playerTrigger" ? change.state : undefined;
    };
    const placed = (name: string) => {
      const change = h.last("actor", name);
      return change?.kind === "actor" && change.state.placed;
    };
    const wipe = (name: string, tally: number[]) => {
      const row = h.rowOf(name);
      h.runtime.reportSquadTally(row, tally);
      h.runtime.reportSquadAlive(row, 0);
    };

    // The root sets pregame; the arrival cinematic plays nine seconds on.
    // The two triggers the missions arm start disarmed.
    h.ticks(3);
    expect(h.said("lifetime set_state(pregame)")).toBe(true);
    expect(trigger("pt_vn01_010_70")?.enabled).toBe(false);
    expect(trigger("pt_vn01_020_30")?.enabled).toBe(false);
    h.ticks(8);
    expect(h.said("cinematic start")).toBe(true);
    h.runtime.reportCinematicFinished(
      h.rowOf("phase_shattered_coast_intro.pf_112_vnr._cinematic")
    );
    h.ticks(3);
    expect(h.said("mission act_venus_m01_engineering_mission2 starting")).toBe(
      true
    );

    // Landing at baby_shat sets the lifetime active; the spawn starts the
    // arrival music, the Ghost's line, and the first sensor eleven seconds on.
    fire("pt_in_baby_shat");
    h.players.push({ characterKey: "c0", powerLevel: 1, ready: true });
    h.runtime.reportPlayerSpawned();
    h.ticks(3);
    expect(h.said("lifetime set_state(active)")).toBe(true);
    expect(playing("venus_m01_intro_music")).toBeDefined();
    expect(playing("md_vn01_010_15")).toBeDefined();
    const sensor01 =
      "phase_shattered_coast_sensors.pf_sensor01._player_objective";
    const sensor02 =
      "phase_shattered_coast_sensors.pf_sensor02._player_objective";
    expect(objective(sensor01)).toBeUndefined();
    h.ticks(10);
    expect(objective(sensor01)).toBeGreaterThan(0);

    // The first scan: the Ghost's long line, then the second sensor and its
    // nag trigger.
    h.runtime.reportInteraction((name) => name === SENSOR01);
    h.ticks(2);
    expect(playing("md_vn01_010_60")).toBeDefined();
    expect(objective(sensor02)).toBeUndefined();
    h.ticks(19);
    expect(objective(sensor01)).toBe(0);
    expect(objective(sensor02)).toBeGreaterThan(0);
    expect(trigger("pt_vn01_010_70")?.enabled).toBe(true);
    fire("pt_vn01_010_70");
    h.ticks(2);
    expect(playing("md_vn01_010_70")).toBeDefined();

    // The second scan completes its objective; the last line ends the phase.
    h.runtime.reportInteraction((name) => name === SENSOR02);
    h.ticks(2);
    expect(playing("md_vn01_010_80")).toBeDefined();
    h.ticks(8);
    expect(objective(sensor02)).toBe(0);
    expect(playing("md_vn01_010_90")).toBeDefined();
    h.ticks(7);
    expect(h.said("mission act_venus_m01_engineering_mission3 starting")).toBe(
      true
    );

    // On to the entrance: the cue's first section, the music at its
    // trigger, the Ghost on the steps and once the player is in.
    h.ticks(2);
    expect(h.said("venus_m01_music_cue1 t5#1 set_switch_mask(2)")).toBe(true);
    expect(trigger("pt_vn01_020_30")?.enabled).toBe(true);
    fire("pt_venus_m01_cue1_start");
    h.ticks(2);
    expect(h.said("set_switch_mask(3)")).toBe(true);
    fire("pt_vn01_020_30");
    h.ticks(2);
    expect(playing("md_vn01_020_30")).toBeDefined();
    fire("phase_entrance_goto.pt_entrance");
    h.ticks(4);
    expect(playing("md_vn01_020_50")).toBeDefined();
    h.ticks(6);
    expect(h.said("mission act_venus_m01_engineering_mission4 starting")).toBe(
      true
    );

    // The conflux: hacking it plays the Ghost, then opens the first cloud and
    // the marchers come out.
    h.ticks(6);
    h.runtime.reportInteraction((name) => name === VEX_BLOCK);
    h.ticks(2);
    expect(playing("md_vn01_020_60")).toBeDefined();
    h.ticks(9);
    expect(playing("md_vn01_020_70")).toBeDefined();
    expect(h.said("set_switch_mask(7)")).toBe(true);
    expect(placed("sq_cloud01__cloud")).toBe(true);
    expect(squad("sq_march01")?.task).toBe(13);
    h.ticks(14);
    expect(placed("sq_cloud01__cloud")).toBe(false);

    // The mid group with one marcher left, the anchor once it is dead.
    for (const march of ["sq_march01", "sq_march02"]) {
      for (const n of [1, 2, 3, 4]) {
        spent(`${march}__goblin0${n}`);
      }
    }
    for (const n of [1, 2, 4]) {
      spent(`sq_march03__goblin0${n}`);
    }
    h.ticks(2);
    expect(squad("sq_mid_snipers")?.task).toBe(10);
    expect(squad("sq_mid_goblins")?.task).toBe(11);
    expect(squad("sq_anchor")?.task).toBeUndefined();
    wipe("sq_mid_snipers", [2]);
    wipe("sq_mid_goblins", [3]);
    // the cloud stays seven seconds before the wait
    h.ticks(7);
    expect(squad("sq_anchor")?.task).toBe(0);
    expect(squad("sq_center01")?.task).toBe(15);

    // The anchor dead: the phase moves on to holding the entrance, the first
    // wave and its ledge sniper with it.
    wipe("sq_anchor", [2, 1]);
    wipe("sq_center01", [3]);
    h.ticks(14);
    expect(h.said("mission act_venus_m01_engineering_mission5 starting")).toBe(
      true
    );
    expect(squad("sq_def_center01")?.task).toBe(7);
    expect(squad("sq_right_ledge_sniper")?.task).toBe(3);

    // Each wave once the last is dead; the third brings the anchors and the
    // music's next section.
    wipe("sq_def_center01", [3]);
    wipe("sq_def_center02", [3]);
    wipe("sq_right_ledge_sniper", [1, 2]);
    h.ticks(9);
    expect(squad("sq_left_ledge_sniper")?.task).toBe(2);
    expect(squad("sq_def_center01")?.task).toBe(6);
    wipe("sq_def_center01", [6]);
    wipe("sq_def_center02", [6]);
    wipe("sq_left_ledge_sniper", [1, 2]);
    h.ticks(9);
    expect(squad("sq_def_anchor01")?.task).toBe(5);
    expect(h.said("set_switch_mask(15)")).toBe(true);
    wipe("sq_def_center01", [9]);
    wipe("sq_def_center02", [9]);
    wipe("sq_def_anchor01", [1, 2]);
    wipe("sq_def_anchor02", [1, 2]);
    h.ticks(12);
    expect(
      objective("phase_entrance_resist_vex.pf_resist_vex._player_objective")
    ).toBe(0);
    expect(
      objective("phase_entrance_vex_conflux.pf_kill_vex._player_objective")
    ).toBe(0);
    h.ticks(2);
    expect(h.said("set_switch_mask(31)")).toBe(true);
    h.ticks(6);
    expect(playing("md_vn01_020_100")).toBeDefined();

    // The outro: the loot goes, the activity completes, the Stranger's
    // cinematic plays and the game ends as it finishes.
    h.ticks(8);
    expect(h.said("mission act_venus_m01_engineering_mission6 starting")).toBe(
      true
    );
    h.ticks(6);
    expect(h.completed()).toBe(1);
    h.runtime.reportCinematicFinished(
      h.rowOf("phase_engineering_outro.pf_113_str._cinematic")
    );
    h.ticks(4);
    expect(playing("venus_m01_music_ascent")).toBeDefined();
    expect(h.said("activity ended - scripts stopped")).toBe(true);
  });
});
