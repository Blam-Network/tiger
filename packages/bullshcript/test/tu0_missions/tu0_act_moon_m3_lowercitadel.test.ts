import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ACT_MOON_M3_LOWERCITADEL_ROWS,
  ACT_MOON_M3_LOWERCITADEL_TAGS,
} from "./tu0_act_moon_m3_lowercitadel_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_moon_m3_lowercitadel (The World's Grave) on TU0: its own bundles and
// the binder (TU0 disc tags), and the script each one runs.
const BUNDLES = [
  {
    bundle: 0x95_2f_31_3e,
    key: "ROOT",
    path: "es/moon/act_moon_m3_lowercitadel/act_moon_m3_lowercitadel.es",
  },
  {
    bundle: 0xe2_38_8e_fa,
    key: "AUDIO",
    path: "es/moon/act_moon_m3_lowercitadel/unknown_e2388efa.es",
  },
  {
    bundle: 0x7d_a1_d5_78,
    key: "STRENGTH",
    path: "es/moon/strength/enc_strength_m3.es",
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

const MISSIONS = [1, 2, 3, 4, 5].map(
  (n) =>
    `es/moon/act_moon_m3_lowercitadel/act_moon_m3_lowercitadel_mission${n}.esp`
);

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key }) => ({
  bundle,
  rows: (ACT_MOON_M3_LOWERCITADEL_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag: ACT_MOON_M3_LOWERCITADEL_TAGS[key] ?? 0,
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

describe("TU0 act_moon_m3_lowercitadel scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES.slice(0, 3)) {
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

  it("starts in the accelerator, walks down to the citadel and the chamber", () => {
    const start = tu0Scripts.activityStart("act_moon_m3_lowercitadel");
    expect(start?.startSlice).toBe("accelerator");
    expect(start?.spawnTransition).toBe(0x87_87_51_58);
    expect(start?.phases.map(({ slice }) => slice)).toEqual([
      "lowercitadel",
      "lowercitadel",
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
        "collect_loot_objective",
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

  it("runs the mission on the TU0 host from the spawn to the scan", () => {
    const log: string[] = [];
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
      phaseProgress: {
        read: () => progress,
        write: (index) => {
          progress = index;
        },
      },
      players: () => players,
      scriptFor: (bundleTag) => bundleTag,
      scripts: tu0ScriptSource(TAGS, "moon"),
      // as web-tiger-day0 hosts it: a squad stands only once a script places it
      squadPlacedByDefault: () => false,
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
    const alive = (name: string, count: number) =>
      runtime.reportSquadAlive(rowOf("STRENGTH", name), count);
    const tally = (name: string, cells: number[]) =>
      runtime.reportSquadTally(rowOf("STRENGTH", name), cells);
    const spent = (...names: string[]) => {
      for (const name of names) {
        runtime.reportActorBound(rowOf("STRENGTH", name), true, true);
      }
    };
    const placed = (name: string) =>
      log.some(
        (line) => line.includes(`${name} t2#`) && line.includes("place")
      );

    // The way down: the objective goes active fourteen seconds after the
    // activity does, and clears on the Lower Citadel's bubble.
    runtime.reportPlayerSpawned();
    ticks(3);
    expect(said("lifetime set_state(active)")).toBe(true);
    expect(said("seq_music_intro t5#0 sequence play")).toBe(true);
    ticks(10);
    expect(
      said(
        "phase_wisdom.pf_objective_goto._player_objective t32#0 player objective active"
      )
    ).toBe(false);
    ticks(3);
    expect(
      said(
        "phase_wisdom.pf_objective_goto._player_objective t32#0 player objective active"
      )
    ).toBe(true);
    fire("ROOT", "phase_wisdom.pf_objective_goto._player_trigger");
    ticks(3);
    expect(said("mission act_moon_m3_lowercitadel_mission2 starting")).toBe(
      true
    );

    // The arena, then the key off the ultra.
    ticks(4);
    fire("ROOT", "phase_lowercitadel.pf_obj_ultra_trigger._player_trigger");
    ticks(4);
    runtime.reportLootGathered((hash) => hash === 0x97_37_bf_52);
    ticks(8);
    expect(said("mission act_moon_m3_lowercitadel_mission3 starting")).toBe(
      true
    );

    // The chamber: its guards come in with the player, and their deaths end
    // the kill objective though no kill names their identifier.
    ticks(4);
    fire("ROOT", "phase_strength.pf_objective_goto._player_trigger");
    fire("STRENGTH", "pt_bubble");
    ticks(4);
    expect(said("sq_m3_guard_front t1#20 bodies=4")).toBe(true);
    expect(said("sq_m3_guard_rear t1#25 bodies=4")).toBe(true);
    alive("sq_m3_guard_front", 4);
    alive("sq_m3_guard_rear", 4);
    ticks(3);
    spent(
      "sq_m3_guard_front__trooper",
      "sq_m3_guard_front__trooper_1",
      "sq_m3_guard_front__trooper_2",
      "sq_m3_guard_front__trooper_3",
      "sq_m3_guard_rear__trooper",
      "sq_m3_guard_rear__trooper_1",
      "sq_m3_guard_rear__knight",
      "sq_m3_guard_rear__knight_1"
    );
    alive("sq_m3_guard_front", 0);
    alive("sq_m3_guard_rear", 0);
    ticks(3);
    expect(said("mission act_moon_m3_lowercitadel_mission4 starting")).toBe(
      true
    );

    // The console: its use starts the scan and the waves.
    ticks(4);
    runtime.reportInteraction((hash) => hash === 0x9d_0a_d7_e7);
    ticks(14);
    expect(said("sq_m3_rear t1#30 bodies=")).toBe(true);
    expect(placed("sq_m3_thrall_a__thrall_c")).toBe(true);
    expect(placed("sq_m3_thrall_a__thrall_d")).toBe(false);
    expect(said("seq_wave_announce1 t5#16 sequence play")).toBe(true);
    // the first push once the Thrall are dead
    spent(
      "sq_m3_thrall_a__thrall_a",
      "sq_m3_thrall_a__thrall_b",
      "sq_m3_thrall_a__thrall_c"
    );
    ticks(5);
    expect(said("sq_m3_push_a_c t1#35 bodies=")).toBe(true);
    // the Ghost's line and the exploders once the push is dead
    expect(said("seq_d_o2_s04 t5#15 sequence play")).toBe(false);
    tally("sq_m3_push_a_a", [2]);
    alive("sq_m3_push_a_a", 0);
    spent("sq_m3_push_a_b__trooper1", "sq_m3_push_a_b__trooper2");
    alive("sq_m3_push_a_b", 0);
    tally("sq_m3_push_a_c", [1, 1]);
    alive("sq_m3_push_a_c", 0);
    ticks(3);
    expect(said("seq_d_o2_s04 t5#15 sequence play")).toBe(true);
    ticks(3);
    expect(placed("sq_m3_exploder1__thrall_exploder_4")).toBe(true);
    expect(placed("sq_m3_exploder2__thrall_exploder_1")).toBe(false);
    // the second exploders a second after the first one dies
    spent("sq_m3_exploder1__thrall_exploder_1");
    ticks(2);
    expect(placed("sq_m3_exploder2__thrall_exploder_1")).toBe(true);
    // the second push once the exploders are dead
    spent(
      "sq_m3_exploder1__thrall_exploder_3",
      "sq_m3_exploder1__thrall_exploder_4",
      "sq_m3_exploder2__thrall_exploder_1",
      "sq_m3_exploder2__thrall_exploder_3",
      "sq_m3_exploder2__thrall_exploder_4"
    );
    ticks(6);
    expect(placed("sq_m3_push_b_b__knight_cleaver1")).toBe(true);
    expect(placed("sq_m3_push_b_b__knight_cleaver2")).toBe(false);

    // The second push dead: the scan is in, the activity completes, and the
    // game ends half a minute later.
    expect(completed).toBe(0);
    spent("sq_m3_push_b_b__knight_cleaver1");
    tally("sq_m3_push_b_a", [1]);
    alive("sq_m3_push_b_a", 0);
    ticks(6);
    expect(completed).toBe(1);
    expect(said("seq_music_ascent t5#2 sequence play")).toBe(true);
    ticks(35);
    expect(said("lifetime end_game")).toBe(true);
  });
});
