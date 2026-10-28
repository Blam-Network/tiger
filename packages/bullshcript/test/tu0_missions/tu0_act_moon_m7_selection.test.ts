import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ACT_MOON_M7_SELECTION_ROWS,
  ACT_MOON_M7_SELECTION_TAGS,
} from "./tu0_act_moon_m7_selection_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_moon_m7_selection (Now Come Salvation) on TU0: its own bundles and the
// binder (TU0 disc tags), and the script each one runs.
const BUNDLES = [
  {
    bundle: 0xf8_72_5c_53,
    key: "ROOT",
    path: "es/moon/act_moon_m7_selection/act_moon_m7_selection.es",
  },
  {
    bundle: 0x99_5f_bd_7f,
    key: "AUDIO",
    path: "es/moon/act_moon_m7_selection/unknown_995fbd7f.es",
  },
  {
    bundle: 0x52_f0_f3_53,
    key: "LAUNCHTUBES",
    path: "es/moon/launchtubes/enc_launchtubes_m7.es",
  },
  {
    bundle: 0x1b_f7_5a_33,
    key: "SELECTION",
    path: "es/moon/selection/enc_selection_m7.es",
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

const MISSIONS = [1, 2, 3, 4, 5, 6].map(
  (n) => `es/moon/act_moon_m7_selection/act_moon_m7_selection_mission${n}.esp`
);

// the control's TU0 import identifier
const CONTROL = 0x34_ea_a8_16;

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key }) => ({
  bundle,
  rows: (ACT_MOON_M7_SELECTION_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag: ACT_MOON_M7_SELECTION_TAGS[key] ?? 0,
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

describe("TU0 act_moon_m7_selection scripts", () => {
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

  it("starts in the accelerator with the accelerator phase", () => {
    const start = tu0Scripts.activityStart("act_moon_m7_selection");
    expect(start?.startSlice).toBe("accelerator");
    expect(start?.startPhase?.name).toBe("phase_accelerator");
    expect(start?.spawnTransition).toBe(0x87_87_51_58);
    expect(start?.phases.map(({ slice }) => slice)).toEqual([
      "accelerator",
      "launchtubes",
      "launchtubes",
      "selection",
      "selection",
      "selection",
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

  it("runs the mission on the TU0 host from the accelerator to the outro", () => {
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
    // The task a squad row was last given.
    const taskOf = (key: string, name: string) => {
      const row = rowOf(key, name);
      const writes = changes.filter(
        (change) =>
          change.kind === "squad" &&
          change.item.bundle === row.bundle &&
          change.item.typeIndex === row.typeIndex
      );
      const last = writes.at(-1);
      return last?.kind === "squad" ? last.state.task : undefined;
    };
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

    // The accelerator: active at the spawn, the intro and the tubes phase
    // three seconds on, its objective eight seconds after that.
    ticks(1);
    expect(said("mission act_moon_m7_selection_mission1 starting")).toBe(true);
    runtime.reportPlayerSpawned();
    ticks(2);
    expect(said("lifetime set_state(active)")).toBe(true);
    ticks(3);
    expect(said("mission act_moon_m7_selection_mission2 starting")).toBe(true);
    expect(said("seq_music_intro t5#0 sequence play")).toBe(true);
    expect(said("seq_dialog_moonbase_launchtubes_transition")).toBe(true);
    ticks(9);
    expect(
      said(
        "phase_launchtubes.sp_objective_goto._player_objective t32#0 player objective active"
      )
    ).toBe(true);

    // The tubes: each stretch on its trigger, the exit at the inner floor.
    expect(deviceOf("LAUNCHTUBES", "o_gate_intro")).toBe(1);
    fire("LAUNCHTUBES", "pt_bowl");
    ticks(2);
    expect(taskOf("LAUNCHTUBES", "sq_bowl_trooper_a")).toBe(2);
    fire("LAUNCHTUBES", "pt_tube");
    fire("LAUNCHTUBES", "pt_floor");
    ticks(2);
    expect(taskOf("LAUNCHTUBES", "sq_tube_trooper_a")).toBe(5);
    expect(taskOf("LAUNCHTUBES", "sq_floor_knight")).toBe(8);
    expect(deviceOf("LAUNCHTUBES", "o_gate_exit")).toBeUndefined();
    fire("LAUNCHTUBES", "pt_floor_inner");
    ticks(2);
    expect(deviceOf("LAUNCHTUBES", "o_gate_exit")).toBe(1);
    expect(said("seq_hive_announce")).toBe(true);

    // The floor: the goto clears on its volume, then the control.
    fire("ROOT", "phase_launchtubes.sp_objective_goto._player_trigger");
    ticks(3);
    expect(said("mission act_moon_m7_selection_mission3 starting")).toBe(true);
    ticks(1);
    expect(said("seq_dialog_launchtubes_seeder")).toBe(true);
    ticks(5);
    expect(said("seq_dialog_launchtubes_control_complete")).toBe(false);
    runtime.reportInteraction((hash) => hash === CONTROL);
    ticks(6);
    expect(said("seq_dialog_launchtubes_control_complete")).toBe(true);
    expect(said("mission act_moon_m7_selection_mission4 starting")).toBe(true);
    ticks(1);
    expect(said("seq_dialog_strength_selection_transition")).toBe(true);

    // Selection: the first kill line with the bubble, the stretches on
    // their triggers.
    ticks(3);
    expect(said("seq_dialog_selection_kill_progress_a")).toBe(true);
    fire("SELECTION", "pt_twist");
    fire("SELECTION", "pt_cave");
    fire("SELECTION", "pt_hall");
    fire("SELECTION", "pt_deck");
    ticks(2);
    expect(taskOf("SELECTION", "sq_twist_knight")).toBe(3);
    expect(taskOf("SELECTION", "sq_cave_thrall_a")).toBe(5);
    expect(taskOf("SELECTION", "sq_hall_knight_cleaver")).toBe(9);
    expect(taskOf("SELECTION", "sq_deck_ogre")).toBe(11);
    expect(said("seq_dialog_selection_kill_progress_b")).toBe(true);
    expect(said("seq_ogre_announce")).toBe(true);

    // The arena: the goto clears, the witches come up casting and are
    // named, and the objective clears once all four are dead.
    fire("ROOT", "phase_selection.sp_objective_goto._player_trigger");
    fire("SELECTION", "pt_arena");
    ticks(3);
    expect(said("mission act_moon_m7_selection_mission5 starting")).toBe(true);
    expect(said("sq_arena_a_wizard_a t1#21")).toBe(true);
    ticks(9);
    expect(said("seq_dialog_selection_witches")).toBe(true);
    const witches = ["a", "b", "c", "d"].map((w) =>
      rowOf("SELECTION", `sq_arena_a_wizard_${w}__major_wizard`)
    );
    for (const witch of witches) {
      runtime.reportActorBound(witch, false, true);
    }
    ticks(2);
    for (const witch of witches.slice(0, 3)) {
      runtime.reportActorBound(witch, true, true);
    }
    ticks(3);
    expect(said("mission act_moon_m7_selection_mission6 starting")).toBe(false);
    runtime.reportActorBound(witches[3]!, true, true);
    ticks(5);
    expect(said("mission act_moon_m7_selection_mission6 starting")).toBe(true);

    // The outro: the last line, the activity complete, the results.
    ticks(13);
    expect(said("seq_dialog_selection_outro")).toBe(true);
    expect(completed).toBe(0);
    ticks(19);
    expect(completed).toBe(1);
    ticks(32);
    expect(said("lifetime end_game")).toBe(true);
  });
});
