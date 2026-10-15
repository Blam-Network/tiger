// A wiped ambient squad's respawn: the bodies go on top of the dead cells
// (retail's dome A Fallen went 2 -> 4), and alive_count holds at what was
// asked for until the client reports them.
import { describe, expect, it } from "vitest";
import { LuaHostFunction, type LuaValue } from "../../src/hks/vm/values.ts";
import type { BoundRow } from "../../src/host/bound/bindings.ts";
import {
  BoundInstance,
  type HostContext,
  ItemWriter,
  type RowFacts,
  registerBoundObject,
} from "../../src/host/natives/natives.ts";
import { ScriptItemState } from "../../src/host/state/item_state.ts";
import type { ItemChange } from "../../src/host/state/items.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/tag_types.ts";

const BUNDLE = 0x34e80eed;

function makeSquad() {
  const client: {
    alive?: number;
    deaths?: number;
    tally?: readonly number[];
  } = {};
  let ticks = 100;
  const changes: ItemChange[] = [];
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
      bubbleOccupied: () => undefined,
      health: () => undefined,
      objectAlive: () => undefined,
      objectiveCount: () => undefined,
      playerMonitorCount: () => undefined,
      safeZoneInside: () => undefined,
      squadAliveCount: () => client.alive,
      squadCombatCount: () => undefined,
      squadIncidentDeaths: () => client.deaths,
      squadTally: () => client.tally,
      triggerFired: () => false,
    },
    runHandler: () => undefined,
    sink: (change) => {
      changes.push(change);
    },
    state: new ScriptItemState(),
    time: () => 0,
    trace: [],
  };
  const row: BoundRow = {
    bundle: BUNDLE,
    name: "_squad",
    typeId: ActivityBundleItemType.Squad,
    typeIndex: 7,
  };
  const rows: RowFacts = {
    defaultBodies: () => 2,
    namedMembers: () => [],
    navPointPosition: () => undefined,
    owningSquad: () => undefined,
    resolveByIdentifier: () => undefined,
    roster: () => 2,
  };
  const squad = new BoundInstance(
    context,
    new ItemWriter(context),
    row.name,
    row,
    rows
  );
  registerBoundObject(squad);
  const group = new BoundInstance(
    context,
    new ItemWriter(context),
    "_squad_group",
    undefined,
    rows
  );
  registerBoundObject(group);
  const actor = new BoundInstance(
    context,
    new ItemWriter(context),
    "_squad__dropship",
    {
      bundle: BUNDLE,
      name: "_squad__dropship",
      typeId: ActivityBundleItemType.Actor,
      typeIndex: 62,
    },
    rows
  );
  registerBoundObject(actor);
  const callOn =
    (target: BoundInstance) =>
    (method: string, ...args: LuaValue[]): LuaValue => {
      const fn = target.object.get(method);
      if (!(fn instanceof LuaHostFunction)) {
        throw new Error(`${method} did not resolve to a host function`);
      }
      return fn.callback([target.object, ...args], {
        name: method,
        requestYield: () => undefined,
      })?.[0] as LuaValue;
    };
  return {
    advance: (by: number) => {
      ticks += by;
    },
    bodies: () => context.state.bodiesFor(BUNDLE, 7),
    actor: callOn(actor),
    actorState: () => {
      const last = changes.filter((c) => c.kind === "actor").at(-1);
      return last?.kind === "actor" ? last.state : undefined;
    },
    call: callOn(squad),
    client,
    group: callOn(group),
    placedAt: () => context.state.squad(row).placedAt,
    squad: squad.object,
  };
}

describe("a wiped squad's respawn", () => {
  it("adds the bodies on top of the dead ones and holds until the client reports", () => {
    const { advance, bodies, call, client, placedAt } = makeSquad();
    call("place");
    expect(bodies()).toBe(2);
    client.alive = 2;
    client.tally = [0];
    client.deaths = 0;
    expect(call("alive_count")).toBe(2);
    // wiped
    client.alive = 0;
    client.tally = [2];
    client.deaths = 2;
    expect(call("alive_count")).toBe(0);
    advance(7681);
    call("respawn");
    expect(bodies()).toBe(4);
    expect(placedAt()).toBe(7781);
    // the client has not caught up: still the wipe's report
    expect(call("alive_count")).toBe(2);
    client.alive = 2;
    expect(call("alive_count")).toBe(2);
    client.alive = 1;
    client.tally = [3];
    client.deaths = 3;
    expect(call("alive_count")).toBe(1);
  });

  // simple_encounter's main, run again by the encounter manager: add_child
  // each time, place the first time, respawn after.
  it("comes back under its group when the encounter runs again", () => {
    const { bodies, client, group, squad } = makeSquad();
    group("add_child", squad);
    group("place");
    client.alive = 2;
    client.tally = [0];
    client.deaths = 0;
    expect(group("alive_count")).toBe(2);
    client.alive = 0;
    client.tally = [2];
    client.deaths = 2;
    expect(group("alive_count")).toBe(0);
    group("add_child", squad);
    group("respawn");
    expect(bodies()).toBe(4);
    expect(group("alive_count")).toBeGreaterThan(0);
  });

  // The table placed the squad (the host's default bodies) before any
  // script placement: respawn still refills on top of the dead cells.
  it("refills a table-placed squad the script never placed", () => {
    const { bodies, call, client } = makeSquad();
    client.alive = 0;
    client.tally = [2];
    client.deaths = 2;
    expect(call("alive_count")).toBe(0);
    call("respawn");
    expect(bodies()).toBe(4);
    expect(call("alive_count")).toBe(2);
  });

  // Retail's Last Array wave ship flew its exit and came back for the next
  // wave as a new actor: ActorAuth [0] 1 -> 2 -> 3, nothing left to drop.
  it("places an already placed actor afresh, its drops cleared", () => {
    const { actor, actorState, squad } = makeSquad();
    actor("place");
    expect(actorState()?.incarnation).toBeUndefined();
    actor("drop_squad", squad);
    expect(actorState()?.drop?.squads).toHaveLength(1);
    actor("place");
    expect(actorState()?.incarnation).toBe(2);
    expect(actorState()?.drop).toBeUndefined();
    actor("place");
    expect(actorState()?.incarnation).toBe(3);
  });
});
