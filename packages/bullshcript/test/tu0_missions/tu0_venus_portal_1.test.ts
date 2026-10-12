import ScriptRuntime, {
  type ActivityBundleTag,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";
import { VENUS_PORTAL_1_ROWS } from "./tu0_venus_portal_1_rows.ts";

// venus_portal_1's strike on TU0: its bundles (TU0 disc tags) and the
// script each one runs.
const BUNDLES = [
  {
    bundle: 0xf2_92_21_f5,
    key: "PORTAL_COMMON",
    path: "bs/activities/common/portal_common.bs",
    tag: 0x80_fe_1e_25,
  },
  {
    bundle: 0xa8_60_8b_10,
    key: "STRIKE_1_AUDIO",
    path: "es/venus/strike_1_activity/strike_1_audio.es",
    tag: 0x80_fe_1e_24,
  },
  {
    bundle: 0x0a_30_24_29,
    key: "STRIKE_1_ACTIVITY",
    path: "es/venus/strike_1_activity/strike_1_activity.es",
    tag: 0x80_fe_1e_23,
  },
  {
    bundle: 0x97_43_8d_09,
    key: "ENGINEERING",
    path: "es/venus/academy_engineering/enc_engineering_strike1.es",
    tag: 0x80_fe_1c_19,
  },
  {
    bundle: 0x5d_e7_d8_e2,
    key: "DIG_SITE",
    path: "es/venus/academy_dig_site/enc_dig_site_strike1.es",
    tag: 0x80_fe_1b_ad,
  },
  {
    bundle: 0x9c_f4_7a_d5,
    key: "RUINS",
    path: "es/venus/vex_ruins/enc_ruins_strike1.es",
    tag: 0x80_fe_1c_af,
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
  (n) => `es/venus/strike_1_activity/venus_strike_1_mission${n}.esp`
);

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key, tag }) => ({
  bundle,
  rows: (VENUS_PORTAL_1_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag,
}));

function rowOf(key: string, name: string) {
  const tag = TAGS.find(
    (entry) => BUNDLES.find((b) => b.key === key)?.tag === entry.tag
  );
  const row = tag?.rows.find((entry) => entry.name === name);
  if (!(tag && row)) {
    throw new Error(`${key} ${name} missing`);
  }
  return { bundle: tag.bundle, typeId: row.typeId, typeIndex: row.typeIndex };
}

describe("TU0 venus_portal_1 scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "venus")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    const root = tu0Scripts.scriptByPath(
      "es/venus/strike_1_activity/strike_1_activity.es"
    );
    expect(
      root && tu0Scripts.missionScripts(root).map((file) => file.path)
    ).toEqual(MISSIONS);
    const audio = tu0Scripts.scriptByPath(
      "es/venus/strike_1_activity/strike_1_audio.es"
    );
    expect(audio && tu0Scripts.missionScripts(audio)).toEqual([]);
  });

  it("compiles each decl to a chunk on its native base", () => {
    const paths = [
      ...BUNDLES.map((entry) => entry.path),
      ...MISSIONS,
      ...[
        "dialog_trigger",
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

  it("runs the strike on the TU0 host from the engineering floor to the end", () => {
    const log: string[] = [];
    const changes: ItemChange[] = [];
    const players: ActivityPlayer[] = [
      { characterKey: "c0", powerLevel: 1, ready: true },
    ];
    let progress = 0;
    const runtime = new ScriptRuntime({
      bundles: TAGS,
      clock: { activityTicks: () => 0 },
      log: (line) => log.push(line),
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
    runtime.reportPlayerSpawned();
    const ticks = (n: number) => {
      for (let i = 0; i < n; i++) {
        runtime.tick();
      }
    };
    const said = (text: string) => log.some((line) => line.includes(text));
    const kill = (ident: number) => {
      runtime.reportKill({
        assists: [],
        killer: { characterKey: "c0" },
        victim: {},
      });
      runtime.reportSquadKill(ident);
    };

    ticks(5);
    expect(said("mission venus_strike_1_mission1 starting")).toBe(true);
    expect(runtime.unresolvedBindings).toEqual([]);

    // The engineering floor: the bubble objective, then four servitors.
    runtime.reportTriggerFired(
      rowOf(
        "STRIKE_1_ACTIVITY",
        "engineering_phase.engineering_bubble_objective._player_trigger"
      )
    );
    ticks(20);
    expect(said("From the Big Room")).toBe(false);
    // Four servitors die: each a kill incident naming the servitors'
    // identifier (strike_kill_servitors).
    for (let i = 0; i < 4; i++) {
      kill(fnv1("strike_kill_servitors"));
    }
    ticks(20);
    expect(said("mission venus_strike_1_mission2 starting")).toBe(true);

    // On to the dig site.
    for (const tag of TAGS) {
      for (const row of tag.rows) {
        if (row.name?.endsWith("pm_bubble_dig_site")) {
          runtime.reportPlayerMonitor(
            { bundle: tag.bundle, typeIndex: row.typeIndex },
            1
          );
        }
      }
    }
    ticks(10);
    expect(said("mission venus_strike_1_mission3 starting")).toBe(true);
    runtime.reportTriggerFired(
      rowOf(
        "STRIKE_1_ACTIVITY",
        "dig_site_phase.trigger_volume_dig_site._player_trigger"
      )
    );
    ticks(10);
    expect(said("mission venus_strike_1_mission4 starting")).toBe(true);

    // The ruins: the way in, the guards, the boss.
    runtime.reportTriggerFired(
      rowOf(
        "STRIKE_1_ACTIVITY",
        "ruins_phase.trigger_volume_ruins._player_trigger"
      )
    );
    ticks(10);
    expect(said("place guards")).toBe(true);
    const guards = [1, 2, 3, 4, 5, 6].map((n) =>
      rowOf("STRIKE_1_ACTIVITY", `ruins_phase.sq_boss_guard0${n}`)
    );
    for (const guard of guards) {
      runtime.reportSquadAlive(guard, 1);
    }
    ticks(3);
    for (const guard of guards) {
      runtime.reportSquadAlive(guard, 0);
    }
    ticks(5);
    expect(said("start encounter")).toBe(true);
    const boss = rowOf("STRIKE_1_ACTIVITY", "ruins_phase.sq_boss");
    expect(
      changes.some(
        (change) =>
          change.kind === "squad" &&
          change.item.bundle === boss.bundle &&
          change.item.typeIndex === boss.typeIndex
      )
    ).toBe(true);
    ticks(50);
    expect(said("boss wave 1")).toBe(true);
    kill(fnv1("strike_kill_boss"));
    ticks(40);
    expect(said("mission venus_strike_1_mission5 starting")).toBe(true);
    ticks(80);
    // Mission 5's complete ends the game through the binder's lifetime.
    expect(said("lifetime t16#3 lifetime end_game")).toBe(true);
    expect(said("activity ended - scripts stopped")).toBe(true);
  });
});
