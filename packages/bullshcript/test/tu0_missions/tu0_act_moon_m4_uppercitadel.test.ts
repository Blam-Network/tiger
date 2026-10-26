import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ACT_MOON_M4_UPPERCITADEL_ROWS,
  ACT_MOON_M4_UPPERCITADEL_TAGS,
} from "./tu0_act_moon_m4_uppercitadel_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_moon_m4_uppercitadel (The Sword of Crota) on TU0: its own bundles and
// the binder (TU0 disc tags), and the script each one runs.
const BUNDLES = [
  {
    bundle: 0xbd_2a_d5_ae,
    key: "ROOT",
    path: "es/moon/act_moon_m4_uppercitadel/act_moon_m4_uppercitadel.es",
  },
  {
    bundle: 0x86_1c_c3_e2,
    key: "AUDIO",
    path: "es/moon/act_moon_m4_uppercitadel/unknown_861cc3e2.es",
  },
  {
    bundle: 0x50_2e_f6_96,
    key: "UPPERCITADEL",
    path: "es/moon/uppercitadel/enc_uppercitadel_m4.es",
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
  (n) =>
    `es/moon/act_moon_m4_uppercitadel/act_moon_m4_uppercitadel_mission${n}.esp`
);

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key }) => ({
  bundle,
  rows: (ACT_MOON_M4_UPPERCITADEL_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag: ACT_MOON_M4_UPPERCITADEL_TAGS[key] ?? 0,
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

describe("TU0 act_moon_m4_uppercitadel scripts", () => {
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

  it("starts in the accelerator, its phases in the Hellmouth and the upper citadel", () => {
    const start = tu0Scripts.activityStart("act_moon_m4_uppercitadel");
    expect(start?.startSlice).toBe("accelerator");
    expect(start?.startPhase).toBeUndefined();
    expect(start?.spawnTransition).toBe(0x87_87_51_58);
    expect(start?.phases.map(({ slice }) => slice)).toEqual([
      "hellmouth",
      "hellmouth",
      "uppercitadel",
      "uppercitadel",
      "uppercitadel",
      "uppercitadel",
    ]);
    expect(start?.regionSpawnTransitions).toEqual({
      8: 0x87_87_51_58,
      16: 0xff_20_d5_87,
      96: 0x76_75_53_f6,
    });
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
      ...[
        "generic_objective",
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

  it("runs the mission on the TU0 host from the accelerator to the shattered sword", () => {
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
    // A squad wiped: its kills tallied, its named members spent, its report
    // down to 0.
    const wipe = (name: string, tally: number[], ...members: string[]) => {
      for (const member of members) {
        runtime.reportActorBound(rowOf("UPPERCITADEL", member), true, true);
      }
      runtime.reportSquadTally(rowOf("UPPERCITADEL", name), tally);
      runtime.reportSquadAlive(rowOf("UPPERCITADEL", name), 0);
    };

    // The accelerator: the Ghost's landing line, then "Go to the Hellmouth".
    ticks(2);
    runtime.reportPlayerSpawned();
    ticks(2);
    expect(said("lifetime set_state(active)")).toBe(true);
    expect(said("seq_m_intro_s01 t5#0 sequence play")).toBe(true);
    ticks(14);
    expect(
      said(
        "pf_objective_hellmouth_goto._player_objective t32#0 player objective active"
      )
    ).toBe(true);
    fire(
      "ROOT",
      "phase_m4_hellmouth_goto.pf_objective_hellmouth_goto._player_trigger"
    );
    ticks(3);
    expect(said("mission act_moon_m4_uppercitadel_mission2 starting")).toBe(
      true
    );

    // The henge: get there, then its Hive (the clock stands in for them).
    ticks(4);
    fire(
      "ROOT",
      "phase_m4_hellmouth.pf_objective_hellmouth_henge_goto._player_trigger"
    );
    ticks(5);
    expect(
      said(
        "pf_objective_hellmouth_henge_kill._player_objective t32#6 player objective active"
      )
    ).toBe(true);
    ticks(56);
    expect(
      said(
        "pf_objective_hellmouth_henge_kill._player_objective t32#6 player objective cleared"
      )
    ).toBe(true);
    ticks(8);
    expect(said("mission act_moon_m4_uppercitadel_mission3 starting")).toBe(
      true
    );

    // On to the upper citadel; its Hive take their posts.
    ticks(4);
    fire(
      "ROOT",
      "phase_m4_uppercitadel_goto.pf_objective_uppercitadel_goto._player_trigger"
    );
    ticks(3);
    expect(said("mission act_moon_m4_uppercitadel_mission4 starting")).toBe(
      true
    );
    expect(said("sq_chainroom_melee1:set_task(0x25436735) -> task 9")).toBe(
      true
    );
    ticks(6);
    expect(said("sq_overlook_anchor1__knight_boomer t2#10 placed")).toBe(true);
    fire("UPPERCITADEL", "pt_chainroom_enter");
    ticks(2);
    expect(said("sq_chainroom_melee1:set_task(0x6744E7F4) -> task 8")).toBe(
      true
    );

    // Into the chain room: "clear the room", and the Wizard three seconds
    // after it goes up. It clears once the room is dead, Wizard included.
    fire(
      "ROOT",
      "phase_m4_uppercitadel.pf_objective_uppercitadel_trigger._player_trigger"
    );
    ticks(7);
    expect(said("sq_chainroom_anchor1__wizard t2#15 placed")).toBe(true);
    ticks(2);
    wipe("sq_overlook_anchor1", [0], "sq_overlook_anchor1__knight_boomer");
    wipe("sq_overlook_support1", [3]);
    wipe("sq_overlook_support3", [3]);
    wipe("sq_chainroom_melee1", [3, 1]);
    wipe("sq_chainroom_melee2", [3, 1]);
    wipe("sq_chainroom_support1", [3]);
    wipe("sq_chainroom_support2", [3]);
    wipe("sq_chainroom_support4", [2]);
    wipe("sq_chainroom_anchor1", [0], "sq_chainroom_anchor1__wizard");
    ticks(3);
    expect(
      said(
        "pf_objective_uppercitadel_clear._player_objective t32#15 player objective cleared"
      )
    ).toBe(false);
    wipe("sq_chainroom_support3", [2]);
    ticks(3);
    expect(
      said(
        "pf_objective_uppercitadel_clear._player_objective t32#15 player objective cleared"
      )
    ).toBe(true);

    // The sword, then the darkness.
    ticks(13);
    expect(said("mission act_moon_m4_uppercitadel_mission5 starting")).toBe(
      true
    );
    ticks(7);
    expect(said("sq_chainroom_wave0_melee3__thrall_a t2#25 placed")).toBe(true);
    wipe("sq_chainroom_wave0_melee1", [2]);
    wipe("sq_chainroom_wave0_melee2", [2]);
    wipe(
      "sq_chainroom_wave0_melee3",
      [0, 0],
      "sq_chainroom_wave0_melee3__thrall_a",
      "sq_chainroom_wave0_melee3__thrall_b"
    );
    ticks(3);
    expect(said("sq_chainroom_wave0_support2__trooper_a t2#31 placed")).toBe(
      true
    );
    wipe("sq_chainroom_wave0_support1", [2]);
    wipe(
      "sq_chainroom_wave0_support2",
      [0, 0],
      "sq_chainroom_wave0_support2__trooper_a",
      "sq_chainroom_wave0_support2__trooper_b"
    );
    ticks(3);
    expect(said("sq_chainroom_wave0_melee4:set_task(0xA0A802A4)")).toBe(true);
    wipe("sq_chainroom_wave0_melee4", [2]);
    wipe("sq_chainroom_wave0_melee5", [2]);
    wipe("sq_chainroom_wave0_support3", [2]);
    wipe("sq_chainroom_wave0_support4", [2]);

    // The first Swordbearer's wave.
    ticks(8);
    expect(said("seq_d_upperc_climax_wave t5#15 sequence play")).toBe(true);
    expect(
      said("sq_chainroom_wave1_major1__major_knight_cleaver t2#36 placed")
    ).toBe(true);
    wipe("sq_chainroom_wave1_melee2", [2]);
    wipe("sq_chainroom_wave1_melee3", [2]);
    wipe(
      "sq_chainroom_wave1_melee1",
      [0, 0],
      "sq_chainroom_wave1_melee1__thrall_a",
      "sq_chainroom_wave1_melee1__thrall_b"
    );
    wipe(
      "sq_chainroom_wave1_major1",
      [0],
      "sq_chainroom_wave1_major1__major_knight_cleaver"
    );

    // The second.
    ticks(7);
    expect(
      said("sq_chainroom_wave2_major1__major_knight_cleaver t2#43 placed")
    ).toBe(true);
    wipe("sq_chainroom_wave2_support1", [2]);
    wipe("sq_chainroom_wave2_support2", [2]);
    wipe(
      "sq_chainroom_wave2_support3",
      [0, 0],
      "sq_chainroom_wave2_support3__trooper_a",
      "sq_chainroom_wave2_support3__trooper_b"
    );
    wipe(
      "sq_chainroom_wave2_major1",
      [0],
      "sq_chainroom_wave2_major1__major_knight_cleaver"
    );

    // The third: when he falls the objective clears and the sword shatters,
    // and the activity completes four seconds on.
    ticks(11);
    expect(
      said("sq_chainroom_wave3_major1__major_knight_cleaver t2#50 placed")
    ).toBe(true);
    wipe(
      "sq_chainroom_wave3_major1",
      [0],
      "sq_chainroom_wave3_major1__major_knight_cleaver"
    );
    ticks(4);
    expect(
      said(
        "pf_objective_uppercitadel_kill._player_objective t32#21 player objective cleared"
      )
    ).toBe(true);
    expect(said("mission act_moon_m4_uppercitadel_mission6 starting")).toBe(
      true
    );
    expect(completed).toBe(0);
    ticks(6);
    expect(said("seq_d_upperc_prince_killed_s01 t5#14 sequence play")).toBe(
      true
    );
    expect(completed).toBe(1);
    ticks(35);
    expect(said("lifetime end_game")).toBe(true);
  });
});
