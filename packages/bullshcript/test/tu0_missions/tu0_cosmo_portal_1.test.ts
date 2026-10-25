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
  COSMO_PORTAL_1_NAV_POINTS,
  COSMO_PORTAL_1_ROWS,
} from "./tu0_cosmo_portal_1_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

interface Bundle {
  bundle: number;
  key: string;
  path: string;
  tag: number;
}

// cosmo_portal_1 on TU0: its bundles and the script each runs.
const BUNDLES: Bundle[] = [
  {
    bundle: 0x47_86_c0_e0,
    key: "STORY_COMMON",
    path: "bs/activities/common/story_common.bs",
    tag: 0x80_cc_b7_c8,
  },
  {
    bundle: 0x3c_3e_c7_28,
    key: "COSMO_PORTAL1_ACTIVITY",
    path: "es/cosmo/cosmo_portal1_activity/cosmo_portal1_activity.es",
    tag: 0x80_cb_98_90,
  },
  {
    bundle: 0xc6_5a_de_ef,
    key: "AUDIO",
    path: "es/cosmo/cosmo_portal1_activity/cosmo_portal1_audio.es",
    tag: 0x80_cb_9c_c6,
  },
  {
    bundle: 0x4c_63_79_2c,
    key: "REFINERY",
    path: "es/cosmo/refinery/enc_refinery_portal1.es",
    tag: 0x80_cb_98_91,
  },
  {
    bundle: 0x63_48_63_c2,
    key: "BLAST",
    path: "es/cosmo/blast/enc_blast_portal1.es",
    tag: 0x80_cb_98_2c,
  },
  {
    bundle: 0xfe_85_01_fa,
    key: "SHIP",
    path: "es/cosmo/ship/enc_ship_portal1.es",
    tag: 0x80_cb_99_6c,
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
  (n) =>
    `es/cosmo/cosmo_portal1_activity/cosmo_portal1_activity_mission${n}.esp`
);

const ARCHETYPES = [
  "countdown_objective",
  "dialog_trigger",
  "generic_objective",
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
  const rowOf = (name: string) => {
    const tag = tags.find((entry) => entry.rows.some((r) => r.name === name));
    const row = tag?.rows.find((entry) => entry.name === name);
    if (!(tag && row)) {
      throw new Error(`${name} missing`);
    }
    return { bundle: tag.bundle, typeId: row.typeId, typeIndex: row.typeIndex };
  };
  const last = (kind: ItemChange["kind"], name: string) => {
    const row = rowOf(name);
    return changes
      .filter(
        (change) =>
          change.kind === kind &&
          change.item.bundle === row.bundle &&
          change.item.typeIndex === row.typeIndex
      )
      .at(-1);
  };
  return {
    changes,
    completed: () => completed,
    last,
    lifetimeStates: () =>
      changes.flatMap((change) =>
        change.kind === "lifetime" ? [change.state.state] : []
      ),
    players,
    progress: () => progress,
    rowOf,
    runtime,
    said: (text: string) => log.some((line) => line.includes(text)),
    saidAll: (...texts: string[]) =>
      log.some((line) => texts.every((text) => line.includes(text))),
    ticks: (n: number) => {
      for (let i = 0; i < n; i++) {
        runtime.tick();
      }
    },
  };
}

describe("TU0 cosmo_portal_1 scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of BUNDLES) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "cosmo")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    // The strike's names all cracked: each file name hashes to its bundle.
    expect(bundleHashOf("cosmo_portal1_activity")).toBe(0x3c_3e_c7_28);
    expect(bundleHashOf("cosmo_portal1_audio")).toBe(0xc6_5a_de_ef);
    expect(bundleHashOf("enc_blast_portal1")).toBe(0x63_48_63_c2);
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

  it("runs the strike on the TU0 host from the rocketyard to end_game", () => {
    const tags = tagsOf(BUNDLES, COSMO_PORTAL_1_ROWS);
    const h = host(tags, COSMO_PORTAL_1_NAV_POINTS);
    const fire = (name: string) => h.runtime.reportTriggerFired(h.rowOf(name));
    const alive = (name: string, count: number) =>
      h.runtime.reportSquadAlive(h.rowOf(name), count);
    const squadTask = (name: string) => {
      const change = h.last("squad", name);
      return change?.kind === "squad" ? change.state.task : undefined;
    };
    const objectiveState = (name: string) => {
      const change = h.last("playerObjective", name);
      return change?.kind === "playerObjective" ? change.state : undefined;
    };

    // The root sets pregame; mission 1 waits for the players, then the
    // lifetime goes active with the first objective.
    h.ticks(3);
    expect(h.said("mission cosmo_portal1_activity_mission1 starting")).toBe(
      true
    );
    expect(h.runtime.unresolvedBindings).toEqual([]);
    expect(h.lifetimeStates()).toEqual([0]);
    h.players.push({ characterKey: "c0", powerLevel: 1, ready: true });
    h.runtime.reportPlayerSpawned();
    h.ticks(4);
    expect(h.lifetimeStates().at(-1)).toBe(2);
    expect(h.last("sequence", "music_intro01")?.kind).toBe("sequence");
    const first = objectiveState("phase00.obj_s1_phase00_m1._player_objective");
    expect(first?.navPoints[0]?.sliceSet).toBe(20);
    fire("phase00.obj_s1_phase00_m1._player_trigger");
    h.ticks(3);
    expect(h.said("mission cosmo_portal1_activity_mission2 starting")).toBe(
      true
    );

    // A handle is the other bundle's encounter itself, filled by its name.
    const refinery = h.runtime.instances.get("enc_refinery_portal1");
    expect(refinery).toBeDefined();
    expect(
      h.runtime.instances
        .get("cosmo_portal1_audio")
        ?.get("enc_refinery_portal1")
    ).toBe(refinery);

    // The refinery: the trash and the playfight on their triggers, the
    // objectives on theirs.
    fire("phase01.pt_wake_trash01");
    h.ticks(2);
    expect(squadTask("sq_trash01_fallen01")).toBe(6);
    expect(h.last("sequence", "s01_xx40")?.kind).toBe("sequence");
    fire("phase01.pt_wake_playfight01");
    h.ticks(2);
    expect(squadTask("sq_playfight_fallen02")).toBe(3);
    fire("phase01.obj_s1_phase01_m1._player_trigger");
    h.ticks(2);
    for (const squad of [
      "sq_playfight_hive01",
      "sq_playfight_hive02",
      "sq_playfight_fallen01",
      "sq_playfight_fallen02",
    ]) {
      alive(squad, 1);
    }
    h.ticks(5);
    for (const squad of [
      "sq_playfight_hive01",
      "sq_playfight_hive02",
      "sq_playfight_fallen01",
      "sq_playfight_fallen02",
    ]) {
      alive(squad, 0);
    }
    h.ticks(4);
    expect(h.said("mission cosmo_portal1_activity_mission3 starting")).toBe(
      true
    );

    // The Ghost's scan: the console's use starts the hack and the waves.
    h.ticks(3);
    h.runtime.reportInteraction(
      (name) => name === fnv1("sp_placement_array._object")
    );
    h.ticks(2);
    const repel = objectiveState("phase02.po_repel_fallen01");
    expect(repel?.state).toBe(2);
    expect(repel?.navPoints[0]?.sliceSet).toBe(19);
    const console_ = h.last("object", "sp_placement_array._object");
    expect(
      console_?.kind === "object" && console_.state.device?.position
    ).toBeCloseTo(0.1);
    expect(h.last("sequence", "cue1")?.kind).toBe("sequence");
    // The hack runs on the waves' deaths (sc_hack): nothing moves on while
    // a wave stands, and each web falls a few seconds after its wave is down.
    const actorPushes = (name: string) => {
      const row = h.rowOf(name);
      return h.changes.filter(
        (change) =>
          change.kind === "actor" && change.item.typeIndex === row.typeIndex
      ).length;
    };
    const webPresent = (name: string) => {
      const web = h.last("object", name);
      return web?.kind === "object" && web.state.present;
    };
    const devicePosition = () => {
      const console_ = h.last("object", "sp_placement_array._object");
      return console_?.kind === "object"
        ? console_.state.device?.position
        : undefined;
    };
    h.ticks(8);
    expect(squadTask("sq_objective_suppressors01")).toBe(18);
    expect(squadTask("sq_objective_fallen01a")).toBe(4);
    h.ticks(40);
    expect(squadTask("sq_objective_fallen01c")).not.toBe(5);
    // the third squad as the first two thin out to three
    alive("sq_objective_fallen01a", 2);
    alive("sq_objective_fallen01b", 1);
    h.ticks(2);
    expect(squadTask("sq_objective_fallen01c")).toBe(5);
    // the shanks once wave 1's Fallen are down, and that holds
    for (const squad of [
      "sq_objective_fallen01a",
      "sq_objective_fallen01b",
      "sq_objective_fallen01c",
    ]) {
      alive(squad, 0);
    }
    h.ticks(6);
    expect(squadTask("sq_objective_fallen01d")).toBe(0);
    const shankPushes = actorPushes("sq_objective_fallen01d__shank01");
    expect(actorPushes("sq_objective_fallen01e__shank04")).toBeGreaterThan(0);
    h.ticks(30);
    expect(webPresent("o_laserweb01")).toBe(true);
    alive("sq_objective_fallen01d", 0);
    alive("sq_objective_fallen01e", 0);
    h.ticks(5);
    expect(webPresent("o_laserweb01")).toBe(false);
    h.ticks(2);
    expect(objectiveState("phase02.po_repel_fallen01")?.progress?.min).toBe(1);
    h.ticks(10);
    expect(squadTask("sq_objective_fallen02b")).toBe(8);
    expect(squadTask("sq_objective_suppressors05")).toBe(20);
    // the rushers as the first two squads thin out
    alive("sq_objective_fallen02b", 4);
    alive("sq_objective_fallen02c", 0);
    h.ticks(6);
    expect(squadTask("sq_objective_fallen02b")).toBe(7);
    expect(squadTask("sq_objective_fallen02d")).toBe(10);
    h.ticks(30);
    expect(webPresent("o_laserweb02")).toBe(true);
    for (const squad of [
      "sq_objective_fallen02b",
      "sq_objective_fallen02d",
      "sq_objective_fallen02e",
    ]) {
      alive(squad, 0);
    }
    h.ticks(5);
    expect(webPresent("o_laserweb02")).toBe(false);
    h.ticks(8);
    expect(squadTask("sq_objective_fallen03a")).toBe(11);
    expect(squadTask("sq_objective_hive04")).not.toBe(17);
    alive("sq_objective_hive01", 0);
    alive("sq_objective_hive02", 1);
    h.ticks(3);
    expect(squadTask("sq_objective_hive04")).toBe(17);
    // wave 3 down: the shanks again, and the rushers back as they thin out
    for (const squad of [
      "sq_objective_hive02",
      "sq_objective_hive03",
      "sq_objective_hive04",
      "sq_objective_fallen03a",
      "sq_objective_fallen03b",
    ]) {
      alive(squad, 0);
    }
    // the four pairs of shanks take 4 s to drop
    h.ticks(9);
    expect(actorPushes("sq_objective_fallen01d__shank01")).toBeGreaterThan(
      shankPushes
    );
    alive("sq_objective_fallen01d", 4);
    alive("sq_objective_fallen01e", 4);
    h.ticks(3);
    expect(h.saidAll("sq_objective_fallen02d", "bodies=8")).toBe(false);
    alive("sq_objective_fallen01d", 1);
    alive("sq_objective_fallen01e", 1);
    h.ticks(2);
    expect(h.saidAll("sq_objective_fallen02d", "bodies=8")).toBe(true);
    // wave 3's Fallen back as the rushers thin out, the captain once they
    // are down
    alive("sq_objective_fallen02d", 3);
    alive("sq_objective_fallen02e", 3);
    h.ticks(2);
    alive("sq_objective_fallen02d", 1);
    alive("sq_objective_fallen02e", 0);
    h.ticks(2);
    expect(h.saidAll("sq_objective_fallen03a", "bodies=6")).toBe(true);
    const captainPushes = actorPushes("sq_objective_fallen03c__captain_major");
    alive("sq_objective_fallen02d", 0);
    h.ticks(3);
    expect(
      actorPushes("sq_objective_fallen03c__captain_major")
    ).toBeGreaterThan(captainPushes);
    // the hack waits on the captain, and completes as he dies
    h.ticks(20);
    expect(devicePosition()).toBeCloseTo(0.1);
    h.runtime.reportActorBound(
      h.rowOf("sq_objective_fallen03c__captain_major"),
      true,
      true
    );
    h.ticks(4);
    expect(devicePosition()).toBe(1);
    h.ticks(8);
    const repelRow = h.rowOf("phase02.po_repel_fallen01");
    expect(
      h.changes.some(
        (change) =>
          change.kind === "playerObjective" &&
          change.item.typeIndex === repelRow.typeIndex &&
          change.state.progress?.min === 3
      )
    ).toBe(true);
    expect(objectiveState("phase02.po_repel_fallen01")?.state).toBe(0);
    expect(squadTask("sq_trash02_fallen03")).toBe(2);
    expect(h.said("mission cosmo_portal1_activity_mission4 starting")).toBe(
      true
    );

    // On to the blast, where the Walker lands and dies.
    h.ticks(3);
    fire("phase03.obj_s1_phase03_m1._player_trigger");
    h.ticks(3);
    expect(h.said("mission cosmo_portal1_activity_mission5 starting")).toBe(
      true
    );
    const door = h.last("object", "phase04.o_cosmo_strike01_door01");
    expect(door?.kind === "object" && door.state.present).toBe(true);
    fire("phase04.pt_play_s01_x100_s01_x110");
    h.ticks(4);
    const tank = h.last("squad", "sq_tank");
    expect(tank?.kind === "squad" && tank.state.objective?.typeIndex).toBe(0);
    const skiff = h.last("actor", "sq_dropship_tank__dropship");
    expect(
      skiff?.kind === "actor" && skiff.state.commandScript?.atoms.length
    ).toBe(4);
    expect(h.last("sequence", "s01_x100")?.kind).toBe("sequence");
    // The Walker rides in seated in the skiff, placed with it.
    const seat = () => {
      const change = h.last("passenger", "skiff_passenger");
      return change?.kind === "passenger" ? change.state : undefined;
    };
    expect(seat()).toEqual({ passenger: h.rowOf("sq_tank__tank"), state: 1 });
    h.ticks(50);
    expect(seat()).toEqual({ state: 2 });
    const walker = h.last("actor", "sq_tank__tank");
    expect(walker?.kind === "actor" && walker.state.drop?.squads.length).toBe(
      2
    );
    expect(squadTask("sq_fallen_rear01")).toBe(10);
    alive("sq_tank", 1);
    h.ticks(1);
    alive("sq_tank", 0);
    h.ticks(5);
    const opened = h.last("object", "phase04.o_cosmo_strike01_door01");
    expect(opened?.kind === "object" && opened.state.device?.position).toBe(1);
    expect(squadTask("sq_fallen_door01")).toBe(14);
    expect(h.said("mission cosmo_portal1_activity_mission6 starting")).toBe(
      true
    );

    // The ship: the servitor's entrance, the guards, the fight.
    h.ticks(3);
    fire("phase05.pt_play_s01_x120");
    h.ticks(3);
    expect(squadTask("sq_bossbattle_boss01")).toBe(6);
    const shield = h.last("hopOn", "ho_servitor_performance_shield01");
    expect(shield?.kind === "hopOn" && shield.state.filter).toBeDefined();
    // The servitor comes in blind and deaf: it does not fight its guards' fight.
    const servitor = () => {
      const change = h.last("actor", "sq_bossbattle_boss01__servitor");
      return change?.kind === "actor" ? change.state : undefined;
    };
    expect(servitor()?.placed).toBe(true);
    expect(servitor()?.behaviour).toMatchObject({
      awarenessFlags: 3,
      awarenessMask: 3,
    });
    // As the client does at placement: the named servitor is no tally cell.
    h.runtime.reportSquadTally(h.rowOf("sq_bossbattle_boss01"), [0]);
    fire("phase05.obj_s1_phase05_m1._player_trigger");
    h.ticks(3);
    const hangar = h.last("object", "phase05.o_cosmo_strike01_hangar_door01");
    expect(hangar?.kind === "object" && hangar.state.device?.position).toBe(1);
    expect(h.last("sequence", "cue2")?.kind).toBe("sequence");
    const guards = [
      "sq_bossbattle_fallen01",
      "sq_bossbattle_fallen02",
      "sq_bossbattle_fallen03",
      "sq_bossbattle_fallen04",
    ];
    for (const squad of guards) {
      alive(squad, 2);
    }
    h.ticks(5);
    for (const squad of guards) {
      alive(squad, 0);
    }
    // It wakes with the stim as the last guard dies; the shield goes 8 s on.
    h.ticks(1);
    expect(servitor()?.behaviour).toMatchObject({
      awarenessFlags: 0,
      awarenessMask: 3,
    });
    const stim = h.last("object", "o_sepix_stim");
    expect(stim?.kind === "object" && stim.state.present).toBe(true);
    h.ticks(7);
    const shielded = h.last("hopOn", "ho_servitor_performance_shield01");
    expect(shielded?.kind === "hopOn" && shielded.state.filter).toBeDefined();
    h.ticks(2);
    const unshielded = h.last("hopOn", "ho_servitor_performance_shield01");
    expect(unshielded?.kind === "hopOn" && unshielded.state.filter).toBe(
      undefined
    );
    h.ticks(4);
    expect(h.said("mission cosmo_portal1_activity_mission7 starting")).toBe(
      true
    );
    expect(h.last("sequence", "cue3")?.kind).toBe("sequence");
    h.ticks(12);
    expect(squadTask("sq_bossbattle_boss01")).toBe(0);
    expect(squadTask("sq_bossbattle_shanks04")).toBe(18);
    h.ticks(30);
    expect(squadTask("sq_bossbattle_reinf02")).toBe(7);
    h.ticks(45);
    expect(squadTask("sq_bossbattle_boss01")).toBe(3);
    alive("sq_bossbattle_boss01", 1);
    h.ticks(1);
    alive("sq_bossbattle_boss01", 0);
    h.ticks(3);
    // A teleport's 0 is not his death: the squad holds him alive until his
    // own death edge, and his adds die with him.
    expect(h.said("mission cosmo_portal1_activity_mission8 starting")).toBe(
      false
    );
    alive("sq_bossbattle_boss01", 1);
    h.runtime.reportActorBound(
      h.rowOf("sq_bossbattle_boss01__servitor"),
      true,
      true
    );
    h.ticks(3);
    expect(h.said("mission cosmo_portal1_activity_mission8 starting")).toBe(
      true
    );
    const reinf = h.last("squad", "sq_bossbattle_reinf02");
    expect(reinf?.kind === "squad" && reinf.state.killed).toBe(1);
    // The audio still holds the boss's 0 for 15 s before its ascent.
    h.ticks(15);

    // The end: the loot's lines, activity complete, the 30 s results hold.
    h.runtime.reportClientIncident(0xbd_1f_b4_18);
    h.ticks(3);
    expect(h.last("sequence", "seq_music_ascent")?.kind).toBe("sequence");
    h.ticks(14);
    expect(h.completed()).toBe(1);
    expect(h.said("end_game (results, 30 s)")).toBe(true);
    const timer = h.last("timer", "lifetime_timer");
    expect(timer?.kind === "timer" && timer.state.running?.seconds).toBe(30);
    expect(h.lifetimeStates().at(-1)).toBe(5);
    h.ticks(31);
    expect(h.lifetimeStates().at(-1)).toBe(6);
    expect(h.said("activity ended - scripts stopped")).toBe(true);
    expect(h.runtime.unresolvedBindings).toEqual([]);
  });
});
