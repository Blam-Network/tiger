import { describe, expect, it } from "vitest";
import type { ScriptSource } from "../../src/hks/source/script_source.ts";
import {
  type LuaHostFunction,
  LuaTable,
  type LuaValue,
  luaLessThan,
} from "../../src/hks/vm/values.ts";
import type { ActivityPlayer } from "../../src/host/activity/encounter_host.ts";
import type { ItemChange } from "../../src/host/state/items.ts";
import {
  ScriptRuntime,
  type ScriptRuntimeOptions,
} from "../../src/versions/destiny1/v41375_14_07_03_1501_live/host/runtime.ts";

const noScripts: ScriptSource = {
  read: () => undefined,
  tags: () => [],
};

function runtime(overrides: Partial<ScriptRuntimeOptions> = {}) {
  const changes: ItemChange[] = [];
  const instance = new ScriptRuntime({
    bundles: [{ bundle: 0x1234_5678, rows: [], tag: 0x809b_800d }],
    clock: { activityTicks: () => 0 },
    onItemChange: (change) => changes.push(change),
    scriptFor: () => undefined,
    scripts: noScripts,
    tickSeconds: 1,
    ...overrides,
  });
  return { changes, instance };
}

// Runs pick_random_count the way `for x in pick_random_count(...)` does.
function picks(instance: ScriptRuntime, ...args: LuaValue[]): LuaValue[] {
  const call = (fn: LuaValue, callArgs: LuaValue[]) =>
    (fn as LuaHostFunction).callback(callArgs, {
      name: (fn as LuaHostFunction).name,
      requestYield: () => undefined,
    }) ?? [];
  const [step, state] = call(
    instance.vm.globals.get("pick_random_count"),
    args
  );
  const out: LuaValue[] = [];
  for (let guard = 0; guard < 16; guard++) {
    const [value] = call(step, [state, out.at(-1)]);
    if (value === undefined) {
      break;
    }
    out.push(value);
  }
  return out;
}

describe("pick_random_count", () => {
  it("picks one of two values for count 1", () => {
    const { instance } = runtime();
    for (let roll = 0; roll < 8; roll++) {
      const [pick, ...rest] = picks(instance, 1, 60, 240);
      expect([60, 240]).toContain(pick);
      expect(rest).toEqual([]);
    }
    // The event timers' form: one candidate, so always that value.
    expect(picks(instance, 1, 60)).toEqual([60]);
  });

  it("yields every squad once when the count covers them all", () => {
    const { instance } = runtime();
    const squads = [1, 2, 3, 4, 5, 6].map((n) => `sq_boss_striker0${n}`);
    const picked = picks(instance, 6, ...squads);
    expect(picked).toHaveLength(6);
    expect([...picked].sort()).toEqual(squads);
  });
});

describe("ScriptRuntime", () => {
  it("runs nothing when no bundle names a script", () => {
    const { changes, instance } = runtime();
    instance.start();
    instance.tick();
    expect(instance.scriptTags).toEqual([]);
    expect(changes).toEqual([]);
  });

  it("ticks once per interval however often it is beaten", () => {
    const { instance } = runtime({ tickSeconds: 2 });
    instance.start();
    expect(instance.tickIfDue(0)).toBe(true);
    expect(instance.tickIfDue(1000)).toBe(false);
    expect(instance.tickIfDue(1900)).toBe(true);
  });

  // Warp gates sharing an identifier, each on its own spawn point with an empty
  // cell and a named gate Actor.
  const GATE_XS = [458.7, 650, 700, 750];
  const gate = (typeIndex: number, x: number) => [
    {
      cells: [0],
      importIdent: 0x2f41_bc62,
      memberCount: 1,
      nameHash: typeIndex,
      spawnPoints: [{ x, y: -300, z: 10 }],
      typeId: 1,
      typeIndex,
    },
    { nameHash: 0x100 + typeIndex, typeId: 2, typeIndex },
  ];
  const gates = (xs = GATE_XS.slice(0, 2)) => {
    const lines: string[] = [];
    const { changes, instance } = runtime({
      bundles: [
        {
          bundle: 0x5176_41f1,
          rows: xs.flatMap((x, i) => gate(i, x)),
          tag: 0x809b_800d,
        },
      ],
      log: (line) => lines.push(line),
    });
    instance.start();
    const credits = () => lines.filter((line) => line.includes("credited to"));
    return { changes, credits, instance };
  };
  const killAt = (instance: ScriptRuntime, x: number) =>
    instance.reportSquadKill(0x2f41_bc62, { x, y: -300.2, z: 10 });

  it("credits a shared-identifier kill to the squad spawned where it died", () => {
    const { credits, instance } = gates();
    killAt(instance, 650);
    instance.reportSquadKill(0x2f41_bc62);
    expect(credits()[0]).toContain("credited to 517641f1:1 (position)");
    expect(credits()[1]).toContain(
      "credited to 517641f1:0 (only one standing)"
    );
  });

  // With no position and several squads standing, no squad is guessed at: the
  // identifier's total still counts.
  it("leaves a shared-identifier kill uncredited while several stand", () => {
    const { credits, instance } = gates();
    instance.reportSquadKill(0x2f41_bc62);
    expect(credits()).toEqual([]);
    const all = new Set(["517641f1:0", "517641f1:1"]);
    // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
    expect(instance["scopeKills"](all)).toBe(1);
    for (const key of all) {
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      expect(instance["squadIncidentDeaths"](key)).toBe(0);
    }
  });

  // A second body dying on a gate's spot is that gate's, not the next one's
  // in table order: that marked a gate still standing dead.
  it("keeps a kill on the squad it matched when that one has no body left", () => {
    const { credits, instance } = gates();
    killAt(instance, 650);
    killAt(instance, 650);
    expect(credits()[1]).toContain(
      "credited to 517641f1:1 (position, no body open) -> 2"
    );
    // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
    expect(instance["squadIncidentDeaths"]("517641f1:0")).toBe(0);
  });

  it("credits each of four gates its own death, in any order", () => {
    const { credits, instance } = gates(GATE_XS);
    const all = new Set(GATE_XS.map((_, i) => `517641f1:${i}`));
    const counts: number[] = [];
    for (const i of [2, 0, 3, 1]) {
      killAt(instance, GATE_XS[i]);
      expect(credits().at(-1)).toContain(
        `credited to 517641f1:${i} (position) -> 1`
      );
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      counts.push(instance["scopeKills"](all));
    }
    expect(counts).toEqual([1, 2, 3, 4]);
    for (const key of all) {
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      expect(instance["squadIncidentDeaths"](key)).toBe(1);
    }
  });

  it("leaves a named squad no child encounter reads to the table", () => {
    expect(gates(GATE_XS).changes).toEqual([]);
  });
});

// `receiver:name(args)`, the way the VM makes the call.
function invoke(
  receiver: LuaValue,
  name: string,
  ...args: LuaValue[]
): LuaValue {
  const fn = (receiver as LuaTable).get(name) as LuaHostFunction;
  return fn.callback([receiver, ...args], {
    name,
    requestYield: () => undefined,
  })?.[0];
}

// Capturable sense's owner-change edge: the client's own capture incident fires
// only when the owner moves to a real team.
describe("capture incident on an owner change", () => {
  it("fires only when the owner changes to a real team, not on every report", () => {
    const { instance } = runtime();
    const captured = () =>
      instance.trace.filter((line) => line.includes("captured by faction"));
    instance.reportCapturableSense(
      { bundle: 0x1234_5678, typeIndex: 5 },
      {
        locked: false,
        lockStamp: 1,
        owner: -1,
        progressTenths: 3,
        resetStamp: 0,
      }
    );
    expect(captured()).toHaveLength(0);
    instance.reportCapturableSense(
      { bundle: 0x1234_5678, typeIndex: 5 },
      {
        locked: false,
        lockStamp: 1,
        owner: 16,
        progressTenths: 10,
        resetStamp: 0,
      }
    );
    expect(captured()).toHaveLength(1);
    // The same owner reported again is not a new capture.
    instance.reportCapturableSense(
      { bundle: 0x1234_5678, typeIndex: 5 },
      {
        locked: false,
        lockStamp: 1,
        owner: 16,
        progressTenths: 10,
        resetStamp: 0,
      }
    );
    expect(captured()).toHaveLength(1);
    // A different team capturing it is.
    instance.reportCapturableSense(
      { bundle: 0x1234_5678, typeIndex: 5 },
      {
        locked: true,
        lockStamp: 2,
        owner: 18,
        progressTenths: 0,
        resetStamp: 0,
      }
    );
    expect(captured()).toHaveLength(2);
  });
});

describe("host natives with no item", () => {
  // With no players option: the solo player once spawned, no power level, so
  // `< 8` reads nil as 0.
  it("answers c_player_script_utilities without player data", () => {
    const { instance } = runtime();
    const library = (method: string) =>
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      instance["libraryCall"]("c_player_script_utilities", method, [])[0];
    expect(library("get_minimum_power_level")).toBeUndefined();
    expect(luaLessThan(library("get_minimum_power_level"), 8)).toBe(true);
    expect(library("get_player_count")).toBe(0);
    expect(library("all_players_are_ready")).toBe(false);
    instance.reportPlayerSpawned();
    expect(library("get_player_count")).toBe(1);
    expect(library("get_ready_player_count")).toBe(1);
    expect(library("all_players_are_ready")).toBe(true);
  });

  // `c_player_script_utilities:get_minimum_power_level()` the way the VM
  // runs it: the class definition, then a method call on it.
  function utilities(players: ActivityPlayer[]) {
    const { instance } = runtime({ players: () => players });
    const classDefinition = instance.vm.globals.get(
      "__class_definition_get"
    ) as LuaHostFunction;
    const [library] =
      classDefinition.callback(["c_player_script_utilities"], {
        name: "__class_definition_get",
        requestYield: () => undefined,
      }) ?? [];
    return (method: string) => invoke(library, method);
  }

  it("gives get_minimum_power_level the lowest player's power level", () => {
    const players: ActivityPlayer[] = [
      { characterKey: "p", powerLevel: 12, ready: true },
      { characterKey: "p", powerLevel: 7, ready: false },
    ];
    const call = utilities(players);
    expect(call("get_minimum_power_level")).toBe(7);
    // Read live: gear changes under a running script.
    players[1] = { characterKey: "p", powerLevel: 16, ready: true };
    expect(call("get_minimum_power_level")).toBe(12);
  });

  it("answers nil when any player's power level is unknown", () => {
    const call = utilities([
      { characterKey: "p", powerLevel: 12, ready: true },
      { characterKey: "p", powerLevel: undefined, ready: true },
    ]);
    expect(call("get_minimum_power_level")).toBeUndefined();
    expect(utilities([])("get_minimum_power_level")).toBeUndefined();
  });

  it("counts the players and the ready ones", () => {
    const players: ActivityPlayer[] = [
      { characterKey: "p", powerLevel: 3, ready: true },
      { characterKey: "p", powerLevel: 3, ready: false },
    ];
    const call = utilities(players);
    expect(call("get_player_count")).toBe(2);
    expect(call("get_ready_player_count")).toBe(1);
    expect(call("all_players_are_ready")).toBe(false);
    players[1] = { characterKey: "p", powerLevel: 3, ready: true };
    expect(call("all_players_are_ready")).toBe(true);
    // Nobody in the activity is not everyone ready.
    expect(utilities([])("all_players_are_ready")).toBe(false);
  });

  // Dead until the player has spawned, then dead again from a
  // player_died kill until their next spawn.
  it("tracks PlayerSensor.is_dead across death and respawn", () => {
    const players: ActivityPlayer[] = [
      { characterKey: "p1", powerLevel: undefined, ready: false },
    ];
    const { instance } = runtime({ players: () => players });
    const sensor = () =>
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      instance["libraryCall"](
        "c_player_script_utilities",
        "get_player_sensor",
        ["p1"]
      )[0];
    expect(invoke(sensor(), "is_dead")).toBe(true);
    players[0] = { ...players[0], ready: true };
    expect(invoke(sensor(), "is_dead")).toBe(false);
    instance.reportPlayerDied("p1");
    expect(invoke(sensor(), "is_dead")).toBe(true);
    // A player_died for someone else does not touch p1.
    instance.reportPlayerDied("p2");
    expect(invoke(sensor(), "is_dead")).toBe(true);
    instance.reportPlayerRespawned("p1");
    expect(invoke(sensor(), "is_dead")).toBe(false);
  });

  it("gives get_lifetime_timer the binder's lifetime_timer item", () => {
    const { changes, instance } = runtime({
      bundles: [
        {
          bundle: 0x4786_c0e0,
          // fnv1("lifetime_timer")
          rows: [{ nameHash: 0xc562_283a, typeId: 17, typeIndex: 2 }],
          tag: 0x809b_8018,
        },
      ],
    });
    const timer = () =>
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      instance["libraryCall"](
        "c_lifetime_script_utilities",
        "get_lifetime_timer",
        []
      )[0];
    const first = timer();
    expect(timer()).toBe(first);
    invoke(first, "reset", 30);
    invoke(first, "start");
    expect(changes.at(-1)).toMatchObject({
      item: { typeId: 17, typeIndex: 2 },
      kind: "timer",
      state: { running: { seconds: 30 } },
    });
  });

  it("drives Lifetime.set_state/allow_join_in_progress/end_game and stops ticking after", () => {
    const { changes, instance } = runtime({
      bundles: [
        {
          bundle: 0x4786_c0e0,
          rows: [{ nameHash: 0x1, typeId: 16, typeIndex: 3 }],
          tag: 0x809b_8018,
        },
      ],
    });
    const sensor = () =>
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      instance["libraryCall"](
        "c_lifetime_script_utilities",
        "get_lifetime_sensor",
        []
      )[0];
    const first = sensor();
    expect(sensor()).toBe(first);

    const member = (name: string) =>
      `native.activitylib.e_activity_lifetime_state.${name}`;
    invoke(first, "set_state", member("active"));
    expect(changes.at(-1)).toMatchObject({
      item: { typeId: 16, typeIndex: 3 },
      kind: "lifetime",
      state: { joinFlag: true, state: 2 },
    });

    invoke(first, "allow_join_in_progress", false);
    expect(changes.at(-1)).toMatchObject({
      kind: "lifetime",
      state: { joinFlag: false, state: 2 },
    });

    invoke(first, "end_game");
    expect(changes.at(-1)).toMatchObject({
      kind: "lifetime",
      state: { joinFlag: false, state: 5 },
    });
    // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
    expect(instance["activityEnded"]).toBe(false);

    // The ended state follows on the next tick (retail sends the pair
    // within one second).
    instance.tick();
    expect(changes.at(-1)).toMatchObject({
      kind: "lifetime",
      state: { state: 6 },
    });
    // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
    expect(instance["activityEnded"]).toBe(true);

    const before = changes.length;
    instance.tick();
    expect(changes.length).toBe(before);
  });

  it("holds a suppressed ambient encounter back until unsuppressed", () => {
    const { instance } = runtime();
    // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
    const manager = instance["encounterManager"](new LuaTable());
    const encounter = new LuaTable();
    invoke(manager, "add_ambient_encounter", encounter, 1, 0, 0, 0, 0);
    invoke(manager, "suppress_encounter", encounter, true);
    instance.tick();
    instance.tick();
    expect(instance.trace.some((line) => line.endsWith(" activated"))).toBe(
      false
    );
    invoke(manager, "suppress_encounter", encounter, false);
    instance.tick();
    expect(instance.trace).toContain("encounters: script activated");
  });

  // RowFacts.sequenceDuration reads the tag row's own
  // sequenceDurationSeconds, which the caller's bundle reader fills in.
  it("reads a Sequence row's own duration off the tag data", () => {
    const { instance } = runtime({
      bundles: [
        {
          bundle: 0x1234,
          rows: [
            {
              nameHash: 1,
              sequenceDurationSeconds: 12,
              typeId: 5,
              typeIndex: 0,
            },
            // A music bed with no fixed length: the raw 0 comes through -
            // natives.ts, not this read, decides what 0 means.
            {
              nameHash: 2,
              sequenceDurationSeconds: 0,
              typeId: 5,
              typeIndex: 1,
            },
          ],
          tag: 0x809b_8018,
        },
      ],
    });
    expect(
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      instance["sequenceDuration"]({
        bundle: 0x1234,
        name: "a",
        typeId: 5,
        typeIndex: 0,
      })
    ).toBe(12);
    expect(
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      instance["sequenceDuration"]({
        bundle: 0x1234,
        name: "b",
        typeId: 5,
        typeIndex: 1,
      })
    ).toBe(0);
    // Not a Sequence row at all.
    expect(
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      instance["sequenceDuration"]({
        bundle: 0x1234,
        name: "c",
        typeId: 4,
        typeIndex: 0,
      })
    ).toBeUndefined();
  });

  // RowFacts.hasSequence reads the tag row's own
  // sequenceHasBlueprint the same way sequenceDuration reads its duration.
  it("reads a Sequence row's own has_sequence off the tag data", () => {
    const { instance } = runtime({
      bundles: [
        {
          bundle: 0x1234,
          rows: [
            {
              nameHash: 1,
              sequenceHasBlueprint: true,
              typeId: 5,
              typeIndex: 0,
            },
            // An objective archetype's _incoming_sequence placeholder.
            {
              nameHash: 2,
              sequenceHasBlueprint: false,
              typeId: 5,
              typeIndex: 1,
            },
          ],
          tag: 0x809b_8018,
        },
      ],
    });
    expect(
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      instance["hasSequence"]({
        bundle: 0x1234,
        name: "a",
        typeId: 5,
        typeIndex: 0,
      })
    ).toBe(true);
    expect(
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      instance["hasSequence"]({
        bundle: 0x1234,
        name: "b",
        typeId: 5,
        typeIndex: 1,
      })
    ).toBe(false);
    // Not a Sequence row at all.
    expect(
      // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
      instance["hasSequence"]({
        bundle: 0x1234,
        name: "c",
        typeId: 4,
        typeIndex: 0,
      })
    ).toBeUndefined();
  });
});

// A fire survives a re-arm for a while: the client fires on entry only.
describe("trigger fires across a re-arm", () => {
  const BUNDLE = 0x1234_5678;
  const key = `${(BUNDLE >>> 0).toString(16)}:35`;

  it("keeps a recent fire and forgets an old one", () => {
    const { instance } = runtime();
    instance.reportTriggerFired({ bundle: BUNDLE, typeIndex: 35 });
    for (let i = 0; i < 3; i++) {
      instance.tick();
    }
    instance.forgetStaleTriggerFire(key);
    expect(instance.world.at(key)?.triggerFiredAt).toBeDefined();
    for (let i = 0; i < 11; i++) {
      instance.tick();
    }
    instance.forgetStaleTriggerFire(key);
    expect(instance.world.at(key)?.triggerFiredAt).toBeUndefined();
  });

  it("hands a client incident to the listeners by name hash", () => {
    const { instance } = runtime();
    expect(() => instance.reportClientIncident(0xbd_1f_b4_18)).not.toThrow();
  });
});
