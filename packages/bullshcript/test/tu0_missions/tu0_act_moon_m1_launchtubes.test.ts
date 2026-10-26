import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ACT_MOON_M1_LAUNCHTUBES_ROWS,
  ACT_MOON_M1_LAUNCHTUBES_TAGS,
} from "./tu0_act_moon_m1_launchtubes_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_moon_m1_launchtubes (The Dark Beyond) on TU0: its own bundles and the
// binder (TU0 disc tags), and the script each one runs.
const BUNDLES = [
  {
    bundle: 0x70_29_bd_3d,
    key: "ROOT",
    path: "es/moon/act_moon_m1_launchtubes/act_moon_m1_launchtubes.es",
  },
  {
    bundle: 0xd6_6c_e6_81,
    key: "AUDIO",
    path: "es/moon/act_moon_m1_launchtubes/unknown_d66ce681.es",
  },
  {
    bundle: 0x24_95_f5_41,
    key: "ACCELERATOR",
    path: "es/moon/act_moon_m1_launchtubes/unknown_2495f541.es",
  },
  {
    bundle: 0x43_f9_e8_c0,
    key: "LAUNCHTUBES",
    path: "es/moon/act_moon_m1_launchtubes/unknown_43f9e8c0.es",
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

const MISSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
  (n) =>
    `es/moon/act_moon_m1_launchtubes/act_moon_m1_launchtubes_mission${n}.esp`
);

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key }) => ({
  bundle,
  rows: (ACT_MOON_M1_LAUNCHTUBES_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag: ACT_MOON_M1_LAUNCHTUBES_TAGS[key] ?? 0,
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

describe("TU0 act_moon_m1_launchtubes scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES.slice(0, 4)) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "moon")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    const root = tu0Scripts.scriptByPath(BUNDLES[0]!.path);
    expect(
      root && tu0Scripts.missionScripts(root).map((file) => file.path)
    ).toEqual(MISSIONS);
  });

  it("starts in the accelerator's intro state at the mission's spawn point", () => {
    const start = tu0Scripts.activityStart("act_moon_m1_launchtubes");
    expect(start?.startSlice).toBe("accelerator");
    expect(start?.startPhase?.name).toBe("phase_intro_cin");
    expect(start?.spawnTransition).toBe(0x87_87_51_58);
    expect(start?.phases.map(({ slice }) => slice)).toEqual([
      "accelerator",
      "accelerator",
      "moonbase",
      "launchtubes",
      "launchtubes",
      "launchtubes",
      "launchtubes",
      "launchtubes",
      "launchtubes",
    ]);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
      ...[
        "cinematic_midmission",
        "generic_objective",
        "interactable_objective",
        "interactable_placement",
        "kill_squad_objective",
        "trigger_bubble_objective",
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

  it("runs the mission on the TU0 host from the intro to the Ghost", () => {
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
      scripts: tu0ScriptSource(TAGS, "moon"),
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
    const use = (identifier: number) =>
      runtime.reportInteraction((hash) => hash === identifier);
    const alive = (key: string, name: string, count: number) =>
      runtime.reportSquadAlive(rowOf(key, name), count);
    // A kill incident naming no squad: the listeners scoped to a squad count
    // its deaths from the sense, up to the kills the guest reported.
    const kill = () =>
      runtime.reportKill({
        assists: [],
        killer: { characterKey: "c0" },
        victim: {},
      });
    const tally = (key: string, name: string, cells: number[]) =>
      runtime.reportSquadTally(rowOf(key, name), cells);
    const spent = (key: string, ...names: string[]) => {
      for (const name of names) {
        runtime.reportActorBound(rowOf(key, name), true, true);
      }
    };
    // The device position an object row was last given.
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

    // The intro cinematic plays before anyone spawns.
    ticks(3);
    expect(said("mission act_moon_m1_launchtubes_mission1 starting")).toBe(
      true
    );
    expect(said("lifetime cinematic hold")).toBe(true);
    runtime.reportCinematicFinished(
      rowOf("ROOT", "phase_intro_cin.pf_cine_109_mnr._cinematic")
    );
    ticks(3);
    expect(said("mission act_moon_m1_launchtubes_mission2 starting")).toBe(
      true
    );

    // The accelerator: spawn, the explore objective twelve seconds on, then
    // the button.
    runtime.reportPlayerSpawned();
    fire("ACCELERATOR", "pt_bubble");
    ticks(3);
    expect(said("lifetime set_state(active)")).toBe(true);
    expect(said("o_device_invis_a t4#0 object present")).toBe(true);
    ticks(12);
    expect(
      said("pf_gen_obj_explore._player_objective t32#1 player objective active")
    ).toBe(true);
    fire("ACCELERATOR", "pt_accel_enter");
    ticks(5);
    expect(
      said(
        "pf_objective_button_a._player_objective t32#4 player objective active"
      )
    ).toBe(true);

    // The false start: the accelerator charges and dies, the room's Fallen
    // come and the west ship hovers.
    use(0x0f_93_e9_4c);
    ticks(6);
    expect(deviceOf("ACCELERATOR", "o_device_invis_a")).toBe(1);
    expect(said("seq_accel_audio_false_start t5#46 sequence play")).toBe(true);
    ticks(8);
    expect(deviceOf("ACCELERATOR", "o_device_invis_a")).toBe(0);
    expect(said("sq_interior_back t1#11 bodies=3")).toBe(true);
    expect(said("sq_dropship_west__pilot t2#34 command script cookie #1")).toBe(
      true
    );
    ticks(8);
    expect(
      said("pf_gen_obj_defend._player_objective t32#8 player objective active")
    ).toBe(true);

    // Out through the drop exit: the first drop, and the true start once
    // three of its four are dead.
    fire("ACCELERATOR", "pt_drop_exit");
    ticks(4);
    expect(said("sq_dropship_west__pilot drop t1#22 bodies=4")).toBe(true);
    alive("ACCELERATOR", "sq_drop_initial", 4);
    ticks(2);
    for (const left of [3, 2]) {
      kill();
      alive("ACCELERATOR", "sq_drop_initial", left);
      ticks(2);
    }
    expect(said("seq_accel_audio_true_start t5#45 sequence play")).toBe(false);
    kill();
    alive("ACCELERATOR", "sq_drop_initial", 1);
    ticks(4);
    expect(said("seq_accel_audio_true_start t5#45 sequence play")).toBe(true);
    ticks(2);
    expect(deviceOf("ACCELERATOR", "pf_placement_button_b._object")).toBe(0);
    ticks(14);
    expect(said("sq_dropship_east__pilot drop t1#23 bodies=4")).toBe(true);
    expect(said("sq_dropship_east__pilot drop t1#25 bodies=2")).toBe(true);
    // Five of the six down brings the second east ship and its drop.
    expect(said("enter_45_stop")).toBe(false);
    tally("ACCELERATOR", "sq_drop_a", [3, 0]);
    tally("ACCELERATOR", "sq_drop_c", [2]);
    ticks(6);
    expect(said("enter_45_stop")).toBe(true);
    ticks(6);
    expect(said("sq_dropship_east__pilot drop t1#26 bodies=5")).toBe(true);

    // The last of them dead: the defend objective ends and the moonbase
    // phase starts seven seconds on.
    spent(
      "ACCELERATOR",
      "sq_interior_back__dreg_pistol",
      "sq_interior_back__dreg_pistol_1",
      "sq_interior_back__dreg_pistol_2",
      "sq_interior_melee__dreg_knife",
      "sq_interior_front__dreg_pistol",
      "sq_interior_front__dreg_pistol_1",
      "sq_interior_front__dreg_pistol_2",
      "sq_interior_front__vandal"
    );
    tally("ACCELERATOR", "sq_drop_initial", [3, 1]);
    tally("ACCELERATOR", "sq_drop_a", [3, 1]);
    tally("ACCELERATOR", "sq_drop_c", [4]);
    tally("ACCELERATOR", "sq_drop_d", [2, 1, 1, 1]);
    for (const name of [
      "sq_drop_initial",
      "sq_drop_a",
      "sq_drop_c",
      "sq_drop_d",
    ]) {
      alive("ACCELERATOR", name, 0);
    }
    ticks(4);
    expect(said("tg_m1_accel_combat t30#40 trigger group deactivate()")).toBe(
      true
    );
    ticks(12);
    expect(said("mission act_moon_m1_launchtubes_mission3 starting")).toBe(
      true
    );

    // The moonbase terminal, then on to the launch tubes.
    ticks(5);
    use(0x83_62_59_6d);
    ticks(6);
    expect(said("mission act_moon_m1_launchtubes_mission4 starting")).toBe(
      true
    );
    ticks(4);
    fire("ROOT", "phase_goto_launchtubes.pf_objective_goto._player_trigger");
    ticks(3);
    expect(said("mission act_moon_m1_launchtubes_mission5 starting")).toBe(
      true
    );

    // The fallen Guardian and the false button.
    ticks(4);
    fire("ROOT", "phase_3_launchtubes.pt_guardian_down");
    ticks(5);
    use(0xb5_c2_fd_d1);
    ticks(9);
    expect(
      deviceOf("ROOT", "phase_3_launchtubes.pf_placement_button_false._object")
    ).toBe(1);
    expect(said("mission act_moon_m1_launchtubes_mission6 starting")).toBe(
      true
    );

    // The Hive cinematic, then the gate.
    ticks(6);
    runtime.reportCinematicFinished(
      rowOf("ROOT", "phase_4_launchtubes.pf_cine_110_mst._cinematic")
    );
    ticks(9);
    expect(said("mission act_moon_m1_launchtubes_mission7 starting")).toBe(
      true
    );
    expect(said("o_gate_lock01 t4#4 object absent")).toBe(true);
    expect(said("sq_gate_knights t1#14 bodies=4")).toBe(true);
    ticks(13);
    expect(
      said(
        "pf_gen_obj_kill_all._player_objective t32#26 player objective active"
      )
    ).toBe(true);
    spent(
      "LAUNCHTUBES",
      "sq_gate_knights__knight",
      "sq_gate_knights__trooper_a",
      "sq_gate_knights__trooper_b",
      "sq_gate_knights__trooper_c"
    );
    tally("LAUNCHTUBES", "sq_gate_knights", [0, 0, 0, 0]);
    alive("LAUNCHTUBES", "sq_gate_knights", 0);
    ticks(7);
    expect(said("mission act_moon_m1_launchtubes_mission8 starting")).toBe(
      true
    );

    // The court: the Ghost's volume brings the Knight; his death ends it.
    ticks(6);
    fire("ROOT", "phase_5_launchtubes.pf_trigger_ghost._player_trigger");
    ticks(2);
    expect(said("sq_court_high_b t1#31 bodies=1")).toBe(true);
    ticks(4);
    spent("LAUNCHTUBES", "sq_court_high_b__major");
    tally("LAUNCHTUBES", "sq_court_high_b", [0]);
    alive("LAUNCHTUBES", "sq_court_high_b", 0);
    ticks(4);
    expect(said("mission act_moon_m1_launchtubes_mission9 starting")).toBe(
      true
    );

    // Taking the Ghost completes the activity; the game ends half a minute
    // later.
    ticks(5);
    expect(completed).toBe(0);
    use(0x67_fb_61_49);
    ticks(3);
    expect(completed).toBe(1);
    ticks(35);
    expect(said("lifetime end_game")).toBe(true);
  });
});
