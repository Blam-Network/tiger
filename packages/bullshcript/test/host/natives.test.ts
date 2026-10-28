import { describe, expect, it } from "vitest";
import type { LuaHostObject } from "../../src/hks/env/host_env.ts";
import { LuaHostFunction, type LuaValue } from "../../src/hks/vm/values.ts";
import {
  type BoundRow,
  squadRosterSize,
} from "../../src/host/bound/bindings.ts";
import { CommandScriptBuilder } from "../../src/host/natives/command_script.ts";
import { registerIncidentMetadata } from "../../src/host/natives/incident_natives.ts";
import {
  BoundInstance,
  type HostContext,
  ItemWriter,
  type KillFilterDetails,
  type RowFacts,
  registerBoundObject,
  resolveStringHash,
} from "../../src/host/natives/natives.ts";
import { ScriptItemState } from "../../src/host/state/item_state.ts";
import {
  type ActorState,
  type ItemChange,
  type ObjectiveState,
  PlayerObjectiveStage,
  type PlayerObjectiveState,
  type ScoreboardDefinition,
} from "../../src/host/state/items.ts";
import { itemKey } from "../../src/host/tags/item_key.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/tag_types.ts";

const BUNDLE = 0x1234;

function makeObjective() {
  const changes: ItemChange[] = [];
  const trace: string[] = [];
  let ticks = 0;
  const context: HostContext = {
    types: ActivityBundleItemType,
    activityFlagChanged: () => undefined,
    clock: { activityTicks: () => ticks },
    currentInstance: () => undefined,
    log: () => undefined,
    namedHandles: new Map(),
    noteRowRead: () => undefined,
    objectStates: new Map(),
    placeActors: false,
    players: () => [],
    playerSensor: () => undefined,
    reports: {
      actorBound: () => undefined,
      actorCommandScript: () => undefined,
      actorDropAck: () => undefined,
      actorStanding: () => undefined,
      bubbleOccupied: () => undefined,
      health: () => undefined,
      objectAlive: () => undefined,
      objectiveCount: () => undefined,
      playerMonitorCount: () => undefined,
      safeZoneInside: () => undefined,
      squadAliveCount: () => undefined,
      squadCombatCount: () => undefined,
      triggerFired: () => false,
    },
    runHandler: () => undefined,
    sink: (change) => changes.push(change),
    state: new ScriptItemState(),
    time: () => 0,
    trace,
  };
  const row: BoundRow = {
    bundle: BUNDLE,
    name: "po_event_countdown",
    typeId: ActivityBundleItemType.PlayerObjective,
    typeIndex: 47,
  };
  const bound = new BoundInstance(
    context,
    new ItemWriter(context),
    "po_event_countdown",
    row,
    {
      navPointPosition: () => undefined,
      owningSquad: () => undefined,
      resolveByIdentifier: () => undefined,
      roster: () => 1,
    }
  );
  registerBoundObject(bound);
  const call = (method: string, ...args: LuaValue[]) => {
    const fn = bound.object.get(method);
    if (!(fn instanceof LuaHostFunction)) {
      throw new Error(`${method} did not resolve to a host function`);
    }
    return fn.callback([bound.object, ...args], {
      name: method,
      requestYield: () => undefined,
    })?.[0];
  };
  const last = () =>
    (changes.at(-1) as { state: PlayerObjectiveState } | undefined)?.state;
  const tick = (seconds: number) => {
    ticks += seconds * 30;
    bound.advance(seconds);
  };
  return { call, last, tick };
}

describe("a player objective's countdown", () => {
  // u_event_countdown loads its setup timer, starts it and polls it every
  // second; complete on the first poll, the public event failed at once.
  it("is complete only once started and run down", () => {
    const { call, tick } = makeObjective();
    expect(call("timer_is_complete")).toBe(false);
    call("timer_activate", 3);
    tick(5);
    expect(call("timer_is_complete")).toBe(false);
    call("timer_start");
    tick(2);
    expect(call("timer_is_complete")).toBe(false);
    expect(call("timer_get_current")).toBe(1);
    tick(1);
    expect(call("timer_is_complete")).toBe(true);
  });

  it("holds its time while paused and forgets it when cleared", () => {
    const { call, tick } = makeObjective();
    call("timer_activate", 10);
    call("timer_start");
    tick(4);
    call("timer_pause");
    tick(20);
    expect(call("timer_get_current")).toBe(6);
    expect(call("timer_is_complete")).toBe(false);
    call("timer_clear");
    expect(call("timer_is_complete")).toBe(false);
  });

  it("goes out with the objective", () => {
    const { call, last, tick } = makeObjective();
    call("set_incoming");
    expect(last()?.countdown).toBeUndefined();
    call("timer_activate", 55);
    expect(last()?.countdown).toEqual({
      at: 0,
      duration: 55,
      remaining: 55,
      running: false,
    });
    tick(5);
    call("timer_start");
    expect(last()).toMatchObject({
      countdown: { at: 150, remaining: 55, running: true },
      state: PlayerObjectiveStage.Incoming,
    });
    call("timer_clear");
    expect(last()?.countdown).toBeUndefined();
  });

  // A public event's line only shows for a participant: shown, the solo
  // player (activity player index 0) takes part.
  it("counts the solo player in while shown", () => {
    const { call, last } = makeObjective();
    call("set_incoming");
    expect(last()?.participants).toBe(1);
    call("clear");
    expect(last()?.participants).toBeUndefined();
  });
});

describe("a player objective's stage", () => {
  it("follows the verbs, and is active only while active", () => {
    const { call, last } = makeObjective();
    const verbs: [string, PlayerObjectiveStage][] = [
      ["activate", PlayerObjectiveStage.Incoming],
      ["set_incoming", PlayerObjectiveStage.Incoming],
      ["set_active", PlayerObjectiveStage.Active],
      ["set_complete", PlayerObjectiveStage.Complete],
      ["set_failed", PlayerObjectiveStage.Failed],
    ];
    for (const [verb, stage] of verbs) {
      call(verb);
      expect(last()).toMatchObject({ participants: 1, state: stage });
      expect(call("is_active")).toBe(stage === PlayerObjectiveStage.Active);
    }
  });

  it("completes a public event with its tier", () => {
    const { call, last } = makeObjective();
    call("set_active");
    call("set_public_event_tier", 2);
    expect(last()).toMatchObject({
      state: PlayerObjectiveStage.Active,
      tier: 2,
    });
    call("set_complete");
    expect(last()).toMatchObject({
      participants: 1,
      state: PlayerObjectiveStage.Complete,
      tier: 2,
    });
  });

  it("starts clean after clear", () => {
    const { call, last } = makeObjective();
    call("set_active");
    call("set_public_event_tier", 3);
    call("progress_activate", 0, 5);
    call("timer_activate", 30);
    call("clear");
    expect(last()).toMatchObject({
      countdown: undefined,
      participants: undefined,
      progress: undefined,
      state: PlayerObjectiveStage.None,
      tier: undefined,
    });
    expect(call("is_active")).toBe(false);
    call("set_incoming");
    expect(last()).toMatchObject({
      countdown: undefined,
      progress: undefined,
      state: PlayerObjectiveStage.Incoming,
      tier: undefined,
    });
  });
});

// Both resolve to a NavPoint's position, a Squad's spawn point or an Object's
// placement, whichever the item is.
function makeWaypointObjective() {
  const changes: ItemChange[] = [];
  const context: HostContext = {
    types: ActivityBundleItemType,
    activityFlagChanged: () => undefined,
    clock: { activityTicks: () => 0 },
    currentInstance: () => undefined,
    log: () => undefined,
    namedHandles: new Map(),
    noteRowRead: () => undefined,
    objectStates: new Map(),
    placeActors: false,
    players: () => [],
    playerSensor: () => undefined,
    reports: {
      actorBound: () => undefined,
      actorCommandScript: () => undefined,
      actorDropAck: () => undefined,
      actorStanding: () => undefined,
      bubbleOccupied: () => undefined,
      health: () => undefined,
      objectAlive: () => undefined,
      objectiveCount: () => undefined,
      playerMonitorCount: () => undefined,
      safeZoneInside: () => undefined,
      squadAliveCount: () => undefined,
      squadCombatCount: () => undefined,
      triggerFired: () => false,
    },
    runHandler: () => undefined,
    sink: (change) => changes.push(change),
    state: new ScriptItemState(),
    time: () => 0,
    trace: [],
  };
  const squadSpawn = { x: 1, y: 2, z: 3 };
  const objectPlacement = { x: 10, y: 20, z: 30 };
  const bakedNav = { x: 100, y: 200, z: 300 };
  const rows: RowFacts = {
    navPointPosition: (row) =>
      row.typeId === ActivityBundleItemType.NavPoint ? bakedNav : undefined,
    objectPosition: (row) =>
      row.typeId === ActivityBundleItemType.Object
        ? objectPlacement
        : undefined,
    owningSquad: () => undefined,
    resolveByIdentifier: () => undefined,
    roster: () => 1,
    squadSpawnPoint: (row) =>
      row.typeId === ActivityBundleItemType.Squad ? squadSpawn : undefined,
  };
  const writer = new ItemWriter(context);
  const bind = (row: BoundRow) =>
    registerBoundObject(
      new BoundInstance(context, writer, row.name, row, rows)
    );
  const objective = bind({
    bundle: BUNDLE,
    name: "po_event_countdown",
    typeId: ActivityBundleItemType.PlayerObjective,
    typeIndex: 47,
  });
  const squad = bind({
    bundle: BUNDLE,
    name: "_squad",
    typeId: ActivityBundleItemType.Squad,
    typeIndex: 4,
  });
  const object = bind({
    bundle: BUNDLE,
    name: "o_vex_block",
    typeId: ActivityBundleItemType.Object,
    typeIndex: 6,
  });
  const navPoint = bind({
    bundle: BUNDLE,
    name: "_nav_point",
    typeId: ActivityBundleItemType.NavPoint,
    typeIndex: 8,
  });
  const call = (method: string, ...args: LuaValue[]) => {
    const fn = objective.get(method);
    if (!(fn instanceof LuaHostFunction)) {
      throw new Error(`${method} did not resolve to a host function`);
    }
    return fn.callback([objective, ...args], {
      name: method,
      requestYield: () => undefined,
    })?.[0];
  };
  const last = () =>
    (changes.at(-1) as { state: PlayerObjectiveState } | undefined)?.state;
  return { call, last, navPoint, object, squad };
}

describe("a player objective's nav point waypoint", () => {
  it("nav_point_activate resolves a NavPoint item's own baked position", () => {
    const { call, last, navPoint } = makeWaypointObjective();
    call("nav_point_activate", navPoint);
    expect(last()?.navPoints).toEqual([{ x: 100, y: 200, z: 300 }]);
  });

  it("nav_point_activate resolves a Squad item's own spawn point", () => {
    const { call, last, squad } = makeWaypointObjective();
    call("nav_point_activate", squad);
    expect(last()?.navPoints).toEqual([{ x: 1, y: 2, z: 3 }]);
  });

  // The two real public events call this straight on their headline Object
  // (u_event_vex_block, u_event_countdown), with no fallback argument at all.
  it("nav_point_activate resolves an Object item's own placement", () => {
    const { call, last, object } = makeWaypointObjective();
    call("nav_point_activate", object);
    expect(last()?.navPoints).toEqual([{ x: 10, y: 20, z: 30 }]);
  });

  it("nav_point_activate_with_fallback prefers a baked nav point over the item", () => {
    const { call, last, navPoint, object } = makeWaypointObjective();
    call("nav_point_activate_with_fallback", object, navPoint);
    expect(last()?.navPoints).toEqual([{ x: 100, y: 200, z: 300 }]);
  });

  // The generic archetypes (countdown_objective, destructible_objective,
  // interactable_objective) wire an Object item with no baked NavPoint row.
  it("nav_point_activate_with_fallback falls back to the Object item with no nav point wired", () => {
    const { call, last, object } = makeWaypointObjective();
    call("nav_point_activate_with_fallback", object, undefined);
    expect(last()?.navPoints).toEqual([{ x: 10, y: 20, z: 30 }]);
  });

  it("nav_point_activate_with_fallback falls back to the Squad item with no nav point wired", () => {
    const { call, last, squad } = makeWaypointObjective();
    call("nav_point_activate_with_fallback", squad, undefined);
    expect(last()?.navPoints).toEqual([{ x: 1, y: 2, z: 3 }]);
  });

  it("is a no-op with neither a nav point nor a fallback position", () => {
    const { call, last } = makeWaypointObjective();
    call("nav_point_activate_with_fallback", undefined, undefined);
    expect(last()).toBeUndefined();
  });
});

// A warp gate: table-placed, alive count 0 while it stands; the kill incidents
// speak for it.
function makeGate() {
  let deaths = 0;
  const changes: ItemChange[] = [];
  const state = new ScriptItemState();
  const context: HostContext = {
    types: ActivityBundleItemType,
    activityFlagChanged: () => undefined,
    clock: { activityTicks: () => 0 },
    currentInstance: () => undefined,
    log: () => undefined,
    namedHandles: new Map(),
    noteRowRead: () => undefined,
    objectStates: new Map(),
    placeActors: false,
    players: () => [],
    playerSensor: () => undefined,
    reports: {
      actorBound: () => undefined,
      actorCommandScript: () => undefined,
      actorDropAck: () => undefined,
      actorStanding: () => undefined,
      bubbleOccupied: () => undefined,
      health: () => undefined,
      objectAlive: () => undefined,
      objectiveCount: () => undefined,
      playerMonitorCount: () => undefined,
      safeZoneInside: () => undefined,
      squadAliveCount: () => 0,
      squadCombatCount: () => undefined,
      squadIncidentDeaths: () => deaths,
      triggerFired: () => false,
    },
    runHandler: () => undefined,
    sink: (change) => changes.push(change),
    state,
    time: () => 0,
    trace: [],
  };
  const squadRow: BoundRow = {
    bundle: BUNDLE,
    name: "_squad",
    typeId: ActivityBundleItemType.Squad,
    typeIndex: 4,
  };
  const gateRow: BoundRow = {
    bundle: BUNDLE,
    name: "_squad__gate",
    typeId: ActivityBundleItemType.Actor,
    typeIndex: 5,
  };
  const rows = {
    defaultBodies: () => 1,
    // The gate is its squad's one cell, authored [0].
    namedMembers: (squad: BoundRow) =>
      squad.typeIndex === squadRow.typeIndex ? [gateRow] : [],
    navPointPosition: () => undefined,
    owningSquad: (row: BoundRow) =>
      row.typeId === ActivityBundleItemType.Actor ? squadRow : undefined,
    resolveByIdentifier: () => undefined,
    roster: () => 1,
  };
  const writer = new ItemWriter(context);
  const bind = (row: BoundRow) => {
    const bound = new BoundInstance(context, writer, row.name, row, rows);
    registerBoundObject(bound);
    return (method: string, ...args: LuaValue[]) => {
      const fn = bound.object.get(method);
      if (!(fn instanceof LuaHostFunction)) {
        throw new Error(`${method} did not resolve to a host function`);
      }
      return fn.callback([bound.object, ...args], {
        name: method,
        requestYield: () => undefined,
      })?.[0];
    };
  };
  const lastActor = () =>
    (
      changes.filter((change) => change.kind === "actor").at(-1) as
        | { state: ActorState }
        | undefined
    )?.state;
  const placed = () => lastActor()?.placed;
  return {
    changes,
    gate: bind(gateRow),
    lastActor,
    kill: () => {
      deaths += 1;
    },
    placed,
    squad: bind(squadRow),
    state,
  };
}

// alive_count() is roster minus tally once a tally has arrived, else the
// incident-credited path.
function makeTallySquad() {
  let tally: readonly number[] | undefined;
  let incidentDeaths: number | undefined;
  const context: HostContext = {
    types: ActivityBundleItemType,
    activityFlagChanged: () => undefined,
    clock: { activityTicks: () => 0 },
    currentInstance: () => undefined,
    log: () => undefined,
    namedHandles: new Map(),
    noteRowRead: () => undefined,
    objectStates: new Map(),
    placeActors: false,
    players: () => [],
    playerSensor: () => undefined,
    reports: {
      actorBound: () => undefined,
      actorCommandScript: () => undefined,
      actorDropAck: () => undefined,
      actorStanding: () => undefined,
      bubbleOccupied: () => undefined,
      health: () => undefined,
      objectAlive: () => undefined,
      objectiveCount: () => undefined,
      playerMonitorCount: () => undefined,
      safeZoneInside: () => undefined,
      squadAliveCount: () => undefined,
      squadCombatCount: () => undefined,
      squadIncidentDeaths: () => incidentDeaths,
      squadTally: () => tally,
      triggerFired: () => false,
    },
    runHandler: () => undefined,
    sink: () => undefined,
    state: new ScriptItemState(),
    time: () => 0,
    trace: [],
  };
  const squadRow: BoundRow = {
    bundle: BUNDLE,
    name: "_squad",
    typeId: ActivityBundleItemType.Squad,
    typeIndex: 9,
  };
  const rows: RowFacts = {
    defaultBodies: () => 6,
    namedMembers: () => [],
    navPointPosition: () => undefined,
    owningSquad: () => undefined,
    resolveByIdentifier: () => undefined,
    roster: () => 6,
  };
  const bound = new BoundInstance(
    context,
    new ItemWriter(context),
    squadRow.name,
    squadRow,
    rows
  );
  registerBoundObject(bound);
  const call = (method: string) => {
    const fn = bound.object.get(method);
    if (!(fn instanceof LuaHostFunction)) {
      throw new Error(`${method} did not resolve to a host function`);
    }
    return fn.callback([bound.object], {
      name: method,
      requestYield: () => undefined,
    })?.[0];
  };
  return {
    call,
    setIncidentDeaths: (value: number) => {
      incidentDeaths = value;
    },
    setTally: (value: readonly number[] | undefined) => {
      tally = value;
    },
  };
}

describe("a squad's alive_count from its roster TALLY", () => {
  it("sums roster minus TALLY per cell once this epoch's first report arrives", () => {
    const { call, setTally } = makeTallySquad();
    setTally([2, 1]);
    expect(call("alive_count")).toBe(3); // 6 authored bodies - 3 lost
  });

  it("floors at 0 rather than going negative", () => {
    const { call, setTally } = makeTallySquad();
    setTally([10, 10]);
    expect(call("alive_count")).toBe(0);
  });

  it("falls back to incident-credited deaths before the first TALLY arrives", () => {
    const { call, setIncidentDeaths } = makeTallySquad();
    setIncidentDeaths(2);
    expect(call("alive_count")).toBe(4); // 6 authored - 2 credited deaths
  });

  // Named deaths never bump the tally: a squad whose kills the incidents
  // credited reads no more alive than those leave, whatever the tally says.
  it("caps a tally count at what the credited kills leave", () => {
    const { call, setIncidentDeaths, setTally } = makeTallySquad();
    setTally([0]);
    setIncidentDeaths(6);
    expect(call("alive_count")).toBe(0);
    setIncidentDeaths(2);
    expect(call("alive_count")).toBe(4);
  });
});

describe("a default-placed squad the kill incidents speak for", () => {
  it("is alive, and its actor with it, until a kill", () => {
    const { gate, kill, squad } = makeGate();
    expect(squad("alive_count")).toBe(1);
    expect(gate("is_alive")).toBe(true);
    kill();
    expect(squad("alive_count")).toBe(0);
    expect(gate("is_alive")).toBe(false);
  });

  // The client drops only from an actor it holds placed. A squad a script
  // reserved at 0 stays unplaced whatever its default.
  it("counts as placed for its actor's drop", () => {
    const { gate, placed, state } = makeGate();
    gate("set_channel_scalar", "activate", 1);
    expect(placed()).toBe(true);
    state.setSquad(
      { bundle: BUNDLE, typeId: ActivityBundleItemType.Squad, typeIndex: 4 },
      { bodies: 0, carried: false, wave: 0 }
    );
    gate("set_channel_scalar", "activate", 0);
    expect(placed()).toBe(false);
  });
});

// A squad whose one cell is its named member: placing it places the actor,
// and the roster asks for no anonymous body.
describe("a script placing a squad of named members", () => {
  const reserved = { bodies: 0, carried: false, wave: 0 };
  const squadRef = {
    bundle: BUNDLE,
    typeId: ActivityBundleItemType.Squad,
    typeIndex: 4,
  };

  it("places a member nothing has written", () => {
    const { lastActor, squad, state } = makeGate();
    state.setSquad(squadRef, reserved);
    squad("place");
    expect(lastActor()).toEqual({ placed: true });
  });

  // The gate powers up before its squad is placed, so its state went out
  // unplaced; the place resends it placed with its channels intact.
  it("resends a written member placed, keeping what it carried", () => {
    const { gate, lastActor, squad, state } = makeGate();
    state.setSquad(squadRef, reserved);
    gate("set_channel_scalar", "power", 1);
    expect(lastActor()?.placed).toBe(false);
    squad("place");
    expect(lastActor()?.placed).toBe(true);
    expect(lastActor()?.behaviour?.channels).toHaveLength(1);
  });

  it("leaves a carrier's cargo to the carrier", () => {
    const { changes, squad, state } = makeGate();
    state.setSquad(squadRef, { ...reserved, carried: true });
    squad("place");
    expect(changes.some((change) => change.kind === "actor")).toBe(false);
  });
});

// A carrier (here a warp gate, #72) dropping squads, with the client's
// reports under the test's control.
function makeCarrier() {
  const changes: ItemChange[] = [];
  const trace: string[] = [];
  const reported: {
    ack?: { dropId: number; inProgress: boolean };
    alive?: number;
    deaths: number;
  } = { deaths: 0 };
  const state = new ScriptItemState();
  let tick = 0;
  const context: HostContext = {
    types: ActivityBundleItemType,
    activityFlagChanged: () => undefined,
    clock: { activityTicks: () => tick },
    currentInstance: () => undefined,
    log: () => undefined,
    namedHandles: new Map(),
    noteRowRead: () => undefined,
    objectStates: new Map(),
    placeActors: false,
    players: () => [],
    playerSensor: () => undefined,
    reports: {
      actorBound: () => undefined,
      actorCommandScript: () => undefined,
      actorDropAck: () => reported.ack,
      actorStanding: () => undefined,
      bubbleOccupied: () => undefined,
      health: () => undefined,
      objectAlive: () => undefined,
      objectiveCount: () => undefined,
      playerMonitorCount: () => undefined,
      safeZoneInside: () => undefined,
      squadAliveCount: () => reported.alive,
      squadCombatCount: () => undefined,
      squadDeaths: () => reported.deaths,
      triggerFired: () => false,
    },
    runHandler: () => undefined,
    sink: (change) => changes.push(change),
    state,
    time: () => 0,
    trace,
  };
  const row = (
    typeId: ActivityBundleItemType,
    typeIndex: number,
    name: string
  ): BoundRow => ({ bundle: BUNDLE, name, typeId, typeIndex });
  // sq_miniboss (#80) authors [0], its body the named minotaur (#81).
  const minibossRow = row(ActivityBundleItemType.Squad, 80, "sq_miniboss");
  const minotaurRow = row(ActivityBundleItemType.Actor, 81, "sq_minotaur");
  const rows = {
    namedMembers: (squad: BoundRow) =>
      squad.typeIndex === 80 ? [minotaurRow] : [],
    navPointPosition: () => undefined,
    owningSquad: (member: BoundRow) =>
      member.typeIndex === 81 ? minibossRow : undefined,
    resolveByIdentifier: () => undefined,
    // Every dropped squad authors three bodies.
    roster: () => 3,
  };
  const writer = new ItemWriter(context);
  const bind = (bound: BoundRow) => {
    const object = new BoundInstance(context, writer, bound.name, bound, rows);
    registerBoundObject(object);
    return object;
  };
  const gate = bind(row(ActivityBundleItemType.Actor, 72, "_squad__gate"));
  const squad = (typeIndex: number) =>
    bind(row(ActivityBundleItemType.Squad, typeIndex, `sq_${typeIndex}`));
  const call = (object: BoundInstance, method: string, ...args: LuaValue[]) => {
    const fn = object.object.get(method);
    if (!(fn instanceof LuaHostFunction)) {
      throw new Error(`${method} did not resolve to a host function`);
    }
    return fn.callback([object.object, ...args], {
      name: method,
      requestYield: () => undefined,
    })?.[0];
  };
  const actor = (typeIndex: number) =>
    (
      changes
        .filter(
          (change) =>
            change.kind === "actor" && change.item.typeIndex === typeIndex
        )
        .at(-1) as { state: ActorState } | undefined
    )?.state;
  // Each drop() is a tick of its own; dropInTick() drops in the current one.
  const dropInTick = (target: BoundInstance) =>
    call(gate, "drop_squad", target.object);
  const drop = (target: BoundInstance) => {
    tick += 1;
    return dropInTick(target);
  };
  const dropping = () => call(gate, "is_dropping");
  const squadState = (typeIndex: number) =>
    state.squad({
      bundle: BUNDLE,
      typeId: ActivityBundleItemType.Squad,
      typeIndex,
    });
  return {
    actor,
    bind,
    call,
    drop,
    dropInTick,
    dropping,
    gate,
    minibossRow,
    minotaurRow,
    reported,
    squad,
    squadState,
    trace,
  };
}

describe("a carrier drop", () => {
  // Field 4 is written at kick-off; field 5 holds from the drop's start to
  // "drop #N complete".
  it("runs from kick-off until the client reports it complete", () => {
    const { drop, dropping, reported, squad } = makeCarrier();
    const reinf = squad(107);
    drop(reinf);
    expect(dropping()).toBe(true);
    reported.ack = { dropId: 1, inProgress: true };
    expect(dropping()).toBe(true);
    reported.ack = { dropId: 1, inProgress: false };
    expect(dropping()).toBe(false);
    drop(reinf);
    expect(dropping()).toBe(true);
  });

  // Retail's Last Array wave ship (row 62) dropped 1 and 2, was placed again
  // and dropped from 1; its report starts over from 0.
  it("numbers a placed-again carrier's drops from 1", () => {
    const { actor, call, drop, dropping, gate, reported, squad } =
      makeCarrier();
    const reinf = squad(107);
    call(gate, "place");
    drop(reinf);
    drop(reinf);
    reported.ack = { dropId: 2, inProgress: false };
    expect(actor(72)?.drop?.id).toBe(2);
    call(gate, "place");
    reported.ack = { dropId: 0, inProgress: false };
    drop(reinf);
    expect(actor(72)?.drop?.id).toBe(1);
    expect(actor(72)?.incarnation).toBe(2);
    // an earlier drop's report has not taken this one yet
    expect(dropping()).toBe(true);
    reported.ack = { dropId: 1, inProgress: false };
    expect(dropping()).toBe(false);
  });

  // The client starts each drop with every squad queued: kept across drops,
  // gate01's sixth drop listed #27, #28 and #30 four times.
  it("queues only the current drop's squads", () => {
    const { actor, drop, reported, squad } = makeCarrier();
    const [a, b, c] = [squad(27), squad(28), squad(30)];
    drop(a);
    reported.ack = { dropId: 1, inProgress: false };
    drop(b);
    expect(actor(72)?.drop?.squads.map((ref) => ref.typeIndex)).toEqual([28]);
    // A running drop is aborted for the next, so its squads go again - once.
    reported.ack = { dropId: 2, inProgress: true };
    drop(c);
    drop(b);
    expect(actor(72)?.drop).toMatchObject({ id: 4 });
    expect(actor(72)?.drop?.squads.map((ref) => ref.typeIndex)).toEqual([
      28, 30,
    ]);
  });

  // A new wave destroys the squad's anonymous members: #107 took one every
  // re-drop, and one Vex vanished as fresh ones came through the gate.
  it("starts a new wave only for a squad with nobody alive", () => {
    const { drop, reported, squad, squadState, trace } = makeCarrier();
    const reinf = squad(107);
    reported.deaths = 4;
    drop(reinf);
    expect(squadState(107)).toMatchObject({
      bodies: 3,
      carried: true,
      wave: 1,
    });
    reported.alive = 1;
    reported.deaths = 6;
    drop(reinf);
    expect(squadState(107)).toMatchObject({ bodies: 5, wave: 1 });
    expect(
      trace.some((line) =>
        line.includes("drop keeps 1 alive in squad #107 (same wave, 2 lost)")
      )
    ).toBe(true);
    reported.alive = 0;
    drop(reinf);
    expect(squadState(107)).toMatchObject({ bodies: 3, wave: 2 });
  });

  // The boss squad's named minotaur came through the gate as an anonymous
  // body, and its health never resolved.
  it("seats a dropped squad's named member", () => {
    const { actor, bind, call, drop, minibossRow, minotaurRow } = makeCarrier();
    const minotaur = bind(minotaurRow);
    call(minotaur, "set_channel_scalar", "power", 1);
    expect(actor(81)?.carried).toBe(false);
    drop(bind(minibossRow));
    expect(actor(81)).toMatchObject({ carried: true, placed: true });
    expect(actor(81)?.behaviour?.channels).toHaveLength(1);
    expect(actor(72)?.carried).toBe(false);
  });

  // The Black Garden's clouds carry the squads dropped in one tick as one
  // drop: three refs under drop 1, and the pilot acknowledges drop 1.
  it("drops one tick's squads under one id", () => {
    const { actor, drop, dropInTick, dropping, reported, squad } =
      makeCarrier();
    drop(squad(27));
    dropInTick(squad(28));
    dropInTick(squad(30));
    expect(actor(72)?.drop?.id).toBe(1);
    expect(actor(72)?.drop?.squads.map((ref) => ref.typeIndex)).toEqual([
      27, 28, 30,
    ]);
    reported.ack = { dropId: 1, inProgress: false };
    expect(dropping()).toBe(false);
    drop(squad(27));
    expect(actor(72)?.drop?.id).toBe(2);
  });

  it("seats nobody for an anonymous-only squad", () => {
    const { actor, drop, squad } = makeCarrier();
    drop(squad(27));
    expect(actor(81)).toBeUndefined();
  });
});

// u_event_countdown's warsat: enable_all_players() gives it a prompt, and
// get_active() waits for the interaction incident naming its object.
describe("an event interactable", () => {
  function makeInteractable() {
    const changes: ItemChange[] = [];
    const sense: {
      current?: { used: boolean; usedStamp: number };
      device?: { position: number; positionStamp: number };
    } = {};
    const context: HostContext = {
      types: ActivityBundleItemType,
      activityFlagChanged: () => undefined,
      clock: { activityTicks: () => 0 },
      currentInstance: () => undefined,
      log: () => undefined,
      namedHandles: new Map(),
      noteRowRead: () => undefined,
      objectStates: new Map(),
      placeActors: false,
      players: () => [],
      playerSensor: () => undefined,
      reports: {
        actorBound: () => undefined,
        actorCommandScript: () => undefined,
        actorDropAck: () => undefined,
        actorStanding: () => undefined,
        bubbleOccupied: () => undefined,
        deviceSense: () => sense.device,
        health: () => undefined,
        interactableSense: () => sense.current,
        objectAlive: () => undefined,
        objectiveCount: () => undefined,
        playerMonitorCount: () => undefined,
        safeZoneInside: () => undefined,
        squadAliveCount: () => undefined,
        squadCombatCount: () => undefined,
        triggerFired: () => false,
      },
      runHandler: () => undefined,
      sink: (change) => changes.push(change),
      state: new ScriptItemState(),
      time: () => 0,
      trace: [],
    };
    const row: BoundRow = {
      bundle: BUNDLE,
      name: "o_event_countdown_object_spawner",
      typeId: ActivityBundleItemType.Object,
      typeIndex: 67,
    };
    const bound = new BoundInstance(
      context,
      new ItemWriter(context),
      "int_event_countdown_object",
      row,
      {
        navPointPosition: () => undefined,
        owningSquad: () => undefined,
        resolveByIdentifier: () => undefined,
        roster: () => 1,
      }
    );
    registerBoundObject(bound);
    const call = (method: string) => {
      const fn = bound.object.get(method);
      if (!(fn instanceof LuaHostFunction)) {
        throw new Error(`${method} did not resolve to a host function`);
      }
      return fn.callback([bound.object], {
        name: method,
        requestYield: () => undefined,
      })?.[0];
    };
    return { bound, call, changes, sense };
  }

  // The client applies a grouped device's position and counts its stamp up
  // again: the Devil's Lair console reported stamp 2 for our 0.1 at 1.
  it("stamps its device past the stamp the client holds", () => {
    const { bound, changes, sense } = makeInteractable();
    const fn = bound.object.get("set_device_position");
    if (!(fn instanceof LuaHostFunction)) {
      throw new Error("set_device_position did not resolve");
    }
    const set = (position: number) =>
      fn.callback([bound.object, position], {
        name: "set_device_position",
        requestYield: () => undefined,
      });
    set(0.1);
    expect(changes.at(-1)).toMatchObject({
      state: { device: { position: 0.1, revision: 1 } },
    });
    sense.device = { position: 0.1, positionStamp: 2 };
    set(1);
    expect(changes.at(-1)).toMatchObject({
      state: { device: { position: 1, revision: 3 } },
    });
    sense.device = { position: 1, positionStamp: 1 };
    set(0);
    expect(changes.at(-1)).toMatchObject({
      state: { device: { position: 0, revision: 4 } },
    });
  });

  it("is enabled for every player", () => {
    const { call, changes } = makeInteractable();
    call("enable_all_players");
    expect(changes.at(-1)).toMatchObject({
      kind: "object",
      state: { interactable: { enabled: true } },
    });
  });

  it("is active once used, until cleared", () => {
    const { bound, call } = makeInteractable();
    const names = () => [0x6f2c_f973];
    expect(call("get_active")).toBe(false);
    bound.noteInteraction((name) => name === 0x6f2c_f973, names);
    expect(call("get_active")).toBe(true);
    call("clear");
    expect(call("get_active")).toBe(false);
  });

  // interactable_placement: `if not _interactable:is_active()` ... then
  // clear() and wait for the next use. A constant false never re-armed it.
  it("reads is_active the same way", () => {
    const { bound, call } = makeInteractable();
    expect(call("is_active")).toBe(false);
    bound.noteInteraction(
      () => true,
      () => [1]
    );
    expect(call("is_active")).toBe(true);
    call("clear");
    expect(call("is_active")).toBe(false);
  });

  // The client keeps its own used latch (interactable sense 0x80802DA3) and
  // reports it on the object's sense row.
  it("is active once the client reports its used latch", () => {
    const { call, sense } = makeInteractable();
    call("enable_all_players");
    sense.current = { used: false, usedStamp: 0 };
    expect(call("get_active")).toBe(false);
    sense.current = { used: true, usedStamp: 0 };
    expect(call("get_active")).toBe(true);
    call("clear");
    expect(call("get_active")).toBe(false);
    expect(call("is_active")).toBe(false);
    sense.current = { used: true, usedStamp: 1 };
    expect(call("is_active")).toBe(true);
  });

  it("is disabled again once cleared", () => {
    const { call, changes } = makeInteractable();
    call("enable_all_players");
    call("clear");
    expect(changes.at(-1)).toMatchObject({
      kind: "object",
      state: { interactable: { enabled: false } },
    });
  });
});

// Mission 3's Vex sniper: its teleport cookie landed before the combatant
// was placed, and the client reported pc 0/1 with a flat heartbeat for good.
describe("a command script the client never primed", () => {
  const EXECUTING = "native.activitylib.e_command_script_state.executing";
  interface Report {
    cookieRunning?: number;
    heartbeat?: number;
    pcReached?: number;
  }

  function makeSniper(sleepFirst = false) {
    const changes: ItemChange[] = [];
    const trace: string[] = [];
    const holder: { report?: Report } = {};
    const context: HostContext = {
      types: ActivityBundleItemType,
      activityFlagChanged: () => undefined,
      clock: { activityTicks: () => 0 },
      currentInstance: () => undefined,
      log: () => undefined,
      namedHandles: new Map(),
      noteRowRead: () => undefined,
      objectStates: new Map(),
      placeActors: false,
      players: () => [],
      playerSensor: () => undefined,
      reports: {
        actorBound: () => undefined,
        actorCommandScript: () => holder.report,
        actorDropAck: () => undefined,
        actorStanding: () => undefined,
        bubbleOccupied: () => undefined,
        health: () => undefined,
        objectAlive: () => undefined,
        objectiveCount: () => undefined,
        playerMonitorCount: () => undefined,
        safeZoneInside: () => undefined,
        squadAliveCount: () => undefined,
        squadCombatCount: () => undefined,
        triggerFired: () => false,
      },
      runHandler: () => undefined,
      sink: (change) => changes.push(change),
      state: new ScriptItemState(),
      time: () => 0,
      trace,
    };
    const snipePoint: BoundRow = {
      bundle: 0x5176_41f1,
      name: "ps_snipe01",
      typeId: ActivityBundleItemType.ActionPoint,
      typeIndex: 246,
    };
    const bound = new BoundInstance(
      context,
      new ItemWriter(context),
      "sq_vex_sniper01__sniper",
      {
        bundle: BUNDLE,
        name: "sq_vex_sniper01__sniper",
        typeId: ActivityBundleItemType.Actor,
        typeIndex: 40,
      },
      {
        navPointPosition: () => undefined,
        owningSquad: () => undefined,
        resolveByIdentifier: () => undefined,
        roster: () => 1,
      }
    );
    registerBoundObject(bound);
    const invoke = (
      object: LuaHostObject,
      method: string,
      ...args: LuaValue[]
    ) => {
      const fn = object.get(method);
      if (!(fn instanceof LuaHostFunction)) {
        throw new Error(`${method} did not resolve to a host function`);
      }
      return fn.callback([object, ...args], {
        name: method,
        requestYield: () => undefined,
      })?.[0];
    };
    const cs = new CommandScriptBuilder(
      ActivityBundleItemType,
      "__cs",
      (value) => (value === "ps_snipe01" ? snipePoint : undefined),
      () => undefined,
      () => undefined
    );
    invoke(cs.object, "clear");
    if (sleepFirst) {
      invoke(cs.object, "sleep", 2);
    }
    invoke(
      cs.object,
      "point_targeted_ability",
      "teleport",
      "command_script",
      "ps_snipe01",
      0
    );
    invoke(bound.object, "execute", cs.object);
    const script = () =>
      (
        changes.filter((change) => change.kind === "actor").at(-1) as
          | { state: ActorState }
          | undefined
      )?.state.commandScript;
    const scriptState = () => invoke(bound.object, "get_command_script_state");
    return { bound, holder, script, scriptState, trace };
  }

  it("goes again under a new cookie once PC and heartbeat stand still 6 s", () => {
    const { bound, holder, script, scriptState, trace } = makeSniper();
    const sent = script();
    expect(sent?.cookie).toBe(1);
    holder.report = { cookieRunning: 1, heartbeat: 7, pcReached: 0 };
    // The first tick only records what the client reported.
    for (let tick = 0; tick < 6; tick++) {
      bound.advance(1);
    }
    expect(script()?.cookie).toBe(1);
    bound.advance(1);
    expect(script()).toEqual({ atoms: sent?.atoms, cookie: 2, pc: 0 });
    expect(trace.some((line) => line.includes("re-armed as cookie #2"))).toBe(
      true
    );
    expect(scriptState()).toBe(EXECUTING);
  });

  it("leaves a runner alone while its heartbeat rises", () => {
    const { bound, holder, script } = makeSniper();
    holder.report = { cookieRunning: 1, heartbeat: 0, pcReached: 0 };
    for (let tick = 1; tick <= 60; tick++) {
      bound.advance(0.5);
      if (tick % 5 === 0) {
        holder.report = { ...holder.report, heartbeat: tick / 5 };
      }
    }
    expect(script()?.cookie).toBe(1);
  });

  it("leaves a script alone once its PC has moved past where it was issued", () => {
    const { bound, holder, script } = makeSniper(true);
    const sent = script();
    expect(sent?.atoms).toHaveLength(2);
    // past the sleep, on a long last atom, heartbeat standing still
    holder.report = { cookieRunning: 1, heartbeat: 3, pcReached: 1 };
    for (let tick = 0; tick < 20; tick++) {
      bound.advance(1);
    }
    expect(script()).toEqual(sent);
  });

  it("leaves a finished script alone", () => {
    const { bound, holder, script, scriptState } = makeSniper();
    holder.report = { cookieRunning: 1, pcReached: 1 };
    for (let tick = 0; tick < 20; tick++) {
      bound.advance(1);
    }
    expect(script()?.cookie).toBe(1);
    expect(scriptState()).not.toBe(EXECUTING);
  });
});

describe("squadRosterSize", () => {
  const tag = {
    bundle: BUNDLE,
    rows: [
      {
        cells: [3, 1],
        memberCount: 2,
        nameHash: 1,
        typeId: ActivityBundleItemType.Squad,
        typeIndex: 0,
      },
      {
        cells: [0],
        memberCount: 1,
        nameHash: 2,
        typeId: ActivityBundleItemType.Squad,
        typeIndex: 1,
      },
      { nameHash: 3, typeId: ActivityBundleItemType.Actor, typeIndex: 2 },
    ],
    tag: 0x809b_800d,
  };
  const squad = (typeIndex: number): BoundRow => ({
    bundle: BUNDLE,
    name: "sq",
    typeId: ActivityBundleItemType.Squad,
    typeIndex,
  });

  // A warp cloud's squad authors [3, 1]: four come through, not one.
  it("places the authored cells", () => {
    expect(squadRosterSize(ActivityBundleItemType, [tag], squad(0))).toBe(4);
  });

  // The captain's squad authors [0]: he is its Actor row, one body.
  it("gives an empty cell its named member", () => {
    expect(squadRosterSize(ActivityBundleItemType, [tag], squad(1))).toBe(1);
  });
});

// A context with every report settable, and handles bound to rows of any
// type against the same row facts.
function makeRows(
  facts: Partial<RowFacts> = {},
  reports: Partial<HostContext["reports"]> = {},
  contextOverrides: Partial<HostContext> = {}
) {
  const changes: ItemChange[] = [];
  const trace: string[] = [];
  const handlerCalls: { args: readonly LuaValue[]; handler: LuaValue }[] = [];
  const context: HostContext = {
    types: ActivityBundleItemType,
    activityFlagChanged: () => undefined,
    clock: { activityTicks: () => 0 },
    currentInstance: () => undefined,
    log: () => undefined,
    namedHandles: new Map(),
    noteRowRead: () => undefined,
    objectStates: new Map(),
    placeActors: false,
    players: () => [],
    playerSensor: () => undefined,
    reports: {
      actorBound: () => undefined,
      actorCommandScript: () => undefined,
      actorDropAck: () => undefined,
      actorStanding: () => undefined,
      bubbleOccupied: () => undefined,
      health: () => undefined,
      objectAlive: () => undefined,
      objectiveCount: () => undefined,
      playerMonitorCount: () => undefined,
      safeZoneInside: () => undefined,
      squadAliveCount: () => undefined,
      squadCombatCount: () => undefined,
      triggerFired: () => false,
      ...reports,
    },
    runHandler: (handler, args) => handlerCalls.push({ args, handler }),
    sink: (change) => changes.push(change),
    state: new ScriptItemState(),
    time: () => 0,
    trace,
    ...contextOverrides,
  };
  const rows: RowFacts = {
    navPointPosition: () => undefined,
    owningSquad: () => undefined,
    resolveByIdentifier: () => undefined,
    roster: () => 1,
    ...facts,
  };
  const writer = new ItemWriter(context);
  const bind = (
    path: string,
    typeId?: ActivityBundleItemType,
    typeIndex = 0
  ) => {
    const row =
      typeId === undefined
        ? undefined
        : { bundle: BUNDLE, name: path, typeId, typeIndex };
    const bound = new BoundInstance(context, writer, path, row, rows);
    registerBoundObject(bound);
    const call = (method: string, ...args: LuaValue[]) => {
      const fn = bound.object.get(method);
      if (!(fn instanceof LuaHostFunction)) {
        throw new Error(`${method} did not resolve to a host function`);
      }
      return fn.callback([bound.object, ...args], {
        name: method,
        requestYield: () => undefined,
      })?.[0];
    };
    return { bound, call, object: bound.object };
  };
  const last = <K extends ItemChange["kind"]>(kind: K, typeIndex: number) =>
    changes
      .filter(
        (change) => change.kind === kind && change.item.typeIndex === typeIndex
      )
      .at(-1)?.state as Extract<ItemChange, { kind: K }>["state"] | undefined;
  return { bind, changes, context, handlerCalls, last, trace };
}

// Retail sends ref0 from the world entry and the task with the placement.
describe("a squad's objective and task", () => {
  const GATING = fnv1("gating");
  const flat = (name: number, influencer: number) => ({
    capacity: -1,
    firstChild: -1,
    influencer,
    name,
    nextSibling: -1,
    parent: -1,
    priority: 0,
  });
  const tasks = [
    flat(0x6b_b0_5c_df, 1),
    flat(0x50_56_ca_74, 2),
    flat(GATING, 3),
    flat(0x00_69_45_3e, 5),
  ];
  const harness = () =>
    makeRows({
      objectiveTasks: (row) =>
        row.typeId === ActivityBundleItemType.Objective && row.typeIndex === 4
          ? tasks
          : undefined,
    });

  it("links the squad to the objective, then to a task by name", () => {
    const { bind, last, trace } = harness();
    const objective = bind(
      "obj_m0_hangar_fallen",
      ActivityBundleItemType.Objective,
      4
    );
    const squad = bind("sq_m0_fallen_gating", ActivityBundleItemType.Squad, 7);
    squad.call("set_objective", objective.object);
    expect(last("squad", 7)?.objective).toEqual({
      bundle: BUNDLE,
      typeId: ActivityBundleItemType.Objective,
      typeIndex: 4,
    });
    squad.call("set_task", "gating");
    expect(last("squad", 7)?.task).toBe(2);
    expect(last("squad", 7)?.taskInfluencer).toBe(3);
    expect(trace).toContain("sq_m0_fallen_gating:set_task(gating) -> task 2");
  });

  it("takes a task as a hash literal or an index", () => {
    const { bind, last } = harness();
    const objective = bind(
      "obj_m0_hangar_fallen",
      ActivityBundleItemType.Objective,
      4
    );
    const squad = bind(
      "sq_ch1_fallen_on_playership_1",
      ActivityBundleItemType.Squad,
      8
    );
    squad.call("set_objective", objective.object);
    squad.call("set_task", "0x0069453E");
    expect(last("squad", 8)?.task).toBe(3);
    squad.call("set_task", 1);
    expect(last("squad", 8)?.task).toBe(1);
    expect(last("squad", 8)?.taskInfluencer).toBe(2);
  });

  it("refuses a task before the objective, or one the objective lacks", () => {
    const { bind, last, trace } = harness();
    const objective = bind(
      "obj_m0_hangar_fallen",
      ActivityBundleItemType.Objective,
      4
    );
    const squad = bind("sq_m0_fallen_1", ActivityBundleItemType.Squad, 11);
    squad.call("set_task", "gating");
    expect(last("squad", 11)).toBeUndefined();
    squad.call("set_objective", objective.object);
    squad.call("set_task", "no_such_task");
    expect(last("squad", 11)?.task).toBeUndefined();
    expect(trace).toEqual([
      "sq_m0_fallen_1:set_task(gating) (no objective)",
      "sq_m0_fallen_1:set_objective(obj_m0_hangar_fallen)",
      "sq_m0_fallen_1:set_task(no_such_task) (no such task of the objective)",
    ]);
  });

  it("takes an uncracked temperament as a hash literal", () => {
    const { bind, last } = harness();
    const squad = bind("sq_m0_fallen_init_b", ActivityBundleItemType.Squad, 6);
    squad.call("activate_temperament", "0x8AEFBA13");
    squad.call("activate_temperament", "temper_combat_flee");
    expect(last("squad", 6)?.temperaments).toEqual([
      0x8a_ef_ba_13,
      fnv1("temper_combat_flee"),
    ]);
  });
});

describe("verbs nothing binds", () => {
  // `get_minimum_power_level() < 8` raised on the bare `true`.
  it("answers by the verb's name and leaves a line for each", () => {
    const { bind, trace } = makeRows();
    const { call } = bind("some_handle");
    expect(call("get_something")).toBe(0);
    expect(call("is_something")).toBe(false);
    expect(call("set_something_command", 2)).toBe(true);
    expect(trace).toEqual([
      "some_handle:get_something() (unbound, 0)",
      "some_handle:is_something() (unbound, false)",
      "some_handle:set_something_command(2) (unbound)",
    ]);
  });
});

// A poll like t30_hack_bind_host's is called every tick a script waits on it;
// logging every one of them drowned the log in identical lines.
describe("repeated identical polls", () => {
  it("logs a poll once, and again only when the answer changes", () => {
    let players: { characterKey: string }[] = [];
    const { bind, trace } = makeRows({}, {}, { players: () => players });
    const host = bind("host");
    expect(host.call("t30_hack_bind_host")).toBe(false);
    expect(host.call("t30_hack_bind_host")).toBe(false);
    expect(host.call("t30_hack_bind_host")).toBe(false);
    expect(trace).toEqual(["host:t30_hack_bind_host() -> false"]);
    players = [{ characterKey: "abc" }];
    expect(host.call("t30_hack_bind_host")).toBe(true);
    expect(host.call("t30_hack_bind_host")).toBe(true);
    expect(trace).toEqual([
      "host:t30_hack_bind_host() -> false",
      "host:t30_hack_bind_host() -> true",
    ]);
  });

  // set()-routed resends (timer start/stop, bodies=N, ...) go through the
  // same dedupe, keyed by the item rather than the verb.
  it("logs a resend once when the state it carries has not moved", () => {
    const { bind, trace } = makeRows();
    const timer = bind("respawn_timer", ActivityBundleItemType.Timer, 5);
    timer.call("start");
    timer.call("start");
    expect(trace).toEqual(["respawn_timer t17#5 timer start"]);
    timer.call("stop");
    expect(trace).toEqual([
      "respawn_timer t17#5 timer start",
      "respawn_timer t17#5 timer stop",
    ]);
  });
});

describe("a player objective's progress", () => {
  it("reads back the current it was given", () => {
    const { bind } = makeRows();
    const po = bind("po", ActivityBundleItemType.PlayerObjective, 47);
    expect(po.call("progress_get_current")).toBe(0);
    po.call("progress_activate", 0, 5);
    po.call("progress_update", 3);
    expect(po.call("progress_get_current")).toBe(3);
  });

  it("binds a Squad, Actor or Object and clears it", () => {
    const { bind, last } = makeRows();
    const po = bind("po", ActivityBundleItemType.PlayerObjective, 47);
    const timer = bind("t_timer", ActivityBundleItemType.Timer, 3);
    const spawner = bind("o_spawner", ActivityBundleItemType.Object, 9);
    po.call("progress_activate", 0, 4);
    po.call("progress_bind", timer.object);
    expect(last("playerObjective", 47)?.progressItem).toBeUndefined();
    po.call("progress_bind", spawner.object);
    expect(last("playerObjective", 47)?.progressItem).toEqual({
      bundle: BUNDLE,
      typeId: ActivityBundleItemType.Object,
      typeIndex: 9,
    });
    po.call("progress_clear");
    expect(last("playerObjective", 47)).toMatchObject({
      progress: undefined,
      progressItem: undefined,
    });
  });
});

describe("a public event's engaged players", () => {
  it("counts the player in once a kill lands on a bound squad", () => {
    let deaths = 0;
    const { bind } = makeRows(
      { squadScopeOf: (row) => new Set([itemKey(row.bundle, row.typeIndex)]) },
      { squadDeaths: () => deaths }
    );
    const po = bind("pf.po_event", ActivityBundleItemType.PlayerObjective, 47);
    const delegate = bind("pf.po_event.d_handle_engagement_incident");
    const listener = bind("event_globals.kil_squad");
    const squad = bind("sq_initialize", ActivityBundleItemType.Squad, 7);
    listener.call("bind_squad", squad.object);
    listener.call("set_handler", delegate.object);
    expect(po.call("get_engaged_player_count")).toBe(0);
    deaths = 1;
    expect(po.call("get_engaged_player_count")).toBe(1);
  });

  it("counts a trigger only while it is armed", () => {
    let fired = false;
    const { bind } = makeRows({}, { triggerFired: () => fired });
    const po = bind("po_event", ActivityBundleItemType.PlayerObjective, 47);
    const delegate = bind("po_event.d_handle_engagement_incident");
    const trigger = bind("pt", ActivityBundleItemType.PlayerTrigger, 20);
    trigger.call("set_handler", delegate.object);
    trigger.call("disable");
    fired = true;
    expect(po.call("get_engaged_player_count")).toBe(0);
    trigger.call("reset");
    expect(po.call("get_engaged_player_count")).toBe(1);
  });
});

describe("a squad group", () => {
  const rosters = new Map([
    [21, 3],
    [22, 2],
  ]);
  function makeGroup() {
    const rows = makeRows({ roster: (row) => rosters.get(row.typeIndex) ?? 0 });
    const sg = rows.bind("sg", ActivityBundleItemType.SquadGroup, 40);
    for (const typeIndex of rosters.keys()) {
      sg.call(
        "add_child",
        rows.bind(`sq_${typeIndex}`, ActivityBundleItemType.Squad, typeIndex)
          .object
      );
    }
    const bodies = () =>
      [...rosters.keys()].map(
        (typeIndex) => rows.last("squad", typeIndex)?.bodies
      );
    return { bodies, rows, sg };
  }

  it("sums its children's rosters for max_count", () => {
    const { sg } = makeGroup();
    expect(sg.call("max_count")).toBe(5);
  });

  it("clears every child's bodies on remove", () => {
    const { bodies, sg } = makeGroup();
    sg.call("place");
    expect(bodies()).toEqual([3, 2]);
    sg.call("remove");
    expect(bodies()).toEqual([0, 0]);
  });

  it("kill()s every child by epoch instead, leaving bodies alone", () => {
    const { rows, sg } = makeGroup();
    sg.call("place");
    sg.call("kill");
    const killed = () =>
      [...rosters.keys()].map(
        (typeIndex) => rows.last("squad", typeIndex)?.killed
      );
    expect(killed()).toEqual([1, 1]);
    // The bodies write from place() is untouched - kill() is a separate
    // wire field (SquadAuth unk9 + epoch), not a body count.
    expect(rows.last("squad", 21)?.bodies).toBe(3);
    expect(rows.last("squad", 22)?.bodies).toBe(2);
  });
});

describe("an actor placed on its own", () => {
  it("raises and lowers its placed flag, and follows its squad after", () => {
    const squadRow: BoundRow = {
      bundle: BUNDLE,
      name: "sq_cloud",
      typeId: ActivityBundleItemType.Squad,
      typeIndex: 4,
    };
    const pilotRow: BoundRow = {
      bundle: BUNDLE,
      name: "pilot",
      typeId: ActivityBundleItemType.Actor,
      typeIndex: 5,
    };
    const { bind, last } = makeRows({
      defaultBodies: () => 0,
      namedMembers: (row) => (row.typeIndex === 4 ? [pilotRow] : []),
      owningSquad: (row) =>
        row.typeId === ActivityBundleItemType.Actor ? squadRow : undefined,
    });
    const pilot = bind("pilot", ActivityBundleItemType.Actor, 5);
    const squad = bind("sq_cloud", ActivityBundleItemType.Squad, 4);
    pilot.call("place");
    expect(last("actor", 5)?.placed).toBe(true);
    pilot.call("remove");
    expect(last("actor", 5)?.placed).toBe(false);
    squad.call("place");
    expect(last("actor", 5)?.placed).toBe(true);
  });

  // Sepiks Prime comes in blind and deaf and wakes as his guards die (2.3.1
  // capture: behaviour 3 under mask 3|16, then 0, each a new generation).
  it("carries set_blind and set_deaf into its behaviour, placed with its squad", () => {
    const squadRow: BoundRow = {
      bundle: BUNDLE,
      name: "sq_boss",
      typeId: ActivityBundleItemType.Squad,
      typeIndex: 4,
    };
    const servitorRow: BoundRow = {
      bundle: BUNDLE,
      name: "sq_boss__servitor",
      typeId: ActivityBundleItemType.Actor,
      typeIndex: 5,
    };
    const { bind, last } = makeRows({
      defaultBodies: () => 0,
      namedMembers: (row) => (row.typeIndex === 4 ? [servitorRow] : []),
      owningSquad: (row) =>
        row.typeId === ActivityBundleItemType.Actor ? squadRow : undefined,
    });
    const servitor = bind("sq_boss__servitor", ActivityBundleItemType.Actor, 5);
    const squad = bind("sq_boss", ActivityBundleItemType.Squad, 4);
    servitor.call("set_blind", true);
    servitor.call("set_deaf", true);
    squad.call("place");
    const placed = last("actor", 5) as ActorState;
    expect(placed.placed).toBe(true);
    expect(placed.behaviour).toMatchObject({
      awarenessFlags: 3,
      awarenessMask: 3,
    });
    const generation = placed.behaviour?.incarnation ?? 0;
    servitor.call("set_blind", false);
    servitor.call("set_deaf", false);
    const awake = last("actor", 5) as ActorState;
    expect(awake.behaviour).toMatchObject({
      awarenessFlags: 0,
      awarenessMask: 3,
      incarnation: generation + 2,
    });
  });
});

// Phogoth is his squad's one body, a named member. His death is his own
// ActorSense f7; with no tally the squad's report never falls for it.
describe("a named member's death before any tally", () => {
  const squadRow: BoundRow = {
    bundle: BUNDLE,
    name: "sq_boss",
    typeId: ActivityBundleItemType.Squad,
    typeIndex: 4,
  };
  const ogreRow: BoundRow = {
    bundle: BUNDLE,
    name: "sq_boss__ogre",
    typeId: ActivityBundleItemType.Actor,
    typeIndex: 5,
  };
  const makeBoss = (bodies: number, reported: number) => {
    const report: { sense?: { flag7: boolean; flag8: boolean } } = {};
    const { bind } = makeRows(
      {
        defaultBodies: () => bodies,
        namedMembers: (row) => (row.typeIndex === 4 ? [ogreRow] : []),
        owningSquad: (row) =>
          row.typeId === ActivityBundleItemType.Actor ? squadRow : undefined,
        roster: () => bodies,
      },
      { actorBound: () => report.sense, squadAliveCount: () => reported }
    );
    const squad = bind("sq_boss", ActivityBundleItemType.Squad, 4);
    squad.call("place");
    return { report, squad };
  };

  it("leaves a squad of one named member nobody alive", () => {
    const { report, squad } = makeBoss(1, 1);
    expect(squad.call("alive_count")).toBe(1);
    report.sense = { flag7: false, flag8: true };
    expect(squad.call("alive_count")).toBe(1);
    report.sense = { flag7: true, flag8: true };
    expect(squad.call("alive_count")).toBe(0);
  });

  it("keeps the anonymous bodies standing beside him", () => {
    const { report, squad } = makeBoss(4, 4);
    report.sense = { flag7: true, flag8: true };
    expect(squad.call("alive_count")).toBe(3);
  });
});

describe("items cleared, stopped and disarmed", () => {
  it("empties an ObjectFilter on clear()", () => {
    const { bind, last } = makeRows();
    const filter = bind("of", ActivityBundleItemType.ObjectFilter, 12);
    filter.call("add", bind("sq", ActivityBundleItemType.Squad, 13).object);
    expect(last("objectFilter", 12)?.predicates).toHaveLength(1);
    filter.call("clear");
    expect(last("objectFilter", 12)?.predicates).toEqual([]);
  });

  it("stops a Sequence", () => {
    const { bind, last } = makeRows();
    const sequence = bind("seq", ActivityBundleItemType.Sequence, 30);
    sequence.call("start");
    expect(last("sequence", 30)?.playing).toBeDefined();
    sequence.call("stop");
    expect(last("sequence", 30)).toEqual({});
  });

  it("disarms a PlayerTrigger on disable()", () => {
    const { bind, last } = makeRows();
    const trigger = bind("pt", ActivityBundleItemType.PlayerTrigger, 20);
    trigger.call("reset");
    trigger.call("disable");
    expect(last("playerTrigger", 20)?.enabled).toBe(false);
  });

  it("plays a Cinematic and is done on cinematic_finished", () => {
    const { bind, last } = makeRows();
    const cinematic = bind("cin", ActivityBundleItemType.Cinematic, 7);
    cinematic.call("start");
    expect(last("cinematic", 7)?.playing).toBeDefined();
    expect(cinematic.call("is_done")).toBe(false);
    cinematic.bound.noteCinematicFinished();
    expect(cinematic.call("is_done")).toBe(true);
    expect(last("cinematic", 7)).toEqual({});
  });
});

describe("string_hash resolution", () => {
  it("hashes a string and passes a number through", () => {
    expect(resolveStringHash("player_joined")).toBe(fnv1("player_joined"));
    expect(resolveStringHash(0x1234)).toBe(0x1234);
  });

  it("reads invalid off an unbound handle, and leaves any other field unresolved", () => {
    // sh_<x>/<x>_hash fields arrive as numbers; `invalid` is the one unbound
    // handle left.
    const { bind } = makeRows();
    expect(resolveStringHash(bind("u.invalid").object)).toBe(fnv1(""));
    expect(resolveStringHash(bind("u.sh_headlands").object)).toBeUndefined();
  });

  it("does not hash a field that resolved to a real row", () => {
    const { bind } = makeRows();
    const row = bind("sq", ActivityBundleItemType.Squad, 1);
    expect(resolveStringHash(row.object)).toBeUndefined();
  });
});

describe("Loot enable/disable/reset", () => {
  it("writes LootAuth and keeps the host-side pickup count", () => {
    const { bind, last } = makeRows();
    const loot = bind("_loot", ActivityBundleItemType.Loot, 5);
    loot.call("enable");
    expect(last("loot", 5)).toEqual({ enabled: true, epoch: 0 });
    loot.bound.noteLootGathered();
    expect(loot.call("get_count")).toBe(1);
    loot.call("disable");
    expect(last("loot", 5)).toEqual({ enabled: false, epoch: 0 });
    loot.call("reset");
    expect(last("loot", 5)).toEqual({ enabled: false, epoch: 1 });
    expect(loot.call("get_count")).toBe(0);
  });
});

// Phogoth's chains (retail 2.3.1 Summoning Pits, phogoth_chains_seat): the
// seat holds the ogre at state 1, then lets him go at state 2.
describe("Passenger seat and release", () => {
  it("seats an actor at state 1 and releases it at state 2", () => {
    const PASSENGER = 37;
    const { bind, last } = makeRows(
      {},
      {},
      {
        types: { ...ActivityBundleItemType, Passenger: PASSENGER },
      }
    );
    const seat = bind(
      "phogoth_chains_seat",
      PASSENGER as ActivityBundleItemType,
      62
    );
    const ogre = bind(
      "sq_bossbattle_boss01__ogre",
      ActivityBundleItemType.Actor,
      5
    );
    seat.call("seat", ogre.object);
    expect(last("passenger", 62)).toEqual({
      passenger: expect.objectContaining({
        typeId: ActivityBundleItemType.Actor,
        typeIndex: 5,
      }),
      state: 1,
    });
    seat.call("release");
    expect(last("passenger", 62)).toEqual({ state: 2 });
  });
});

describe("Sequence set_state and is_done", () => {
  it("upserts its 2 pairs by name, F1-hashed", () => {
    const { bind, last } = makeRows();
    const seq = bind("seq_pvp_music", ActivityBundleItemType.Sequence, 9);
    seq.call("set_state", "pvp_music_switch", "intro");
    seq.call("set_state", "pvp_music_switch", "combat");
    seq.call("set_state", "pvp_music_round_intro", "start");
    expect(last("sequence", 9)?.pairs).toEqual([
      { name: fnv1("pvp_music_switch"), value: fnv1("combat") },
      { name: fnv1("pvp_music_round_intro"), value: fnv1("start") },
    ]);
  });

  // start(actor): SequenceAuth [3] names the row the sound plays from, as
  // retail's seq_fallen_* rows name the breach's entrance actor.
  it("start(actor) names the actor as the sequence's target", () => {
    const { bind, last } = makeRows();
    const seq = bind(
      "seq_fallen_vault_right",
      ActivityBundleItemType.Sequence,
      99
    );
    const dreg = bind(
      "sq_fallen_wall_l_c__dreg",
      ActivityBundleItemType.Actor,
      39
    );
    seq.call("start", dreg.object);
    expect(last("sequence", 99)?.target).toEqual({
      bundle: BUNDLE,
      typeId: ActivityBundleItemType.Actor,
      typeIndex: 39,
    });
    seq.call("stop");
    seq.call("start");
    expect(last("sequence", 99)?.target?.typeIndex).toBe(39);
  });

  // The TU0 client reads {mask, empty hash} as the first switch's option
  // bitmask; retail's music cues step it 1, 3, 7...
  it("set_switch_mask sends the mask as pair 0 with the empty hash", () => {
    const { bind, last } = makeRows();
    const seq = bind("seq_m_cue1", ActivityBundleItemType.Sequence, 0);
    seq.call("start");
    seq.call("set_switch_mask", 1);
    expect(last("sequence", 0)?.pairs).toEqual([
      { name: 1, value: 0x81_1c_9d_c5 },
    ]);
    expect(last("sequence", 0)?.playing?.id).toBe(0);
    seq.call("set_switch_mask", 3);
    expect(last("sequence", 0)?.pairs).toEqual([
      { name: 3, value: 0x81_1c_9d_c5 },
    ]);
  });

  it("is not done until played, and done after its configured duration", () => {
    let now = 0;
    const { bind } = makeRows(
      { sequenceDuration: () => 5 },
      {},
      { time: () => now }
    );
    const seq = bind("seq", ActivityBundleItemType.Sequence, 9);
    expect(seq.call("is_done")).toBe(false);
    seq.call("start");
    expect(seq.call("is_done")).toBe(false);
    now = 4;
    expect(seq.call("is_done")).toBe(false);
    now = 5;
    expect(seq.call("is_done")).toBe(true);
  });

  it("is done at once when no duration is wired", () => {
    const { bind } = makeRows();
    const seq = bind("seq", ActivityBundleItemType.Sequence, 9);
    seq.call("start");
    expect(seq.call("is_done")).toBe(true);
  });

  it("never sends a playing id, and is done at once, with no blueprint authored", () => {
    const { bind, last } = makeRows({ hasSequence: () => false });
    const seq = bind("seq", ActivityBundleItemType.Sequence, 9);
    expect(seq.call("is_done")).toBe(true);
    seq.call("start");
    expect(seq.call("is_done")).toBe(true);
    expect(last("sequence", 9)).toBeUndefined();
  });

  // Duration 0 with a blueprint is a music bed: never auto-completes.
  it("never auto-completes a zero-duration sequence with a blueprint authored", () => {
    let now = 0;
    const { bind } = makeRows(
      { hasSequence: () => true, sequenceDuration: () => 0 },
      {},
      { time: () => now }
    );
    const seq = bind("seq", ActivityBundleItemType.Sequence, 9);
    seq.call("start");
    now = 1000;
    expect(seq.call("is_done")).toBe(false);
    seq.call("stop");
    expect(seq.call("is_done")).toBe(true);
  });

  // The client only replays a sequence when the playing id changes
  // (0x8381AB00), so each start() must send a fresh one.
  it("cycles the playing id, never repeating the previous one, on each start()", () => {
    const { bind, last } = makeRows({ hasSequence: () => true });
    const seq = bind("seq", ActivityBundleItemType.Sequence, 9);
    seq.call("start");
    const first = last("sequence", 9)?.playing?.id;
    seq.call("start");
    const second = last("sequence", 9)?.playing?.id;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(second).not.toBe(255);
    expect(second).not.toBe(first);
  });
});

describe("Lifetime set_state/allow_join_in_progress/end_game", () => {
  it("maps the enum member set_state receives, no-op on one never seen", () => {
    const { bind, last } = makeRows();
    const lifetime = bind("lifetime", ActivityBundleItemType.Lifetime, 4);
    lifetime.call(
      "set_state",
      "native.activitylib.e_activity_lifetime_state.pregame"
    );
    expect(last("lifetime", 4)).toEqual({ joinFlag: true, state: 0 });
    lifetime.call(
      "set_state",
      "native.activitylib.e_activity_lifetime_state.countdown"
    );
    expect(last("lifetime", 4)?.state).toBe(1);
    lifetime.call(
      "set_state",
      "native.activitylib.e_activity_lifetime_state.active"
    );
    expect(last("lifetime", 4)?.state).toBe(2);
    lifetime.call(
      "set_state",
      "native.activitylib.e_activity_lifetime_state.mystery"
    );
    expect(last("lifetime", 4)?.state).toBe(2);
  });

  it("writes the +0x101 join flag", () => {
    const { bind, last } = makeRows();
    const lifetime = bind("lifetime", ActivityBundleItemType.Lifetime, 4);
    lifetime.call("allow_join_in_progress", false);
    expect(last("lifetime", 4)).toEqual({ joinFlag: false, state: 2 });
    lifetime.call("allow_join_in_progress", true);
    expect(last("lifetime", 4)?.joinFlag).toBe(true);
  });

  // Retail sends the results state (join flag dropped) and the ended
  // state in one update pair, so the ended state follows on the next tick.
  it("sends state 5 without the join flag, then 6 on the next tick, and stays there", () => {
    let now = 0;
    const { bind, last } = makeRows({}, {}, { time: () => now });
    const lifetime = bind("lifetime", ActivityBundleItemType.Lifetime, 4);
    lifetime.call("end_game");
    expect(last("lifetime", 4)).toEqual({ joinFlag: false, state: 5 });
    now = 1;
    lifetime.bound.advance(1);
    expect(last("lifetime", 4)?.state).toBe(6);
    // The transition only fires once.
    now = 20;
    lifetime.bound.advance(0);
    expect(last("lifetime", 4)?.state).toBe(6);
  });

  // Retail's results update carries lifetime_timer running with 0 to count.
  it("starts the timer the lifetime was bound to with the results", () => {
    const { bind, last } = makeRows(
      {},
      {},
      { clock: { activityTicks: () => 5024 } }
    );
    const timer = bind("lifetime_timer", ActivityBundleItemType.Timer, 2);
    const lifetime = bind("lifetime", ActivityBundleItemType.Lifetime, 4);
    lifetime.call("import_only_bind", timer.object);
    expect(last("timer", 2)).toBeUndefined();
    lifetime.call("end_game");
    expect(last("timer", 2)).toEqual({
      running: { progressBar: false, rate: 1, seconds: 0, startedAt: 5024 },
    });
    expect(last("lifetime", 4)).toEqual({ joinFlag: false, state: 5 });
  });

  // The lifetime's last two members lock the clients' time of day; retail
  // moves act_cosmo_m0_highway's to 0.025 as the garage fight starts.
  it("set_time_of_day rides the lifetime state and stays on later pushes", () => {
    const { bind, last } = makeRows();
    const lifetime = bind("lifetime", ActivityBundleItemType.Lifetime, 4);
    lifetime.call("set_time_of_day", 0.025);
    expect(last("lifetime", 4)).toEqual({
      joinFlag: true,
      state: 2,
      timeOfDay: 0.025,
    });
    lifetime.call("end_game");
    expect(last("lifetime", 4)?.timeOfDay).toBe(0.025);
    lifetime.call("set_time_of_day", "night");
    expect(last("lifetime", 4)?.timeOfDay).toBe(0.025);
  });

  it("ends a lifetime bound to nothing without a timer write", () => {
    const { bind, last } = makeRows();
    const lifetime = bind("lifetime", ActivityBundleItemType.Lifetime, 4);
    lifetime.call("end_game");
    expect(last("timer", 2)).toBeUndefined();
    expect(last("lifetime", 4)?.state).toBe(5);
  });

  // get_lifetime_sensor() hands scripts a handle of its own, which never saw
  // story_common's import_only_bind: the binder's row is found by name.
  it("finds the binder's lifetime_timer by name from an unbound handle", () => {
    const timerRow = {
      bundle: BUNDLE,
      name: "lifetime_timer",
      typeId: ActivityBundleItemType.Timer,
      typeIndex: 2,
    };
    const { bind, last } = makeRows({
      resolveByIdentifier: (identifier) =>
        identifier === "lifetime_timer" ? timerRow : undefined,
    });
    const lifetime = bind("lifetime", ActivityBundleItemType.Lifetime, 4);
    lifetime.call("end_game");
    expect(last("timer", 2)?.running?.seconds).toBe(0);
  });
});

describe("Fireteam t30_hack_bind_host and nav_point_clear_all", () => {
  it("binds once a player has joined the activity", () => {
    let players: { characterKey: string }[] = [];
    const { bind } = makeRows({}, {}, { players: () => players });
    const host = bind("host");
    expect(host.call("t30_hack_bind_host")).toBe(false);
    players = [{ characterKey: "abc" }];
    expect(host.call("t30_hack_bind_host")).toBe(true);
  });

  it("clears every fireteam nav point as a host-only no-op", () => {
    const { bind } = makeRows();
    expect(bind("host").call("nav_point_clear_all")).toBe(true);
  });
});

describe("Actor.is_bound", () => {
  it("is bound while placed and alive or awaiting its first report", () => {
    const rows: Partial<RowFacts> = {
      owningSquad: (row) =>
        row.typeId === ActivityBundleItemType.Actor
          ? {
              bundle: BUNDLE,
              name: "sq",
              typeId: ActivityBundleItemType.Squad,
              typeIndex: 1,
            }
          : undefined,
    };
    const { bind } = makeRows(rows);
    const actor = bind("pilot", ActivityBundleItemType.Actor, 2);
    expect(actor.call("is_bound")).toBe(false);
    actor.call("place");
    expect(actor.call("is_bound")).toBe(true);
  });

  // Once ActorSense has reported, the client's own rule takes over from
  // the host's placed-flag guess.
  it("follows ActorSense f7/f8 once the client has reported", () => {
    let sense: { flag7: boolean; flag8: boolean } | undefined;
    const { bind } = makeRows({}, { actorBound: () => sense });
    const actor = bind("pilot", ActivityBundleItemType.Actor, 2);
    actor.call("place");
    // Placed, but the client has not echoed a sense yet: the host guess.
    expect(actor.call("is_bound")).toBe(true);
    // f8 set, f7 clear: bound.
    sense = { flag7: false, flag8: true };
    expect(actor.call("is_bound")).toBe(true);
    // f7 set (a failed placement, or death): not bound, even though placed.
    sense = { flag7: true, flag8: true };
    expect(actor.call("is_bound")).toBe(false);
    // f8 clear: the auth was never received.
    sense = { flag7: false, flag8: false };
    expect(actor.call("is_bound")).toBe(false);
  });
});

describe("Actor.kill and abort_command_script", () => {
  it("kills a named actor by epoch, not a placement unlink", () => {
    const { bind, last } = makeRows();
    const actor = bind("pilot", ActivityBundleItemType.Actor, 2);
    actor.call("place");
    expect(last("actor", 2)?.placed).toBe(true);
    actor.call("kill");
    const state = last("actor", 2) as ActorState;
    expect(state.placed).toBe(true);
    expect(state.kill).toEqual({ epoch: 1 });
    actor.call("kill");
    expect((last("actor", 2) as ActorState).kill).toEqual({ epoch: 2 });
  });

  it("aborts a running command script under a fresh, empty cookie", () => {
    const { bind, last } = makeRows();
    const actor = bind("pilot", ActivityBundleItemType.Actor, 2);
    actor.call("execute", undefined);
    const running = last("actor", 2) as ActorState;
    expect(running.commandScript?.atoms).toEqual([]);
    const cookie = running.commandScript?.cookie;
    actor.call("abort_command_script");
    const aborted = last("actor", 2) as ActorState;
    expect(aborted.commandScript).toEqual({
      atoms: [],
      cookie: (cookie ?? 0) + 1,
      pc: 0,
    });
    expect(actor.call("get_command_script_state")).toBe(
      "lua-host:command_script_state:not_executing"
    );
  });
});

describe("Objective.reset", () => {
  it("toggles the slot byte and bumps unk1, distinct from every prior write", () => {
    const { bind, last } = makeRows();
    const objective = bind("obj", ActivityBundleItemType.Objective, 5);
    objective.call("objective_begin");
    expect((last("objective", 5) as ObjectiveState).slots[0]).toBe(1);
    objective.call("reset");
    const first = last("objective", 5) as ObjectiveState;
    expect(first.slots[0]).toBe(2);
    expect(first.unk1).toBe(1);
    objective.call("reset");
    const second = last("objective", 5) as ObjectiveState;
    expect(second.slots[0]).toBe(1);
    expect(second.unk1).toBe(2);
  });
});

describe("Squad/SquadGroup count_at_firing_area and current_in_combat_count", () => {
  it("reads the reported SquadSense f4/f3, summed over a group's children", () => {
    const reported = new Map<string, { combat?: number; firing?: number }>();
    const { bind } = makeRows(
      {},
      {
        squadAliveCount: (key) => reported.get(key)?.firing,
        squadCombatCount: (key) => reported.get(key)?.combat,
      }
    );
    const sg = bind("sg", ActivityBundleItemType.SquadGroup, 40);
    const sq21 = bind("sq_21", ActivityBundleItemType.Squad, 21);
    const sq22 = bind("sq_22", ActivityBundleItemType.Squad, 22);
    sg.call("add_child", sq21.object);
    sg.call("add_child", sq22.object);
    // Nothing reported yet: falls back to alive_count() (the desired
    // placement, here 0 - neither squad was placed by this handle).
    expect(sg.call("count_at_firing_area")).toBe(0);
    expect(sg.call("current_in_combat_count")).toBe(0);
    reported.set(itemKey(BUNDLE, 21), { combat: 2, firing: 3 });
    reported.set(itemKey(BUNDLE, 22), { combat: 1, firing: 1 });
    expect(sq21.call("count_at_firing_area")).toBe(3);
    expect(sq21.call("current_in_combat_count")).toBe(2);
    expect(sg.call("count_at_firing_area")).toBe(4);
    expect(sg.call("current_in_combat_count")).toBe(3);
  });
});

describe("Object.is_alive from destructible kills", () => {
  it("is alive once created, and not once a destructible kill names it", () => {
    const { bind } = makeRows();
    const object = bind("_object", ActivityBundleItemType.Object, 11);
    expect(object.call("is_alive")).toBe(false);
    object.call("create");
    expect(object.call("is_alive")).toBe(true);
    object.bound.noteDestructibleKill([0xaaaa], () => [0xaaaa]);
    expect(object.call("is_alive")).toBe(false);
    object.call("create");
    expect(object.call("is_alive")).toBe(true);
  });

  it("a real ObjectSense report overrides the destructible-kill fallback", () => {
    let reported: boolean | undefined;
    const { bind } = makeRows({}, { objectAlive: () => reported });
    const object = bind("_object", ActivityBundleItemType.Object, 11);
    object.call("create");
    object.bound.noteDestructibleKill([0xaaaa], () => [0xaaaa]);
    expect(object.call("is_alive")).toBe(false);
    reported = true;
    expect(object.call("is_alive")).toBe(true);
  });
});

// The Ghost's light-up: of_ghostlight, then tg_m0_gating held at 1.
describe("trigger groups and the hop-on filter", () => {
  it("activate / deactivate write a tg_ row's state as 1 / 0", () => {
    const { bind, last, trace } = makeRows();
    const group = bind("tg_m0_gating", ActivityBundleItemType.TriggerGroup, 36);
    group.call("activate");
    expect(last("triggerGroup", 36)).toEqual({ state: 1 });
    group.call("deactivate");
    expect(last("triggerGroup", 36)).toEqual({ state: 0 });
    expect(trace).toEqual([
      "tg_m0_gating t30#36 trigger group activate()",
      "tg_m0_gating t30#36 trigger group deactivate()",
    ]);
  });

  it("set_filter / clear_filter point a HopOn at its ObjectFilter and back", () => {
    const { bind, last } = makeRows();
    const hopOn = bind("ho_ghostlight", ActivityBundleItemType.HopOn, 101);
    const filter = bind(
      "of_ghostlight",
      ActivityBundleItemType.ObjectFilter,
      124
    );
    hopOn.call("set_filter", filter.object);
    expect(last("hopOn", 101)?.filter).toEqual({
      bundle: BUNDLE,
      typeId: ActivityBundleItemType.ObjectFilter,
      typeIndex: 124,
    });
    hopOn.call("clear_filter");
    expect(last("hopOn", 101)).toEqual({ filter: undefined });
  });

  it("add(actor) puts the one actor on the filter", () => {
    const { bind, last } = makeRows();
    const filter = bind(
      "of_ghostlight",
      ActivityBundleItemType.ObjectFilter,
      124
    );
    const ghost = bind("sq_nux_ghost__ghost", ActivityBundleItemType.Actor, 95);
    filter.call("add", ghost.object);
    expect(last("objectFilter", 124)?.predicates).toEqual([
      {
        kind: "slotObject",
        item: {
          bundle: BUNDLE,
          typeId: ActivityBundleItemType.Actor,
          typeIndex: 95,
        },
      },
    ]);
  });
});

describe("Capturable component (lock/unlock/reset/set_filter/set_icon_index)", () => {
  it("sends icon, lock stamp/locked and reset stamp on the Object row's vec, stamps counting up from 0", () => {
    const { bind, last } = makeRows();
    const zone = bind("_capturable", ActivityBundleItemType.Object, 30);
    zone.call("set_icon_index", 2);
    expect(last("object", 30)?.capturable).toEqual({
      filter: undefined,
      icon: 2,
      lockStamp: 0,
      locked: false,
      resetStamp: 0,
    });
    zone.call("lock");
    expect(last("object", 30)?.capturable).toMatchObject({
      lockStamp: 1,
      locked: true,
    });
    zone.call("unlock");
    expect(last("object", 30)?.capturable).toMatchObject({
      lockStamp: 2,
      locked: false,
    });
    zone.call("reset");
    expect(last("object", 30)?.capturable).toMatchObject({ resetStamp: 1 });
  });

  it("set_filter names the ObjectFilter row that gates who counts as inside", () => {
    const { bind, last } = makeRows();
    const zone = bind("_capturable", ActivityBundleItemType.Object, 31);
    const filter = bind("of", ActivityBundleItemType.ObjectFilter, 9);
    zone.call("set_filter", filter.object);
    expect(last("object", 31)?.capturable?.filter).toEqual({
      bundle: BUNDLE,
      typeId: ActivityBundleItemType.ObjectFilter,
      typeIndex: 9,
    });
  });

  it("reads progress/owner from the sense once it arrives, tenths to a fraction", () => {
    const { bind } = makeRows(
      {},
      {
        capturableSense: (key) =>
          key === itemKey(BUNDLE, 32)
            ? {
                locked: false,
                lockStamp: 1,
                owner: 17,
                progressTenths: 7,
                resetStamp: 0,
              }
            : undefined,
      }
    );
    const zone = bind("_capturable", ActivityBundleItemType.Object, 32);
    expect(zone.call("get_capture_progress")).toBeCloseTo(0.7);
    expect(zone.call("is_captured")).toBe(true);
    expect(zone.call("get_owner_team_index")).toBe(1);
  });

  it("is 0/not captured/no owner before any sense arrives", () => {
    const { bind } = makeRows();
    const zone = bind("_capturable", ActivityBundleItemType.Object, 33);
    expect(zone.call("get_capture_progress")).toBe(0);
    expect(zone.call("is_captured")).toBe(false);
    expect(zone.call("get_owner_team_index")).toBe(-1);
  });

  it("drops a stale sense (echoed from before the last reset) back to none/0", () => {
    const { bind } = makeRows(
      {},
      {
        capturableSense: () => ({
          locked: false,
          lockStamp: 1,
          owner: 16,
          progressTenths: 10,
          resetStamp: 0,
        }),
      }
    );
    const zone = bind("_capturable", ActivityBundleItemType.Object, 34);
    expect(zone.call("is_captured")).toBe(true);
    // Our own resetStamp is now 1; the sense above still echoes 0, so it is
    // stale until the client catches up.
    zone.call("reset");
    expect(zone.call("is_captured")).toBe(false);
    expect(zone.call("get_capture_progress")).toBe(0);
  });

  it("fills at the definition's own capture rate until the client's own sense arrives", () => {
    const { bind } = makeRows(
      {
        capturableDefinition: () => ({
          captureIncidentName: 0x811c_9dc5,
          captureSeconds: 10,
          emptyRateIndex: 0,
          flags: 0,
          occupantRateIndices: [0, 0, 0, 0, 0, 0],
        }),
      },
      { bubbleOccupied: () => true }
    );
    const zone = bind("_capturable", ActivityBundleItemType.Object, 35);
    zone.call("set_icon_index", 0);
    // One tick past the definition's 10s capture rate, so float
    // accumulation still clamps to exactly 1 via Math.min.
    for (let tick = 0; tick < 11; tick++) {
      zone.bound.advance(1);
    }
    expect(zone.call("get_capture_progress")).toBe(1);
    expect(zone.call("is_captured")).toBe(true);
  });

  it("never advances progress with no capturable definition wired", () => {
    const { bind } = makeRows({}, { bubbleOccupied: () => true });
    const zone = bind("_capturable", ActivityBundleItemType.Object, 36);
    zone.call("set_icon_index", 0);
    for (let tick = 0; tick < 30; tick++) {
      zone.bound.advance(1);
    }
    expect(zone.call("get_capture_progress")).toBe(0);
    expect(zone.call("is_captured")).toBe(false);
  });
});

describe("ObjectFaction (set_faction/set_team_index/get_team_index)", () => {
  it("set_faction writes faction and a stamp that counts up", () => {
    const { bind, last } = makeRows();
    const obj = bind("_object_faction", ActivityBundleItemType.Object, 40);
    obj.call("set_faction", 1);
    expect(last("object", 40)?.faction).toEqual({ faction: 1, stamp: 1 });
    obj.call("set_faction", 0);
    expect(last("object", 40)?.faction).toEqual({ faction: 0, stamp: 2 });
  });

  it("set_team_index is set_faction(16 + t)", () => {
    const { bind, last } = makeRows();
    const obj = bind("_object_faction", ActivityBundleItemType.Object, 41);
    obj.call("set_team_index", 2);
    expect(last("object", 41)?.faction).toEqual({ faction: 18, stamp: 1 });
  });

  it("get_team_index is -1 until a sense arrives, even right after set_team_index", () => {
    const { bind } = makeRows();
    const obj = bind("_object_faction", ActivityBundleItemType.Object, 42);
    obj.call("set_team_index", 3);
    expect(obj.call("get_team_index")).toBe(-1);
  });

  it("falls back to the last set value once a tick has passed with no sense back", () => {
    let now = 0;
    const { bind } = makeRows({}, {}, { time: () => now });
    const obj = bind("_object_faction", ActivityBundleItemType.Object, 43);
    obj.call("set_team_index", 4);
    expect(obj.call("get_team_index")).toBe(-1);
    now = 1;
    expect(obj.call("get_team_index")).toBe(4);
  });

  it("prefers the reported sense over the set-value fallback", () => {
    const { bind } = makeRows({}, { factionSense: () => 16 + 5 });
    const obj = bind("_object_faction", ActivityBundleItemType.Object, 44);
    obj.call("set_team_index", 2);
    expect(obj.call("get_team_index")).toBe(5);
  });
});

describe("ObjectTimer component on an Object row", () => {
  // The raid's pillar_switch / warp_ruins pillars drive a Timer verb chain
  // on an Object row, not a Timer row (ObjectTimer, wire tag 0x80802D9D).
  it("activate/start/set_rate_multiplier/stop go out as the component", () => {
    const { bind, last } = makeRows();
    const pillar = bind("ot_vex_pillar", ActivityBundleItemType.Object, 50);
    // activate() runs the countdown; the component carries the same state.
    pillar.call("activate", 10);
    expect(last("object", 50)?.objectTimer).toMatchObject({ active: true });
    expect(last("object", 50)?.objectTimer?.running).toMatchObject({
      rate: 1,
      seconds: 10,
    });
    pillar.call("start");
    expect(last("object", 50)?.objectTimer?.running).toMatchObject({
      rate: 1,
      seconds: 10,
    });
    pillar.call("set_rate_multiplier", 2);
    expect(last("object", 50)?.objectTimer?.running).toMatchObject({
      rate: 2,
    });
    pillar.call("stop");
    expect(last("object", 50)?.objectTimer?.running).toBeUndefined();
  });
});

describe("Interactable disabled filter and re-arm", () => {
  it("set_disabled_player_filter is the opposite polarity of set_enabled_player_filter", () => {
    const { bind, last } = makeRows();
    const object = bind("_object", ActivityBundleItemType.Object, 60);
    const interactable = bind("_interactable", undefined);
    interactable.call("import_only_bind", object.object);
    const filter = bind("of", ActivityBundleItemType.ObjectFilter, 12);
    interactable.call("set_disabled_player_filter", filter.object);
    expect(last("object", 60)?.interactable).toMatchObject({
      enabled: true,
      filter: {
        bundle: BUNDLE,
        typeId: ActivityBundleItemType.ObjectFilter,
        typeIndex: 12,
      },
    });
  });

  it("clear() re-arms a used single-use interactable by bumping its stamp", () => {
    const { bind, last } = makeRows();
    const object = bind("_object", ActivityBundleItemType.Object, 61);
    const interactable = bind("_interactable", undefined);
    interactable.call("import_only_bind", object.object);
    const filter = bind("of", ActivityBundleItemType.ObjectFilter, 13);
    interactable.call("set_enabled_player_filter", filter.object);
    expect(last("object", 61)?.interactable?.used).toEqual({
      stamp: 0,
      value: false,
    });
    interactable.call("clear");
    expect(last("object", 61)?.interactable?.used).toEqual({
      stamp: 1,
      value: false,
    });
    interactable.call("clear");
    expect(last("object", 61)?.interactable?.used).toEqual({
      stamp: 2,
      value: false,
    });
  });
});

describe("PlayerIterator", () => {
  it("walks every player in the activity with no incident metadata", () => {
    const { bind } = makeRows(
      {},
      {},
      { players: () => [{ characterKey: "a" }, { characterKey: "b" }] }
    );
    const it_ = bind("player_iterator");
    it_.call("begin");
    expect(it_.call("is_valid")).toBe(true);
    expect(it_.call("get_character_id")).toBe("a");
    it_.call("next");
    expect(it_.call("get_character_id")).toBe("b");
    it_.call("next");
    expect(it_.call("is_valid")).toBe(false);
  });

  it("walks killing_object_player's one player from a kill's metadata", () => {
    const { bind } = makeRows(
      {},
      {},
      { players: () => [{ characterKey: "k" }] }
    );
    const it_ = bind("incident_player_iterator");
    const metadata = registerIncidentMetadata({
      kill: kill({ killer: { characterKey: "k" } }),
      players: [],
    });
    it_.call("begin", "kill", "killing_object_player", metadata);
    expect(it_.call("is_valid")).toBe(true);
    expect(it_.call("get_character_id")).toBe("k");
  });

  it("could not find audience: an unknown hash iterates nobody", () => {
    const { bind } = makeRows(
      {},
      {},
      { players: () => [{ characterKey: "k" }] }
    );
    const it_ = bind("incident_player_iterator");
    const metadata = registerIncidentMetadata({
      kill: kill({ killer: { characterKey: "k" } }),
      players: [],
    });
    it_.call("begin", "kill", "nonexistent_audience", metadata);
    expect(it_.call("is_valid")).toBe(false);
  });
});

function kill(over: Partial<KillFilterDetails> = {}): KillFilterDetails {
  return { assists: [], killer: {}, victim: {}, ...over };
}

describe("incident listeners: kill filters and dispatch", () => {
  it("bind_bubble_name_hash only counts a kill in that bubble", () => {
    const { bind } = makeRows();
    const listener = bind("kil_squad");
    listener.call("bind_bubble_name_hash", "headlands");
    listener.bound.noteAnyKill(kill({ bubbleHash: fnv1("shattered_coast") }));
    expect(listener.call("get_count")).toBe(0);
    listener.bound.noteAnyKill(kill({ bubbleHash: fnv1("headlands") }));
    expect(listener.call("get_count")).toBe(1);
  });

  it("bind_incident_name_hash only counts kills of that family", () => {
    const { bind } = makeRows();
    const listener = bind("kil_captain");
    listener.call("bind_incident_name_hash", "0xA9FEA575");
    const plain = [fnv1("any_kill"), fnv1("kill")];
    listener.bound.noteAnyKill(kill({ incidentNames: plain }));
    expect(listener.call("get_count")).toBe(0);
    listener.bound.noteAnyKill(
      kill({ incidentNames: [...plain, 0xa9_fe_a5_75] })
    );
    expect(listener.call("get_count")).toBe(1);
    // a kill whose names are not known still counts
    listener.bound.noteAnyKill(kill());
    expect(listener.call("get_count")).toBe(2);
  });

  it("all_players counts every kill, AI-on-AI included", () => {
    const { bind } = makeRows();
    const listener = bind("kil_squad");
    listener.call("bind_hash", "kill", "all_players");
    listener.bound.noteAnyKill(kill());
    expect(listener.call("get_count")).toBe(1);
  });

  it("an unbound audience also counts every kill", () => {
    const { bind } = makeRows();
    const listener = bind("kil_squad");
    listener.call("bind_incident_name_hash", "kill");
    listener.bound.noteAnyKill(kill());
    expect(listener.call("get_count")).toBe(1);
  });

  it("killing_object_player only counts a kill whose killer is an activity player", () => {
    const { bind } = makeRows(
      {},
      {},
      { players: () => [{ characterKey: "k" }] }
    );
    const listener = bind("kil_squad");
    listener.call("bind_hash", "kill", "killing_object_player");
    listener.bound.noteAnyKill(kill());
    expect(listener.call("get_count")).toBe(0);
    listener.bound.noteAnyKill(kill({ killer: { characterKey: "k" } }));
    expect(listener.call("get_count")).toBe(1);
  });

  it("an unknown audience never matches", () => {
    const { bind } = makeRows(
      {},
      {},
      { players: () => [{ characterKey: "k" }] }
    );
    const listener = bind("kil_squad");
    listener.call("bind_hash", "kill", "nonexistent_audience");
    listener.bound.noteAnyKill(kill({ killer: { characterKey: "k" } }));
    expect(listener.call("get_count")).toBe(0);
  });

  it("runs set_handler's closure as a thread on a match", () => {
    const { bind, handlerCalls } = makeRows();
    const listener = bind("il_player_joined");
    const handler = { fakeClosure: true } as unknown as LuaValue;
    listener.call("bind_hash", "player_joined", "all_players");
    listener.call("set_handler", handler);
    listener.bound.dispatchIncident(
      fnv1("player_joined"),
      registerIncidentMetadata({ players: ["a"] })
    );
    expect(handlerCalls).toHaveLength(1);
    expect(handlerCalls[0]?.handler).toBe(handler);
  });

  it("dispatchIncident requires an exact name match", () => {
    const { bind } = makeRows();
    const listener = bind("il_player_left");
    listener.call("bind_hash", "player_left", "all_players");
    listener.bound.dispatchIncident(fnv1("player_joined"), undefined);
    expect(listener.call("get_count")).toBe(0);
    listener.bound.dispatchIncident(fnv1("player_left"), undefined);
    expect(listener.call("get_count")).toBe(1);
  });
});

// A fixture in dominion.scoreboard's byte layout (class 8080261A).
const KILLS_HASH = fnv1("kills");
const FLAG_HOLDER_HASH = fnv1("flag_holder");
const ZONE_BEGIN_HASH = fnv1("zone_begin");
const SOME_FACTION_HASH = fnv1("some_faction");

function scoreboardDefinition(): ScoreboardDefinition {
  return {
    derivedStats: [],
    global: [],
    notifications: [],
    player: [],
    rules: [
      {
        audience: fnv1("killing_player"),
        bytecode: [0x3c, 0, 0x34, 0, 1, 0x3e, 0],
        consts: [1],
        flags: 0b101, // player | global
        incidentName: fnv1("kill"),
        statName: KILLS_HASH,
      },
      {
        audience: SOME_FACTION_HASH,
        bytecode: [0x34, 0, 0x3e, 0],
        consts: [1],
        flags: 0b010, // team
        incidentName: ZONE_BEGIN_HASH,
        statName: FLAG_HOLDER_HASH,
      },
    ],
    tag: 0,
    team: [],
  };
}

describe("scoreboard rule engine", () => {
  it("submit_incident_with_team applies a team-scoped rule directly", () => {
    const { bind, last } = makeRows(
      {},
      {},
      { scoreboardDefinition: scoreboardDefinition() }
    );
    const scoreboard = bind("scoreboard", ActivityBundleItemType.Scoreboard, 3);
    scoreboard.bound.applyScoreboardTeamIncident(ZONE_BEGIN_HASH, 1);
    const state = last("scoreboard", 3);
    expect(state?.teams).toEqual([
      { team: 1, stats: [{ nameHash: FLAG_HOLDER_HASH, value: 1 }] },
    ]);
  });

  it("a kill's player and global stats both bump by 1", () => {
    const { bind, last } = makeRows(
      {},
      {},
      {
        players: () => [{ characterKey: "k", team: 0 }],
        scoreboardDefinition: scoreboardDefinition(),
      }
    );
    const scoreboard = bind("scoreboard", ActivityBundleItemType.Scoreboard, 5);
    scoreboard.bound.noteAnyKill(kill({ killer: { characterKey: "k" } }));
    const state = last("scoreboard", 5);
    expect(state?.global).toEqual([{ nameHash: KILLS_HASH, value: 1 }]);
    expect(state?.players).toEqual([
      {
        characterKey: "k",
        team: 0,
        stats: [{ nameHash: KILLS_HASH, value: 1 }],
      },
    ]);
    // A second kill by the same player accumulates.
    scoreboard.bound.noteAnyKill(kill({ killer: { characterKey: "k" } }));
    const second = last("scoreboard", 5);
    expect(second?.global).toEqual([{ nameHash: KILLS_HASH, value: 2 }]);
  });

  it("is_tied() at 0-0, then false once one team scores (Q7)", () => {
    const { bind } = makeRows(
      {},
      {},
      {
        players: () => [{ characterKey: "k", team: 0 }],
        scoreboardDefinition: scoreboardDefinition(),
      }
    );
    const scoreboard = bind("scoreboard", ActivityBundleItemType.Scoreboard, 7);
    expect(scoreboard.call("is_tied")).toBe(true);
    expect(scoreboard.call("get_leading_team_index")).toBe(-1);
    scoreboard.call("add_player_score", "k", 10, true);
    expect(scoreboard.call("get_team_score", 0)).toBe(10);
    expect(scoreboard.call("is_tied")).toBe(true); // still the only team
    scoreboard.bound.applyScoreboardTeamIncident(ZONE_BEGIN_HASH, 1);
    expect(scoreboard.call("get_team_stat", "flag_holder", 1)).toBe(1);
  });

  it("get_leading_team_index/score pick the higher of two team scores", () => {
    const { bind } = makeRows(
      {},
      {},
      {
        players: () => [
          { characterKey: "a", team: 0 },
          { characterKey: "b", team: 1 },
        ],
        scoreboardDefinition: scoreboardDefinition(),
      }
    );
    const scoreboard = bind("scoreboard", ActivityBundleItemType.Scoreboard, 9);
    scoreboard.call("add_player_score", "a", 10, true);
    scoreboard.call("add_player_score", "b", 20, true);
    expect(scoreboard.call("is_tied")).toBe(false);
    expect(scoreboard.call("get_leading_team_index")).toBe(1);
    expect(scoreboard.call("get_leading_team_score")).toBe(20);
  });
});

// Machine rows (type 40): a nest crawler's performance named with its placement
// and cued once; the Ghost's cued four times.
describe("machines (AI-managed performances)", () => {
  it("start_performance names the performance, cue_performance appends cues", () => {
    const { bind, last, trace } = makeRows();
    const ghost = bind("nux_ghost", ActivityBundleItemType.Machine, 125);
    ghost.call("start_performance", 0x9b_1d_6a_71);
    expect(last("machine", 125)).toEqual({
      cues: [],
      performance: { generation: 1, name: 0x9b_1d_6a_71 },
    });
    ghost.call("cue_performance", 0x10_0e_2b_1d);
    ghost.call("cue_performance", "ghost_complete");
    expect(last("machine", 125)).toEqual({
      cues: [0x10_0e_2b_1d, 0x72_f6_a4_a4],
      performance: { generation: 1, name: 0x9b_1d_6a_71 },
    });
    expect(trace).toEqual([
      "nux_ghost t40#125 performance 0x9b1d6a71",
      "nux_ghost t40#125 cue 0x100e2b1d",
      "nux_ghost t40#125 cue 0x72f6a4a4",
    ]);
  });

  it("keeps the last four cues and counts a restart up", () => {
    const { bind, last } = makeRows();
    const row = bind("crawler1", ActivityBundleItemType.Machine, 127);
    row.call("start_performance", 0x8c_ea_3a_b1);
    for (const cue of [1, 2, 3, 4, 5]) {
      row.call("cue_performance", cue);
    }
    row.call("start_performance", 0x8c_ea_3a_b1);
    expect(last("machine", 127)).toEqual({
      cues: [2, 3, 4, 5],
      performance: { generation: 2, name: 0x8c_ea_3a_b1 },
    });
  });

  it("logs the verbs on any other row and writes nothing", () => {
    const { bind, trace } = makeRows();
    const actor = bind("sq_nux_ghost__ghost", ActivityBundleItemType.Actor, 95);
    actor.call("start_performance", 1);
    expect(trace).toEqual([
      "sq_nux_ghost__ghost:start_performance(1) (not driveable on t2#95)",
    ]);
  });
});

// TU0 keeps only the identifier's hash and has no activity-flag row, so the
// flag is the "0x" literal itself (1C450A3D).
describe("an activity flag named by a row's import identifier", () => {
  const IDENT = 0x1c_45_0a_3d;

  function makeRows() {
    const changes: ItemChange[] = [];
    const flags: [number, boolean][] = [];
    const context: HostContext = {
      types: ActivityBundleItemType,
      activityFlagChanged: (hash, active) => flags.push([hash, active]),
      clock: { activityTicks: () => 0 },
      currentInstance: () => undefined,
      log: () => undefined,
      namedHandles: new Map(),
      noteRowRead: () => undefined,
      objectStates: new Map(),
      placeActors: false,
      players: () => [],
      playerSensor: () => undefined,
      reports: {
        actorBound: () => undefined,
        actorCommandScript: () => undefined,
        actorDropAck: () => undefined,
        actorStanding: () => undefined,
        bubbleOccupied: () => undefined,
        health: () => undefined,
        interactableSense: () => undefined,
        objectAlive: () => undefined,
        objectiveCount: () => undefined,
        playerMonitorCount: () => undefined,
        safeZoneInside: () => undefined,
        squadAliveCount: () => undefined,
        squadCombatCount: () => undefined,
        triggerFired: () => false,
      },
      runHandler: () => undefined,
      sink: (change) => changes.push(change),
      state: new ScriptItemState(),
      time: () => 0,
      trace: [],
    };
    const facts = {
      importIdentifier: (row: BoundRow) =>
        row.typeId === ActivityBundleItemType.Object ? IDENT : undefined,
      navPointPosition: () => undefined,
      owningSquad: () => undefined,
      resolveByIdentifier: () => undefined,
      roster: () => 1,
    };
    const writer = new ItemWriter(context);
    const make = (path: string, row: BoundRow | undefined) => {
      const bound = new BoundInstance(context, writer, path, row, facts);
      registerBoundObject(bound);
      return bound;
    };
    const object = make("sp_placement_array._object", {
      bundle: BUNDLE,
      name: "sp_placement_array._object",
      typeId: ActivityBundleItemType.Object,
      typeIndex: 66,
    });
    const filter = make("sp_placement_array._object_filter", {
      bundle: BUNDLE,
      name: "sp_placement_array._object_filter",
      typeId: ActivityBundleItemType.ObjectFilter,
      typeIndex: 67,
    });
    const flag = make("sp_placement_array._activity_flag", undefined);
    const call = (
      bound: BoundInstance,
      method: string,
      ...args: LuaValue[]
    ) => {
      const fn = bound.object.get(method);
      if (!(fn instanceof LuaHostFunction)) {
        throw new Error(`${method} did not resolve to a host function`);
      }
      return fn.callback([bound.object, ...args], {
        name: method,
        requestYield: () => undefined,
      })?.[0];
    };
    return { call, changes, filter, flag, flags, object };
  }

  it("hands the identifier out as a hash literal, nil without one", () => {
    const { call, flag, object } = makeRows();
    expect(call(object, "import_identifier")).toBe("0x1C450A3D");
    expect(call(flag, "import_identifier")).toBeUndefined();
  });

  it("raises and clears the literal's hash on the players", () => {
    const { call, flag, flags, object } = makeRows();
    call(flag, "import_only_bind", call(object, "import_identifier"));
    call(flag, "activate");
    expect(call(flag, "is_active")).toBe(true);
    call(flag, "clear");
    expect(flags).toEqual([
      [IDENT, true],
      [IDENT, false],
    ]);
  });

  it("filters the players holding that hash and gates the object on them", () => {
    const { call, changes, filter, flag, object } = makeRows();
    call(flag, "import_only_bind", call(object, "import_identifier"));
    call(filter, "add_players_with_activity_flag", flag.object);
    // The literal itself does as well (enc_refinery_portal1 passes it
    // straight from import_identifier()).
    call(filter, "add_players_with_activity_flag", "0x1C450A3D");
    call(object, "set_enabled_player_filter", filter.object);
    const last = [...changes].reverse().find((c) => c.kind === "objectFilter");
    expect(last).toMatchObject({
      state: {
        predicates: [
          { kind: "playersWithActivityFlag", flagNameHash: IDENT },
          { kind: "playersWithActivityFlag", flagNameHash: IDENT },
        ],
      },
    });
    expect(changes.at(-1)).toMatchObject({
      kind: "object",
      state: {
        interactable: {
          enabled: false,
          filter: { bundle: BUNDLE, typeIndex: 67 },
        },
      },
    });
  });
});
