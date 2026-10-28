import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  MARS_PORTAL_3_ROWS,
  MARS_PORTAL_3_TAGS,
} from "./tu0_mars_portal_3_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// mars_portal_3 (the Hypogeum strike) on TU0: its own bundles and the binder
// (TU0 disc tags), and the script each one runs.
const BUNDLES = [
  {
    bundle: 0x27_62_dd_ea,
    key: "ROOT",
    path: "es/mars/mars_portal3_activity/mars_portal3_activity.es",
  },
  {
    bundle: 0x26_b3_84_39,
    key: "AUDIO",
    path: "es/mars/mars_portal3_activity/mars_portal3_audio.es",
  },
  {
    bundle: 0x8e_a7_86_0a,
    key: "HYPOGEUM",
    path: "es/mars/hypogeum/enc_hypogeum_portal3.es",
  },
  {
    bundle: 0x4c_da_be_fe,
    key: "LOWERGARDEN",
    path: "es/mars/lowergarden/enc_lowergarden_portal3.es",
  },
  {
    bundle: 0x66_dc_83_e1,
    key: "UPPERGARDEN",
    path: "es/mars/uppergarden/enc_uppergarden_portal3.es",
  },
  {
    bundle: 0xf2_92_21_f5,
    key: "PORTAL_COMMON",
    path: "bs/activities/common/portal_common.bs",
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
  (n) => `es/mars/mars_portal3_activity/mars_portal3_activity_mission${n}.esp`
);

// the Cyclops' squad identifier, which its kill carries
const CYCLOPS = 0x2e_ff_da_e2;

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key }) => ({
  bundle,
  rows: (MARS_PORTAL_3_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag: MARS_PORTAL_3_TAGS[key] ?? 0,
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

describe("TU0 mars_portal_3 scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES.slice(0, 5)) {
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

  it("starts in the lower garden with its phase, then the upper garden and the Hypogeum", () => {
    const start = tu0Scripts.activityStart("mars_portal_3");
    expect(start?.startSlice).toBe("lowergarden");
    expect(start?.startPhase?.name).toBe("phase_lowergarden");
    expect(start?.phases.map(({ slice }) => slice)).toEqual([
      "lowergarden",
      "uppergarden",
      "uppergarden",
      "hypogeum",
      "hypogeum",
      "hypogeum",
    ]);
    expect(start?.spawnTransition).toBe(0xfb_76_ec_c4);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
      ...[
        "ambush_encounter",
        "dialog_trigger",
        "dropship_encounter",
        "generic_objective",
        "kill_squad_objective",
        "trigger_bubble_objective",
        "trigger_volume_objective",
        "vex_warp_gate",
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

  it("runs the strike on the TU0 host from the lower garden to the hydra", () => {
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
    const objective = (row: string, state: string) =>
      said(`${row}._player_objective`) &&
      log.some(
        (line) =>
          line.includes(`${row}._player_objective`) &&
          line.includes(`player objective ${state}`)
      );

    // The lower garden: the door open, the lifetime, the music and the
    // Ghost's line armed, the objective on up.
    ticks(1);
    expect(said("mission mars_portal3_activity_mission1 starting")).toBe(true);
    runtime.reportPlayerSpawned();
    ticks(4);
    expect(deviceOf("ROOT", "o_lowergarden_door")).toBe(1);
    expect(said("lifetime set_state(active)")).toBe(true);
    expect(said("seq_music_cue1")).toBe(true);
    expect(objective("phase_lowergarden.pf_objective_upper", "active")).toBe(
      true
    );
    fire("ROOT", "phase_lowergarden.pf_objective_upper._player_trigger");
    ticks(2);
    expect(said("mission mars_portal3_activity_mission2 starting")).toBe(true);

    // The upper garden: its doors and stair Vex, the gate.
    expect(deviceOf("UPPERGARDEN", "o_door_hypogeum")).toBe(1);
    expect(said("sq_stair_a:set_task(0x2BF1ADA6)")).toBe(true);
    ticks(5);
    fire("ROOT", "phase_uppergarden.pf_objective_gate._player_trigger");
    ticks(2);
    expect(said("mission mars_portal3_activity_mission3 starting")).toBe(true);

    // The Cyclops: in at once, the objective at the Ghost's line, cleared
    // four seconds after its kill.
    ticks(1);
    expect(said("sq_turret:set_task(0x9F6DB313)")).toBe(true);
    fire("AUDIO", "mss03_020_030_trigger._player_trigger");
    ticks(4);
    expect(
      objective("phase_upper_uppergarden.pf_objective_kill", "active")
    ).toBe(true);
    runtime.reportKill({
      assists: [],
      killer: { characterKey: "c0" },
      victim: {},
    });
    runtime.reportSquadKill(CYCLOPS);
    ticks(3);
    expect(said("mission mars_portal3_activity_mission4 starting")).toBe(false);
    ticks(4);
    expect(said("mission mars_portal3_activity_mission4 starting")).toBe(true);

    // Down to the Hypogeum's gate.
    ticks(5);
    fire("ROOT", "phase_hypogeum.pf_objective_gate._player_trigger");
    ticks(2);
    expect(said("mission mars_portal3_activity_mission5 starting")).toBe(true);

    // The hydra: the blocks light 55 s in, the hydra 12 s later; its death
    // clears the objective three seconds on.
    ticks(58);
    expect(deviceOf("HYPOGEUM", "o_vex_block")).toBeCloseTo(0.6);
    ticks(13);
    expect(said("sq_boss:set_task(boss)")).toBe(true);
    runtime.reportSquadAlive(rowOf("HYPOGEUM", "sq_boss"), 0);
    ticks(5);
    expect(said("mission mars_portal3_activity_mission6 starting")).toBe(true);

    // The end: the ascent music, the line, the strike complete, the game's
    // end half a minute later.
    expect(completed).toBe(0);
    ticks(14);
    expect(said("seq_music_ascent")).toBe(true);
    expect(completed).toBe(1);
    ticks(32);
    expect(said("lifetime end_game")).toBe(true);
  });
});
