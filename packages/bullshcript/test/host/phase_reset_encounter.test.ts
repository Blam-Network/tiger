// A hard wipe restarts the encounters that wrote beside the armed phase from
// their start, so the rows they own go back to how the host started them:
// the ones they placed before the phase began and the ones the phase left
// alone, not only the ones written since. What the host holds of those rows
// goes with them, so the restarted threads place and seat them afresh.
import { describe, expect, it } from "vitest";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import {
  formatScriptTag,
  type ScriptSource,
} from "../../src/hks/source/script_source.ts";
import type {
  ItemChange,
  ItemRef,
  SquadState,
} from "../../src/host/state/items.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";
import type { ActivityBundleTag } from "../../src/host/tags/tag_types.ts";
import { ScriptRuntime } from "../../src/versions/destiny1/v52553_16_09_28_1551_evil/host/runtime.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v52553_16_09_28_1551_evil/host/tag_types.ts";

const { Actor, HardWipeGlobals, Object: ObjectRow, Passenger, Squad } =
  ActivityBundleItemType;

const FILES = {
  root: { path: "es/test/act_c/act_c.es", text: "int unused = 0\n" },
  // places a squad the second phase takes away again
  mission1: {
    path: "es/test/act_c/act_c_mission1.esp",
    text: [
      "squad sq_pre",
      "",
      "script init(): pass",
      "",
      "script main():",
      "    sq_pre.place()",
      "",
    ].join("\n"),
  },
  mission2: {
    path: "es/test/act_c/act_c_mission2.esp",
    text: [
      "@hard_wipe()",
      "squad sq_pre",
      "squad sq_shared",
      "",
      "script init(): pass",
      "",
      "script main():",
      '    print("m2 main")',
      "    sq_pre.remove()",
      "    sq_shared.place()",
      "    sleep(1000)",
      "",
    ].join("\n"),
  },
  // Seats its boss in the chains before the second phase starts; during it,
  // places more squads and lets the boss go.
  chains: {
    path: "es/test/act_c/enc_chains.es",
    text: [
      "squad sq_boss",
      "squad_member sq_boss__ogre",
      "passenger chains_seat",
      "squad sq_add",
      "squad sq_shared",
      "object o_door",
      "",
      "@startup()",
      "script sc_main():",
      '    print("chains main")',
      "    if sq_boss.alive_count() == 0:",
      '        print("boss unplaced")',
      "    if sq_boss__ogre.is_bound() == false:",
      '        print("ogre unbound")',
      "    o_door.create()",
      "    sq_shared.place()",
      "    sq_boss.place()",
      '    sq_boss.activate_temperament("held")',
      "    chains_seat.seat(sq_boss__ogre)",
      "",
      "@startup()",
      "script sc_fight():",
      "    sleep(6)",
      '    print("chains fight")',
      "    sq_add.place()",
      "    sq_shared.place()",
      "    chains_seat.release()",
      '    sq_boss.deactivate_temperament("held")',
      "    sleep(1000)",
      "",
    ].join("\n"),
  },
  // writes the boss squad once, before the phase, and nothing after
  watch: {
    path: "es/test/act_c/enc_watch.es",
    text: [
      "squad sq_boss",
      "",
      "@startup()",
      "script sc_watch():",
      '    print("watch main")',
      "    sq_boss.place()",
      "",
    ].join("\n"),
  },
};

const TAGS = {
  chains: 0x80ab_0204,
  mission1: 0x80ab_0202,
  mission2: 0x80ab_0203,
  root: 0x80ab_0201,
  watch: 0x80ab_0205,
};
const BUNDLE_A = 0x1111_0a01;
const BUNDLE_D = 0x1111_0d04;
const BUNDLE_E = 0x1111_0e05;
const TAG_A = 0x80ab_0a01;
const TAG_D = 0x80ab_0d04;
const TAG_E = 0x80ab_0e05;

const SQ_PRE = 1;
const HARD_WIPE_GLOBALS = 2;
const SQ_BOSS = 1;
const OGRE = 1;
const SEAT = 1;
const SQ_ADD = 2;
const SQ_SHARED = 3;
const DOOR = 1;

const squad = (name: string, typeIndex: number, cells: number[] = [1]) => ({
  cells,
  memberCount: cells.length,
  memberNames: cells.map(() => fnv1("grunt")),
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
      formatScriptTag(TAGS[name as keyof typeof TAGS]),
      FILES[name].path,
    ])
  );
  const refs = new Map([
    [
      formatScriptTag(TAGS.root),
      [formatScriptTag(TAGS.mission1), formatScriptTag(TAGS.mission2)],
    ],
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
        squad("sq_pre", SQ_PRE),
        row("hard_wipe_globals", HardWipeGlobals, HARD_WIPE_GLOBALS),
      ],
      tag: TAG_A,
    },
    {
      bundle: BUNDLE_D,
      rows: [
        // a boss whose one cell is a named member
        squad("sq_boss", SQ_BOSS, [0]),
        row("sq_boss__ogre", Actor, OGRE),
        row("chains_seat", Passenger, SEAT),
        row("o_door", ObjectRow, DOOR),
        squad("sq_add", SQ_ADD),
        squad("sq_shared", SQ_SHARED),
      ],
      tag: TAG_D,
    },
    { bundle: BUNDLE_E, rows: [], tag: TAG_E },
  ];
  return { bundles, scripts };
}

function start() {
  const { bundles, scripts } = project();
  const changes: ItemChange[] = [];
  const cleared: ItemRef[] = [];
  const runtime = new ScriptRuntime({
    bundles,
    clock: { activityTicks: () => 0 },
    onItemChange: (change) => changes.push(change),
    onItemsCleared: (items) => cleared.push(...items),
    scriptFor: (tag) =>
      ({
        [TAG_A]: TAGS.root,
        [TAG_D]: TAGS.chains,
        [TAG_E]: TAGS.watch,
      })[tag],
    scripts,
    squadPlacedByDefault: () => false,
    tickSeconds: 1,
  });
  runtime.start();
  runtime.reportPlayerSpawned();
  const tickUntil = (done: () => boolean, max = 30) => {
    for (let i = 0; i < max && !done(); i++) {
      runtime.tick();
    }
    expect(done()).toBe(true);
  };
  const printed = (text: string) =>
    runtime.trace.filter((line) => line === `print ${text}`).length;
  // every change sent of a row, oldest first
  const sent = <K extends ItemChange["kind"]>(
    kind: K,
    bundle: number,
    typeIndex: number
  ) =>
    changes
      .filter(
        (change): change is Extract<ItemChange, { kind: K }> =>
          change.kind === kind &&
          change.item.bundle === bundle &&
          change.item.typeIndex === typeIndex
      )
      .map((change) => change.state);
  const last = <K extends ItemChange["kind"]>(
    kind: K,
    bundle: number,
    typeIndex: number
  ) => {
    const states = sent(kind, bundle, typeIndex);
    const found = states.at(-1);
    if (found === undefined) {
      throw new Error(`${kind} ${bundle}:${typeIndex} was never written`);
    }
    return found;
  };
  // the second phase running and the fight under way
  const reachFight = () => {
    tickUntil(() => printed("chains fight") === 1);
    expect(runtime.phaseIndex).toBe(1);
  };
  // What the host holds of a squad is what it last sent, so nothing is left
  // placed on the host that the client was not told of.
  const heldSquad = (bundle: number, typeIndex: number): SquadState =>
    JSON.parse(
      JSON.stringify(runtime.itemState.squad({ bundle, typeId: Squad, typeIndex }))
    );
  const sentSquad = (bundle: number, typeIndex: number): SquadState => {
    const { initial: _, ...state } = {
      ...last("squad", bundle, typeIndex),
    } as SquadState & { initial?: boolean };
    return JSON.parse(JSON.stringify(state));
  };
  return {
    changes,
    cleared,
    heldSquad,
    last,
    printed,
    reachFight,
    runtime,
    sent,
    sentSquad,
    tickUntil,
  };
}

const BOSS = { bundle: BUNDLE_D, typeIndex: SQ_BOSS };
const OWNED_SQUADS = [SQ_BOSS, SQ_ADD, SQ_SHARED];

describe("a restarted encounter's rows", () => {
  it("run the fight as the test expects before the wipe", () => {
    const { last, printed, reachFight, runtime } = start();
    reachFight();
    expect(printed("boss unplaced")).toBe(1);
    expect(printed("ogre unbound")).toBe(1);
    expect(last("squad", BUNDLE_D, SQ_BOSS)).toMatchObject({
      bodies: 1,
      wave: 0,
    });
    expect(last("squad", BUNDLE_D, SQ_ADD).bodies).toBe(1);
    expect(last("actor", BUNDLE_D, OGRE)).toMatchObject({ placed: true });
    expect(last("passenger", BUNDLE_D, SEAT)).toEqual({ state: 2 });
    expect(runtime.phases[1].hardWipe).toBe(true);
  });

  it("go back to untouched, the ones placed before the phase and the ones placed in it", () => {
    const { changes, cleared, heldSquad, last, reachFight, runtime, sentSquad } =
      start();
    reachFight();
    runtime.reportSquadAlive(BOSS, 1);
    const mark = changes.length;
    runtime.resetCurrentPhase();
    const restore = changes.slice(mark);
    // the boss was placed before the phase began and the fight never touched
    // him: his squad, his actor and his seat go all the same, in a new wave
    for (const typeIndex of OWNED_SQUADS) {
      expect(last("squad", BUNDLE_D, typeIndex)).toMatchObject({
        bodies: 0,
        carried: false,
        wave: 1,
      });
    }
    expect(last("actor", BUNDLE_D, OGRE)).toMatchObject({ placed: false });
    // a seat has no state to put back: it is handed to the sink
    expect(cleared).toContainEqual({
      bundle: BUNDLE_D,
      typeId: Passenger,
      typeIndex: SEAT,
    });
    // the door is a new object, absent, in a generation past the one created
    expect(last("object", BUNDLE_D, DOOR)).toMatchObject({
      incarnation: 2,
      present: false,
    });
    // the unplaced squads' temperaments are not carried over
    expect(last("squad", BUNDLE_D, SQ_BOSS).temperaments).toBeUndefined();
    // all of it out before the call returns, with the phase's own squad
    expect(restore.map((change) => change.kind).sort()).toEqual([
      "actor",
      "object",
      "squad",
      "squad",
      "squad",
      "squad",
    ]);
    // the host holds what it sent, and nothing the client was not told of
    for (const typeIndex of OWNED_SQUADS) {
      expect(heldSquad(BUNDLE_D, typeIndex)).toEqual(
        sentSquad(BUNDLE_D, typeIndex)
      );
    }
    expect(runtime.itemState.bodiesFor(BUNDLE_D, SQ_BOSS)).toBe(0);
    // what the client said of the boss is of a world that is gone
    expect(runtime.world.at(`${BUNDLE_D.toString(16)}:${SQ_BOSS}`)).toEqual({});
  });

  it("are placed and seated again by the restarted startup, past everything sent before", () => {
    const { last, printed, reachFight, runtime, sent, tickUntil } = start();
    reachFight();
    // the client says Phogoth stands
    runtime.reportSquadAlive(BOSS, 1);
    const wave = (typeIndex: number) =>
      Math.max(...sent("squad", BUNDLE_D, typeIndex).map((s) => s.wave));
    const doors = sent("object", BUNDLE_D, DOOR).map((s) => s.incarnation);
    const waves = OWNED_SQUADS.map(wave);
    runtime.resetCurrentPhase();
    tickUntil(() => printed("chains main") === 2);
    // the boss reads as unplaced to the restarted thread, as at a fresh start
    expect(printed("boss unplaced")).toBe(2);
    expect(printed("ogre unbound")).toBe(2);
    expect(last("squad", BUNDLE_D, SQ_BOSS)).toMatchObject({
      bodies: 1,
      carried: false,
      temperaments: [fnv1("held")],
    });
    expect(last("actor", BUNDLE_D, OGRE)).toMatchObject({ placed: true });
    // seated again, after the seat was let go
    expect(sent("passenger", BUNDLE_D, SEAT).map((s) => s.state)).toEqual([
      1, 2, 1,
    ]);
    // the door comes back as a newer object than any sent before
    const created = sent("object", BUNDLE_D, DOOR).at(-1);
    expect(created).toMatchObject({ present: true });
    expect(created?.incarnation).toBeGreaterThan(Math.max(...doors));
    // the squads that stand again are in a wave past every one sent before
    for (const [i, typeIndex] of [SQ_BOSS, SQ_SHARED].entries()) {
      expect(last("squad", BUNDLE_D, typeIndex)).toMatchObject({ bodies: 1 });
      expect(wave(typeIndex)).toBeGreaterThan(waves[i === 0 ? 0 : 2]);
    }
    // the fight happens again
    tickUntil(() => printed("chains fight") === 2);
    expect(last("squad", BUNDLE_D, SQ_ADD)).toMatchObject({ bodies: 1 });
    expect(wave(SQ_ADD)).toBeGreaterThan(waves[1]);
    expect(last("passenger", BUNDLE_D, SEAT)).toEqual({ state: 2 });
  });

  it("go out before the restarted threads or the phase send anything", () => {
    const { changes, printed, reachFight, runtime, tickUntil } = start();
    reachFight();
    const ran = {
      chains: printed("chains main"),
      mission: printed("m2 main"),
    };
    const mark = changes.length;
    runtime.resetCurrentPhase();
    const restore = changes.slice(mark);
    // when it returns, no thread has run: nothing is placed, only taken away
    expect(printed("chains main")).toBe(ran.chains);
    expect(printed("m2 main")).toBe(ran.mission);
    expect(restore.length).toBeGreaterThan(0);
    for (const change of restore) {
      if (change.kind === "squad") {
        expect(change.state.bodies ?? 0).toBeLessThanOrEqual(
          // the phase's squad goes back to the body it had at the phase start
          change.item.bundle === BUNDLE_A ? 1 : 0
        );
      }
      if (change.kind === "actor") {
        expect(change.state.placed).toBe(false);
      }
      if (change.kind === "object") {
        expect(change.state.present).toBe(false);
      }
    }
    // the next ticks run them, and what they send follows
    tickUntil(
      () => printed("chains main") === ran.chains + 1 && printed("m2 main") > 0
    );
    const after = changes.slice(mark + restore.length);
    expect(after.some((change) => change.kind === "squad")).toBe(true);
    expect(
      after.some(
        (change) => change.kind === "squad" && (change.state.bodies ?? 0) > 0
      )
    ).toBe(true);
    // nothing was sent in between, so the order of the log is the order sent
    expect(changes.slice(mark, mark + restore.length)).toEqual(restore);
  });

  it("leave a row only the phase wrote at its phase-start image", () => {
    const { last, reachFight, runtime, tickUntil, printed } = start();
    reachFight();
    // placed by the first phase, taken away by the second
    expect(last("squad", BUNDLE_A, SQ_PRE).bodies).toBe(0);
    runtime.resetCurrentPhase();
    expect(last("squad", BUNDLE_A, SQ_PRE)).toMatchObject({
      bodies: 1,
      wave: 1,
    });
    expect(runtime.itemState.bodiesFor(BUNDLE_A, SQ_PRE)).toBe(1);
    // and the phase takes it away again as it starts over
    tickUntil(() => printed("m2 main") === 2);
    expect(last("squad", BUNDLE_A, SQ_PRE).bodies).toBe(0);
  });

  it("take the encounter's rule when the phase wrote them too", () => {
    const { last, reachFight, runtime } = start();
    reachFight();
    // placed before the phase by the encounter, in the phase by both
    expect(last("squad", BUNDLE_D, SQ_SHARED).bodies).toBe(1);
    runtime.resetCurrentPhase();
    // not the phase-start body: the encounter starts from its start
    expect(last("squad", BUNDLE_D, SQ_SHARED)).toMatchObject({
      bodies: 0,
      wave: 1,
    });
  });

  it("are forgotten by the handles of encounters that outlive the wipe", () => {
    const { reachFight, runtime } = start();
    reachFight();
    const watch = runtime.instances.get("enc_watch");
    const handle = runtime.objects.find(
      (bound) =>
        bound.row?.typeIndex === SQ_BOSS &&
        bound.row.bundle === BUNDLE_D &&
        runtime.ownership.ownerOfObject(bound) === watch
    );
    expect(handle?.squad.desiredBodies).toBe(1);
    runtime.resetCurrentPhase();
    // the encounter that placed the boss ran only before the phase, and is not
    // restarted: its handle outlives the wipe, but not what it remembered
    expect(runtime.objects).toContain(handle);
    expect(handle?.squad.desiredBodies).toBe(0);
  });

  it("restart again from the same start", () => {
    const { last, printed, reachFight, runtime, tickUntil } = start();
    reachFight();
    runtime.resetCurrentPhase();
    tickUntil(() => printed("chains fight") === 2);
    runtime.resetCurrentPhase();
    expect(last("squad", BUNDLE_D, SQ_BOSS)).toMatchObject({
      bodies: 0,
      wave: 2,
    });
    expect(last("actor", BUNDLE_D, OGRE)).toMatchObject({ placed: false });
    tickUntil(() => printed("chains main") === 3);
    expect(printed("boss unplaced")).toBe(3);
    expect(last("squad", BUNDLE_D, SQ_BOSS).bodies).toBe(1);
  });
});
