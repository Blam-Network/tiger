import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import { ACT_COSMO_M2_DOME_C_ROWS } from "./tu0_act_cosmo_m2_dome_c_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_cosmo_m2_dome_c on TU0: its own bundles and the binder (TU0 disc
// tags), and the script each one runs.
const BUNDLES = [
  {
    bundle: 0x79_d9_7f_dd,
    key: "ROOT",
    path: "es/cosmo/act_cosmo_m2_dome_c/act_cosmo_m2_dome_c.es",
    tag: 0x80_cb_95_49,
  },
  {
    bundle: 0x82_94_5a_01,
    key: "AUDIO",
    path: "es/cosmo/act_cosmo_m2_dome_c/unknown_82945a01.es",
    tag: 0x80_cb_95_4a,
  },
  {
    bundle: 0x85_63_94_51,
    key: "DOME_C",
    path: "es/cosmo/dome_c/enc_dome_c_m2.es",
    tag: 0x80_cb_94_7b,
  },
  {
    bundle: 0x47_86_c0_e0,
    key: "STORY_COMMON",
    path: "bs/activities/common/story_common.bs",
    tag: 0x80_cc_b7_c8,
  },
];

// the native base each kind of file sits on
const BASES: Readonly<Record<string, string>> = {
  bs: "c_encounter",
  es: "c_encounter",
  esp: "c_mission_phase",
  esu: "c_activity_script",
};

const MISSIONS = [1, 2, 3, 4, 5].map(
  (n) => `es/cosmo/act_cosmo_m2_dome_c/act_cosmo_m2_dome_c_mission${n}.esp`
);

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key, tag }) => ({
  bundle,
  rows: (ACT_COSMO_M2_DOME_C_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag,
}));

function rowOf(key: string, name: string) {
  const tag = TAGS.find(
    (entry) => BUNDLES.find((b) => b.key === key)?.tag === entry.tag
  );
  const row = tag?.rows.find((entry) => entry.name === name);
  if (!(tag && row)) {
    throw new Error(`${key} ${name} missing`);
  }
  return { bundle: tag.bundle, typeId: row.typeId, typeIndex: row.typeIndex };
}

describe("TU0 act_cosmo_m2_dome_c scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES.slice(0, 3)) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "cosmo")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    const root = tu0Scripts.scriptByPath(BUNDLES[0]!.path);
    expect(
      root && tu0Scripts.missionScripts(root).map((file) => file.path)
    ).toEqual(MISSIONS);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
      ...[
        "destructible_objective",
        "destructible_placement",
        "generic_objective",
        "interactable_objective",
        "interactable_placement",
        "trigger_volume_objective",
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

  it("runs the mission on the TU0 host from delta_n to the beacon", () => {
    const log: string[] = [];
    const changes: ItemChange[] = [];
    const players: ActivityPlayer[] = [
      { characterKey: "c0", powerLevel: 1, ready: true },
    ];
    let progress = 0;
    const runtime = new ScriptRuntime({
      bundles: TAGS,
      clock: { activityTicks: () => 0 },
      log: (line) => log.push(line),
      onItemChange: (change) => changes.push(change),
      phaseProgress: {
        read: () => progress,
        write: (index) => {
          progress = index;
        },
      },
      players: () => players,
      scriptFor: (bundleTag) => bundleTag,
      scripts: tu0ScriptSource(TAGS, "cosmo"),
      tickSeconds: 1,
    });
    runtime.start();
    runtime.setActiveBundles(new Set(TAGS.map((tag) => tag.bundle)));
    runtime.reportPlayerSpawned();
    const ticks = (n: number) => {
      for (let i = 0; i < n; i++) {
        runtime.tick();
      }
    };
    const said = (text: string) => log.some((line) => line.includes(text));
    const use = (identifier: number) =>
      runtime.reportInteraction((hash) => hash === identifier);
    const tally = (name: string, cells: number[]) =>
      runtime.reportSquadTally(rowOf("DOME_C", name), cells);
    // The task a squad was last put on, by index into its objective's list.
    const taskOf = (name: string) => {
      const row = rowOf("DOME_C", name);
      const writes = changes.filter(
        (change) =>
          change.kind === "squad" &&
          change.item.bundle === row.bundle &&
          change.item.typeIndex === row.typeIndex &&
          change.state.task !== undefined
      );
      const last = writes.at(-1);
      return last?.kind === "squad" ? last.state.task : undefined;
    };

    ticks(5);
    expect(said("mission act_cosmo_m2_dome_c_mission1 starting")).toBe(true);
    expect(said("lifetime set_state(active)")).toBe(true);

    // delta_n: the objective comes up after the Ghost's lines; using the
    // thing it points at ends the phase once the next line is over.
    ticks(15);
    use(0xea_a3_39_a4);
    ticks(12);
    expect(said("mission act_cosmo_m2_dome_c_mission2 starting")).toBe(true);

    // The Dry Sea: the sea's trigger, then the two objects.
    ticks(10);
    runtime.reportTriggerFired(
      rowOf("ROOT", "cosmo_m2_phase01_dry_sea.obj_m2_o2a._player_trigger")
    );
    ticks(10);
    use(0xc9_a2_ca_78);
    ticks(5);
    expect(said("mission act_cosmo_m2_dome_c_mission3 starting")).toBe(false);
    use(0x97_42_d9_5d);
    ticks(10);
    expect(said("mission act_cosmo_m2_dome_c_mission3 starting")).toBe(true);

    // dome_c: the pipe room's first group falls back at its first loss.
    expect(taskOf("sq_fallen_piperoom01a")).toBe(0);
    ticks(5);
    tally("sq_fallen_piperoom01a", [1]);
    ticks(2);
    expect(taskOf("sq_fallen_piperoom01a")).toBe(2);
    // The guards' hall: the captain's fall moves the music on.
    runtime.reportTriggerFired(rowOf("DOME_C", "pt_fallen_guards_spawn01"));
    ticks(6);
    expect(taskOf("sq_fallen_guards01")).toBe(0);
    expect(said("seq_m_cue2 t5#23 sequence play")).toBe(false);
    tally("sq_fallen_guards01", [1, 1]);
    ticks(2);
    expect(taskOf("sq_fallen_guards01")).toBe(1);
    expect(said("seq_m_cue2 t5#23 sequence play")).toBe(true);
    use(0x9d_f3_a0_2e);
    ticks(10);
    expect(said("mission act_cosmo_m2_dome_c_mission4 starting")).toBe(true);

    // The waves, each step on what is left of the one before.
    ticks(12);
    expect(taskOf("sq_fallen_wave01a")).toBe(6);
    tally("sq_fallen_wave01a", [4, 0]);
    ticks(2);
    expect(taskOf("sq_fallen_wave01a")).toBe(7);
    tally("sq_fallen_wave01b", [2, 0]);
    tally("sq_fallen_wave01c", [1, 0, 0]);
    ticks(2);
    expect(taskOf("sq_fallen_wave01a")).toBe(8);
    tally("sq_fallen_wave01c", [3, 0, 1]);
    ticks(14);
    expect(taskOf("sq_fallen_wave02a")).toBe(9);
    expect(taskOf("sq_fallen_wave02e")).toBe(3);
    for (const name of [
      "sq_fallen_wave02b",
      "sq_fallen_wave02c",
      "sq_fallen_wave02d",
      "sq_fallen_wave02e",
    ]) {
      tally(name, name.endsWith("b") ? [4, 1] : [2]);
    }
    tally("sq_fallen_wave02a", [3, 0]);
    ticks(2);
    expect(taskOf("sq_fallen_wave02a")).toBe(10);
    tally("sq_fallen_wave02a", [4, 1]);
    ticks(4);
    expect(taskOf("sq_fallen_wave03a")).toBe(15);
    expect(taskOf("sq_fallen_wave03b")).toBe(16);
    ticks(5);
    // The third wave: the clients report each squad down once its last
    // body is (a servitor's death never reaches the tally).
    for (const name of ["sq_fallen_wave03a", "sq_fallen_wave03b"]) {
      tally(name, [0, 3]);
      runtime.reportSquadAlive(rowOf("DOME_C", name), 0);
    }
    ticks(10);
    expect(taskOf("sq_fallen_wave03b")).toBe(23);
    expect(said("mission act_cosmo_m2_dome_c_mission5 starting")).toBe(true);

    // The beacon: its death ends the activity.
    ticks(8);
    runtime.reportObjectAlive(
      rowOf("DOME_C", "obj_placement_m2_o4b._object"),
      false
    );
    ticks(40);
    expect(said("lifetime end_game")).toBe(true);
    expect(said("activity ended - scripts stopped")).toBe(true);
  });

  // A relaunch at the Dry Sea's checkpoint (2026-10-21 run): phase01 runs
  // from the start, waits for the players, and the lifetime goes active.
  it("resumes at the Dry Sea with the lifetime going active on ready", () => {
    const log: string[] = [];
    const players: ActivityPlayer[] = [];
    const runtime = new ScriptRuntime({
      bundles: TAGS,
      clock: { activityTicks: () => 0 },
      log: (line) => log.push(line),
      phaseProgress: { read: () => 1, write: () => undefined },
      players: () => players,
      scriptFor: (bundleTag) => bundleTag,
      scripts: tu0ScriptSource(TAGS, "cosmo"),
      tickSeconds: 1,
    });
    runtime.start();
    runtime.setActiveBundles(new Set(TAGS.map((tag) => tag.bundle)));
    const said = (text: string) => log.some((line) => line.includes(text));
    for (let i = 0; i < 5; i++) {
      runtime.tick();
    }
    expect(said("mission act_cosmo_m2_dome_c_mission2 starting")).toBe(true);
    expect(said("mission act_cosmo_m2_dome_c_mission1 starting")).toBe(false);
    expect(said("lifetime set_state(active)")).toBe(false);
    expect(said("seq_d_o1_s017")).toBe(false);
    players.push({ characterKey: "c0", powerLevel: 1, ready: true });
    runtime.reportPlayerSpawned();
    for (let i = 0; i < 5; i++) {
      runtime.tick();
    }
    expect(said("lifetime set_state(active)")).toBe(true);
    expect(said("seq_d_o1_s017")).toBe(true);
    expect(said("tutorial_vehicle")).toBe(false);
  });
});
