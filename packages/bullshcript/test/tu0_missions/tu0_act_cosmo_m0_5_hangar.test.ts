import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import { ACT_COSMO_M0_5_HANGAR_ROWS } from "./tu0_act_cosmo_m0_5_hangar_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_cosmo_m0_5_hangar on TU0: its bundles (TU0 disc tags) and the script
// each one runs. enc_hangar_amb1 is the Cosmodrome's ambient hangar, whose
// squads the hangar encounter waits on; no script of its own here.
const BUNDLES: { bundle: number; key: string; path?: string; tag: number }[] = [
  {
    bundle: 0x47_86_c0_e0,
    key: "STORY_COMMON",
    path: "bs/activities/common/story_common.bs",
    tag: 0x80_cc_b7_c8,
  },
  {
    bundle: 0x12_00_a0_31,
    key: "ACT_COSMO_M0_5_HANGAR",
    path: "es/cosmo/act_cosmo_m0_5_hangar/act_cosmo_m0_5_hangar.es",
    tag: 0x80_cb_92_99,
  },
  {
    bundle: 0x0d_e8_0b_0d,
    key: "AUDIO",
    path: "es/cosmo/act_cosmo_m0_5_hangar/unknown_0de80b0d.es",
    tag: 0x80_cb_92_9a,
  },
  {
    bundle: 0xb4_1e_2f_1d,
    key: "HANGAR",
    path: "es/cosmo/hangar/enc_hangar_m0_5.es",
    tag: 0x80_cb_92_4c,
  },
  { bundle: 0x75_56_a7_bb, key: "HANGAR_AMB", tag: 0x80_cc_af_8b },
];

// the native base each kind of file sits on
const BASES: Readonly<Record<string, string>> = {
  bs: "c_encounter",
  es: "c_encounter",
  esp: "c_mission_phase",
  esu: "c_activity_script",
};

const MISSIONS = [1, 2, 3].map(
  (n) => `es/cosmo/act_cosmo_m0_5_hangar/act_cosmo_m0_5_hangar_mission${n}.esp`
);

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key, tag }) => ({
  bundle,
  rows: (ACT_COSMO_M0_5_HANGAR_ROWS[key] ?? []).map(
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

describe("TU0 act_cosmo_m0_5_hangar scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES) {
      if (!path) {
        continue;
      }
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "cosmo")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    const root = tu0Scripts.scriptByPath(
      "es/cosmo/act_cosmo_m0_5_hangar/act_cosmo_m0_5_hangar.es"
    );
    expect(
      root && tu0Scripts.missionScripts(root).map((file) => file.path)
    ).toEqual(MISSIONS);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.flatMap((entry) => (entry.path ? [entry.path] : [])),
      ...MISSIONS,
      ...[
        "collect_loot_objective",
        "generic_objective",
        "interactable_objective",
        "trigger_bubble_objective",
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

  it("names the hangar Objective's tasks by their cracked names", () => {
    const objective = TAGS.find(
      (tag) => tag.bundle === 0xb4_1e_2f_1d
    )?.rows.find((row) => row.name === "obj_hangar_m0_5_fallen");
    expect(objective?.tasks?.map((task) => task.name)).toEqual(
      ["ultra", "wave_3", "wave_2", "ultra_gang"].map(fnv1)
    );
  });

  it("runs the mission on the TU0 host from delta_s to the ascent", () => {
    const log: string[] = [];
    const players: ActivityPlayer[] = [
      { characterKey: "c0", powerLevel: 1, ready: true },
    ];
    let progress = 0;
    const runtime = new ScriptRuntime({
      bundles: TAGS,
      clock: { activityTicks: () => 0 },
      log: (line) => log.push(line),
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
    // a squad of one named actor stands once the actor is placed with it
    const placed = (squad: string) => said(`placed with ${squad}`);

    ticks(2);
    expect(said("mission act_cosmo_m0_5_hangar_mission1 starting")).toBe(true);
    expect(said("lifetime set_state(active)")).toBe(true);
    // The flare objective goes active once the Ghost's opening line (6 s)
    // is over, not before.
    ticks(3);
    expect(said("activity flag 0x6607D3FA set")).toBe(false);
    ticks(8);
    expect(said("activity flag 0x6607D3FA set")).toBe(true);
    runtime.reportInteraction((hash) => hash === 0x66_07_d3_fa);
    ticks(5);
    expect(said("activity flag 0x6607D3FA cleared")).toBe(true);
    // The ship objective comes up as the 27 s line after the flare ends.
    ticks(20);
    expect(said("activity flag 0xDE0933DB set")).toBe(false);
    ticks(15);
    expect(said("activity flag 0xDE0933DB set")).toBe(true);
    runtime.reportInteraction((hash) => hash === 0xde_09_33_db);
    ticks(20);
    expect(said("mission act_cosmo_m0_5_hangar_mission2 starting")).toBe(true);

    // The hangar: the bubble trigger, then the ambient Fallen go down and
    // the ultra lands, its Vandals behind it.
    runtime.reportTriggerFired(
      rowOf(
        "ACT_COSMO_M0_5_HANGAR",
        "cosmo_m0_5_phase01_hangar.obj_m0_5_goto_hangar._player_trigger"
      )
    );
    ticks(3);
    expect(said("set_switch_mask(7)")).toBe(true);
    expect(placed("sq_amb_fallen_ultra")).toBe(false);
    for (const name of ["sq_amb_fallen_north_2", "sq_amb_fallen_south_1"]) {
      runtime.reportSquadAlive(rowOf("HANGAR_AMB", name), 0);
    }
    ticks(4);
    expect(placed("sq_amb_fallen_ultra")).toBe(true);
    expect(said("sq_amb_fallen_ultra:set_task(wave_2) -> task 2")).toBe(true);
    ticks(12);
    const vandals = [1, 2, 3].map((n) => `sq_amb_fallen_vandal_${n}`);
    for (const vandal of vandals) {
      expect(placed(vandal), vandal).toBe(true);
    }
    expect(said("set_task(ultra_gang) -> task 3")).toBe(true);
    expect(said("sq_amb_fallen_ultra:set_task(wave_3) -> task 1")).toBe(true);
    expect(placed("sq_amb_fallen_vandal_4")).toBe(false);

    // The ultra's loot is picked up; then the Vandals are cleared out.
    runtime.reportLootGathered((hash) => hash === 0x24_39_99_a0);
    ticks(4);
    expect(said("mission act_cosmo_m0_5_hangar_mission3 starting")).toBe(true);
    ticks(5);
    expect(said("set_activity_complete()")).toBe(false);
    for (const vandal of vandals) {
      runtime.reportSquadAlive(rowOf("HANGAR", vandal), 0);
    }
    ticks(8);
    expect(said("set_activity_complete()")).toBe(true);
    expect(said("lifetime end_game (results, 30 s)")).toBe(true);
    ticks(40);
    expect(said("activity ended - scripts stopped")).toBe(true);
  });
});
