// A hard wipe through the host: a phase that says @hard_wipe() is armed while
// it runs, and resetting it stops its scripts and the encounters that wrote
// beside it, puts every row they wrote back to what it was when the phase
// started and starts the phase again.
import { describe, expect, it } from "vitest";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import {
  formatScriptTag,
  type ScriptSource,
} from "../../src/hks/source/script_source.ts";
import { jumpToPhase } from "../../src/host/schedule/phase_reset.ts";
import type {
  ItemChange,
  ItemRef,
  SquadState,
} from "../../src/host/state/items.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";
import type { ActivityBundleTag } from "../../src/host/tags/tag_types.ts";
import { ScriptRuntime } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/runtime.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/tag_types.ts";

const { Encounter, HardWipeGlobals, Objective, Squad, Timer } =
  ActivityBundleItemType;

const FILES = {
  root: { path: "es/test/act_w/act_w.es", text: "int unused = 0\n" },
  // no @hard_wipe(): a wipe here is never armed
  mission1: {
    path: "es/test/act_w/act_w_mission1.esp",
    text: [
      "squad sq_p1",
      "",
      "script init(): pass",
      "",
      "script main():",
      '    print("m1 main")',
      "    sq_p1.place()",
      "",
    ].join("\n"),
  },
  mission2: {
    path: "es/test/act_w/act_w_mission2.esp",
    text: [
      "@hard_wipe()",
      "squad sq_p2",
      "objective obj_p2",
      "timer tmr_p2",
      "wipe_arch arch",
      "incident_listener il_joined",
      'string_hash sh_player_joined = "player_joined"',
      'string_hash sh_all_players = "all_players"',
      "int starts = 0",
      "",
      "script init():",
      "    starts = starts + 1",
      '    print("m2 init")',
      "    il_joined.bind_hash(sh_player_joined, sh_all_players)",
      "    il_joined.set_handler(joined)",
      "",
      "def joined(incident_name, incident_metadata):",
      '    print("joined handler")',
      "",
      "script main():",
      '    print("m2 main")',
      "    sq_p2.place()",
      "    obj_p2.objective_begin()",
      "    tmr_p2.show_progress_bar()",
      "    sleep(1000)",
      "",
    ].join("\n"),
  },
  arch: {
    path: "es/test/act_w/wipe_arch.esu",
    text: [
      "squad _squad",
      "",
      "@startup()",
      "script sc_arch():",
      '    print("arch main")',
      "    _squad.place()",
      "    sleep(1000)",
      "",
    ].join("\n"),
  },
  // writes a row in the second phase
  placer: {
    path: "es/test/act_w/enc_placer.es",
    text: [
      "squad sq_e",
      "",
      "@startup()",
      "script main():",
      '    print("placer main")',
      "    sleep(3)",
      "    sq_e.place()",
      "    sleep(1000)",
      "",
    ].join("\n"),
  },
  // writes nothing
  quiet: {
    path: "es/test/act_w/enc_quiet.es",
    text: [
      "@startup()",
      "script main():",
      '    print("quiet main")',
      "    sleep(1000)",
      "",
    ].join("\n"),
  },
};

const TAGS = {
  arch: 0x80ab_0104,
  mission1: 0x80ab_0102,
  mission2: 0x80ab_0103,
  placer: 0x80ab_0105,
  quiet: 0x80ab_0106,
  root: 0x80ab_0101,
};
const BUNDLE_A = 0x1111_0a01;
const BUNDLE_B = 0x1111_0b02;
const BUNDLE_C = 0x1111_0c03;
const TAG_A = 0x80ab_0a01;
const TAG_B = 0x80ab_0b02;
const TAG_C = 0x80ab_0c03;

const SQ_P1 = 1;
const SQ_P2 = 2;
const OBJ_P2 = 3;
const TMR_P2 = 4;
const ARCH = 5;
const ARCH_SQUAD = 6;
const HARD_WIPE_GLOBALS = 7;
const SQ_E = 1;

const squad = (name: string, typeIndex: number) => ({
  cells: [1],
  memberCount: 1,
  memberNames: [fnv1("grunt")],
  name,
  nameHash: fnv1(name),
  typeId: Squad,
  typeIndex,
});
const row = (name: string, typeId: number, typeIndex: number) => ({
  name,
  nameHash: fnv1(name),
  typeId,
  typeIndex,
});

function project() {
  const compiled = compileScriptFiles(Object.values(FILES));
  expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
    []
  );
  const byTag = new Map(
    (Object.keys(FILES) as (keyof typeof FILES)[]).map((name) => [
      formatScriptTag(TAGS[name]),
      FILES[name].path,
    ])
  );
  const refs = new Map([
    [
      formatScriptTag(TAGS.root),
      [formatScriptTag(TAGS.mission1), formatScriptTag(TAGS.mission2)],
    ],
    [formatScriptTag(TAGS.mission2), [formatScriptTag(TAGS.arch)]],
  ]);
  const scripts: ScriptSource = {
    read: (tagId) => {
      const path = byTag.get(tagId);
      if (!path) {
        return;
      }
      // the chunk padded to a word, then each referenced tag as a word
      const chunk = compiled.chunkFor(path);
      const padded = Math.ceil(chunk.length / 4) * 4;
      const tags = refs.get(tagId) ?? [];
      const out = new Uint8Array(padded + tags.length * 4);
      out.set(chunk);
      const view = new DataView(out.buffer);
      tags.forEach((ref, i) => {
        view.setUint32(padded + i * 4, Number.parseInt(ref, 16));
      });
      return out;
    },
    schema: (tagId) => {
      const path = byTag.get(tagId);
      return path === undefined
        ? undefined
        : compiled.compiledDecl(path).schema;
    },
    tags: () => [...byTag.keys()],
  };
  const bundles: ActivityBundleTag[] = [
    {
      bundle: BUNDLE_A,
      rows: [
        squad("sq_p1", SQ_P1),
        squad("sq_p2", SQ_P2),
        { ...row("obj_p2", Objective, OBJ_P2), tasks: [] },
        row("tmr_p2", Timer, TMR_P2),
        { ...row("arch", Encounter, ARCH), childScript: "wipe_arch" },
        squad("arch._squad", ARCH_SQUAD),
        row("hard_wipe_globals", HardWipeGlobals, HARD_WIPE_GLOBALS),
      ],
      tag: TAG_A,
    },
    { bundle: BUNDLE_B, rows: [squad("sq_e", SQ_E)], tag: TAG_B },
    { bundle: BUNDLE_C, rows: [], tag: TAG_C },
  ];
  return { bundles, scripts };
}

function start(characters: readonly string[] = ["a"]) {
  const { bundles, scripts } = project();
  const changes: ItemChange[] = [];
  const cleared: ItemRef[] = [];
  const log: string[] = [];
  const runtime = new ScriptRuntime({
    bundles,
    clock: { activityTicks: () => 0 },
    log: (line) => log.push(line),
    onItemChange: (change) => changes.push(change),
    onItemsCleared: (items) => cleared.push(...items),
    players: () =>
      characters.map((characterKey) => ({
        characterKey,
        powerLevel: undefined,
        ready: true,
      })),
    scriptFor: (tag) =>
      ({ [TAG_A]: TAGS.root, [TAG_B]: TAGS.placer, [TAG_C]: TAGS.quiet })[tag],
    scripts,
    squadPlacedByDefault: () => false,
    tickSeconds: 1,
  });
  runtime.start();
  runtime.reportPlayerSpawned();
  const tickUntil = (done: () => boolean, max = 20) => {
    for (let i = 0; i < max && !done(); i++) {
      runtime.tick();
    }
    expect(done()).toBe(true);
  };
  const lastSquad = (bundle: number, typeIndex: number): SquadState => {
    const found = changes
      .filter(
        (change) =>
          change.kind === "squad" &&
          change.item.bundle === bundle &&
          change.item.typeIndex === typeIndex
      )
      .at(-1);
    if (found?.kind !== "squad") {
      throw new Error(`squad ${bundle}:${typeIndex} was never written`);
    }
    return found.state;
  };
  const printed = (text: string) =>
    runtime.trace.filter((line) => line === `print ${text}`).length;
  // the second phase running, its encounters and archetype up
  const reachPhase2 = () =>
    tickUntil(
      () =>
        runtime.phaseIndex === 1 &&
        changes.some(
          (change) =>
            change.kind === "squad" &&
            change.item.bundle === BUNDLE_B &&
            change.state.bodies === 1
        )
    );
  return {
    changes,
    cleared,
    lastSquad,
    log,
    printed,
    reachPhase2,
    runtime,
    tickUntil,
  };
}

describe("a hard wipe's armed phase", () => {
  it("follows the running phase", () => {
    const { reachPhase2, runtime, tickUntil } = start();
    expect(runtime.phases.map((phase) => phase.hardWipe)).toEqual([
      false,
      true,
    ]);
    expect(runtime.hardWipeArmed).toBe(false);
    tickUntil(() => runtime.phaseIndex === 1);
    expect(runtime.hardWipeArmed).toBe(true);
    reachPhase2();
    expect(runtime.hardWipeArmed).toBe(true);
  });

  it("is not armed once no phase runs", () => {
    const { runtime } = start();
    runtime.phaseIndex = -1;
    expect(runtime.hardWipeArmed).toBe(false);
  });
});

describe("the hard wipe row", () => {
  const enabled = (changes: readonly ItemChange[]) =>
    changes.flatMap((change) =>
      change.kind === "hardWipeGlobals" ? [change.state.enabled] : []
    );

  it("says armed as an armed phase starts and disarmed as it is left", () => {
    const { changes, reachPhase2, runtime, tickUntil } = start();
    // the first phase is not armed, and the row starts so
    tickUntil(() => runtime.phaseIndex === 1);
    expect(enabled(changes)).toEqual([true]);
    reachPhase2();
    // starting the phase again says nothing new
    runtime.resetCurrentPhase();
    expect(enabled(changes)).toEqual([true]);
    jumpToPhase(runtime, 0);
    expect(enabled(changes)).toEqual([true, false]);
  });
});

describe("every player dead", () => {
  it("needs a player, and all of them dead", () => {
    const { runtime } = start(["a", "b"]);
    expect(runtime.allPlayersDead).toBe(false);
    runtime.reportPlayerDied("a");
    expect(runtime.allPlayersDead).toBe(false);
    runtime.reportPlayerDied("b");
    expect(runtime.allPlayersDead).toBe(true);
    runtime.reportPlayerRespawned("a");
    expect(runtime.allPlayersDead).toBe(false);
  });

  it("is false with nobody in the activity", () => {
    const { runtime } = start([]);
    expect(runtime.allPlayersDead).toBe(false);
  });
});

describe("resetting the running phase", () => {
  it("puts back the squads, objective and timer the phase wrote", () => {
    const { changes, cleared, lastSquad, reachPhase2, runtime } = start();
    reachPhase2();
    expect(lastSquad(BUNDLE_A, SQ_P2).bodies).toBe(1);
    expect(lastSquad(BUNDLE_A, ARCH_SQUAD).bodies).toBe(1);
    const mark = changes.length;
    runtime.resetCurrentPhase();
    const after = changes.slice(mark);
    // a squad that was reserved empty comes back empty, in a new wave so the
    // client drops what stood
    expect(lastSquad(BUNDLE_A, SQ_P2)).toMatchObject({ bodies: 0, wave: 1 });
    expect(lastSquad(BUNDLE_A, ARCH_SQUAD).bodies).toBe(0);
    expect(runtime.itemState.bodiesFor(BUNDLE_A, SQ_P2)).toBe(0);
    // an objective nothing had written is back to idle, its counter past the
    // one the client has
    expect(after.find((change) => change.kind === "objective")?.state).toEqual({
      slots: [],
      unk1: 1,
    });
    // a row with no state of its own to put back is handed to the sink
    expect(cleared).toEqual([
      { bundle: BUNDLE_A, typeId: Timer, typeIndex: TMR_P2 },
    ]);
  });

  it("leaves a row the phase did not touch alone", () => {
    const { changes, lastSquad, reachPhase2, runtime } = start();
    reachPhase2();
    expect(lastSquad(BUNDLE_A, SQ_P1).bodies).toBe(1);
    const mark = changes.length;
    runtime.resetCurrentPhase();
    expect(
      changes
        .slice(mark)
        .some(
          (change) =>
            change.item.bundle === BUNDLE_A && change.item.typeIndex === SQ_P1
        )
    ).toBe(false);
    expect(lastSquad(BUNDLE_A, SQ_P1).bodies).toBe(1);
  });

  it("stops the phase's threads, its archetypes' and the encounter that wrote, and starts them over", () => {
    const { printed, reachPhase2, runtime, tickUntil } = start();
    reachPhase2();
    expect(printed("m2 main")).toBe(1);
    expect(printed("arch main")).toBe(1);
    expect(printed("placer main")).toBe(1);
    const before = [...runtime.scheduler.threads];
    const oldPhase = runtime.phases[1].instance;
    runtime.resetCurrentPhase();
    // none of the threads that ran for them resumes
    const quiet = runtime.instances.get("enc_quiet");
    expect(quiet).toBeDefined();
    const survivors = before.filter((thread) =>
      runtime.scheduler.threads.includes(thread)
    );
    expect(survivors.map((t) => runtime.threadOwners.get(t))).toEqual([quiet]);
    expect(runtime.phases[1].instance).not.toBe(oldPhase);
    expect(runtime.instances.get("act_w_mission2")).toBe(
      runtime.phases[1].instance
    );
    tickUntil(() => printed("placer main") === 2);
    expect(printed("m2 init")).toBe(2);
    expect(printed("m2 main")).toBe(2);
    expect(printed("arch main")).toBe(2);
    // and what it did not write is not touched
    expect(printed("quiet main")).toBe(1);
    expect(printed("m1 main")).toBe(1);
    // the phase's scalars begin again, not on from where they were
    expect(runtime.phases[1].instance.get("starts")).toBe(1);
  });

  it("drops the incident handlers the phase armed, running or about to", () => {
    const { printed, reachPhase2, runtime, tickUntil } = start();
    reachPhase2();
    // a handler thread started and not yet run, when the wipe comes
    runtime.notePlayerJoined("c");
    expect(
      runtime.scheduler.threads.some((thread) =>
        thread.name.startsWith("incident_handler")
      )
    ).toBe(true);
    runtime.resetCurrentPhase();
    expect(
      runtime.scheduler.threads.some((thread) =>
        thread.name.startsWith("incident_handler")
      )
    ).toBe(false);
    tickUntil(() => printed("m2 main") === 2);
    expect(printed("joined handler")).toBe(0);
    // the old phase's listener hears nothing: one listener, one handler
    runtime.notePlayerJoined("c");
    runtime.tick();
    expect(printed("joined handler")).toBe(1);
  });

  it("runs the restarted encounter's placement again", () => {
    const { changes, lastSquad, reachPhase2, runtime, tickUntil } = start();
    reachPhase2();
    runtime.resetCurrentPhase();
    expect(lastSquad(BUNDLE_B, SQ_E).bodies).toBe(0);
    const mark = changes.length;
    tickUntil(() => lastSquad(BUNDLE_B, SQ_E).bodies === 1);
    expect(changes.length).toBeGreaterThan(mark);
    expect(runtime.phaseIndex).toBe(1);
  });

  it("can reset again, to the state the last reset began from", () => {
    const { lastSquad, reachPhase2, runtime, tickUntil } = start();
    reachPhase2();
    runtime.resetCurrentPhase();
    tickUntil(() => lastSquad(BUNDLE_A, SQ_P2).bodies === 1);
    runtime.resetCurrentPhase();
    expect(lastSquad(BUNDLE_A, SQ_P2)).toMatchObject({ bodies: 0, wave: 2 });
    tickUntil(() => lastSquad(BUNDLE_A, SQ_P2).bodies === 1);
    expect(runtime.phaseIndex).toBe(1);
  });

  it("forgets what the client said of a row it put back", () => {
    const { reachPhase2, runtime } = start();
    reachPhase2();
    runtime.reportSquadAlive({ bundle: BUNDLE_A, typeIndex: SQ_P2 }, 1);
    runtime.reportPlayerMonitor({ bundle: BUNDLE_A, typeIndex: SQ_P2 }, 3);
    expect(runtime.world.at(`${BUNDLE_A.toString(16)}:${SQ_P2}`)).toMatchObject(
      { squadAlive: 1 }
    );
    runtime.resetCurrentPhase();
    const record = runtime.world.at(`${BUNDLE_A.toString(16)}:${SQ_P2}`);
    expect(record?.squadAlive).toBeUndefined();
    // a player standing in a volume still stands in it
    expect(record?.monitorCount).toBe(3);
  });

  it("keeps the phase armed and the progress where it was", () => {
    const { reachPhase2, runtime } = start();
    reachPhase2();
    runtime.resetCurrentPhase();
    expect(runtime.phaseIndex).toBe(1);
    expect(runtime.hardWipeArmed).toBe(true);
    expect(runtime.phaseCompleting).toBe(false);
  });

  it("refuses with no phase running", () => {
    const { runtime } = start();
    runtime.phaseIndex = -1;
    expect(() => runtime.resetCurrentPhase()).toThrow(/no mission phase/);
  });
});

describe("leaving a phase by a jump", () => {
  it("stops the phase and builds it again, so the activity can come back to it", () => {
    const { printed, reachPhase2, runtime, tickUntil } = start();
    reachPhase2();
    const left = runtime.phases[1].instance;
    jumpToPhase(runtime, 0);
    expect(runtime.phaseIndex).toBe(0);
    expect(runtime.phases[1].instance).not.toBe(left);
    expect(
      runtime.scheduler.threads.some(
        (thread) => runtime.threadOwners.get(thread) === left
      )
    ).toBe(false);
    tickUntil(() => printed("m1 main") === 2);
    jumpToPhase(runtime, 1);
    tickUntil(() => printed("arch main") === 2);
    expect(runtime.phases[1].instance.get("starts")).toBe(1);
  });
});
