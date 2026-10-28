import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ACT_VENUS_M06_KETCH_ROWS,
  ACT_VENUS_M06_KETCH_TAGS,
} from "./tu0_act_venus_m06_ketch_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_venus_m06_ketch (Scourge of Winter) on TU0: its own bundles and the
// binder (TU0 disc tags), and the script each one runs.
const BUNDLES = [
  {
    bundle: 0x21_d6_e1_2f,
    key: "ROOT",
    path: "es/venus/act_venus_m06_ketch/act_venus_m06_ketch.es",
  },
  {
    bundle: 0x9e_d3_bc_2b,
    key: "AUDIO",
    path: "es/venus/act_venus_m06_ketch/unknown_9ed3bc2b.es",
  },
  {
    bundle: 0x99_3e_e7_f8,
    key: "DEN",
    path: "es/venus/thieves_den/enc_thieves_den_m06.es",
  },
  {
    bundle: 0x3a_9a_b0_84,
    key: "DOCK",
    path: "es/venus/fallen_dock/enc_fallen_dock_m06.es",
  },
  {
    bundle: 0x74_ad_15_31,
    key: "KETCH",
    path: "es/venus/ketch/enc_ketch_m06.es",
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
  (n) => `es/venus/act_venus_m06_ketch/act_venus_m06_ketch_mission${n}.esp`
);

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key }) => ({
  bundle,
  rows: (ACT_VENUS_M06_KETCH_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag: ACT_VENUS_M06_KETCH_TAGS[key] ?? 0,
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

describe("TU0 act_venus_m06_ketch scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES.slice(0, 5)) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "venus")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    const root = tu0Scripts.scriptByPath(BUNDLES[0]!.path);
    expect(
      root && tu0Scripts.missionScripts(root).map((file) => file.path)
    ).toEqual(MISSIONS);
  });

  it("starts in baby_shat at the GAS's spawn, its phases in the den, the dock and the ketch", () => {
    const start = tu0Scripts.activityStart("act_venus_m06_ketch");
    expect(start?.startSlice).toBe("baby_shat");
    expect(start?.startPhase).toBeUndefined();
    expect(start?.spawnTransition).toBe(0xff_ba_6f_9c);
    expect(start?.regionSpawnTransitions[88]).toBe(0x4f_6a_4d_44);
    expect(start?.phases.map(({ slice }) => slice)).toEqual([
      "thieves_den",
      "dock",
      "ketch",
      "ketch",
      "ketch",
    ]);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
      "es/utility_scripts/generic_objective.esu",
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

  it("runs the mission on the TU0 host from the den to the captain", () => {
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
      scripts: tu0ScriptSource(TAGS, "venus"),
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
    const spent = (key: string, ...names: string[]) => {
      for (const name of names) {
        runtime.reportActorBound(rowOf(key, name), true, true);
      }
    };
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

    // The den: active at the spawn, the goto four seconds on and the
    // majors' objective seven seconds after the den loads (here, at once).
    ticks(1);
    expect(said("mission act_venus_m06_ketch_mission1 starting")).toBe(true);
    runtime.reportPlayerSpawned();
    ticks(2);
    expect(said("lifetime set_state(active)")).toBe(true);
    expect(said("venus_m06_intro_music t5#0 sequence play")).toBe(true);
    ticks(3);
    expect(said("md_vn06_010_10")).toBe(true);
    expect(
      said(
        "phase_thieves_den_hunt_kell.pf_goto_thieves_den._player_objective t32#0 player objective active"
      )
    ).toBe(true);
    expect(taskOf("DEN", "sq_caldera_ent01")).toBe(1);
    expect(taskOf("DEN", "sq_major_vandals_blade")).toBe(2);
    ticks(12);
    expect(
      said(
        "phase_thieves_den_hunt_kell.pf_kill_kell._player_objective t32#3 player objective active"
      )
    ).toBe(true);
    fire("DEN", "pt_bottom");
    ticks(2);
    expect(taskOf("DEN", "sq_den_bottom03")).toBe(8);
    for (const actor of [
      "sq_major_vandals_rifle__vandal_rifle",
      "sq_major_vandals_blade__vandal_blades01",
      "sq_major_vandals_blade__vandal_blades02",
    ]) {
      runtime.reportActorBound(rowOf("DEN", actor), false, true);
    }
    ticks(2);
    spent(
      "DEN",
      "sq_major_vandals_blade__vandal_blades01",
      "sq_major_vandals_blade__vandal_blades02"
    );
    ticks(3);
    expect(said("md_vn06_010_36")).toBe(false);
    spent("DEN", "sq_major_vandals_rifle__vandal_rifle");
    ticks(6);
    expect(said("md_vn06_010_36")).toBe(true);
    ticks(5);
    expect(said("mission act_venus_m06_ketch_mission2 starting")).toBe(true);

    // The dock: the lines and music with the phase, the skiff's drop, each
    // stretch on its trigger, the dock's clear.
    ticks(1);
    expect(said("md_vn06_010_50")).toBe(true);
    expect(said("venus_m06_music_cue1 t5#1 sequence play")).toBe(true);
    fire("DOCK", "pt_skiff");
    ticks(2);
    expect(said("sq_skiff__pilot t2#21 command script cookie #1")).toBe(true);
    ticks(14);
    expect(said("sq_skiff__pilot drop")).toBe(true);
    expect(taskOf("DOCK", "sq_dock02")).toBe(2);
    ticks(6);
    expect(said("sq_skiff__pilot t2#21 command script cookie #2")).toBe(true);
    fire("ROOT", "phase_ketch_infiltrate.pt_goto_dock");
    ticks(4);
    expect(
      said(
        "phase_ketch_infiltrate.pf_infiltrate_ketch._player_objective t32#10 player objective active"
      )
    ).toBe(true);
    fire("DOCK", "pt_dock01");
    ticks(5);
    expect(taskOf("DOCK", "sq_bridge01")).toBe(5);
    expect(taskOf("DOCK", "sq_bridge02")).toBe(5);
    fire("DOCK", "pt_dock03");
    fire("DOCK", "pt_bay01");
    ticks(3);
    expect(taskOf("DOCK", "sq_bridge03")).toBe(4);
    expect(taskOf("DOCK", "sq_bay_captain")).toBe(7);
    expect(deviceOf("ROOT", "phase_ketch_infiltrate.o_door")).toBeUndefined();
    dead(
      "DOCK",
      "sq_den_entrance",
      "sq_dock01",
      "sq_dock02",
      "sq_dock04",
      "sq_dock_anchor",
      "sq_dock_sniper01",
      "sq_dock_sniper02",
      "sq_bridge01",
      "sq_bridge02",
      "sq_bridge03",
      "sq_bridge_sniper01",
      "sq_bridge_sniper02",
      "sq_bay01",
      "sq_bay_captain",
      "sq_bay_vandals",
      "sq_bay_sniper01",
      "sq_bay_sniper02"
    );
    ticks(6);
    expect(deviceOf("ROOT", "phase_ketch_infiltrate.o_door")).toBe(1);
    fire("AUDIO", "pt_vn06_020_20");
    ticks(2);
    expect(deviceOf("ROOT", "phase_ketch_infiltrate.o_door")).toBe(0);
    fire("ROOT", "phase_ketch_infiltrate.pt_ketch");
    ticks(5);
    expect(said("mission act_venus_m06_ketch_mission3 starting")).toBe(true);
    expect(said("venus_m06_music_cue2 t5#2 sequence play")).toBe(true);

    // The ketch: the control deck with the phase, the throne guard and
    // the door on the second spawn trigger, the lock behind the player.
    ticks(2);
    expect(taskOf("KETCH", "sq_control02")).toBe(4);
    fire("KETCH", "pt_spawn01");
    ticks(4);
    expect(taskOf("KETCH", "sq_equipment02")).toBe(1);
    fire("KETCH", "pt_spawn02");
    ticks(8);
    expect(taskOf("KETCH", "sq_throne_front")).toBe(14);
    expect(deviceOf("ROOT", "phase_ketch_kill_captain.o_door")).toBe(1);
    runtime.reportPlayerMonitor(
      rowOf("ROOT", "phase_ketch_kill_captain.pm_lock_door"),
      1
    );
    fire("KETCH", "pt_front_throne");
    ticks(2);
    expect(deviceOf("ROOT", "phase_ketch_kill_captain.o_door")).toBe(0);
    expect(said("tg_boss_fight_respawn t30#25 trigger group activate()")).toBe(
      true
    );
    expect(said("md_vn06_020_40")).toBe(true);
    expect(
      said("sq_throne_captain__captain t2#16 command script cookie #1")
    ).toBe(true);
    fire("ROOT", "phase_ketch_goto_throne.pt_goto_throne");
    ticks(5);
    expect(said("mission act_venus_m06_ketch_mission4 starting")).toBe(true);

    // The captain: the objective clears a second after he dies, the outro
    // five seconds on, the results half a minute after that.
    const captain = rowOf("KETCH", "sq_throne_captain__captain");
    runtime.reportActorBound(captain, false, true);
    ticks(5);
    expect(completed).toBe(0);
    runtime.reportActorBound(captain, true, true);
    ticks(9);
    expect(said("mission act_venus_m06_ketch_mission5 starting")).toBe(true);
    expect(said("md_vn06_020_60")).toBe(true);
    expect(completed).toBe(1);
    ticks(32);
    expect(said("lifetime end_game")).toBe(true);
  });
});
