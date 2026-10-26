import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  bundleHashOf,
  fnv1,
  type ItemChange,
  type NavPointPosition,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ACT_COSMO_M0_HIGHWAY_NAV_POINTS,
  ACT_COSMO_M0_HIGHWAY_ROWS,
  CINE_REVEAL_ROWS,
} from "./tu0_act_cosmo_m0_highway_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

interface Bundle {
  bundle: number;
  key: string;
  path: string;
  tag: number;
}

// act_cosmo_m0_highway on TU0: its bundles and the script each runs.
const MISSION_BUNDLES: Bundle[] = [
  {
    bundle: 0x47_86_c0_e0,
    key: "STORY_COMMON",
    path: "bs/activities/common/story_common.bs",
    tag: 0x80_cc_b7_c8,
  },
  {
    bundle: 0x99_2b_b4_71,
    key: "ACT_COSMO_M0_HIGHWAY",
    path: "es/cosmo/act_cosmo_m0_highway/act_cosmo_m0_highway.es",
    tag: 0x80_cb_90_80,
  },
  {
    bundle: 0x3c_2f_5e_d5,
    key: "AUDIO",
    path: "es/cosmo/act_cosmo_m0_highway/unknown_3c2f5ed5.es",
    tag: 0x80_cb_90_81,
  },
  {
    bundle: 0xec_f5_74_b5,
    key: "HIGHWAY",
    path: "es/cosmo/highway/enc_highway_m0.es",
    tag: 0x80_cb_8c_a4,
  },
  {
    bundle: 0xfc_0e_45_a3,
    key: "BREACH",
    path: "es/cosmo/breach/enc_breach_m0.es",
    tag: 0x80_cb_81_67,
  },
  {
    bundle: 0x92_43_df_fb,
    key: "GRAVEYARD",
    path: "es/cosmo/graveyard/enc_graveyard_m0.es",
    tag: 0x80_cb_83_c1,
  },
  {
    bundle: 0x06_2d_d9_5d,
    key: "HANGAR",
    path: "es/cosmo/hangar/enc_hangar_m0.es",
    tag: 0x80_cb_86_6b,
  },
];

const CINE_BUNDLES: Bundle[] = [
  {
    bundle: 0x47_86_c0_e0,
    key: "STORY_COMMON",
    path: "bs/activities/common/story_common.bs",
    tag: 0x80_c4_e0_0a,
  },
  {
    bundle: 0x2f_e7_db_e6,
    key: "CINE_REVEAL",
    path: "es/cosmo/cine_reveal/cine_reveal.es",
    tag: 0x80_c3_e7_39,
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
  (n) => `es/cosmo/act_cosmo_m0_highway/act_cosmo_m0_highway_mission${n}.esp`
);
const CINE_MISSIONS = [1, 2].map(
  (n) => `es/cosmo/cine_reveal/cine_reveal_mission${n}.esp`
);

const ARCHETYPES = [
  "cinematic_midmission",
  "generic_objective",
  "trigger_bubble_objective",
  "trigger_volume_objective",
];

type Rows = Readonly<
  Record<string, readonly [string, number, number, object?][]>
>;

function tagsOf(bundles: Bundle[], rows: Rows): ActivityBundleTag[] {
  return bundles.map(({ bundle, key, tag }) => ({
    bundle,
    rows: (rows[key] ?? []).map(([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })),
    tag,
  }));
}

function host(
  tags: ActivityBundleTag[],
  navPoints: readonly NavPointPosition[] = []
) {
  const log: string[] = [];
  const changes: ItemChange[] = [];
  const players: ActivityPlayer[] = [];
  let progress = 0;
  let completed = 0;
  const runtime = new ScriptRuntime({
    bundles: tags,
    clock: { activityTicks: () => 0 },
    log: (line) => log.push(line),
    navPoints,
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
    scripts: tu0ScriptSource(tags, "cosmo"),
    tickSeconds: 1,
  });
  runtime.start();
  runtime.setActiveBundles(new Set(tags.map((tag) => tag.bundle)));
  const rowOf = (key: string, name: string) => {
    const tag = tags.find((entry) => entry.rows.some((r) => r.name === name));
    const row = tag?.rows.find((entry) => entry.name === name);
    if (!(tag && row)) {
      throw new Error(`${key} ${name} missing`);
    }
    return { bundle: tag.bundle, typeId: row.typeId, typeIndex: row.typeIndex };
  };
  return {
    changes,
    completed: () => completed,
    lifetimeStates: () =>
      changes.flatMap((change) =>
        change.kind === "lifetime" ? [change.state.state] : []
      ),
    players,
    progress: () => progress,
    rowOf,
    runtime,
    said: (text: string) => log.some((line) => line.includes(text)),
    ticks: (n: number) => {
      for (let i = 0; i < n; i++) {
        runtime.tick();
      }
    },
  };
}

describe("TU0 act_cosmo_m0_highway scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of [...MISSION_BUNDLES, ...CINE_BUNDLES]) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "cosmo")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    // Cracked names hash to their bundles; the one that never cracked keeps
    // its hash in its name.
    expect(bundleHashOf("enc_breach_m0")).toBe(0xfc_0e_45_a3);
    expect(bundleHashOf("unknown_3c2f5ed5")).toBe(0x3c_2f_5e_d5);
    const root = tu0Scripts.scriptByPath(MISSION_BUNDLES[1]?.path ?? "");
    expect(
      root && tu0Scripts.missionScripts(root).map((file) => file.path)
    ).toEqual(MISSIONS);
    const cine = tu0Scripts.scriptByPath(CINE_BUNDLES[1]?.path ?? "");
    expect(
      cine && tu0Scripts.missionScripts(cine).map((file) => file.path)
    ).toEqual(CINE_MISSIONS);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...MISSION_BUNDLES.map((entry) => entry.path),
      ...CINE_BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
      ...CINE_MISSIONS,
      ...ARCHETYPES.map((name) => `es/utility_scripts/${name}.esu`),
    ];
    for (const path of new Set(paths)) {
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

  it("runs the mission on the TU0 host from the intro to end_game", () => {
    const tags = tagsOf(MISSION_BUNDLES, ACT_COSMO_M0_HIGHWAY_ROWS);
    const h = host(tags, ACT_COSMO_M0_HIGHWAY_NAV_POINTS);
    const fire = (name: string) =>
      h.runtime.reportTriggerFired(h.rowOf("", name));
    const finished = (name: string) =>
      h.runtime.reportCinematicFinished(h.rowOf("", name));
    const alive = (name: string, count: number) =>
      h.runtime.reportSquadAlive(h.rowOf("", name), count);

    // The root sets pregame, then the intro plays before anyone spawns and
    // holds the lifetime (runtime state 3, TU0 wire 4).
    h.ticks(3);
    expect(h.said("mission act_cosmo_m0_highway_mission1 starting")).toBe(true);
    expect(h.runtime.unresolvedBindings).toEqual([]);
    expect(h.lifetimeStates()).toEqual([0, 3]);
    finished("cosmo_m0_phase00_highway_intro.pf_104_res._cinematic");
    h.ticks(3);
    finished("cosmo_m0_phase00_highway_intro.pf_104_res_fp._cinematic");
    h.ticks(3);
    expect(h.said("mission act_cosmo_m0_highway_mission2 starting")).toBe(true);
    expect(h.progress()).toBe(1);

    // Into the highway's own state: its bubble trigger lets the player spawn.
    fire("pt_bubble");
    h.ticks(2);
    expect(h.lifetimeStates().at(-1)).toBe(2);
    h.players.push({ characterKey: "c0", powerLevel: 1, ready: true });
    h.runtime.reportPlayerSpawned();
    h.ticks(3);
    expect(
      h.changes.some(
        (change) => change.kind === "object" && change.state.present
      )
    ).toBe(true);

    // Enter the Wall, with the nav point retail sends.
    fire("pt_first_obj");
    h.ticks(10);
    const objective = h.rowOf(
      "",
      "cosmo_m0_phase00_highway.obj_m0_phase00_m1._player_objective"
    );
    const nav = h.changes.find(
      (change) =>
        change.kind === "playerObjective" &&
        change.item.typeIndex === objective.typeIndex &&
        change.state.navPoints.length > 0
    );
    expect(nav?.kind === "playerObjective" && nav.state.navPoints[0]).toEqual({
      ref: {
        bundle: 0x99_2b_b4_71,
        typeId: 44,
        typeIndex: 87,
      },
      sliceSet: 14,
      x: 375.7250061035156,
      y: -796.5736694335938,
      z: 13.351158142089844,
    });
    fire("cosmo_m0_phase00_highway.obj_m0_phase00_m1._player_trigger");
    h.ticks(3);
    expect(h.said("mission act_cosmo_m0_highway_mission3 starting")).toBe(true);

    // Find a Weapon.
    h.ticks(5);
    fire("pt_nux_ghost_light_up_start");
    h.ticks(40);
    fire("cosmo_m0_phase01_breach.obj_get_weapon._player_trigger");
    h.ticks(3);
    expect(h.said("mission act_cosmo_m0_highway_mission4 starting")).toBe(true);

    // Fight Through the Wall.
    fire("pt_fallen_1b_spawn");
    h.ticks(5);
    fire("pt_fallen_c_spawn");
    h.ticks(2);
    const vandal = h.rowOf("", "sq_fallen_bouncedown_c__vandal_blade");
    const placement = h.changes
      .filter(
        (change) =>
          change.kind === "actor" && change.item.typeIndex === vandal.typeIndex
      )
      .at(-1);
    expect(
      placement?.kind === "actor" && {
        atoms: placement.state.commandScript?.atoms,
        placed: placement.state.placed,
      }
    ).toEqual({
      atoms: [{ kind: 1, name: 0xb1_6e_26_c0, end: { kind: 0 } }],
      placed: true,
    });
    const audio = h.changes
      .filter(
        (change) =>
          change.kind === "sequence" &&
          change.item.typeIndex ===
            h.rowOf("", "seq_fallen_intro_vandal_drop").typeIndex
      )
      .at(-1);
    expect(audio?.kind === "sequence" && audio.state.target?.typeIndex).toBe(
      vandal.typeIndex
    );
    fire("cosmo_m0_phase01b_breach.obj_goto_graveyard._player_trigger");
    h.ticks(3);
    expect(h.said("mission act_cosmo_m0_highway_mission5 starting")).toBe(true);

    // Fight Through the Fallen: the dropships wait for the player to come
    // down (the first on pt_ketch_dropship, the other three on
    // pt_ketch_dropship_2), then the six graveyard squads die.
    const pilotsPlaced = () =>
      [1, 2, 3, 4].filter((n) => {
        const pilot = h.rowOf("", `sq_fallen_dropship_${n}__pilot`);
        const last = h.changes
          .filter(
            (change) =>
              change.kind === "actor" &&
              change.item.typeIndex === pilot.typeIndex
          )
          .at(-1);
        return last?.kind === "actor" && last.state.placed;
      });
    fire("pt_ketch");
    h.ticks(15);
    expect(pilotsPlaced()).toEqual([]);
    fire("pt_ketch_dropship");
    h.ticks(2);
    expect(pilotsPlaced()).toEqual([1]);
    fire("pt_ketch_dropship_2");
    h.ticks(4);
    expect(pilotsPlaced()).toEqual([1, 2, 3, 4]);
    fire("pt_exit_shanks");
    h.ticks(2);
    const graveyard = [
      "sq_fallen_m0_drop_1",
      "sq_fallen_m0_drop_2",
      "sq_fallen_m0_drop_2_b",
      "sq_fallen_m0_sniper",
      "sq_fallen_m0_upgrade",
      "sq_fallen_m0_exit_shanks",
    ];
    for (const squad of graveyard) {
      alive(squad, 1);
    }
    h.ticks(3);
    expect(h.said("mission act_cosmo_m0_highway_mission6 starting")).toBe(
      false
    );
    for (const squad of graveyard) {
      alive(squad, 0);
    }
    h.ticks(4);
    expect(h.said("mission act_cosmo_m0_highway_mission6 starting")).toBe(true);

    // Find the Ship, then Clear Out the Fallen.
    h.ticks(6);
    fire("cosmo_m0_phase03_hangar.obj_m0_m04a._player_trigger");
    fire("pt_fallen_backup");
    h.ticks(3);
    alive("sq_m0_fallen_2", 2);
    h.ticks(3);
    alive("sq_m0_fallen_2", 0);
    h.ticks(10);
    expect(h.said("mission act_cosmo_m0_highway_mission7 starting")).toBe(true);

    // The outro: activity complete, the cinematic, then the end.
    h.ticks(9);
    expect(h.completed()).toBe(1);
    expect(h.lifetimeStates().at(-1)).toBe(3);
    finished("cosmo_m0_phase04_outro.pf_105_cto._cinematic");
    h.ticks(20);
    expect(h.said("lifetime end_game")).toBe(true);
    expect(h.said("activity ended - scripts stopped")).toBe(true);
    expect(h.runtime.unresolvedBindings).toEqual([]);
  });

  it("runs cine_reveal's two cinematics to end_game", () => {
    const tags = tagsOf(CINE_BUNDLES, CINE_REVEAL_ROWS);
    const h = host(tags);
    h.ticks(3);
    expect(h.said("mission cine_reveal_mission1 starting")).toBe(true);
    expect(h.lifetimeStates()).toEqual([0, 3]);
    h.runtime.reportCinematicFinished(
      h.rowOf("", "cine_106_trv_phase.cine_106_trv._cinematic")
    );
    h.ticks(5);
    expect(h.said("mission cine_reveal_mission2 starting")).toBe(true);
    h.ticks(6);
    expect(h.completed()).toBe(1);
    h.runtime.reportCinematicFinished(
      h.rowOf("", "cine_107_twr_phase.cine_107_twr._cinematic")
    );
    h.ticks(20);
    expect(h.said("lifetime end_game")).toBe(true);
    expect(h.runtime.unresolvedBindings).toEqual([]);
  });
});
