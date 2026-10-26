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
  ACT_VENUS_M02_SOUTHERN_TIDES_NAV_POINTS,
  ACT_VENUS_M02_SOUTHERN_TIDES_ROWS,
} from "./tu0_act_venus_m02_southern_tides_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

interface Bundle {
  bundle: number;
  key: string;
  path: string;
  tag: number;
}

// act_venus_m02_southern_tides (Ishtar Collective) on TU0: the bundles the
// southern tides' bubble loads (their TU0 tags there) and the script each
// runs.
const BUNDLES: Bundle[] = [
  {
    bundle: 0x47_86_c0_e0,
    key: "STORY_COMMON",
    path: "bs/activities/common/story_common.bs",
    tag: 0x80_ff_50_f7,
  },
  {
    bundle: 0x6d_4a_34_f4,
    key: "ACT_VENUS_M02_SOUTHERN_TIDES",
    path: "es/venus/act_venus_m02_southern_tides/act_venus_m02_southern_tides.es",
    tag: 0x80_fe_12_61,
  },
  {
    bundle: 0x7e_88_04_eb,
    key: "AUDIO",
    path: "es/venus/act_venus_m02_southern_tides/seq_venus_m02_southern_tides.es",
    tag: 0x80_fe_12_62,
  },
  {
    bundle: 0x4e_2c_28_e6,
    key: "SOUTHERN_TIDES",
    path: "es/venus/southern_tides/enc_southern_tides_m02.es",
    tag: 0x80_fe_12_63,
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
    `es/venus/act_venus_m02_southern_tides/act_venus_m02_southern_tides_mission${n}.esp`
);

const ARCHETYPES = [
  "collect_loot_objective",
  "generic_objective",
  "interactable_objective",
  "interactable_placement",
  "trigger_bubble_objective",
  "trigger_volume_objective",
];

// the captain's loot and the Ishtar terminal, by import identifier
const LOOT = 0x8c_52_c4_1d;
const TERMINAL = 0x6f_75_44_2b;

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
  navPoints: readonly NavPointPosition[]
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
    scripts: tu0ScriptSource(tags, "venus"),
    tickSeconds: 1,
  });
  runtime.start();
  runtime.setActiveBundles(new Set(tags.map((tag) => tag.bundle)));
  const rowOf = (name: string) => {
    const tag = tags.find((entry) => entry.rows.some((r) => r.name === name));
    const row = tag?.rows.find((entry) => entry.name === name);
    if (!(tag && row)) {
      throw new Error(`${name} missing`);
    }
    return { bundle: tag.bundle, typeId: row.typeId, typeIndex: row.typeIndex };
  };
  const all = (kind: ItemChange["kind"], name: string) => {
    const row = rowOf(name);
    return changes.filter(
      (change) =>
        change.kind === kind &&
        change.item.bundle === row.bundle &&
        change.item.typeIndex === row.typeIndex
    );
  };
  return {
    all,
    completed: () => completed,
    last: (kind: ItemChange["kind"], name: string) => all(kind, name).at(-1),
    players,
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

describe("TU0 act_venus_m02_southern_tides scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "venus")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    expect(bundleHashOf("act_venus_m02_southern_tides")).toBe(0x6d_4a_34_f4);
    expect(bundleHashOf("enc_southern_tides_m02")).toBe(0x4e_2c_28_e6);
    // the music and Ghost lines' bundle, cracked
    expect(bundleHashOf("seq_venus_m02_southern_tides")).toBe(0x7e_88_04_eb);
    const root = tu0Scripts.scriptByPath(BUNDLES[1]?.path ?? "");
    expect(
      root && tu0Scripts.missionScripts(root).map((file) => file.path)
    ).toEqual(MISSIONS);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
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

  it("runs the mission on the TU0 host from the spawn to end_game", () => {
    const tags = tagsOf(BUNDLES, ACT_VENUS_M02_SOUTHERN_TIDES_ROWS);
    const h = host(tags, ACT_VENUS_M02_SOUTHERN_TIDES_NAV_POINTS);
    const fire = (name: string) => h.runtime.reportTriggerFired(h.rowOf(name));
    const squad = (name: string) => {
      const change = h.last("squad", name);
      return change?.kind === "squad" ? change.state : undefined;
    };
    const objective = (name: string) => {
      const change = h.last("playerObjective", name);
      return change?.kind === "playerObjective"
        ? change.state.state
        : undefined;
    };
    const playing = (name: string) => {
      const change = h.last("sequence", name);
      return change?.kind === "sequence" ? change.state : undefined;
    };
    const placed = (name: string) => {
      const change = h.last("actor", name);
      return change?.kind === "actor" && change.state.placed;
    };
    const wipe = (name: string, tally: number[]) => {
      const row = h.rowOf(name);
      h.runtime.reportSquadTally(row, tally);
      h.runtime.reportSquadAlive(row, 0);
    };
    const said = (n: number) =>
      `mission act_venus_m02_southern_tides_mission${n} starting`;

    // The root sets pregame; the spawn sets the lifetime active and starts
    // the intro music, the Ghost's first line five seconds on and the
    // objective as it ends.
    h.ticks(3);
    expect(h.said("lifetime set_state(pregame)")).toBe(true);
    h.players.push({ characterKey: "c0", powerLevel: 1, ready: true });
    h.runtime.reportPlayerSpawned();
    h.ticks(2);
    expect(h.said("lifetime set_state(active)")).toBe(true);
    expect(playing("seq_act_venus_m2_intro_music")).toBeDefined();
    h.ticks(5);
    expect(playing("seq_vn02_010_s010")).toBeDefined();
    const enter = "phase00.ch2m2_enter_bubble._player_objective";
    const loot = "phase00.ch2m2_collect_loot._player_objective";
    expect(objective(enter)).toBeUndefined();
    h.ticks(8);
    expect(playing("seq_vn02_010_s015")).toBeDefined();
    expect(objective(enter)).toBeGreaterThan(0);

    // The headlands: the bubble objective, then the captain's loot. The
    // pickup clears it two seconds on and the next phase follows.
    fire("phase00.ch2m2_enter_bubble._player_trigger");
    h.ticks(2);
    expect(objective(enter)).toBe(0);
    expect(objective(loot)).toBeGreaterThan(0);
    h.ticks(3);
    h.runtime.reportLootGathered((hash) => hash === LOOT);
    h.ticks(4);
    expect(objective(loot)).toBe(0);
    expect(playing("seq_vn02_010_s024")).toBeDefined();
    h.ticks(6);
    expect(h.said(said(2))).toBe(true);

    // On to the southern tides.
    const goto = "phase_goto_tides.southern_tides_objective._player_objective";
    h.ticks(3);
    expect(objective(goto)).toBeGreaterThan(0);
    expect(playing("seq_vn02_010_s040")).toBeDefined();
    fire("phase_goto_tides.southern_tides_objective._player_trigger");
    h.ticks(2);
    expect(objective(goto)).toBe(0);
    expect(h.said(said(3))).toBe(true);

    // The tides: the camp comes up with the objective; the shanks once the
    // wire vandal is dead, the last vandals once the dreg pack is.
    h.ticks(4);
    expect(squad("sq_fallen01")?.task).toBe(15);
    expect(squad("sq_fallen09")?.task).toBe(17);
    expect(squad("sq_fallen07")?.task).toBeUndefined();
    fire("phase01.southern_tides_objective01._player_trigger");
    h.ticks(4);
    expect(playing("seq_vn02_020_s020")).toBeDefined();
    const secure = "phase01.pf_po_secure._player_objective";
    expect(objective(secure)).toBeGreaterThan(0);
    wipe("sq_fallen05", [1]);
    h.ticks(2);
    expect(squad("sq_fallen07")?.task).toBe(11);
    wipe("sq_fallen09", [4]);
    h.ticks(2);
    expect(squad("sq_fallen06")?.task).toBe(13);
    expect(squad("sq_fallen07")?.task).toBe(10);
    for (const [name, tally] of [
      ["sq_fallen01", [1, 1]],
      ["sq_fallen02", [1, 3]],
      ["sq_fallen03", [1, 1]],
      ["sq_fallen04", [1, 3]],
      ["sq_fallen07", [4]],
      ["sq_fallen08", [2]],
    ] as const) {
      wipe(name, [...tally]);
    }
    h.ticks(2);
    expect(squad("sq_fallen06")?.task).toBe(10);
    expect(objective(secure)).toBeGreaterThan(0);
    wipe("sq_fallen06", [1, 2]);
    h.ticks(5);
    expect(objective(secure)).toBe(0);
    expect(playing("seq_act_venus_m2_cue1_music")).toBeDefined();
    expect(h.said(said(4))).toBe(true);

    // The dome: walking in brings up the analyze objective; using the
    // terminal raises the cage and the first wave's cloud opens five seconds
    // on, the defend objective after it.
    const analyze = "phase02.pf_po_analyze._player_objective";
    const defend = "phase02.pf_po_defend._player_objective";
    const ret = "phase02.pf_po_return._player_objective";
    fire("phase02.pt_dome");
    h.ticks(5);
    expect(objective(analyze)).toBeGreaterThan(0);
    expect(playing("seq_vn02_020_s030")).toBeDefined();
    h.runtime.reportInteraction((name) => name === TERMINAL);
    h.ticks(2);
    expect(objective(analyze)).toBe(0);
    expect(playing("seq_vn02_020_s040")).toBeDefined();
    h.ticks(6);
    expect(placed("sq_vexcloud_dome1__pilot")).toBe(true);
    expect(squad("sq_wave1_v1")?.task).toBe(8);
    h.ticks(8);
    expect(placed("sq_vexcloud_dome1__pilot")).toBe(false);
    expect(objective(defend)).toBeGreaterThan(0);
    expect(h.said("set_switch_mask(3)")).toBe(true);

    // Wave 1: the gate clouds once a harpy is down.
    wipe("sq_wave1_v1", [1]);
    h.ticks(2);
    expect(squad("sq_wave1_v3")?.task).toBe(8);
    h.ticks(5);
    expect(squad("sq_wave1_v4")?.task).toBe(8);
    wipe("sq_wave1_v1", [2]);
    wipe("sq_wave1_v3", [5]);
    wipe("sq_wave1_v4", [5]);
    h.ticks(7);
    expect(playing("seq_vn02_020_s060")).toBeDefined();
    h.ticks(7);

    // Wave 2: the dome's harpies, the square and ruins clouds twice, the last
    // two pushing in.
    expect(squad("sq_wave2_v1")?.task).toBe(7);
    expect(h.said("set_switch_mask(7)")).toBe(true);
    h.ticks(8);
    wipe("sq_wave2_v1", [1]);
    h.ticks(2);
    expect(squad("sq_wave2_v7")?.task).toBe(6);
    expect(squad("sq_wave2_v6")?.task).toBe(6);
    h.ticks(10);
    expect(squad("sq_wave2_v4")?.task).toBe(7);
    expect(squad("sq_wave2_v3")?.task).toBe(7);
    wipe("sq_wave2_v1", [2]);
    wipe("sq_wave2_v3", [4]);
    wipe("sq_wave2_v6", [1]);
    h.runtime.reportSquadTally(h.rowOf("sq_wave2_v4"), [3]);
    h.ticks(2);
    expect(squad("sq_wave2_v4")?.task).toBe(2);
    expect(squad("sq_wave2_v7")?.task).toBe(2);
    wipe("sq_wave2_v4", [4]);
    wipe("sq_wave2_v7", [1]);
    h.ticks(7);
    expect(playing("seq_vn02_020_s065")).toBeDefined();
    h.ticks(7);

    // Wave 3: the dome's harpies, then a pair out of each of the gate,
    // square and ruins clouds; the last three push in.
    expect(squad("sq_wave4_v2")?.task).toBe(4);
    expect(h.said("set_switch_mask(15)")).toBe(true);
    h.ticks(8);
    wipe("sq_wave4_v2", [1]);
    h.ticks(5);
    expect(squad("sq_wave3_v1")?.task).toBe(4);
    expect(squad("sq_wave3_v3")?.task).toBe(3);
    expect(squad("sq_wave3_v5")?.task).toBe(3);
    expect(squad("sq_wave4_v5")?.task).toBe(4);
    expect(playing("seq_wave_spawn_vex")).toBeDefined();
    wipe("sq_wave4_v2", [2]);
    wipe("sq_wave3_v1", [2]);
    wipe("sq_wave3_v2", [2]);
    wipe("sq_wave3_v3", [1]);
    h.runtime.reportSquadTally(h.rowOf("sq_wave4_v5"), [1]);
    h.ticks(2);
    expect(squad("sq_wave3_v4")?.task).toBe(1);
    expect(squad("sq_wave4_v5")?.task).toBe(2);
    expect(objective(defend)).toBeGreaterThan(0);
    wipe("sq_wave3_v4", [1]);
    wipe("sq_wave3_v5", [1]);
    wipe("sq_wave4_v5", [2]);

    // The last wave dead: the music stops, the defend objective clears and
    // the Ghost calls the player back to the terminal.
    h.ticks(6);
    expect(h.said("set_switch_mask(31)")).toBe(true);
    expect(objective(defend)).toBe(0);
    expect(playing("seq_vn02_020_s070")).toBeDefined();
    h.ticks(2);
    expect(objective(ret)).toBeGreaterThan(0);

    // Walking in finishes the analysis; the cage goes, the outro plays and
    // the activity completes, the Ghost's last line two seconds on.
    fire("phase02.pf_po_return._player_trigger");
    h.ticks(6);
    expect(objective(ret)).toBe(0);
    expect(h.said(said(5))).toBe(true);
    h.ticks(1);
    expect(playing("seq_act_venus_m2_outro_music")).toBeDefined();
    expect(h.completed()).toBe(1);
    h.ticks(3);
    expect(playing("seq_vn02_020_s080")).toBeDefined();
  });
});
