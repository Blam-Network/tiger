import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ACT_MOON_M5_STRENGTH_ROWS,
  ACT_MOON_M5_STRENGTH_TAGS,
} from "./tu0_act_moon_m5_strength_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_moon_m5_strength (Chamber of Night) on TU0: its own bundles and the
// binder (TU0 disc tags), and the script each one runs.
const BUNDLES = [
  {
    bundle: 0x91_6e_81_ae,
    key: "ROOT",
    path: "es/moon/act_moon_m5_strength/act_moon_m5_strength.es",
  },
  {
    bundle: 0xf3_85_d0_ca,
    key: "AUDIO",
    path: "es/moon/act_moon_m5_strength/unknown_f385d0ca.es",
  },
  {
    bundle: 0xd5_3a_aa_20,
    key: "CHAMBER",
    path: "es/moon/act_moon_m5_strength/unknown_d53aaa20.es",
  },
  {
    bundle: 0x7d_a1_d5_7e,
    key: "APPROACH",
    path: "es/moon/strength/enc_strength_m5.es",
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
  (n) => `es/moon/act_moon_m5_strength/act_moon_m5_strength_mission${n}.esp`
);

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key }) => ({
  bundle,
  rows: (ACT_MOON_M5_STRENGTH_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag: ACT_MOON_M5_STRENGTH_TAGS[key] ?? 0,
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

describe("TU0 act_moon_m5_strength scripts", () => {
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

  it("starts in the Hellmouth with the Hellmouth phase", () => {
    const start = tu0Scripts.activityStart("act_moon_m5_strength");
    expect(start?.startSlice).toBe("hellmouth");
    expect(start?.startPhase?.name).toBe("phase_2_hellmouth");
    expect(start?.phases.map(({ slice }) => slice)).toEqual([
      "hellmouth",
      "launchtubes",
      "launchtubes",
      "launchtubes",
      "strength",
      "strength",
      "strength",
      "strength",
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

  it("runs the mission on the TU0 host from the Hellmouth to the shard", () => {
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
    // A squad all dead: its tally full and its alive count 0.
    const dead = (key: string, name: string, cells: number[]) => {
      runtime.reportSquadTally(rowOf(key, name), cells);
      runtime.reportSquadAlive(rowOf(key, name), 0);
    };
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

    // The Hellmouth: the objective ten seconds after the spawn, a line after
    // each of the two uses, then the clear.
    ticks(1);
    expect(said("mission act_moon_m5_strength_mission1 starting")).toBe(true);
    runtime.reportPlayerSpawned();
    ticks(2);
    expect(said("lifetime set_state(active)")).toBe(true);
    expect(said("seq_music_intro t5#0 sequence play")).toBe(true);
    ticks(10);
    expect(
      said(
        "obj_m5_multi_interact._player_objective t32#0 player objective active"
      )
    ).toBe(true);
    use(0xe3_54_1d_c3);
    ticks(4);
    expect(said("seq_d_o1_s075")).toBe(true);
    expect(said("seq_d_o1_s078")).toBe(false);
    use(0xef_61_13_de);
    ticks(4);
    expect(said("seq_d_o1_s078")).toBe(true);
    ticks(8);
    expect(said("mission act_moon_m5_strength_mission2 starting")).toBe(true);
    ticks(1);
    expect(said("seq_d_o2_s01")).toBe(true);

    // The launch tubes, the cinematic, and back out to the chamber.
    ticks(5);
    fire("ROOT", "phase_goto_launchtubes.pf_objective_goto._player_trigger");
    ticks(3);
    expect(said("mission act_moon_m5_strength_mission3 starting")).toBe(true);
    ticks(6);
    fire("ROOT", "phase_3_launchtubes.pf_obj_cine_trigger._player_trigger");
    ticks(3);
    expect(said("mission act_moon_m5_strength_mission4 starting")).toBe(true);
    ticks(5);
    expect(said("lifetime cinematic hold")).toBe(true);
    runtime.reportCinematicFinished(
      rowOf("ROOT", "phase_cinematic.pf_cine_110a_mrt._cinematic")
    );
    ticks(8);
    expect(said("mission act_moon_m5_strength_mission5 starting")).toBe(true);

    // The approach: the ledge, hall and annex at the bubble, the tomb ship's
    // drop, then the tower and bridge once the ship is gone and the ledge is
    // clear; the rush gate opens with them.
    ticks(5);
    expect(said("seq_d_o2_s03")).toBe(true);
    fire("ROOT", "phase_goto_strength.pf_objective_goto._player_trigger");
    fire("APPROACH", "pt_bubble");
    ticks(3);
    expect(said("mission act_moon_m5_strength_mission6 starting")).toBe(true);
    expect(said("sq_cutter__pilot t2#17 command script cookie #1")).toBe(true);
    ticks(10);
    expect(said("sq_cutter__pilot drop t1#7")).toBe(true);
    ticks(4);
    expect(said("sq_cutter__pilot t2#17 command script cookie #2")).toBe(true);
    fire("CHAMBER", "pt_gate_rush");
    spent("APPROACH", "sq_cutter__pilot");
    dead("APPROACH", "sq_cutter", [0]);
    ticks(3);
    expect(deviceOf("CHAMBER", "o_gate_rush")).toBeUndefined();
    dead("APPROACH", "sq_cave_ledge", [2, 1]);
    ticks(3);
    expect(said("seq_wave_announce1 t5#18 sequence play")).toBe(true);
    expect(deviceOf("CHAMBER", "o_gate_rush")).toBe(1);

    // The ritual: the wizards six seconds into the phase, the casting
    // breaks with the first death, the waves once all three are dead.
    fire("ROOT", "phase_strength_start.pf_obj_ritual_trigger._player_trigger");
    fire("CHAMBER", "pt_gate");
    ticks(3);
    expect(said("mission act_moon_m5_strength_mission7 starting")).toBe(true);
    ticks(7);
    expect(said("sq_dark_ritual t1#32 bodies=3")).toBe(true);
    expect(deviceOf("CHAMBER", "o_gate_intro")).toBe(1);
    // As on the wire: the squad's tally never moves and its alive count
    // reads 0 with the first death, while two wizards still stand.
    const ritual = rowOf("CHAMBER", "sq_dark_ritual");
    runtime.reportSquadTally(ritual, [0, 0, 0]);
    runtime.reportSquadAlive(ritual, 3);
    ticks(1);
    spent("CHAMBER", "sq_dark_ritual__wizard_a");
    runtime.reportSquadAlive(ritual, 0);
    ticks(3);
    expect(deviceOf("CHAMBER", "specops_moon_anomaly.o_darkness")).toBeCloseTo(
      0.5
    );
    ticks(5);
    expect(
      said(
        "phase_4_strength.pf_objective_kill._player_objective t32#20 player objective cleared"
      )
    ).toBe(false);
    spent("CHAMBER", "sq_dark_ritual__wizard_b", "sq_dark_ritual__wizard_c");
    ticks(3);
    expect(
      said(
        "phase_4_strength.pf_objective_kill._player_objective t32#20 player objective cleared"
      )
    ).toBe(true);
    expect(deviceOf("CHAMBER", "o_gate_intro")).toBe(0);

    // The waves, each on the last one's deaths.
    ticks(10);
    expect(said("sq_thrall_exploders_a1 t1#20")).toBe(true);
    dead("CHAMBER", "sq_thrall_exploders_a1", [1, 1]);
    ticks(2);
    expect(said("sq_knights_a t1#22")).toBe(true);
    ticks(10);
    dead("CHAMBER", "sq_knights_a", [1, 1, 1, 1]);
    dead("CHAMBER", "sq_troopers_a", [1]);
    ticks(8);
    expect(said("sq_thrall_exploders_b2 t1#25")).toBe(true);
    ticks(6);
    expect(said("sq_knights_b t1#27")).toBe(true);
    dead("CHAMBER", "sq_thrall_exploders_b1", [1, 1]);
    dead("CHAMBER", "sq_thrall_exploders_b2", [1, 1]);
    dead("CHAMBER", "sq_knights_b", [1, 1]);
    dead("CHAMBER", "sq_troopers_b", [1]);
    ticks(12);
    expect(said("seq_ogreroar_close")).toBe(true);
    ticks(4);
    expect(said("sq_troopers_c t1#31")).toBe(true);
    dead("CHAMBER", "sq_minibosses", [1]);
    ticks(4);
    expect(said("mission act_moon_m5_strength_mission8 starting")).toBe(true);

    // The shard: the button, the lines, the activity complete, the game's
    // end half a minute later.
    ticks(4);
    expect(completed).toBe(0);
    use(0x0a_a5_4c_c0);
    ticks(3);
    expect(
      deviceOf("ROOT", "phase_strength_complete.pf_placement_button_a._object")
    ).toBeCloseTo(0.1);
    ticks(10);
    expect(
      deviceOf("ROOT", "phase_strength_complete.pf_placement_button_a._object")
    ).toBe(1);
    ticks(24);
    expect(completed).toBe(1);
    ticks(35);
    expect(said("lifetime end_game")).toBe(true);
  });
});
