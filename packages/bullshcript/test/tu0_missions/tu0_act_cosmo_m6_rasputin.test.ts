import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ACT_COSMO_M6_RASPUTIN_ROWS,
  ACT_COSMO_M6_RASPUTIN_TAGS,
} from "./tu0_act_cosmo_m6_rasputin_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_cosmo_m6_rasputin on TU0: its own bundles and the binder (TU0 disc
// tags), and the script each one runs.
const BUNDLES = [
  {
    bundle: 0xa3_03_83_0e,
    key: "ROOT",
    path: "es/cosmo/act_cosmo_m6_rasputin/act_cosmo_m6_rasputin.es",
  },
  {
    bundle: 0xef_78_ad_7a,
    key: "AUDIO",
    path: "es/cosmo/act_cosmo_m6_rasputin/unknown_ef78ad7a.es",
  },
  {
    bundle: 0x60_aa_1f_18,
    key: "CORE",
    path: "es/cosmo/rasputin/enc_rasputin_m6.es",
  },
  {
    bundle: 0xbc_9a_36_c7,
    key: "VENDOR",
    path: "es/cosmo/rasputin_vendor/enc_rasputin_vendor_m6.es",
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

const MISSIONS = [1, 2, 3, 4].map(
  (n) => `es/cosmo/act_cosmo_m6_rasputin/act_cosmo_m6_rasputin_mission${n}.esp`
);

// the ultra ogre's squad identifier, which its kill carries
const BOSS = 0x75_64_93_cb;

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key }) => ({
  bundle,
  rows: (ACT_COSMO_M6_RASPUTIN_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag: ACT_COSMO_M6_RASPUTIN_TAGS[key] ?? 0,
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

describe("TU0 act_cosmo_m6_rasputin scripts", () => {
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

  it("starts in delta_n, its four phases in the vendor bunker and the core", () => {
    const start = tu0Scripts.activityStart("act_cosmo_m6_rasputin");
    expect(start?.startSlice).toBe("delta_n");
    expect(start?.startPhase).toBeUndefined();
    expect(start?.phases.map(({ slice }) => slice)).toEqual([
      "rasputin_vendor",
      "rasputin",
      "rasputin",
      "rasputin",
    ]);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
      ...[
        "interactable_placement",
        "kill_squad_objective",
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

  it("runs the mission on the TU0 host from delta_n through a wipe to the outro", () => {
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
    // How many times an actor row went out placed.
    const placings = (key: string, name: string) => {
      const row = rowOf(key, name);
      return changes.filter(
        (change) =>
          change.kind === "actor" &&
          change.item.bundle === row.bundle &&
          change.item.typeIndex === row.typeIndex &&
          change.state.placed
      ).length;
    };

    // delta_n: the vendor objective and the music at the spawn, the delta
    // lines three seconds later.
    ticks(1);
    expect(said("mission act_cosmo_m6_rasputin_mission1 starting")).toBe(true);
    runtime.reportPlayerSpawned();
    ticks(1);
    expect(said("lifetime set_state(active)")).toBe(true);
    expect(said("seq_music_intro t5#0 sequence play")).toBe(true);
    ticks(4);
    expect(said("seq_dialog_delta_intro t5#2 sequence play")).toBe(true);
    expect(
      said(
        "phase_rasputin_vendor_main.sp_objective_goto._player_objective t32#6 player objective active"
      )
    ).toBe(true);

    // The vendor bunker: the door line, the door, the phase's end.
    fire(
      "ROOT",
      "phase_rasputin_vendor_main.sp_objective_goto._player_trigger"
    );
    ticks(7);
    expect(said("seq_dialog_vendor_door_complete")).toBe(true);
    expect(deviceOf("VENDOR", "o_door")).toBeUndefined();
    ticks(5);
    expect(deviceOf("VENDOR", "o_door")).toBe(1);
    ticks(6);
    expect(said("mission act_cosmo_m6_rasputin_mission2 starting")).toBe(true);

    // The hall and the control room on the way to the controls.
    ticks(4);
    fire("CORE", "pt_hall");
    ticks(2);
    expect(said("sq_hall_thrall_a t1#16 bodies=2")).toBe(true);
    expect(said("sq_hall_trooper_a t1#8 bodies")).toBe(false);
    ticks(5);
    expect(said("sq_hall_trooper_a t1#8 bodies=1")).toBe(true);
    fire("CORE", "pt_control");
    ticks(2);
    expect(said("sq_core_knight_a t1#26 bodies=1")).toBe(true);
    fire("ROOT", "phase_rasputin_intro.sp_objective_goto._player_trigger");
    ticks(2);
    expect(said("mission act_cosmo_m6_rasputin_mission3 starting")).toBe(true);

    // The core: the console lit, the lights half up, the ogre's entrance,
    // the objective, the Hive line.
    ticks(3);
    expect(deviceOf("CORE", "sp_placement_console._object")).toBe(1);
    ticks(5);
    expect(deviceOf("CORE", "o_core_lights")).toBe(0.5);
    ticks(8);
    expect(placings("CORE", "sq_boss__ultra_ogre")).toBe(1);
    ticks(6);
    expect(
      said(
        "phase_rasputin_boss.sp_objective_kill._player_objective t32#18 player objective active"
      )
    ).toBe(true);
    ticks(5);
    expect(said("seq_dialog_rasputin_hive t5#13 sequence play")).toBe(true);

    // A wipe: the phase and the core start over.
    runtime.reportPlayerDied("c0");
    ticks(1);
    expect(runtime.hardWipeArmed && runtime.allPlayersDead).toBe(true);
    runtime.resetCurrentPhase();
    runtime.reportPlayerRespawned("c0");
    ticks(2);
    expect(count("mission act_cosmo_m6_rasputin_mission3 starting")).toBe(2);
    expect(placings("CORE", "sq_boss__ultra_ogre")).toBe(1);
    ticks(14);
    expect(placings("CORE", "sq_boss__ultra_ogre")).toBe(2);
    ticks(6);

    // The ogre dies: the phase ends ten seconds later.
    runtime.reportKill({
      assists: [],
      killer: { characterKey: "c0" },
      victim: {},
    });
    runtime.reportSquadKill(BOSS);
    ticks(8);
    expect(said("mission act_cosmo_m6_rasputin_mission4 starting")).toBe(false);
    ticks(4);
    expect(said("mission act_cosmo_m6_rasputin_mission4 starting")).toBe(true);

    // The end: the console dark, the lights full, Rasputin, the activity
    // complete with the outro music, the game's end half a minute later.
    ticks(2);
    expect(deviceOf("CORE", "sp_placement_console._object")).toBe(0);
    ticks(7);
    expect(deviceOf("CORE", "o_core_lights")).toBe(1);
    ticks(6);
    expect(said("seq_dialog_rasputin_outro")).toBe(true);
    expect(completed).toBe(0);
    ticks(19);
    expect(completed).toBe(1);
    expect(said("seq_music_outro t5#1 sequence play")).toBe(true);
    ticks(32);
    expect(said("lifetime end_game")).toBe(true);
  });
});
