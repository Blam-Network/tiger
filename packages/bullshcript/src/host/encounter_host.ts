// Runs an activity's scripts against its items. Time moves only in tick(),
// so the same reports replay to the same calls in the same order.

import type { BsSchema } from "../bungiescript/schema.ts";
import {
  LuaScheduler,
  type LuaScriptThread,
  type LuaTickContext,
} from "../hks/coroutines.ts";
import { LuaHostEnvironment, LuaHostObject } from "../hks/host_env.ts";
import {
  fieldMethodCalls,
  handleFieldNames,
  tableFieldNames,
} from "../hks/script_shape.ts";
import {
  formatScriptTag,
  loadScriptChunk,
  type ScriptSource,
  scriptReferences,
} from "../hks/script_source.ts";
import type { LuaChunk } from "../hks/types.ts";
import {
  LuaClosure,
  LuaHostFunction,
  LuaTable,
  type LuaValue,
  luaToString,
  toNumber,
} from "../hks/values.ts";
import { LuaVm } from "../hks/vm.ts";
import type { ActivityOptionSet } from "./activity_options.ts";
import { type BoundRow, navPointIndex, squadRosterSize } from "./bindings.ts";
import {
  type CommandScriptIndex,
  commandScriptIndex,
} from "./command_script.ts";
import { registerIncidentMetadata } from "./incident_natives.ts";
import * as instanceBuilding from "./instance_building.ts";
import { itemKey } from "./item_key.ts";
import { ScriptItemState } from "./item_state.ts";
import type {
  ItemChange,
  ItemKey,
  ItemRef,
  ScoreboardDefinition,
} from "./items.ts";
import { bindLibraryNatives } from "./library_natives.ts";
import { FNV1_EMPTY, fnv1 } from "./name_hash.ts";
import {
  boundObjectOf,
  type KillFilterDetails,
  LIFETIME_CINEMATIC_STATE,
  LIFETIME_RESULTS_STATE,
  type LuaBoundObject,
  type LuaHostClock,
  type LuaHostContext,
  LuaItemWriter,
  LuaPredicatePack,
  type LuaReports,
  showArgs,
  unboundAnswer,
  unboundLabel,
} from "./natives.ts";
import * as objectiveTaskAssignment from "./objective_task_assignment.ts";
import type { EncounterManager } from "./scheduling_threads.ts";
import * as schedulingThreads from "./scheduling_threads.ts";
import * as sequenceNatives from "./sequence_natives.ts";
import type {
  ActivityBundleItemTypes,
  ActivityBundleTag,
  ControlPointCommandScript,
  NavPointPosition,
  WorldPosition,
} from "./tag_types.ts";

export interface LuaEncounterHostOptions {
  // Omitted, every option reads 0.
  activityOptions?: ActivityOptionSet;
  bundles: readonly ActivityBundleTag[];
  // Omitted, an unresolved row keeps no pre-sense progress estimate.
  capturableDefinition?(
    bundle: number,
    typeIndex: number
  ):
    | {
        captureIncidentName: number;
        captureSeconds: number;
        emptyRateIndex: number;
        flags: number;
        occupantRateIndices: readonly number[];
      }
    | undefined;
  // Parent field name -> child chunk tag id, for Encounter rows the package
  // data can't resolve.
  childScriptSchemaMap?: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
  // Keyed by the slot's field name; a slot with no entry stays a bound row.
  childScripts?: ReadonlyMap<string, LuaChunk>;
  // The bundle whose own script each root chunk is; a root resolves its rows
  // against it first.
  chunkOwners?: ReadonlyMap<string, number>;
  // A phase script and a bubble's encounter script run as sibling instances.
  chunks: readonly LuaChunk[];
  // Class chain (base first) and delegate names per tag id. Omitted, an
  // instance answers only its own chunk's methods.
  classChainMap?: Readonly<
    Record<
      string,
      Readonly<{ chain: readonly string[]; delegates: readonly string[] }>
    >
  >;
  clock: LuaHostClock;
  // Without them execute()/follow_path run empty scripts.
  commandScripts?: readonly ControlPointCommandScript[];
  // Authored scalars no package data supplies; otherwise they read nil.
  constants?: Readonly<Record<string, LuaValue>>;
  // Omitted, enum_to_int answers nil.
  enumValue?: (member: string) => number | undefined;
  // The binder's Timer; omitted, a lifetime_timer among `bundles` answers.
  lifetimeTimer?: ItemRef;
  log?: (line: string) => void;
  namedHandles?: Readonly<Record<string, boolean>>;
  navPoints?: readonly NavPointPosition[];
  onActivityComplete?: () => void;
  onActivityFlag?: (hash: number, active: boolean) => void;
  onEncounterActivated?: (encounter: string) => void;
  onItemChange?: (change: ItemChange) => void;
  onPhaseStarted?: (phase: string) => void;
  onThreadStarted?: (thread: string) => void;
  // The phase index lives outside the host, which is rebuilt per bubble.
  phaseProgress?: { read(): number; write(index: number): void };
  placeActors?: boolean;
  // Read on every call, since gear and readiness change. Omitted: one player,
  // ready once spawned, no power level.
  players?: () => readonly ActivityPlayer[];
  // Omitted, every chunk is a root.
  rootTags?: ReadonlySet<string>;
  scalarDefaults?: Readonly<
    Record<string, Readonly<Record<string, boolean | number>>>
  >;
  // A chunk with no schema is read off its own shape.
  schemas?: ReadonlyMap<string, BsSchema>;
  // Omitted, get_scoreboard() returns an inert handle.
  scoreboardDefinition?: ScoreboardDefinition;
  seed?: number;
  // Omitted, every squad is.
  squadPlacedByDefault?: (bundle: number, typeIndex: number) => boolean;
  tickSeconds: number;
  types: ActivityBundleItemTypes;
}

export interface ActivityPlayer {
  // A string: a u64 character id does not fit a double.
  characterKey: string;
  powerLevel: number | undefined;
  // Spawned into the activity.
  ready: boolean;
  // PlayerAuth faction - 16; undefined until a team is assigned.
  teamIndex?: number;
}

// enum_of(t): the compiler's generic-for generator, indexed from 0.
const ENUM_OF_STEP = new LuaHostFunction("enum_of.step", (args) => {
  const table = args[0];
  const index = (typeof args[1] === "number" ? args[1] : -1) + 1;
  const value = table instanceof LuaTable ? table.get(index) : undefined;
  return value === undefined ? [] : [index, value];
});
const ENUM_OF = new LuaHostFunction("enum_of", (args) => [
  ENUM_OF_STEP,
  args[0],
  -1,
]);

// `complete` runs separately once `main` has finished.
export const PHASE_LIFECYCLE = ["init", "main"] as const;

const MS_PER_SECOND = 1000;

// A beat this far into a tick counts as the next tick, so keepalive
// jitter never drops one.
const TICK_DUE_FRACTION = 0.9;

// Host-synthesized on join and leave.
const PLAYER_JOINED_HASH = fnv1("player_joined");
const PLAYER_LEFT_HASH = fnv1("player_left");
// The capturable definition's incident name (def+0x6C) when unset
// (sub_838E9860).
const CAPTURE_INCIDENT_HASH = fnv1("capture");
// Host seconds a trigger's fire outlives a re-arm (forgetStaleTriggerFire).
const TRIGGER_ARM_GRACE = 10;
// The scripts' RNG is a 2^31-1 Lehmer generator.
export const RANDOM_MODULUS = 2_147_483_647;
const DEFAULT_SEED = 1;

const DEBUG_RECENT_CALLS = 120;

export interface LuaHostDebugSnapshot {
  // undefined = not yet known; a thread whose bundle is not among them pauses.
  activeBundles: string[] | undefined;
  encounters: {
    budget: number;
    cost: number;
    kind: "ambient" | "unmanaged";
    name: string;
    owner: string;
    state: "waiting" | "active" | "cooling";
    wait: number;
  }[];
  killIncidents: number;
  phase: string | undefined;
  phases: string[];
  recentCalls: string[];
  reports: {
    health: Record<string, { current: number; max: number }>;
    // Admission per squad (SquadAuth); -1 = not admitted anywhere yet.
    influencers: Record<string, number>;
    monitors: Record<string, number>;
    squadsAlive: Record<string, number>;
    squadTallies: Record<string, readonly number[]>;
    triggersFired: string[];
  };
  threads: {
    bundle: string | undefined;
    error: string | undefined;
    name: string;
    stalledTicks: number | undefined;
    state: string;
    waitingOn: string | undefined;
  }[];
  ticks: number;
  time: number;
}

export class LuaEncounterHost {
  readonly itemState = new ScriptItemState();
  readonly navPoints: ReturnType<typeof navPointIndex>;
  readonly commandScripts: CommandScriptIndex;
  readonly scalarDefaultCache = new Map<
    string,
    Readonly<Record<string, boolean | number>>
  >();
  readonly trace: string[] = [];
  // What an attached debugger listens to (src/debug).
  readonly noteListeners = new Set<(line: string) => void>();
  readonly sentListeners = new Set<(change: ItemChange) => void>();
  readonly unresolved: string[] = [];
  // The subset that is a binding: an import slot or a field the script
  // calls into.
  readonly unresolvedBindings: string[] = [];
  readonly scheduler: LuaScheduler;
  readonly vm: LuaVm;
  readonly options: LuaEncounterHostOptions;
  readonly types: ActivityBundleItemTypes;
  readonly context: LuaHostContext;
  readonly writer: LuaItemWriter;
  readonly objects: LuaBoundObject[] = [];
  readonly importSlots: LuaBoundObject[] = [];
  // Reports are keyed by itemKey: two bundles can share a typeIndex.
  readonly monitorCounts = new Map<string, number>();
  readonly safeZoneInside = new Map<string, number>();
  readonly objectAlive = new Map<string, boolean>();
  // Capturable sense 0x80802E50 per Object item.
  readonly capturableSense = new Map<
    string,
    {
      locked: boolean;
      lockStamp: number;
      owner: number;
      progressTenths?: number;
      resetStamp: number;
    }
  >();
  // ObjectFaction sense 0x80801620 per Object item.
  readonly factionSense = new Map<string, number>();
  // Mission-interactable sense 0x80802DA3: the used latch and its stamp.
  readonly interactableSense = new Map<
    string,
    { used: boolean; usedStamp: number }
  >();
  readonly squadAlive = new Map<string, number>();
  // SquadSense squad +452: live members with a real target.
  readonly squadCombatCount = new Map<string, number>();
  // Per-cell failed-placement tally (SquadSense squad +0x110) for the current
  // epoch; cleared on an epoch bump.
  readonly squadTally = new Map<string, readonly number[]>();
  // Every self.<field> write, keyed by the field name's FNV-1. Global fallback
  // for conditionTrue after instanceScalarFieldValues.
  readonly scalarFieldValues = new Map<number, LuaValue>();
  readonly instanceScalarFieldValues = new WeakMap<
    LuaTable,
    Map<number, LuaValue>
  >();
  // A SquadAuth change is pushed only when this moves.
  readonly squadInfluencers = new Map<string, number>();
  // ActorSense flags 7/8 (Actor.is_bound).
  readonly actorBound = new Map<string, { flag7: boolean; flag8: boolean }>();
  // Deaths from alive-count drops; what a squad-scoped listener's get_count()
  // sums.
  readonly squadDeaths = new Map<string, number>();
  // Kills the incidents attribute, per victim import identifier.
  readonly identKills = new Map<number, number>();
  // Kills of a shared identifier credited to one squad (creditSharedKill).
  readonly creditedKills = new Map<string, number>();
  identSquadsCache: Map<number, Set<string>> | undefined;
  chunksByDeclName: Map<string, LuaChunk> | undefined;
  chunksByTagId: Map<string, LuaChunk> | undefined;
  readonly parentShapes = new WeakMap<
    LuaChunk,
    {
      calls: Map<string, Set<string>>;
      handoffs: Map<string, Set<string>>;
    }
  >();
  // Caps deaths: an alive-count drop counts as a death only if a kill was
  // reported.
  killIncidents = 0;
  // Keyed by `${itemKey}:${slot}`.
  readonly objectiveCounts = new Map<string, number>();
  // Host time of the latest fire; nothing clears it but a script re-arm.
  readonly triggersFired = new Map<string, number>();
  // Fields the scripts index as plain tables; nothing binds them.
  readonly tableFields = new Set<string>();
  readonly phases: {
    declName: string;
    instance: LuaTable;
    prefix: string;
    // Threads nothing wakes, started with init and main.
    startup: string[];
  }[] = [];
  phaseIndex = -1;
  phaseCompleting = false;
  // A failed main does not finish its mission; the phase stays put.
  phaseFailed = false;
  // Victims of a player_died kill since their last spawn (PlayerSensor.is_dead).
  readonly deadPlayers = new Set<string>();
  readonly health = new Map<string, { current: number; max: number }>();
  readonly actorDropAcks = new Map<
    string,
    { dropId?: number; inProgress: boolean }
  >();
  readonly actorCommandScript = new Map<
    string,
    { cookieRunning?: number; heartbeat?: number; pcReached?: number }
  >();
  // By declared name, so chunks reach each other's threads and rows.
  readonly instances = new Map<string, LuaTable>();
  // `self` fields a chunk calls methods on: unresolved, they still answer.
  readonly handles = new Set<string>();
  readonly stalls = new Map<string, { gate: string; ticks: number }>();
  // Set while a gate's predicate runs.
  sawAnyRead = false;
  sawRealRow = false;
  random: number;
  now = 0;
  ticks = 0;
  readonly threadOwners = new WeakMap<LuaScriptThread, LuaTable>();
  // The thread record's `started` flag (xex thread instance +0x10).
  readonly threadStarted = new WeakMap<LuaTable, Set<string>>();
  readonly instanceBundle = new WeakMap<LuaTable, number>();
  // Threads a phase script woke through a handle; they run in any bubble.
  readonly scriptStarted = new WeakSet<LuaScriptThread>();
  readonly instancePrefix = new WeakMap<LuaTable, string>();
  readonly managers: EncounterManager[] = [];
  readonly scopeOwner = new WeakMap<readonly ActivityBundleTag[], number>();
  activeBundles: ReadonlySet<number> | undefined;
  lastTickWallMs: number | undefined;
  spawned = false;
  // What get_outer() answers.
  rootInstance: LuaTable | undefined;
  lifetimeTimerHandle: LuaHostObject | undefined;
  lifetimeSensorHandle: LuaHostObject | undefined;
  scoreboardHandle: LuaHostObject | undefined;
  // end_game sent state 6: stop ticking.
  activityEnded = false;
  handlerThreadSeq = 0;

  constructor(options: LuaEncounterHostOptions) {
    this.options = options;
    this.types = options.types;
    this.navPoints = navPointIndex(options.navPoints ?? []);
    this.commandScripts = commandScriptIndex(options.commandScripts ?? []);
    this.random = (options.seed ?? DEFAULT_SEED) % RANDOM_MODULUS || 1;
    const reports: LuaReports = {
      bubbleOccupied: (bundle) => this.bubbleOccupied(bundle),
      capturableSense: (key) => this.capturableSense.get(key),
      factionSense: (key) => this.factionSense.get(key),
      interactableSense: (key) => this.interactableSense.get(key),
      objectiveCount: (key, slot) => this.objectiveCounts.get(`${key}:${slot}`),
      playerMonitorCount: (key) => this.monitorCounts.get(key),
      safeZoneInside: (key) => this.safeZoneInside.get(key),
      objectAlive: (key) => this.objectAlive.get(key),
      squadAliveCount: (key) => this.squadAlive.get(key),
      squadCombatCount: (key) => this.squadCombatCount.get(key),
      squadTally: (key) => this.squadTally.get(key),
      actorBound: (key) => this.actorBound.get(key),
      squadDeaths: (key) => this.squadDeathsOf(key),
      scopeKills: (keys) => this.scopeKills(keys),
      scopeDeaths: (keys) => this.scopeDeaths(keys),
      squadIncidentDeaths: (key) => this.squadIncidentDeaths(key),
      killIncidents: () => this.killIncidents,
      triggerFired: (key) => this.triggersFired.has(key),
      triggerArmed: (key) => this.forgetStaleTriggerFire(key),
      health: (key) => this.health.get(key),
      actorDropAck: (key) => {
        const ack = this.actorDropAcks.get(key);
        return ack?.dropId === undefined
          ? undefined
          : { dropId: ack.dropId, inProgress: ack.inProgress };
      },
      actorCommandScript: (key) => this.actorCommandScript.get(key),
      zonePlayers: (row) => this.zonePlayers(row),
    };
    this.context = {
      activityFlagChanged: (hash, active) =>
        this.options.onActivityFlag?.(hash, active),
      clock: options.clock,
      types: options.types,
      currentInstance: () => {
        const thread = this.scheduler.current;
        return thread ? this.threadOwners.get(thread) : undefined;
      },
      endActivity: () => {
        this.activityEnded = true;
        this.writer.note("activity ended - scripts stopped");
      },
      holdLifetimeForCinematic: (row) => this.holdLifetimeForCinematic(row),
      noteRowRead: (hasRow) => {
        this.sawAnyRead = true;
        this.sawRealRow ||= hasRow;
      },
      onSquadEpochBump: (key) => this.squadTally.delete(key),
      log: options.log ?? (() => undefined),
      namedHandles: new Map(Object.entries(options.namedHandles ?? {})),
      objectStates: new Map(),
      machineStates: new Map(),
      placeActors: options.placeActors ?? false,
      players: () =>
        (this.options.players?.() ?? []).map((player) => ({
          characterKey: player.characterKey,
          team: player.teamIndex,
        })),
      playerSensor: (key) => {
        const player = this.findPlayer(key);
        return player ? this.playerSensorObject(player) : undefined;
      },
      reports,
      runHandler: (handler, args) => this.runHandler(handler, args),
      scoreboardDefinition: options.scoreboardDefinition,
      sink: options.onItemChange ?? (() => undefined),
      onNote: (line) => {
        for (const listener of this.noteListeners) {
          listener(line);
        }
      },
      onSent: (change) => {
        for (const listener of this.sentListeners) {
          listener(change);
        }
      },
      state: this.itemState,
      time: () => this.now,
      trace: this.trace,
    };
    this.writer = new LuaItemWriter(this.context);
    const environment = new LuaHostEnvironment({
      log: (message) => this.writer.note(`print ${message}`),
    });
    environment.bind("predicate_pack", (args) => [
      new LuaPredicatePack(args[0]),
    ]);
    environment.bind("__class_definition_get", (args) => [
      schedulingThreads.library(this, luaToString(args[0])),
    ]);
    // A member reads as its qualified name: members are only ever compared.
    environment.bind("__enum_definition_get", (args) => [
      new LuaEnumDefinition(luaToString(args[0])),
    ]);
    environment.bindValue("enum_of", ENUM_OF);
    bindLibraryNatives(environment, {
      enumValue: options.enumValue,
      log: (message) => this.writer.note(message),
    });
    // Indexes from 0: count up from 0 until a hole.
    environment.bind("len", (args) => {
      const table = args[0];
      if (!(table instanceof LuaTable)) {
        return [0];
      }
      const lazy = instanceBuilding.arrayImportSlotLength(table);
      if (lazy !== undefined) {
        return [lazy];
      }
      let count = 0;
      while (table.get(count) !== undefined) {
        count += 1;
      }
      return [count];
    });
    // Generic-for over `count` distinct random candidates; nil candidates are
    // skipped.
    environment.bind("pick_random_count", (args) => {
      const picks = schedulingThreads.pickRandom(
        this,
        toNumber(args[0]) ?? 0,
        args.slice(1)
      );
      let next = 0;
      const step = new LuaHostFunction("pick_random_count.step", () => {
        const pick = picks[next];
        next += 1;
        return pick === undefined ? [] : [pick];
      });
      return [step, undefined, undefined];
    });
    this.vm = new LuaVm({
      globals: environment.globals,
      stringMetatable: environment.stringMetatable,
    });
    this.scheduler = new LuaScheduler(this.vm);
    this.scheduler.isRunnable = (script) =>
      schedulingThreads.threadMayRun(this, script);
  }

  // A phase script autostarts only as a bundle's own script; as a root's child
  // it waits for its mission.
  start(): void {
    const named = new Set<string>();
    // Child chunks' own fields are scanned too, so they degrade like a root's.
    const graph = [
      ...this.options.chunks,
      ...(this.options.childScripts?.values() ?? []),
    ];
    // A thread another script restarts or wakes is not started at activity
    // start; a child archetype's restart of its own `main` says nothing about
    // a root's `main`, so archetypes only name what their own Lua calls.
    const archetypes = new Set(this.options.childScripts?.values());
    for (const chunk of graph) {
      const archetype =
        archetypes.has(chunk) && !this.options.rootTags?.has(chunk.tagId);
      for (const [field, methods] of fieldMethodCalls(chunk)) {
        if (!archetype && (methods.has("restart") || methods.has("wake"))) {
          named.add(field);
        }
      }
      for (const field of handleFieldNames(chunk)) {
        this.handles.add(field);
      }
      for (const field of tableFieldNames(chunk)) {
        this.tableFields.add(field);
      }
    }
    // One bad chunk must not cost the activity its scripts.
    const built: (ReturnType<typeof instanceBuilding.buildInstance> & {
      chunk: LuaChunk;
    })[] = [];
    // An archetype is built under the encounter that runs it, where its rows
    // resolve.
    const childChunks = new Set(this.options.childScripts?.values());
    for (const chunk of this.options.chunks) {
      if (childChunks.has(chunk) && !this.options.rootTags?.has(chunk.tagId)) {
        continue;
      }
      try {
        const instance = instanceBuilding.buildInstance(
          this,
          chunk,
          "",
          this.options.childScripts,
          [],
          instanceBuilding.bundlesFirst(
            this,
            this.options.chunkOwners?.get(chunk.tagId)
          )
        );
        instanceBuilding.callImport(this, instance.table);
        built.push({ ...instance, chunk });
        // The first rootTags match is the Link-A root (get_outer()).
        if (
          this.rootInstance === undefined &&
          this.options.rootTags?.has(chunk.tagId)
        ) {
          this.rootInstance = instance.table;
        }
      } catch (error) {
        this.writer.note(
          `chunk ${chunk.tagId} did not load, its scripts do not run: ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    }
    instanceBuilding.reserveScriptPlacedSquads(this, built);
    instanceBuilding.markCarrierCargo(this);
    instanceBuilding.placeTableNamedMembers(this);
    // A slot never pointed at a row is a named handle or cut content.
    for (const slot of this.importSlots) {
      if (slot.row === undefined) {
        instanceBuilding.noteUnresolved(this, slot.path, true);
      }
    }
    const resumeAt = this.options.phaseProgress?.read() ?? 0;
    let phaseOrdinal = 0;
    let startedPhase = false;
    for (const instance of built) {
      // An activity's phases all load, built so siblings resolve by name, but
      // only one runs at a time.
      if (instanceBuilding.isDormantPhase(this, instance.chunk)) {
        this.phases.push({
          declName: instance.declName,
          instance: instance.table,
          prefix: "",
          startup: instanceBuilding
            .startupThreads(this, instance.chunk, named, instance.implNames)
            .filter(
              (name) =>
                name !== "complete" &&
                !(PHASE_LIFECYCLE as readonly string[]).includes(name)
            ),
        });
        const ordinal = phaseOrdinal;
        phaseOrdinal += 1;
        if (startedPhase || ordinal !== resumeAt) {
          this.writer.note(`script ${instance.declName} loaded, phase queued`);
          continue;
        }
        startedPhase = true;
        this.phaseIndex = this.phases.length - 1;
        // Started here: the externally-driven heuristic would otherwise suppress
        // every phase's main.
        this.writer.note(`mission ${instance.declName} starting`);
        this.options.onPhaseStarted?.(instance.declName);
        for (const name of [
          ...PHASE_LIFECYCLE,
          ...(this.phases.at(-1)?.startup ?? []),
        ]) {
          schedulingThreads.startThreadGuarded(
            this,
            instance.table,
            "",
            name,
            instance.declName
          );
        }
        continue;
      }
      if (!instanceBuilding.isTopLevelActor(this, instance.chunk)) {
        this.writer.note(
          `script ${instance.declName} built, not a top-level root (no autostart)`
        );
        continue;
      }
      const autoStart = instanceBuilding.startupThreads(
        this,
        instance.chunk,
        named,
        instance.implNames
      );
      for (const name of autoStart) {
        // A thread that raises on its first step takes only itself out.
        try {
          schedulingThreads.restartThread(this, instance.table, "", name);
        } catch (error) {
          this.writer.note(
            `thread ${name} of ${instance.declName} did not start: ` +
              (error instanceof Error ? error.message : String(error))
          );
        }
      }
      this.writer.note(
        `script ${instance.declName} threads [${autoStart.join(",")}]`
      );
    }
  }

  debugSnapshot(): LuaHostDebugSnapshot {
    return {
      killIncidents: this.killIncidents,
      phase:
        this.phaseIndex >= 0
          ? this.phases[this.phaseIndex]?.declName
          : undefined,
      phases: this.phases.map((phase) => phase.declName),
      recentCalls: this.trace.slice(-DEBUG_RECENT_CALLS),
      reports: {
        health: Object.fromEntries(this.health),
        influencers: Object.fromEntries(this.squadInfluencers),
        monitors: Object.fromEntries(this.monitorCounts),
        squadsAlive: Object.fromEntries(this.squadAlive),
        squadTallies: Object.fromEntries(this.squadTally),
        triggersFired: [...this.triggersFired.keys()],
      },
      encounters: this.managers.flatMap((manager) =>
        manager.encounters.map((encounter) => ({
          budget: manager.budget,
          cost: encounter.cost,
          kind: encounter.kind,
          name: encounter.name,
          owner: manager.name,
          state: encounter.state,
          wait: Math.max(0, Math.round(encounter.wait)),
        }))
      ),
      activeBundles:
        this.activeBundles === undefined
          ? undefined
          : [...this.activeBundles].map((bundle) => bundle.toString(16)),
      threads: this.scheduler.threads.map((thread) => ({
        bundle: schedulingThreads.threadBundle(this, thread),
        error: thread.error?.message,
        name: thread.name,
        stalledTicks: this.stalls.get(thread.name)?.ticks,
        state: thread.state,
        waitingOn: thread.gate?.describe(),
      })),
      ticks: this.ticks,
      time: this.now,
    };
  }

  get playerSpawned(): boolean {
    return this.spawned;
  }

  reportPlayerSpawned(): void {
    if (!this.spawned) {
      this.spawned = true;
      this.writer.note("player spawned - scripts start");
    }
  }

  // Cleared by reportPlayerRespawned.
  reportPlayerDied(characterKey: string): void {
    if (!this.deadPlayers.has(characterKey)) {
      this.deadPlayers.add(characterKey);
      this.writer.note(`player ${characterKey} died`);
    }
  }

  reportPlayerRespawned(characterKey: string): void {
    if (this.deadPlayers.delete(characterKey)) {
      this.writer.note(`player ${characterKey} respawned`);
    }
  }

  // Several connections beat their own keepalive; only a beat most of a
  // tick after the last one ticks.
  // Every chunk the host can run, roots and the archetypes under them.
  get allChunks(): readonly LuaChunk[] {
    return [
      ...new Set([
        ...this.options.chunks,
        ...(this.options.childScripts?.values() ?? []),
      ]),
    ];
  }

  tickIfDue(wallMs: number): boolean {
    // A debugger's all-stop holds the clock too.
    if (this.scheduler.paused) {
      return false;
    }
    const intervalMs = this.options.tickSeconds * MS_PER_SECOND;
    if (
      this.lastTickWallMs !== undefined &&
      wallMs - this.lastTickWallMs < intervalMs * TICK_DUE_FRACTION
    ) {
      return false;
    }
    this.lastTickWallMs = wallMs;
    this.tick();
    return true;
  }

  tick(): void {
    if (this.scheduler.paused) {
      return;
    }
    this.ticks += 1;
    this.now += this.options.tickSeconds;
    // The clock still moves.
    if (this.activityEnded) {
      return;
    }
    for (const bound of this.objects) {
      bound.advance(this.options.tickSeconds);
    }
    for (const manager of this.managers) {
      schedulingThreads.advanceManager(this, manager, this.options.tickSeconds);
    }
    const context: LuaTickContext = { tick: this.ticks, time: this.now };
    const report = this.scheduler.tick(context);
    const phase = this.phases[this.phaseIndex];
    for (const failed of report.failed) {
      this.writer.note(
        `thread ${failed.name} failed: ${failed.error?.message}`
      );
      if (
        phase &&
        this.threadOwners.get(failed) === phase.instance &&
        failed.name === (phase.prefix ? `${phase.prefix}.main` : "main")
      ) {
        this.phaseFailed = true;
        this.writer.note(
          `mission ${phase.declName} main failed - held, not completing`
        );
      }
    }
    schedulingThreads.advanceMissions(this);
    schedulingThreads.watchStalls(this);
    objectiveTaskAssignment.assignInfluencers(this);
  }

  // Resumes what is ready without moving the clock, so a newly active
  // bundle's placements make the world entry.
  runReadyThreads(): void {
    if (this.activityEnded || this.scheduler.paused) {
      return;
    }
    const context: LuaTickContext = { tick: this.ticks, time: this.now };
    const report = this.scheduler.tick(context);
    for (const failed of report.failed) {
      this.writer.note(
        `thread ${failed.name} failed: ${failed.error?.message}`
      );
    }
    objectiveTaskAssignment.assignInfluencers(this);
  }

  reportPlayerMonitor(item: ItemKey, count: number): void {
    this.monitorCounts.set(itemKey(item.bundle, item.typeIndex), count);
  }

  // A drop is a death: the only per-squad kill signal, since kill incidents
  // never name a victim.
  reportSquadAlive(item: ItemKey, count: number): void {
    const key = itemKey(item.bundle, item.typeIndex);
    const previous = this.squadAlive.get(key);
    if (previous !== count) {
      this.writer.note(`squad ${key} alive ${count} (reported)`);
    }
    if (previous !== undefined && count < previous) {
      const deaths = (this.squadDeaths.get(key) ?? 0) + (previous - count);
      this.squadDeaths.set(key, deaths);
      this.writer.note(
        `squad ${key} -${previous - count} dead -> ${deaths} total (reported)`
      );
    }
    this.squadAlive.set(key, count);
  }

  // SquadSense squad +452: live members with a real target.
  reportSquadCombatCount(item: ItemKey, count: number): void {
    this.squadCombatCount.set(itemKey(item.bundle, item.typeIndex), count);
  }

  // Sense sends are diffs; onSquadEpochBump clears it.
  reportSquadTally(item: ItemKey, tally: readonly number[]): void {
    const key = itemKey(item.bundle, item.typeIndex);
    const previous = this.squadTally.get(key);
    this.squadTally.set(key, tally);
    const unchanged =
      previous !== undefined &&
      previous.length === tally.length &&
      previous.every((value, i) => value === tally[i]);
    if (unchanged) {
      return;
    }
    const alive = this.squadAlive.get(key) ?? 0;
    this.writer.note(`${key} tally -> [${tally.join(",")}] alive ${alive}`);
  }

  reportActorBound(item: ItemKey, flag7: boolean, flag8: boolean): void {
    this.actorBound.set(itemKey(item.bundle, item.typeIndex), {
      flag7,
      flag8,
    });
  }

  reportSafeZone(item: ItemKey, inside: number): void {
    this.safeZoneInside.set(itemKey(item.bundle, item.typeIndex), inside);
  }

  reportObjectAlive(item: ItemKey, alive: boolean): void {
    this.objectAlive.set(itemKey(item.bundle, item.typeIndex), alive);
  }

  // Dispatches the capture incident when the owner changes to a real team;
  // the metadata carries no players.
  reportCapturableSense(
    item: ItemKey,
    sense: {
      locked: boolean;
      lockStamp: number;
      owner: number;
      progressTenths?: number;
      resetStamp: number;
    }
  ): void {
    const key = itemKey(item.bundle, item.typeIndex);
    const previous = this.capturableSense.get(key);
    this.capturableSense.set(key, sense);
    const realOwner = sense.owner !== -1 && sense.owner !== 0xff;
    if (realOwner && sense.owner !== previous?.owner) {
      const defName = this.options.capturableDefinition?.(
        item.bundle,
        item.typeIndex
      )?.captureIncidentName;
      const nameHash =
        defName === undefined || defName === FNV1_EMPTY
          ? CAPTURE_INCIDENT_HASH
          : defName;
      this.writer.note(`${key} captured by faction ${sense.owner}`);
      this.dispatchByHash(nameHash, registerIncidentMetadata({ players: [] }));
    }
  }

  reportFactionSense(item: ItemKey, faction: number): void {
    this.factionSense.set(itemKey(item.bundle, item.typeIndex), faction);
  }

  reportInteractableSense(
    item: ItemKey,
    sense: { used: boolean; usedStamp: number }
  ): void {
    this.interactableSense.set(itemKey(item.bundle, item.typeIndex), sense);
  }

  reportObjectiveCount(item: ItemKey, slot: number, count: number): void {
    this.objectiveCounts.set(
      `${itemKey(item.bundle, item.typeIndex)}:${slot}`,
      count
    );
  }

  // Answered from the bundle's one PlayerMonitor row; with several, undefined.
  bubbleOccupied(bundle: number): boolean | undefined {
    const monitors: number[] = [];
    for (const tag of this.options.bundles) {
      if (tag.bundle !== bundle) {
        continue;
      }
      for (const row of tag.rows) {
        if (row.typeId === this.types.PlayerMonitor) {
          monitors.push(row.typeIndex);
        }
      }
    }
    const only = monitors.length === 1 ? monitors[0] : undefined;
    if (only === undefined) {
      return;
    }
    const count = this.monitorCounts.get(itemKey(bundle, only));
    return count === undefined ? undefined : count > 0;
  }

  // Players in the PlayerMonitors bound to this row; undefined when none is.
  zonePlayers(row: BoundRow): number | undefined {
    const monitors = new Set<string>();
    for (const object of this.objects) {
      const watched = object.watchedRow;
      if (
        object.row?.typeId === this.types.PlayerMonitor &&
        watched?.bundle === row.bundle &&
        watched.typeId === row.typeId &&
        watched.typeIndex === row.typeIndex
      ) {
        monitors.add(itemKey(object.row.bundle, object.row.typeIndex));
      }
    }
    if (monitors.size === 0) {
      return;
    }
    let players = 0;
    for (const key of monitors) {
      players += this.monitorCounts.get(key) ?? 0;
    }
    return players;
  }

  // Dispatches straight to the row; the metadata carries only the local player.
  reportTriggerFired(item: ItemKey): void {
    const key = itemKey(item.bundle, item.typeIndex);
    this.triggersFired.set(key, this.now);
    const local = this.options.players?.()[0]?.characterKey;
    const object = this.objects.find(
      (candidate) =>
        candidate.row?.typeId === this.types.PlayerTrigger &&
        itemKey(candidate.row.bundle, candidate.row.typeIndex) === key
    );
    object?.dispatchTriggerFired(
      registerIncidentMetadata({ players: local ? [local] : [] })
    );
  }

  // The client fires on entry only, so a fire just before the arm still
  // counts; older ones are forgotten. The window's length is a guess.
  forgetStaleTriggerFire(key: string): void {
    const firedAt = this.triggersFired.get(key);
    if (firedAt !== undefined && this.now - firedAt > TRIGGER_ARM_GRACE) {
      this.triggersFired.delete(key);
    }
  }

  // Every listener bound to the name hash counts it; the metadata is the
  // local player.
  reportClientIncident(nameHash: number): void {
    const local = this.options.players?.()[0]?.characterKey;
    this.dispatchByHash(
      nameHash >>> 0,
      registerIncidentMetadata({ players: local ? [local] : [] })
    );
  }

  // cinematic_finished 0x3C03F059: what Cinematic.is_done waits on.
  reportCinematicFinished(item: ItemKey): void {
    const key = itemKey(item.bundle, item.typeIndex);
    for (const object of this.objects) {
      const row = object.row;
      if (
        row?.typeId === this.types.Cinematic &&
        itemKey(row.bundle, row.typeIndex) === key
      ) {
        object.noteCinematicFinished();
      }
    }
  }

  reportSquadKill(ident: number, at?: WorldPosition): void {
    const kills = (this.identKills.get(ident) ?? 0) + 1;
    this.identKills.set(ident, kills);
    const where =
      at === undefined
        ? ""
        : ` at (${at.x.toFixed(1)}, ${at.y.toFixed(1)}, ${at.z.toFixed(1)})`;
    this.writer.note(
      `squad ident 0x${ident.toString(16)} kill${where} -> ${kills} total ` +
        "(incident)"
    );
    this.creditSharedKill(ident, at);
  }

  // A shared identifier names no squad alone: credit the squad spawned within a
  // metre of the death with the most open bodies, else the first in table order.
  creditSharedKill(ident: number, at?: WorldPosition): void {
    const keys = this.identSquads().get(ident);
    if (!keys || keys.size < 2) {
      return;
    }
    const near =
      at === undefined ? [] : [...keys].filter((k) => this.spawnedNear(k, at));
    const sensed = near.filter((key) => this.squadAlive.has(key));
    const matched = sensed.length > 0 ? sensed : near;
    let rule = matched.length > 0 ? "position" : "table order";
    let best = this.mostOpenBodies(matched.length > 0 ? matched : keys);
    if (!best && matched.length > 0) {
      rule = "position, no body open";
      best = { key: matched[0], open: 0 };
    }
    if (!best) {
      return;
    }
    const credited = (this.creditedKills.get(best.key) ?? 0) + 1;
    this.creditedKills.set(best.key, credited);
    this.writer.note(
      `squad ident 0x${ident.toString(16)} kill credited to ${best.key} ` +
        `(${rule}) -> ${credited}`
    );
  }

  // First in table order on a tie.
  mostOpenBodies(
    keys: Iterable<string>
  ): { key: string; open: number } | undefined {
    let best: { key: string; open: number } | undefined;
    for (const key of keys) {
      const [hex, typeIndex] = key.split(":");
      const bundle = Number.parseInt(hex, 16);
      const placed =
        this.itemState.bodiesFor(bundle, Number(typeIndex)) ??
        this.defaultBodies(bundle, Number(typeIndex));
      const open = placed - (this.creditedKills.get(key) ?? 0);
      if (open > 0 && (best === undefined || open > best.open)) {
        best = { key, open };
      }
    }
    return best;
  }

  spawnedNear(key: string, at: WorldPosition): boolean {
    const [hex, typeIndex] = key.split(":");
    const bundle = Number.parseInt(hex, 16);
    const row = this.options.bundles
      .find((t) => t.bundle === bundle)
      ?.rows.find(
        (r) =>
          r.typeId === this.types.Squad && r.typeIndex === Number(typeIndex)
      );
    return (row?.spawnPoints ?? []).some(
      (p) => (p.x - at.x) ** 2 + (p.y - at.y) ** 2 + (p.z - at.z) ** 2 <= 1
    );
  }

  identSquads(): Map<number, Set<string>> {
    if (this.identSquadsCache) {
      return this.identSquadsCache;
    }
    const map = new Map<number, Set<string>>();
    for (const tag of this.options.bundles) {
      for (const row of tag.rows) {
        if (
          row.typeId === this.types.Squad &&
          row.importIdent !== undefined &&
          row.importIdent !== FNV1_EMPTY
        ) {
          const keys = map.get(row.importIdent) ?? new Set<string>();
          keys.add(itemKey(tag.bundle, row.typeIndex));
          map.set(row.importIdent, keys);
        }
      }
    }
    this.identSquadsCache = map;
    return map;
  }

  identOf(key: string): number | undefined {
    for (const [ident, keys] of this.identSquads()) {
      if (keys.has(key)) {
        return ident;
      }
    }
    return;
  }

  squadNamedByKills(key: string): boolean {
    const ident = this.identOf(key);
    return ident !== undefined && this.identSquads().get(ident)?.size === 1;
  }

  // undefined for a squad with no identifier.
  squadIncidentDeaths(key: string): number | undefined {
    const ident = this.identOf(key);
    if (ident === undefined) {
      return;
    }
    return this.squadNamedByKills(key)
      ? (this.identKills.get(ident) ?? 0)
      : (this.creditedKills.get(key) ?? 0);
  }

  // Table bodies for an unplaced squad (options.squadPlacedByDefault).
  defaultBodies(bundle: number, typeIndex: number): number {
    if (this.options.squadPlacedByDefault?.(bundle, typeIndex) === false) {
      return 0;
    }
    return squadRosterSize(this.types, this.options.bundles, {
      bundle,
      name: "",
      typeId: this.types.Squad,
      typeIndex,
    });
  }

  // For a squad the incidents name only they count: a reported alive count
  // can drop to 0 while the squad still stands.
  squadDeathsOf(key: string): number | undefined {
    if (this.squadNamedByKills(key)) {
      const ident = this.identOf(key);
      return ident === undefined ? 0 : (this.identKills.get(ident) ?? 0);
    }
    const credited = this.creditedKills.get(key);
    const sensed = this.squadDeaths.get(key);
    return credited === undefined ? sensed : Math.max(credited, sensed ?? 0);
  }

  // Each identifier once.
  scopeDeaths(keys: ReadonlySet<string>): number {
    let drops = 0;
    const named = new Set<string>();
    for (const key of keys) {
      if (this.identOf(key) === undefined) {
        drops += this.squadDeaths.get(key) ?? 0;
      } else {
        named.add(key);
      }
    }
    return drops + this.scopeKills(named);
  }

  // Each identifier once.
  scopeKills(keys: ReadonlySet<string>): number {
    const idents = new Set<number>();
    for (const key of keys) {
      const ident = this.identOf(key);
      if (ident !== undefined) {
        idents.add(ident);
      }
    }
    let kills = 0;
    for (const ident of idents) {
      kills += this.identKills.get(ident) ?? 0;
    }
    return kills;
  }

  // Bumps every unscoped armed listener; a scoped one counts its own squads'
  // deaths instead.
  reportKill(details: KillFilterDetails): void {
    this.killIncidents += 1;
    for (const object of this.objects) {
      object.noteAnyKill(details);
    }
    // Object.is_alive for destructible kills.
    const hashes = details.objectIdentifierHashes;
    if (hashes && hashes.length > 0) {
      for (const object of this.objects) {
        object.noteDestructibleKill(hashes, (row) =>
          [this.importIdentOf(row), this.nameHashOf(row)].filter(
            (value): value is number => value !== undefined
          )
        );
      }
    }
  }

  // Host-local dispatch with one-team metadata; dominion rules named `name`
  // run through the scoreboard engine.
  submitIncidentWithTeam(nameHash: number, team: number | undefined): void {
    this.dispatchByHash(nameHash, undefined);
    if (team !== undefined) {
      const scoreboard = this.objects.find(
        (object) => object.row?.typeId === this.types.Scoreboard
      );
      scoreboard?.applyScoreboardTeamIncident(nameHash, team);
    }
  }

  // Host-synthesized: nothing submits player_joined/player_left.
  notePlayerJoined(characterKey: string): void {
    this.dispatchByHash(
      PLAYER_JOINED_HASH,
      registerIncidentMetadata({ players: [characterKey] })
    );
  }

  notePlayerLeft(characterKey: string): void {
    this.dispatchByHash(
      PLAYER_LEFT_HASH,
      registerIncidentMetadata({ players: [characterKey] })
    );
  }

  dispatchByHash(nameHash: number, metadata: LuaValue): void {
    for (const object of this.objects) {
      object.dispatchIncident(nameHash, metadata);
    }
  }

  findPlayer(characterKey: string): ActivityPlayer | undefined {
    return this.options
      .players?.()
      .find((player) => player.characterKey === characterKey);
  }

  // get_player_sensor / PlayerIterator.get_sensor.
  playerSensorObject(player: ActivityPlayer): LuaHostObject {
    return new LuaHostObject("player_sensor", ({ args, method }) => {
      if (method === "get_team_index") {
        const team = player.teamIndex ?? -1;
        this.writer.note(
          `player_sensor(${player.characterKey}):get_team_index() -> ${team}`
        );
        return [team];
      }
      if (method === "is_dead") {
        // player_resurrected is not modelled: its metadata never names who was
        // revived.
        const dead = !player.ready || this.deadPlayers.has(player.characterKey);
        this.writer.note(
          `player_sensor(${player.characterKey}):is_dead() -> ${dead}`
        );
        return [dead];
      }
      const answer = unboundAnswer(method);
      this.writer.note(
        `player_sensor(${player.characterKey}):${method}(${showArgs(args)}) ${unboundLabel(answer)}`
      );
      return [answer];
    });
  }

  // A non-closure logs and does nothing; a runaway is bounded by the VM's
  // step limit.
  runHandler(handler: LuaValue, args: readonly LuaValue[]): void {
    if (!(handler instanceof LuaClosure)) {
      this.writer.note("incident handler is not a script function, not run");
      return;
    }
    this.handlerThreadSeq += 1;
    const name = `incident_handler#${this.handlerThreadSeq}`;
    this.scheduler.spawn(name, handler, args);
    this.writer.note(`incident handler thread ${name} started`);
  }

  // Listeners are bound by identifier.
  reportInteraction(carries: (name: number) => boolean): void {
    for (const object of this.objects) {
      object.noteInteraction(carries, (row) =>
        [this.importIdentOf(row), this.nameHashOf(row)].filter(
          (value) => value !== undefined
        )
      );
    }
  }

  nameHashOf(row: BoundRow): number | undefined {
    return this.options.bundles
      .find((tag) => tag.bundle === row.bundle)
      ?.rows.find(
        (r) => r.typeId === row.typeId && r.typeIndex === row.typeIndex
      )?.nameHash;
  }

  // Names a material, not a row; every enabled Loot row carrying it counts
  // one pickup.
  reportLootGathered(carries: (material: number) => boolean): void {
    for (const object of this.objects) {
      const row = object.enabledLootRow;
      const material =
        row && (this.importIdentOf(row) ?? object.boundIdentifier);
      if (material !== undefined && carries(material)) {
        object.noteLootGathered();
      }
    }
  }

  importIdentOf(row: BoundRow): number | undefined {
    const tagRow = this.options.bundles
      .find((tag) => tag.bundle === row.bundle)
      ?.rows.find(
        (r) => r.typeId === row.typeId && r.typeIndex === row.typeIndex
      );
    // Empty-string hash: no material authored.
    return tagRow?.importIdent === FNV1_EMPTY ? undefined : tagRow?.importIdent;
  }

  reportHealth(item: ItemKey, current: number, max: number): void {
    this.health.set(itemKey(item.bundle, item.typeIndex), { current, max });
  }

  // undefined = the last drop id stands.
  reportActorDropAck(
    item: ItemKey,
    dropId: number | undefined,
    inProgress: boolean
  ): void {
    const key = itemKey(item.bundle, item.typeIndex);
    this.actorDropAcks.set(key, {
      dropId: dropId ?? this.actorDropAcks.get(key)?.dropId,
      inProgress,
    });
  }

  reportActorCommandScript(
    item: ItemKey,
    progress: { cookieRunning?: number; heartbeat?: number; pcReached?: number }
  ): void {
    // Reports are dirty-gated: the last cookie stands.
    const key = itemKey(item.bundle, item.typeIndex);
    const last = this.actorCommandScript.get(key);
    this.actorCommandScript.set(key, {
      cookieRunning: progress.cookieRunning ?? last?.cookieRunning,
      heartbeat: progress.heartbeat ?? last?.heartbeat,
      pcReached: progress.pcReached ?? last?.pcReached,
    });
  }

  // A phase's own cinematic holds the players; an encounter's leaves the
  // lifetime alone.
  holdLifetimeForCinematic(row: BoundRow): void {
    const dot = row.name.indexOf(".");
    const phase = dot > 0 ? fnv1(row.name.slice(0, dot)) : undefined;
    const tag = this.options.bundles.find(
      (entry) => entry.bundle >>> 0 === row.bundle >>> 0
    );
    const isPhase = tag?.rows.some(
      (entry) =>
        entry.typeId === this.types.Phase && entry.nameHash >>> 0 === phase
    );
    if (!isPhase) {
      return;
    }
    const lifetime = boundObjectOf(
      schedulingThreads.lifetimeSensor(this, "cinematic")
    );
    if (
      !lifetime ||
      lifetime.lifetimeState === LIFETIME_CINEMATIC_STATE ||
      lifetime.lifetimeState >= LIFETIME_RESULTS_STATE
    ) {
      return;
    }
    lifetime.lifetimeState = LIFETIME_CINEMATIC_STATE;
    sequenceNatives.pushLifetime(lifetime, "cinematic hold");
  }

  // A bubble's scripts run only while it is loaded; undefined = not yet
  // known, everything runs.
  setActiveBundles(bundles: ReadonlySet<number>): void {
    this.activeBundles = bundles;
  }

  // Rebuilt once per assignInfluencers() pass; squadScopeOf is O(objects).
  squadGroupMembership = new Map<string, ReadonlySet<string>>();

  private libraryCall(
    library: string,
    method: string,
    args: readonly LuaValue[]
  ): readonly LuaValue[] {
    return schedulingThreads.libraryCall(this, library, method, args);
  }

  private encounterManager(owner: LuaTable): LuaHostObject {
    return schedulingThreads.encounterManager(this, owner);
  }

  private sequenceDuration(row: BoundRow): number | undefined {
    return instanceBuilding.sequenceDuration(this, row);
  }

  private hasSequence(row: BoundRow): boolean | undefined {
    return instanceBuilding.hasSequence(this, row);
  }
}

// Member meanings are unknown.
class LuaEnumDefinition extends LuaTable {
  private readonly enumName: string;

  constructor(enumName: string) {
    super();
    this.enumName = enumName;
  }

  override get(key: LuaValue): LuaValue {
    const own = super.get(key);
    if (own !== undefined || typeof key !== "string") {
      return own;
    }
    return `${this.enumName}.${key}`;
  }
}

// Each bundle's own script (Link A) plus the closure of what it references
// (Link B); siblings resolve by name (Link C).
export function loadScriptGraph(
  scripts: ScriptSource,
  scriptFor: (bundleTag: number) => number | undefined,
  bundles: readonly ActivityBundleTag[]
): {
  chunks: LuaChunk[];
  chunkOwners: Map<string, number>;
  rootTags: Set<string>;
} {
  const chunks: LuaChunk[] = [];
  const chunkOwners = new Map<string, number>();
  const rootTags = new Set<string>();
  const seen = new Set<string>();
  const queue: string[] = [];
  for (const bundle of bundles) {
    const script = scriptFor(bundle.tag);
    if (script !== undefined) {
      const tagId = formatScriptTag(script);
      rootTags.add(tagId);
      if (!chunkOwners.has(tagId)) {
        chunkOwners.set(tagId, bundle.bundle);
      }
      queue.push(tagId);
    }
  }
  while (queue.length > 0) {
    const tagId = queue.shift();
    if (tagId === undefined || seen.has(tagId)) {
      continue;
    }
    seen.add(tagId);
    const chunk = loadScriptChunk(scripts, tagId);
    if (chunk === undefined) {
      continue;
    }
    chunks.push(chunk);
    queue.push(...scriptReferences(scripts, tagId));
  }
  return { chunkOwners, chunks, rootTags };
}

// From the Encounter row's 8080047B lookup tag (its decl_name), else
// childScriptSchemaMap.
export function childScriptsFor(
  types: ActivityBundleItemTypes,
  scripts: ScriptSource,
  chunks: readonly LuaChunk[],
  bundles: readonly ActivityBundleTag[],
  scriptBundles: readonly ActivityBundleTag[],
  childScriptSchemaMap: LuaEncounterHostOptions["childScriptSchemaMap"] = {}
): ReadonlyMap<string, LuaChunk> {
  const slots = new Map<string, LuaChunk>();
  const byDeclName = new Map<string, LuaChunk>();
  for (const chunk of chunks) {
    const declName = chunkDeclName(chunk);
    if (declName !== undefined) {
      byDeclName.set(declName, chunk);
    }
  }
  const rowBundles = new Map<number, ActivityBundleTag>();
  for (const bundle of [...bundles, ...scriptBundles]) {
    rowBundles.set(bundle.tag, bundle);
  }
  for (const bundle of rowBundles.values()) {
    for (const row of bundle.rows) {
      if (
        row.typeId !== types.Encounter ||
        row.childScript === undefined ||
        row.name === undefined
      ) {
        continue;
      }
      const child = byDeclName.get(row.childScript);
      if (child) {
        // The slot key is the row name's last segment.
        slots.set(row.name.split(".").at(-1) ?? row.name, child);
      }
    }
  }
  for (const chunk of chunks) {
    const entry = childScriptSchemaMap?.[chunk.tagId.toUpperCase()];
    if (entry === undefined) {
      continue;
    }
    for (const [slot, childTag] of Object.entries(entry)) {
      if (slots.has(slot)) {
        continue;
      }
      const child = loadScriptChunk(scripts, childTag);
      if (child) {
        slots.set(slot, child);
      }
    }
  }
  return slots;
}

// The chunk's declared name: its source path's basename equals its
// decl_name.
const CHUNK_SOURCE_EXTENSION = /\.[^.]+$/;

export function chunkDeclName(chunk: LuaChunk): string | undefined {
  const source = chunk.root.source;
  if (source === undefined) {
    return;
  }
  const cut = Math.max(source.lastIndexOf("\\"), source.lastIndexOf("/"));
  const base = source.slice(cut + 1);
  return base.replace(CHUNK_SOURCE_EXTENSION, "");
}
