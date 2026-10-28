import { describe, expect, it } from "vitest";
import type { HksBytecode } from "../../../../../src/hks/bytecode/proto.ts";
import {
  directoryScriptSource,
  loadScriptChunk,
  type ScriptSource,
  scriptReferences,
} from "../../../../../src/hks/source/script_source.ts";
import {
  type LuaHostFunction,
  LuaTable,
  type LuaValue,
  luaLessThan,
} from "../../../../../src/hks/vm/values.ts";
import {
  type ActivityPlayer,
  EncounterScriptHost,
} from "../../../../../src/host/activity/encounter_host.ts";
import { scoreboardSensor } from "../../../../../src/host/schedule/scheduling_threads.ts";
import type { ItemChange } from "../../../../../src/host/state/items.ts";
import { fnv1 } from "../../../../../src/host/tags/name_hash.ts";
import {
  ScriptRuntime,
  type ScriptRuntimeOptions,
} from "../../../../../src/versions/destiny1/v36735_13_12_02_1953_alpha/host/runtime.ts";
import { ActivityBundleItemType } from "../../../../../src/versions/destiny1/v36735_13_12_02_1953_alpha/host/tag_types.ts";

// A directory of dumped script tags (`<TAGID>_<label>.lua51`). The
// alpha's scripts aren't redistributable, so these tests only run locally.
const chunkDir = process.env.TIGER_LUA_CHUNKS;

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
      state: { state: 5 },
    });
    // biome-ignore lint/complexity/useLiteralKeys: reaches a private member on purpose
    expect(instance["activityEnded"]).toBe(false);

    // retail sends the results state and the ended state as one pair
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

describe.skipIf(chunkDir === undefined)("the alpha's scripts", () => {
  const scripts = () => directoryScriptSource(chunkDir as string);
  // pvp_factory's (8220C001) script-class members, as its schema declares
  // them: the controller and the four game types it embeds.
  const pvpFactoryMembers = {
    "8220C001": {
      dominion: "8220C004",
      pvp_controller: "8220C003",
      salvage: "8220C005",
      slayer: "8220C006",
      slayer_ffa: "8220C007",
    },
  };

  it("finds venus_chapter_2's missions through the root's references", () => {
    expect(scriptReferences(scripts(), "821B8000")).toEqual([
      "821B801D",
      "821B801E",
      "821B801F",
      "821B8020",
    ]);
    const { instance } = runtime({
      scriptFor: () => 0x821b_8000,
      scripts: scripts(),
    });
    expect(instance.scriptTags.slice(0, 5)).toEqual([
      "821B8000",
      "821B801D",
      "821B801E",
      "821B801F",
      "821B8020",
    ]);
  });

  // The table places the gate squad; the named gate is placed from setup so the
  // cell goes out at its authored 0.
  it("places each table-placed warp gate's named gate at setup", () => {
    const warpGate = loadScriptChunk(scripts(), "821B803E");
    expect(warpGate).toBeDefined();
    const row = (name: string, typeId: number, typeIndex: number) => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
    });
    const rows = [0, 1, 2, 3].flatMap((i) => {
      const encounter = `phase02.vex_warp_gate0${i}`;
      return [
        {
          ...row(encounter, ActivityBundleItemType.Encounter, i),
          childScript: "vex_warp_gate",
        },
        {
          ...row(`${encounter}._squad`, 1, 69 + 2 * i),
          cells: [0],
          importIdent: 0x2f41_bc62,
          memberCount: 1,
        },
        row(`${encounter}._squad__gate`, 2, 70 + 2 * i),
      ];
    });
    const changes: ItemChange[] = [];
    new EncounterScriptHost({
      types: ActivityBundleItemType,
      bundles: [{ bundle: 0x5176_41f1, rows, tag: 0x809b_800d }],
      childScripts: new Map([["vex_warp_gate", warpGate as HksBytecode]]),
      chunks: [],
      clock: { activityTicks: () => 0 },
      onItemChange: (change) => changes.push(change),
      tickSeconds: 1,
    }).start();
    expect(changes).toEqual(
      [70, 72, 74, 76].map((typeIndex) => ({
        item: expect.objectContaining({ typeId: 2, typeIndex }),
        kind: "actor",
        state: { placed: true },
      }))
    );
  });

  it("starts the activity's first mission", () => {
    const phases: string[] = [];
    const { instance } = runtime({
      onPhaseStarted: (phase) => phases.push(phase),
      scriptFor: () => 0x821b_8000,
      scripts: scripts(),
    });
    instance.start();
    instance.reportPlayerSpawned();
    for (let i = 0; i < 5; i++) {
      instance.tick();
    }
    const snapshot = instance.debugSnapshot();
    expect(snapshot.phases).toHaveLength(4);
    expect(snapshot.phase).toBe(snapshot.phases[0]);
    expect(phases).toEqual([snapshot.phases[0]]);
  });

  // Dominion's chunk (8220C004) has no init/tick/start: they are
  // c_pvp_game_type's, reached through the class chain.
  it("pvp_factory's game_thread gets past init", () => {
    const slayerDelegates = [
      "d_init",
      "d_slayer_handle_assist",
      "d_slayer_handle_kill",
      "d_slayer_init",
      "d_slayer_start",
      "d_slayer_tick",
      "d_start",
      "d_tick",
    ];
    const classChainMap = {
      "8220C003": { chain: ["8220C003"], delegates: ["d_finalize"] },
      "8220C004": {
        chain: ["8220C008", "8220C006", "8220C004"],
        delegates: slayerDelegates,
      },
      "8220C005": {
        chain: ["8220C008", "8220C006", "8220C005"],
        delegates: slayerDelegates,
      },
      "8220C006": {
        chain: ["8220C008", "8220C006"],
        delegates: slayerDelegates,
      },
      "8220C007": {
        chain: ["8220C008", "8220C006", "8220C007"],
        delegates: slayerDelegates,
      },
    };
    const { instance } = runtime({
      bundles: [{ bundle: 0x3977_4ee1, rows: [], tag: 0x80a0_c008 }],
      childScriptSchemaMap: pvpFactoryMembers,
      classChainMap,
      scriptFor: () => 0x8220_c001,
      scripts: scripts(),
    });
    instance.start();
    instance.reportPlayerSpawned();
    for (let i = 0; i < 5; i++) {
      instance.tick();
    }
    // Neither failure reappears; what remains is missing row data in this fixture.
    expect(instance.trace).not.toContain(
      "chunk 8220C004 did not load, its scripts do not run: attempt to index a nil value with import_only_bind [chunk 8220C004, proto @2658, pc 44, SELF (8)]"
    );
    const initCallFailed = instance.trace.some(
      (line) =>
        line.includes("thread game_thread failed") &&
        line.includes("attempt to call a nil value") &&
        line.includes("chunk 8220C003, proto @1215, pc 90")
    );
    expect(initCallFailed).toBe(false);
  });

  // zone_capturables has no row family: `import_only_bind(self.zones[i])` binds
  // each to the same Object row as zones[i].
  it("dominion's zone_capturables adopt the matching zone's Object row", () => {
    // Loaded as a top-level root, so field reads resolve bare names.
    const row = (i: number) => ({
      nameHash: fnv1(`zones[${i}]`),
      typeId: 4,
      typeIndex: 40 + i,
    });
    const classChainMap = {
      "8220C003": { chain: ["8220C003"], delegates: ["d_finalize"] },
      "8220C004": {
        chain: ["8220C008", "8220C006", "8220C004"],
        delegates: [
          "d_init",
          "d_slayer_handle_assist",
          "d_slayer_handle_kill",
          "d_slayer_init",
          "d_slayer_start",
          "d_slayer_tick",
          "d_start",
          "d_tick",
        ],
      },
    };
    const { instance } = runtime({
      bundles: [
        {
          bundle: 0x3977_4ee1,
          rows: [row(0), row(1), row(2)],
          tag: 0x80a0_c008,
        },
      ],
      childScriptSchemaMap: pvpFactoryMembers,
      classChainMap,
      scriptFor: () => 0x8220_c001,
      scripts: scripts(),
    });
    instance.start();
    instance.reportPlayerSpawned();
    for (let i = 0; i < 5; i++) {
      instance.tick();
    }
    for (let i = 0; i < 3; i++) {
      const boundToTheZonesRow = instance.trace.some(
        (line) =>
          line.startsWith(`zone_capturables[${i}]:import_only_bind`) &&
          line.includes(`t4#${40 + i}`)
      );
      expect(boundToTheZonesRow).toBe(true);
    }
  });

  // pvp_gametype_hash is a real scalar, resolved by number; dominion's own
  // d_slayer_init_impl (80A0C015) printing is the signal that it ran.
  it("pvp_gametype selects dominion via the real option hash and runs 300+ ticks clean", () => {
    const slayerDelegates = [
      "d_init",
      "d_slayer_handle_assist",
      "d_slayer_handle_kill",
      "d_slayer_init",
      "d_slayer_start",
      "d_slayer_tick",
      "d_start",
      "d_tick",
    ];
    const classChainMap = {
      "8220C003": { chain: ["8220C003"], delegates: ["d_finalize"] },
      "8220C004": {
        chain: ["8220C008", "8220C006", "8220C004"],
        delegates: slayerDelegates,
      },
      "8220C005": {
        chain: ["8220C008", "8220C006", "8220C005"],
        delegates: slayerDelegates,
      },
      "8220C006": {
        chain: ["8220C008", "8220C006"],
        delegates: slayerDelegates,
      },
      "8220C007": {
        chain: ["8220C008", "8220C006", "8220C007"],
        delegates: slayerDelegates,
      },
    };
    const { instance } = runtime({
      activityOptions: {
        byHash: { [fnv1("pvp_gametype")]: fnv1("dominion") },
        integerArrays: {},
      },
      bundles: [{ bundle: 0x3977_4ee1, rows: [], tag: 0x80a0_c008 }],
      childScriptSchemaMap: pvpFactoryMembers,
      classChainMap,
      // Schema fast-init scalars: the option's name hash and each mode's name must be
      // real numbers for the mode match to succeed.
      scalarDefaults: {
        "8220C001": {
          dominion_hash: fnv1("dominion"),
          salvage_hash: fnv1("salvage"),
          slayer_ffa_hash: fnv1("slayer_ffa"),
          slayer_hash: fnv1("slayer"),
        },
        "8220C003": {
          game_type_count: 0,
          pvp_gametype_hash: fnv1("pvp_gametype"),
        },
      },
      scriptFor: () => 0x8220_c001,
      scripts: scripts(),
    });
    instance.start();
    instance.reportPlayerSpawned();
    for (let i = 0; i < 300; i++) {
      instance.tick();
    }
    expect(
      instance.trace.some((line) =>
        line.includes("in c_pvp_dominion.d_slayer_init")
      )
    ).toBe(true);
    // The controller and game types are pvp_factory's declared members,
    // embedded in its instance rather than run beside it.
    expect(instance.trace).toContain(
      "pvp_controller runs child script c_pvp_controller (8220C003)"
    );
    const threadErrors = instance
      .debugSnapshot()
      .threads.filter((thread) => thread.error !== undefined);
    expect(threadErrors).toEqual([]);
  }, 30_000);

  // The dominion boot plus a Scoreboard row, scoring a kill and a synthetic
  // capture (34FD8483) through the running instance.
  it("scores a kill and a submitted team incident on the real dominion scoreboard", () => {
    const slayerDelegates = [
      "d_init",
      "d_slayer_handle_assist",
      "d_slayer_handle_kill",
      "d_slayer_init",
      "d_slayer_start",
      "d_slayer_tick",
      "d_start",
      "d_tick",
    ];
    const classChainMap = {
      "8220C003": { chain: ["8220C003"], delegates: ["d_finalize"] },
      "8220C004": {
        chain: ["8220C008", "8220C006", "8220C004"],
        delegates: slayerDelegates,
      },
      "8220C005": {
        chain: ["8220C008", "8220C006", "8220C005"],
        delegates: slayerDelegates,
      },
      "8220C006": {
        chain: ["8220C008", "8220C006"],
        delegates: slayerDelegates,
      },
      "8220C007": {
        chain: ["8220C008", "8220C006", "8220C007"],
        delegates: slayerDelegates,
      },
    };
    const KILLS_HASH = fnv1("kills");
    const ZONE_CAPTURED_HASH = fnv1("pvp_dominion_zone_captured");
    const CAPTURING_FACTION_HASH = fnv1("capturing_faction");
    const DOMINION_ZONES_HASH = fnv1("dominion_zones");
    const { changes, instance } = runtime({
      activityOptions: {
        byHash: { [fnv1("pvp_gametype")]: fnv1("dominion") },
        integerArrays: {},
      },
      bundles: [
        {
          bundle: 0x3977_4ee1,
          rows: [
            {
              name: "scoreboard",
              nameHash: fnv1("scoreboard"),
              typeId: 15,
              typeIndex: 0,
            },
          ],
          tag: 0x80a0_c008,
        },
      ],
      childScriptSchemaMap: pvpFactoryMembers,
      classChainMap,
      players: () => [{ characterKey: "k", powerLevel: 1, ready: true }],
      scalarDefaults: {
        "8220C001": {
          dominion_hash: fnv1("dominion"),
          salvage_hash: fnv1("salvage"),
          slayer_ffa_hash: fnv1("slayer_ffa"),
          slayer_hash: fnv1("slayer"),
        },
        "8220C003": {
          game_type_count: 0,
          pvp_gametype_hash: fnv1("pvp_gametype"),
        },
      },
      scoreboardDefinition: {
        derivedStats: [],
        global: [],
        notifications: [],
        player: [],
        rules: [
          {
            audience: fnv1("killing_player"),
            bytecode: [0x3c, 0, 0x34, 0, 1, 0x3e, 0],
            consts: [1],
            flags: 0b101,
            incidentName: fnv1("kill"),
            statName: KILLS_HASH,
          },
          {
            audience: CAPTURING_FACTION_HASH,
            bytecode: [0x3c, 0, 0x34, 0, 1, 0x3e, 0],
            consts: [1],
            flags: 0b010,
            incidentName: ZONE_CAPTURED_HASH,
            statName: DOMINION_ZONES_HASH,
          },
        ],
        tag: 0x809e_204f,
        team: [],
      },
      scriptFor: () => 0x8220_c001,
      scripts: scripts(),
    });
    instance.start();
    instance.reportPlayerSpawned();
    for (let i = 0; i < 30; i++) {
      instance.tick();
    }
    // Forces the Scoreboard row's bound object into existence, the same
    // lazy build get_scoreboard() does on a script's first call - this
    // fixture's chunk set never reaches one itself.
    scoreboardSensor(instance, "test");
    instance.reportKill({
      assists: [],
      killer: { characterKey: "k" },
      victim: {},
    });
    // Stands in for the 34FD8483 capture incident: same rule engine and audience.
    instance.submitIncidentWithTeam(ZONE_CAPTURED_HASH, 1);
    const scoreboard = changes.filter((change) => change.kind === "scoreboard");
    const afterCapture = scoreboard.at(-1);
    expect(afterCapture?.kind).toBe("scoreboard");
    expect(
      afterCapture?.kind === "scoreboard"
        ? afterCapture.state.players
        : undefined
    ).toEqual([
      {
        characterKey: "k",
        team: undefined,
        stats: [{ nameHash: KILLS_HASH, value: 1 }],
      },
    ]);
    expect(
      afterCapture?.kind === "scoreboard"
        ? afterCapture.state.global
        : undefined
    ).toEqual([{ nameHash: KILLS_HASH, value: 1 }]);
    expect(
      afterCapture?.kind === "scoreboard" ? afterCapture.state.teams : undefined
    ).toEqual([
      { team: 1, stats: [{ nameHash: DOMINION_ZONES_HASH, value: 1 }] },
    ]);
  }, 30_000);
});
