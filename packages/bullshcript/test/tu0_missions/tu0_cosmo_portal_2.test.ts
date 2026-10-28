import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  COSMO_PORTAL_2_ROWS,
  COSMO_PORTAL_2_TAGS,
} from "./tu0_cosmo_portal_2_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// cosmo_portal_2 (the second Cosmodrome strike) on TU0: its own bundles and
// the binder (TU0 disc tags), and the script each one runs.
const BUNDLES = [
  {
    bundle: 0x7e_db_c1_61,
    key: "ROOT",
    path: "es/cosmo/cosmo_portal2_activity/cosmo_portal2_activity.es",
  },
  {
    bundle: 0x63_a7_c9_c8,
    key: "AUDIO",
    path: "es/cosmo/cosmo_portal2_activity/cosmo_portal2_audio.es",
  },
  {
    bundle: 0x54_85_bb_38,
    key: "DOME_C",
    path: "es/cosmo/dome_c/enc_dome_c_portal2.es",
  },
  {
    bundle: 0x74_d6_8d_d5,
    key: "DOME_HIVE",
    path: "es/cosmo/dome_hive/enc_dome_hive_portal2.es",
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

const MISSIONS = [1, 2, 3, 4, 5, 6, 7].map(
  (n) =>
    `es/cosmo/cosmo_portal2_activity/cosmo_portal2_activity_mission${n}.esp`
);

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key }) => ({
  bundle,
  rows: (COSMO_PORTAL_2_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag: COSMO_PORTAL_2_TAGS[key] ?? 0,
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

describe("TU0 cosmo_portal_2 scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES.slice(0, 4)) {
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

  it("starts in dry_sea with phase00", () => {
    const start = tu0Scripts.activityStart("cosmo_portal_2");
    expect(start?.startSlice).toBe("dry_sea");
    expect(start?.startPhase?.name).toBe("phase00");
    expect(start?.phases.map(({ slice }) => slice)).toEqual([
      "dry_sea",
      "dome_c",
      "dome_c",
      "array",
      "dome_hive",
      "dome_hive",
      "dome_hive",
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

  it("runs the strike on the TU0 host from dry_sea to the witch", () => {
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
      scripts: tu0ScriptSource(TAGS, "cosmo"),
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
    const count = (text: string) =>
      log.filter((line) => line.includes(text)).length;
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

    // dry_sea: the lifetime, the music and the Ghost, the objective, the
    // volume.
    ticks(1);
    expect(said("mission cosmo_portal2_activity_mission1 starting")).toBe(true);
    runtime.reportPlayerSpawned();
    ticks(4);
    expect(said("lifetime set_state(active)")).toBe(true);
    expect(said("music_intro01 t5#0 sequence play")).toBe(true);
    expect(said("md_010_20 t5#1 sequence play")).toBe(true);
    fire("ROOT", "phase00.obj_r1_s2_strike2_phase00_m1._player_trigger");
    ticks(3);
    expect(said("mission cosmo_portal2_activity_mission2 starting")).toBe(true);

    // dome_c: the door squads at the door's volume, the grids once they and
    // the first captain are in, the centre's volume.
    ticks(3);
    fire("ROOT", "phase01.pt_md_10_40");
    ticks(2);
    expect(said("md_010_40 t5#2 sequence play")).toBe(true);
    expect(said("sq_fallen_trash05 t1#19 bodies=6")).toBe(true);
    expect(said("sq_fallen_trash06 t1#20 bodies=6")).toBe(true);
    dead("DOME_C", "sq_fallen_trash05", [3, 2, 1]);
    dead("DOME_C", "sq_fallen_trash06", [3, 2, 1]);
    ticks(3);
    expect(said("sq_fallen_trash_boss02 t1#22 bodies=6")).toBe(true);
    ticks(5);
    expect(said("sq_fallen_trash_boss01 t1#21 bodies=6")).toBe(true);
    fire("ROOT", "phase01.pt_dome_c_central01");
    ticks(2);
    expect(said("mission cosmo_portal2_activity_mission3 starting")).toBe(true);

    // The major's floor: the door, the ship's three flights, the major on
    // the second; the door opens and the phase ends after his death.
    ticks(2);
    expect(deviceOf("ROOT", "phase02.o_auto_door02")).toBe(0);
    ticks(97);
    expect(
      said("sq_dropship_fallen01__pilot t2#36 command script cookie #1")
    ).toBe(true);
    ticks(14);
    expect(said("sq_dropship_fallen01__pilot drop t1#29")).toBe(true);
    expect(said("sq_dropship_fallen01__pilot drop t1#30")).toBe(true);
    ticks(30);
    expect(said("sq_dropship_fallen01__pilot drop t1#25")).toBe(true);
    runtime.reportSquadAlive(rowOf("DOME_C", "sq_objective_major00"), 1);
    ticks(2);
    dead("DOME_C", "sq_objective_major00", [1]);
    ticks(3);
    expect(deviceOf("ROOT", "phase02.o_auto_door02")).toBe(1);
    ticks(6);
    expect(said("mission cosmo_portal2_activity_mission4 starting")).toBe(true);

    // Out to the Array: the lasers go; the phase holds until dome_hive.
    ticks(2);
    expect(said("mission cosmo_portal2_activity_mission5 starting")).toBe(
      false
    );
    runtime.reportObjectAlive(
      rowOf("DOME_HIVE", "pf_strike_ghost02._object"),
      true
    );
    ticks(3);
    expect(said("mission cosmo_portal2_activity_mission5 starting")).toBe(true);

    // The scan, its line, the hillside phase six seconds on.
    ticks(4);
    use(0xaf_65_bc_8d);
    ticks(4);
    expect(deviceOf("DOME_HIVE", "pf_strike_ghost02._object")).toBe(1);
    expect(said("md_020_40 t5#6 sequence play")).toBe(true);
    ticks(6);
    expect(said("mission cosmo_portal2_activity_mission6 starting")).toBe(true);

    // The witch at the first volume, the Thrall at the second, the hillside
    // at the third; the hillside dead, the kill objective; the witch dead,
    // the strike complete and the game's end half a minute later.
    ticks(3);
    expect(deviceOf("ROOT", "phase05.o_dome_hive_gate01")).toBe(1);
    fire("DOME_HIVE", "pt_spawn_boss_init");
    ticks(3);
    expect(said("sq_bossbattle_boss01 t1#48 bodies=1")).toBe(true);
    fire("DOME_HIVE", "pt_spawn_boss_attack01");
    fire("ROOT", "phase05.obj_r1_s2_strike2_phase05_m1._player_trigger");
    ticks(14);
    expect(said("sq_ground_hive03 t1#31")).toBe(true);
    fire("DOME_HIVE", "pt_spawn_boss_attack02");
    ticks(15);
    expect(said("sq_hillside_hive01 t1#7 bodies=1")).toBe(true);
    expect(said("sq_hillside_hive04__trooper02 t2#20")).toBe(true);
    spent("DOME_HIVE", "sq_hillside_hive01__ogre");
    spent(
      "DOME_HIVE",
      "sq_hillside_hive02__trooper01",
      "sq_hillside_hive02__trooper02",
      "sq_hillside_hive02__trooper03"
    );
    spent(
      "DOME_HIVE",
      "sq_hillside_hive03__trooper01",
      "sq_hillside_hive03__trooper02",
      "sq_hillside_hive03__trooper03"
    );
    spent(
      "DOME_HIVE",
      "sq_hillside_hive04__trooper01",
      "sq_hillside_hive04__trooper02"
    );
    for (const sq of [
      "sq_hillside_hive01",
      "sq_hillside_hive02",
      "sq_hillside_hive03",
      "sq_hillside_hive04",
    ]) {
      runtime.reportSquadAlive(rowOf("DOME_HIVE", sq), 0);
    }
    ticks(5);
    expect(
      said(
        "phase05.obj_r1_s2_strike2_phase05_m2._player_objective t32#27 player objective active"
      )
    ).toBe(true);
    expect(completed).toBe(0);

    // A wipe in the fight starts the fight over, not the hillside: the kill
    // objective again at once, the witch back at her last post.
    runtime.reportPlayerDied("c0");
    ticks(1);
    expect(runtime.hardWipeArmed && runtime.allPlayersDead).toBe(true);
    runtime.resetCurrentPhase();
    runtime.reportPlayerRespawned("c0");
    ticks(4);
    expect(count("mission cosmo_portal2_activity_mission6 starting")).toBe(2);
    expect(
      count(
        "phase05.obj_r1_s2_strike2_phase05_m1._player_objective t32#24 player objective active"
      )
    ).toBe(1);
    expect(
      count(
        "phase05.obj_r1_s2_strike2_phase05_m2._player_objective t32#27 player objective active"
      )
    ).toBe(2);
    expect(count("sq_bossbattle_boss01:set_task(0xDB85920E)")).toBe(2);
    expect(said("thread sc_witch_return start")).toBe(true);
    expect(deviceOf("ROOT", "phase05.o_dome_hive_gate01")).toBe(1);
    spent("DOME_HIVE", "sq_bossbattle_boss01__wizard01");
    runtime.reportSquadAlive(rowOf("DOME_HIVE", "sq_bossbattle_boss01"), 0);
    ticks(3);
    expect(completed).toBe(1);
    ticks(35);
    expect(said("lifetime end_game")).toBe(true);
  });
});
