import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ACT_MARS_M03_PENTHOUSE_ROWS,
  ACT_MARS_M03_PENTHOUSE_TAGS,
} from "./tu0_act_mars_m03_penthouse_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_mars_m03_penthouse (The Buried City) on TU0: its own bundles and the
// binder (TU0 disc tags), and the script each one runs. The downtown
// ambient is here for the console's placement object alone; its script is
// the destination's and is not this test's.
const BUNDLES = [
  {
    bundle: 0xd3_b4_5b_3e,
    key: "ROOT",
    path: "es/mars/act_mars_m03_penthouse/act_mars_m03_penthouse.es",
  },
  {
    bundle: 0xc5_88_d1_32,
    key: "AUDIO",
    path: "es/mars/act_mars_m03_penthouse/unknown_c588d132.es",
  },
  {
    bundle: 0x33_8e_d9_cb,
    key: "ATRIUM",
    path: "es/mars/atrium/enc_atrium_m03.es",
  },
  {
    bundle: 0xc4_73_ae_50,
    key: "PENTHOUSE",
    path: "es/mars/penthouse/enc_penthouse_m03.es",
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
  (n) => `es/mars/act_mars_m03_penthouse/act_mars_m03_penthouse_mission${n}.esp`
);

// The downtown console's identifier (enc_downtown_amb1's
// pf_placement_m03_button) and the node's.
const CONSOLE = 0x09_2e_8c_15;
const NODE = 0x77_ac_10_e6;

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key }) => ({
  bundle,
  rows: (ACT_MARS_M03_PENTHOUSE_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag: ACT_MARS_M03_PENTHOUSE_TAGS[key] ?? 0,
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

describe("TU0 act_mars_m03_penthouse scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES.slice(0, 4)) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "mars")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    const root = tu0Scripts.scriptByPath(BUNDLES[0]!.path);
    expect(
      root && tu0Scripts.missionScripts(root).map((file) => file.path)
    ).toEqual(MISSIONS);
  });

  it("starts at the landing zone, its phases downtown, in the atrium and the penthouse", () => {
    const start = tu0Scripts.activityStart("act_mars_m03_penthouse");
    expect(start?.startSlice).toBe("plains");
    expect(start?.startPhase).toBeUndefined();
    expect(start?.spawnTransition).toBe(fnv1("landing_zone"));
    expect(start?.regionSpawnTransitions).toEqual({
      0: 0xe0_f8_5f_4c,
      48: 0xf7_45_9a_b9,
      136: 0x0b_1e_e1_25,
      144: fnv1("landing_zone"),
    });
    expect(start?.phases.map(({ slice }) => slice)).toEqual([
      "downtown",
      "downtown",
      "atrium",
      "atrium",
      "penthouse",
      "penthouse",
      "penthouse",
      "penthouse",
    ]);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
      "es/utility_scripts/interactable_objective.esu",
      "es/utility_scripts/interactable_placement.esu",
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

  it("runs the mission on the TU0 host from the landing zone to the node", () => {
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
      scripts: tu0ScriptSource(TAGS, "mars"),
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
    // A squad's deaths so far, as its tally.
    const lose = (key: string, name: string, dead: number) =>
      runtime.reportSquadTally(rowOf(key, name), [dead]);
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
    const objective = (row: string, state: string) =>
      said(`${row}._player_objective t32#`) &&
      log.some(
        (line) =>
          line.includes(`${row}._player_objective t32#`) &&
          line.includes(`player objective ${state}`)
      );

    // The landing zone: active at the spawn with the intro music, the Ghost's
    // line 2.5 s on, the downtown objective a moment after the line ends.
    ticks(1);
    expect(said("mission act_mars_m03_penthouse_mission1 starting")).toBe(true);
    // the office squads stand from the start
    expect(taskOf("ATRIUM", "sq_office_cabal_support1")).toBe(2);
    expect(taskOf("ATRIUM", "sq_office_cabal_support2")).toBe(3);
    runtime.reportPlayerSpawned();
    ticks(2);
    expect(said("lifetime set_state(active)")).toBe(true);
    expect(said("seq_m_intro_s01 t5#0 sequence play")).toBe(true);
    ticks(3);
    expect(said("seq_d_plains_lz_s01 t5#3 sequence play")).toBe(true);
    const goto = "phase_m03_downtown_goto.pf_objective_downtown_goto";
    expect(objective(goto, "active")).toBe(false);
    ticks(11);
    expect(objective(goto, "active")).toBe(true);
    fire("ROOT", `${goto}._player_trigger`);
    ticks(3);
    expect(said("mission act_mars_m03_penthouse_mission2 starting")).toBe(true);

    // Downtown: the travel lines with the objective, the console line on its
    // own trigger, the next line after the use and the atrium phase 7 s on.
    ticks(3);
    expect(said("seq_d_downtown_travel_s01 t5#4 sequence play")).toBe(true);
    fire(
      "ROOT",
      "phase_m03_downtown.pf_objective_downtown_trigger._player_trigger"
    );
    ticks(4);
    expect(
      objective("phase_m03_downtown.pf_objective_downtown_interact", "active")
    ).toBe(true);
    fire("AUDIO", "pt_downtown_obj_near");
    ticks(2);
    expect(said("seq_d_downtown_obj_s01 t5#6 sequence play")).toBe(true);
    runtime.reportInteraction((hash) => hash === CONSOLE);
    ticks(4);
    expect(said("seq_d_downtown_obj_s02 t5#7 sequence play")).toBe(true);
    expect(said("mission act_mars_m03_penthouse_mission3 starting")).toBe(
      false
    );
    ticks(8);
    expect(said("mission act_mars_m03_penthouse_mission3 starting")).toBe(true);

    // To the atrium; the office: the third psion pair on the entry trigger,
    // the first phalanx pair falls back as it loses one.
    ticks(3);
    fire(
      "ROOT",
      "phase_m03_atrium_goto.pf_objective_atrium_goto._player_trigger"
    );
    ticks(5);
    expect(said("mission act_mars_m03_penthouse_mission4 starting")).toBe(true);
    fire("ATRIUM", "pt_office_entry");
    ticks(2);
    expect(taskOf("ATRIUM", "sq_office_cabal_support3")).toBe(8);
    lose("ATRIUM", "sq_office_cabal_support1", 1);
    ticks(1);
    expect(taskOf("ATRIUM", "sq_office_cabal_support1")).toBe(4);
    lose("ATRIUM", "sq_office_cabal_support2", 1);
    ticks(1);
    expect(taskOf("ATRIUM", "sq_office_cabal_support1")).toBe(5);
    expect(taskOf("ATRIUM", "sq_office_cabal_support2")).toBe(5);

    // The atrium: the Cabal below on the office exit, the Vex on two clouds
    // at the entry, the Ghost's line on them, the Cabal above halfway up.
    fire("ATRIUM", "pt_office_exit");
    ticks(3);
    expect(taskOf("ATRIUM", "sq_atrium_dn_cabal_support1")).toBe(1);
    fire("ATRIUM", "pt_atrium_entry");
    ticks(2);
    expect(taskOf("ATRIUM", "sq_atrium_dn_cabal_support1")).toBe(0);
    expect(taskOf("ATRIUM", "sq_atrium_dn_cabal_support3")).toBe(4);
    expect(
      said("sq_atrium_dn_vex_cloud1__vex_cloud t2#23 command script")
    ).toBe(true);
    ticks(1);
    expect(taskOf("ATRIUM", "sq_atrium_dn_vex_anchor1")).toBe(9);
    expect(taskOf("ATRIUM", "sq_atrium_dn_vex_support2")).toBe(11);
    ticks(2);
    expect(taskOf("ATRIUM", "sq_atrium_dn_vex_support1")).toBe(10);
    ticks(5);
    expect(said("seq_d_atrium_vex_s01 t5#9 sequence play")).toBe(true);
    fire("ATRIUM", "pt_atrium_mid");
    ticks(2);
    expect(taskOf("ATRIUM", "sq_atrium_up_cabal_support1")).toBe(16);
    expect(taskOf("ATRIUM", "sq_atrium_up_cabal_support3")).toBe(17);
    fire("ATRIUM", "pt_atrium_up");
    ticks(2);
    expect(taskOf("ATRIUM", "sq_atrium_up_cabal_anchor1")).toBe(15);
    fire(
      "ROOT",
      "phase_m03_atrium.pf_objective_atrium_trigger._player_trigger"
    );
    ticks(3);
    expect(said("mission act_mars_m03_penthouse_mission5 starting")).toBe(true);

    // To the penthouse; rooms 0 and 1 on their triggers, the back line as
    // the front's first squad loses one.
    ticks(6);
    expect(said("seq_d_atrium_to_penthouse_s01 t5#10 sequence play")).toBe(
      true
    );
    fire(
      "ROOT",
      "phase_m03_penthouse_goto.pf_objective_penthouse_goto._player_trigger"
    );
    ticks(3);
    expect(said("mission act_mars_m03_penthouse_mission6 starting")).toBe(true);
    fire("PENTHOUSE", "pt_room0_entry");
    fire("PENTHOUSE", "pt_room1_entry");
    ticks(2);
    expect(taskOf("PENTHOUSE", "sq_room0_support1")).toBe(2);
    expect(taskOf("PENTHOUSE", "sq_room1_anchor1")).toBe(4);
    lose("PENTHOUSE", "sq_room1_support1", 1);
    ticks(2);
    expect(taskOf("PENTHOUSE", "sq_room1_support1")).toBe(7);
    expect(taskOf("PENTHOUSE", "sq_room1_support3")).toBe(9);
    expect(taskOf("PENTHOUSE", "sq_room1_support4")).toBe(10);

    // Room 2 waits on its trigger's re-arming by the darkness phase.
    fire("PENTHOUSE", "pt_room2and3");
    ticks(2);
    expect(taskOf("PENTHOUSE", "sq_room2_support1")).not.toBe(2);
    fire(
      "ROOT",
      "phase_m03_penthouse.pf_objective_penthouse_trigger._player_trigger"
    );
    ticks(3);
    expect(said("mission act_mars_m03_penthouse_mission7 starting")).toBe(true);
    expect(said("seq_m_climax_s01 t5#1 sequence play")).toBe(true);
    fire("PENTHOUSE", "pt_room2and3");
    ticks(2);
    expect(taskOf("PENTHOUSE", "sq_room2_support1")).toBe(2);
    expect(taskOf("PENTHOUSE", "sq_room3_wave1_support2")).toBe(2);

    // Room 3: the first wave at the major's spawn trigger, each next one
    // once the last is down, the third through the courtyard door.
    fire("ROOT", "phase_m03_penthouse_darkness.pt_penthouse_major_spawn");
    ticks(2);
    expect(taskOf("PENTHOUSE", "sq_room3_wave1_support1")).toBe(4);
    lose("PENTHOUSE", "sq_room2_support1", 2);
    ticks(1);
    expect(taskOf("PENTHOUSE", "sq_room2_support2")).toBe(5);
    lose("PENTHOUSE", "sq_room2_support2", 2);
    lose("PENTHOUSE", "sq_room3_wave1_support1", 2);
    lose("PENTHOUSE", "sq_room3_wave1_support2", 2);
    ticks(3);
    expect(taskOf("PENTHOUSE", "sq_room3_wave2_support1")).toBe(6);
    expect(deviceOf("PENTHOUSE", "o_courtyard_door_dummy")).toBe(0);
    lose("PENTHOUSE", "sq_room3_wave2_support1", 2);
    lose("PENTHOUSE", "sq_room3_wave2_support2", 2);
    lose("PENTHOUSE", "sq_room3_wave2_support3", 2);
    ticks(3);
    expect(deviceOf("PENTHOUSE", "o_courtyard_door_dummy")).toBe(1);
    expect(taskOf("PENTHOUSE", "sq_room3_wave3_major1")).toBe(11);
    expect(taskOf("PENTHOUSE", "sq_room3_wave3_support1")).toBe(13);
    ticks(4);
    expect(said("seq_d_cabal_wave_announce t5#16 sequence play")).toBe(true);
    const major = rowOf("PENTHOUSE", "sq_room3_wave3_major1__major_centurion");
    runtime.reportActorBound(major, false, true);
    ticks(2);
    runtime.reportActorBound(major, true, true);
    for (const name of [
      "sq_room3_wave3_support1",
      "sq_room3_wave3_support2",
      "sq_room3_wave3_support3",
    ]) {
      lose("PENTHOUSE", name, 2);
    }
    ticks(4);
    expect(said("seq_m_climax_s01 t5#1 set_switch_mask(31)")).toBe(true);
    // the objective clears two seconds after the last of them
    ticks(5);
    expect(
      objective(
        "phase_m03_penthouse_darkness.pf_objective_penthouse_generic",
        "cleared"
      )
    ).toBe(true);
    fire("AUDIO", "pt_penthouse_cleanroom");
    ticks(2);
    expect(said("seq_d_penthouse_travel_s01 t5#12 sequence play")).toBe(true);
    ticks(4);
    expect(said("mission act_mars_m03_penthouse_mission8 starting")).toBe(true);

    // The node: its use opens the cages, the lines play, the activity
    // completes and the results come half a minute later.
    ticks(3);
    runtime.reportInteraction((hash) => hash === NODE);
    ticks(3);
    expect(
      deviceOf(
        "ROOT",
        "phase_m03_penthouse_close.pf_placement_penthouse_interact._object"
      )
    ).toBeCloseTo(0.89);
    ticks(10);
    expect(said("seq_m_ascent_s01 t5#2 sequence play")).toBe(true);
    expect(completed).toBe(0);
    ticks(6);
    expect(completed).toBe(1);
    ticks(32);
    expect(said("lifetime end_game")).toBe(true);
  });
});
