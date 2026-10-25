// Runs an activity's scripts against its items. Time moves only in tick(),
// so the same reports replay to the same calls in the same order.

import type { BsSchemaMember } from "../../bungiescript/schema.ts";
import type { HksBytecode } from "../../hks/bytecode/proto.ts";
import { LuaHostEnvironment, LuaHostObject } from "../../hks/env/host_env.ts";
import {
  fieldMethodCalls,
  handleFieldNames,
  tableFieldNames,
} from "../../hks/env/script_shape.ts";
import {
  LuaScheduler,
  type LuaScriptThread,
  type LuaTickContext,
} from "../../hks/scheduler/scheduler.ts";
import { LuaState } from "../../hks/vm/interpreter.ts";
import {
  LuaClosure,
  LuaHostFunction,
  LuaTable,
  type LuaValue,
  luaToString,
  toNumber,
} from "../../hks/vm/values.ts";
import {
  type AuthoredCells,
  type BoundRow,
  navPointIndex,
  squadRosterSize,
} from "../bound/bindings.ts";
import * as instanceBuilding from "../build/instance_building.ts";
import { Ownership } from "../build/ownership.ts";
import { ENUM_OF, EnumDefinition, scriptName } from "../build/script_graph.ts";
import {
  type CommandScriptIndex,
  commandScriptIndex,
} from "../natives/command_script.ts";
import { registerIncidentMetadata } from "../natives/incident_natives.ts";
import { bindLibraryNatives } from "../natives/library_natives.ts";
import {
  type BoundInstance,
  boundObjectOf,
  type HostContext,
  type HostReports,
  ItemWriter,
  type KillFilterDetails,
  LIFETIME_CINEMATIC_STATE,
  LIFETIME_RESULTS_STATE,
  PredicatePack,
  showArgs,
  unboundAnswer,
  unboundLabel,
} from "../natives/natives.ts";
import * as sequenceNatives from "../natives/sequence_natives.ts";
import * as objectiveTaskAssignment from "../schedule/objective_task_assignment.ts";
import * as phaseReset from "../schedule/phase_reset.ts";
import * as schedulingThreads from "../schedule/scheduling_threads.ts";
import { ScriptItemState } from "../state/item_state.ts";
import type { ItemChange, ItemKey } from "../state/items.ts";
import { PhaseJournal } from "../state/phase_journal.ts";
import {
  type CapturableSense,
  type DeviceSense,
  WorldState,
} from "../state/world_state.ts";
import { itemKey } from "../tags/item_key.ts";
import { FNV1_EMPTY, fnv1 } from "../tags/name_hash.ts";
import type {
  ActivityBundleItemTypes,
  ActivityBundleTag,
  WorldPosition,
} from "../tags/tag_types.ts";
import {
  type ActivityPlayer,
  type BuiltScript,
  type EncounterHostContext,
  type EncounterManager,
  type EncounterScriptHostOptions,
  type HostPhase,
  PHASE_LIFECYCLE,
  RANDOM_MODULUS,
  type SharedArchetype,
  type TaskGate,
} from "./host_context.ts";

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
const DEFAULT_SEED = 1;

const DEBUG_RECENT_CALLS = 120;

// The entry files still reach these through here.
export { childScriptsFor, loadScriptGraph } from "../build/script_graph.ts";
export type {
  ActivityPlayer,
  EncounterScriptHostOptions,
} from "./host_context.ts";

export interface HostDebugSnapshot {
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

export class EncounterScriptHost implements EncounterHostContext {
  readonly itemState = new ScriptItemState();
  readonly journal = new PhaseJournal();
  readonly ownership = new Ownership();
  readonly built: BuiltScript[] = [];
  readonly namedThreads = new Set<string>();
  readonly memberCounts = new Map<string, AuthoredCells>();
  readonly squadObjectives = new Map<
    string,
    { bundle: number; typeIndex: number }
  >();
  readonly startsPlaced = new Set<string>();
  readonly taskGates = new Map<string, Map<number, TaskGate>>();
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
  readonly vm: LuaState;
  readonly options: EncounterScriptHostOptions;
  readonly types: ActivityBundleItemTypes;
  readonly context: HostContext;
  readonly writer: ItemWriter;
  readonly objects: BoundInstance[] = [];
  readonly importSlots: BoundInstance[] = [];
  // Reports are keyed by itemKey: two bundles can share a typeIndex.
  readonly world = new WorldState();
  // Every self.<field> write, keyed by the field name's FNV-1. Global fallback
  // for conditionTrue after instanceScalarFieldValues.
  readonly scalarFieldValues = new Map<number, LuaValue>();
  readonly instanceScalarFieldValues = new WeakMap<
    LuaTable,
    Map<number, LuaValue>
  >();
  identSquadsCache: Map<number, Set<string>> | undefined;
  chunksByClassName: Map<string, HksBytecode> | undefined;
  chunksByScriptName: Map<string, HksBytecode> | undefined;
  chunksByTagId: Map<string, HksBytecode> | undefined;
  phaseMembers: readonly BsSchemaMember[] | undefined;
  readonly parentShapes = new WeakMap<
    HksBytecode,
    {
      calls: Map<string, Set<string>>;
      handoffs: Map<string, Set<string>>;
    }
  >();
  // Caps deaths: an alive-count drop counts as a death only if a kill was
  // reported.
  killIncidents = 0;
  // Fields the scripts index as plain tables; nothing binds them.
  readonly tableFields = new Set<string>();
  readonly phases: HostPhase[] = [];
  phaseIndex = -1;
  phaseCompleting = false;
  hardWipeOverride: boolean | undefined = undefined;
  // A failed main does not finish its mission; the phase stays put.
  phaseFailed = false;
  // Victims of a player_died kill since their last spawn (PlayerSensor.is_dead).
  readonly deadPlayers = new Set<string>();
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
  // The instance whose listener an incident handler thread runs for. It is
  // not a thread of that instance (a handler runs in any bubble), so it is
  // only for a reset to find.
  readonly handlerOwners = new WeakMap<LuaScriptThread, LuaTable>();
  // The thread record's `started` flag (xex thread instance +0x10).
  readonly threadStarted = new WeakMap<LuaTable, Set<string>>();
  readonly instanceBundle = new WeakMap<LuaTable, number>();
  // Threads a phase script woke through a handle; they run in any bubble.
  readonly scriptStarted = new WeakSet<LuaScriptThread>();
  readonly instancePrefix = new WeakMap<LuaTable, string>();
  readonly managers: EncounterManager[] = [];
  readonly scopeOwner = new WeakMap<readonly ActivityBundleTag[], number>();
  readonly topLevelBundles = new Map<
    HksBytecode,
    readonly ActivityBundleTag[]
  >();
  // options.rowOwners: each Encounter row's one archetype instance, by item
  // key.
  readonly sharedArchetypes = new Map<string, SharedArchetype>();
  activeBundles: ReadonlySet<number> | undefined;
  lastTickWallMs: number | undefined;
  spawned = false;
  readonly restartedRows = new Map<string, ItemChange>();
  // What get_outer() answers.
  rootInstance: LuaTable | undefined;
  lifetimeTimerHandle: LuaHostObject | undefined;
  lifetimeSensorHandle: LuaHostObject | undefined;
  scoreboardHandle: LuaHostObject | undefined;
  // end_game sent state 6: stop ticking.
  activityEnded = false;
  handlerThreadSeq = 0;

  constructor(options: EncounterScriptHostOptions) {
    this.options = options;
    this.types = options.types;
    this.navPoints = navPointIndex(options.navPoints ?? []);
    this.commandScripts = commandScriptIndex(options.commandScripts ?? []);
    this.random = (options.seed ?? DEFAULT_SEED) % RANDOM_MODULUS || 1;
    const reports: HostReports = {
      bubbleOccupied: (bundle) => this.bubbleOccupied(bundle),
      capturableSense: (key) => this.world.at(key)?.capturable,
      deviceSense: (key) => this.world.at(key)?.device,
      factionSense: (key) => this.world.at(key)?.faction,
      interactableSense: (key) => this.world.at(key)?.interactable,
      objectiveCount: (key, slot) =>
        this.world.at(key)?.objectiveCounts?.get(slot),
      playerMonitorCount: (key) => this.world.at(key)?.monitorCount,
      safeZoneInside: (key) => this.world.at(key)?.safeZoneInside,
      objectAlive: (key) => this.world.at(key)?.objectAlive,
      squadAliveCount: (key) => this.world.at(key)?.squadAlive,
      squadCombatCount: (key) => this.world.at(key)?.combatCount,
      squadTally: (key) => this.world.at(key)?.tally,
      actorBound: (key) => this.world.at(key)?.actorBound,
      squadDeaths: (key) => this.squadDeathsOf(key),
      scopeKills: (keys) => this.scopeKills(keys),
      scopeDeaths: (keys) => this.scopeDeaths(keys),
      squadIncidentDeaths: (key) => this.squadIncidentDeaths(key),
      killIncidents: () => this.killIncidents,
      triggerFired: (key) => this.world.at(key)?.triggerFiredAt !== undefined,
      triggerArmed: (key) => this.forgetStaleTriggerFire(key),
      health: (key) => this.world.at(key)?.health,
      actorStanding: (key) => this.world.at(key)?.actorStanding,
      actorDropAck: (key) => {
        const ack = this.world.at(key)?.actorDropAck;
        return ack?.dropId === undefined
          ? undefined
          : { dropId: ack.dropId, inProgress: ack.inProgress };
      },
      actorCommandScript: (key) => this.world.at(key)?.actorCommandScript,
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
      onSquadEpochBump: (key) => {
        const record = this.world.at(key);
        if (record) {
          record.tally = undefined;
        }
      },
      log: options.log ?? (() => undefined),
      namedHandles: new Map(Object.entries(options.namedHandles ?? {})),
      objectStates: new Map(),
      machineStates: new Map(),
      memberCounts: this.memberCounts,
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
      sink: (change) => {
        this.journal.note(change, this.writerRoot());
        options.onItemChange?.(change);
      },
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
    this.writer = new ItemWriter(this.context);
    const environment = new LuaHostEnvironment({
      log: (message) => this.writer.note(`print ${message}`),
    });
    environment.bind("predicate_pack", (args) => [new PredicatePack(args[0])]);
    environment.bind("__class_definition_get", (args) => [
      schedulingThreads.library(this, luaToString(args[0])),
    ]);
    // A member reads as its qualified name: members are only ever compared.
    environment.bind("__enum_definition_get", (args) => [
      new EnumDefinition(luaToString(args[0])),
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
    this.vm = new LuaState({
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
    const named = this.namedThreads;
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
    const built = this.built;
    // An archetype is built under the encounter that runs it, where its rows
    // resolve. childScripts keeps one class per slot name, and rows of
    // different classes can share one (pf_preset, pf_point), so the rows say
    // which chunks are archetypes.
    const childChunks = new Set(this.options.childScripts?.values());
    const childNames = new Set<string>();
    for (const bundle of this.options.bundles) {
      for (const row of bundle.rows) {
        if (row.typeId === this.types.Encounter && row.childScript) {
          childNames.add(row.childScript);
        }
      }
    }
    for (const chunk of this.options.chunks) {
      if (
        (childChunks.has(chunk) || childNames.has(scriptName(chunk))) &&
        !this.options.rootTags?.has(chunk.tagId)
      ) {
        continue;
      }
      try {
        const instance = instanceBuilding.buildInstance(
          this,
          chunk,
          "",
          this.options.childScripts,
          [],
          instanceBuilding.topLevelBundles(this, chunk)
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
    if (this.options.rowOwners !== undefined) {
      instanceBuilding.instantiateDeclaredArchetypes(this, built);
    }
    instanceBuilding.reserveScriptPlacedSquads(this, built);
    instanceBuilding.markCarrierCargo(this);
    instanceBuilding.placeStartingMembers(this);
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
        const phase: HostPhase = {
          chunk: instance.chunk,
          declName: instance.declName,
          hardWipe:
            instanceBuilding.schemaOf(this, instance.chunk)?.hardWipe === true,
          instance: instance.table,
          instantiate: () => {
            if (this.options.rowOwners !== undefined) {
              instanceBuilding.instantiateArchetypes(
                this,
                phase.chunk,
                phase.instance
              );
            }
          },
          prefix: "",
          startup: instanceBuilding
            .startupThreads(this, instance.chunk, named, instance.implNames)
            .filter(
              (name) =>
                name !== "complete" &&
                !(PHASE_LIFECYCLE as readonly string[]).includes(name)
            ),
        };
        this.phases.push(phase);
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
        schedulingThreads.startPhase(this, phase, "");
        continue;
      }
      if (!instanceBuilding.isTopLevelActor(this, instance.chunk)) {
        this.writer.note(
          `script ${instance.declName} built, not a top-level root (no autostart)`
        );
        continue;
      }
      instanceBuilding.autostart(this, instance);
    }
  }

  debugSnapshot(): HostDebugSnapshot {
    return {
      killIncidents: this.killIncidents,
      phase:
        this.phaseIndex >= 0
          ? this.phases[this.phaseIndex]?.declName
          : undefined,
      phases: this.phases.map((phase) => phase.declName),
      recentCalls: this.trace.slice(-DEBUG_RECENT_CALLS),
      reports: {
        health: Object.fromEntries(this.world.collect((r) => r.health)),
        influencers: Object.fromEntries(
          this.world.collect((r) => r.influencer)
        ),
        monitors: Object.fromEntries(this.world.collect((r) => r.monitorCount)),
        squadsAlive: Object.fromEntries(
          this.world.collect((r) => r.squadAlive)
        ),
        squadTallies: Object.fromEntries(this.world.collect((r) => r.tally)),
        triggersFired: this.world
          .collect((r) => r.triggerFiredAt)
          .map(([key]) => key),
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

  // Cleared by reportPlayerRespawned. A player_resurrected or self_resurrection
  // incident would clear it too, once its metadata is known to name who came
  // back.
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

  // Every player of the activity is dead at once. A player the activity has
  // not seen die, or has not got, does not make it so.
  get allPlayersDead(): boolean {
    const players = this.options.players?.() ?? [];
    return (
      players.length > 0 &&
      players.every((player) => this.deadPlayers.has(player.characterKey))
    );
  }

  // The running phase says @hard_wipe(): a hard wipe may happen while it runs.
  // The debugger can say otherwise for the rest of the phase.
  get hardWipeArmed(): boolean {
    const phase = this.phases[this.phaseIndex];
    return phase !== undefined && (this.hardWipeOverride ?? phase.hardWipe);
  }

  // The debugger arms or disarms the hard wipe until the next phase starts.
  setHardWipeArmed(armed: boolean): void {
    schedulingThreads.setHardWipeArmed(this, armed);
  }

  // A hard wipe: the running phase starts again, and the world is back to what
  // it was when the phase started (schedule/phase_reset.ts). Between ticks, not
  // from a script.
  resetCurrentPhase(): void {
    phaseReset.resetCurrentPhase(this);
  }

  // The top-level script writing now: the one whose thread is running, else
  // the one being built or driven.
  private writerRoot(): LuaTable | undefined {
    const thread = this.scheduler.current;
    const owner = thread
      ? (this.threadOwners.get(thread) ?? this.handlerOwners.get(thread))
      : this.ownership.owner;
    return owner === undefined ? undefined : this.ownership.rootOf(owner);
  }

  // Several connections beat their own keepalive; only a beat most of a
  // tick after the last one ticks.
  // Every chunk the host can run, roots and the archetypes under them.
  get allChunks(): readonly HksBytecode[] {
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
      this.ownership.scope(this.ownership.ownerOfObject(bound), () =>
        bound.advance(this.options.tickSeconds)
      );
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
    this.world.record(itemKey(item.bundle, item.typeIndex)).monitorCount =
      count;
  }

  // A drop is a death: the only per-squad kill signal, since kill incidents
  // never name a victim.
  reportSquadAlive(item: ItemKey, count: number): void {
    const key = itemKey(item.bundle, item.typeIndex);
    const record = this.world.record(key);
    const previous = record.squadAlive;
    if (previous !== count) {
      this.writer.note(`squad ${key} alive ${count} (reported)`);
    }
    if (previous !== undefined && count < previous) {
      const deaths = (record.deaths ?? 0) + (previous - count);
      record.deaths = deaths;
      this.writer.note(
        `squad ${key} -${previous - count} dead -> ${deaths} total (reported)`
      );
    }
    record.squadAlive = count;
  }

  // SquadSense squad +452: live members with a real target.
  reportSquadCombatCount(item: ItemKey, count: number): void {
    this.world.record(itemKey(item.bundle, item.typeIndex)).combatCount = count;
  }

  // Sense sends are diffs; onSquadEpochBump clears it.
  reportSquadTally(item: ItemKey, tally: readonly number[]): void {
    const key = itemKey(item.bundle, item.typeIndex);
    const record = this.world.record(key);
    const previous = record.tally;
    record.tally = tally;
    const unchanged =
      previous !== undefined &&
      previous.length === tally.length &&
      previous.every((value, i) => value === tally[i]);
    if (unchanged) {
      return;
    }
    const alive = record.squadAlive ?? 0;
    this.writer.note(`${key} tally -> [${tally.join(",")}] alive ${alive}`);
  }

  reportActorBound(item: ItemKey, flag7: boolean, flag8: boolean): void {
    this.world.record(itemKey(item.bundle, item.typeIndex)).actorBound = {
      flag7,
      flag8,
    };
  }

  reportSafeZone(item: ItemKey, inside: number): void {
    this.world.record(itemKey(item.bundle, item.typeIndex)).safeZoneInside =
      inside;
  }

  reportObjectAlive(item: ItemKey, alive: boolean): void {
    this.world.record(itemKey(item.bundle, item.typeIndex)).objectAlive = alive;
  }

  // Dispatches the capture incident when the owner changes to a real team;
  // the metadata carries no players.
  reportCapturableSense(item: ItemKey, sense: CapturableSense): void {
    const key = itemKey(item.bundle, item.typeIndex);
    const record = this.world.record(key);
    const previous = record.capturable;
    record.capturable = sense;
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
    this.world.record(itemKey(item.bundle, item.typeIndex)).faction = faction;
  }

  reportDeviceSense(item: ItemKey, sense: DeviceSense): void {
    this.world.record(itemKey(item.bundle, item.typeIndex)).device = sense;
  }

  reportInteractableSense(
    item: ItemKey,
    sense: { used: boolean; usedStamp: number }
  ): void {
    this.world.record(itemKey(item.bundle, item.typeIndex)).interactable =
      sense;
  }

  reportObjectiveCount(item: ItemKey, slot: number, count: number): void {
    const record = this.world.record(itemKey(item.bundle, item.typeIndex));
    record.objectiveCounts ??= new Map();
    record.objectiveCounts.set(slot, count);
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
    const count = this.world.at(itemKey(bundle, only))?.monitorCount;
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
      players += this.world.at(key)?.monitorCount ?? 0;
    }
    return players;
  }

  // Dispatches straight to the row; the metadata carries only the local player.
  reportTriggerFired(item: ItemKey): void {
    const key = itemKey(item.bundle, item.typeIndex);
    this.world.record(key).triggerFiredAt = this.now;
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
    const record = this.world.at(key);
    const firedAt = record?.triggerFiredAt;
    if (
      record &&
      firedAt !== undefined &&
      this.now - firedAt > TRIGGER_ARM_GRACE
    ) {
      record.triggerFiredAt = undefined;
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
    const kills = (this.world.identKills.get(ident) ?? 0) + 1;
    this.world.identKills.set(ident, kills);
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
    const sensed = near.filter(
      (key) => this.world.at(key)?.squadAlive !== undefined
    );
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
    const bestRecord = this.world.record(best.key);
    const credited = (bestRecord.creditedKills ?? 0) + 1;
    bestRecord.creditedKills = credited;
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
      const open = placed - (this.world.at(key)?.creditedKills ?? 0);
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
      ? (this.world.identKills.get(ident) ?? 0)
      : (this.world.at(key)?.creditedKills ?? 0);
  }

  // Table bodies for an unplaced squad (options.squadPlacedByDefault, and
  // the squads a script marks @placed).
  defaultBodies(bundle: number, typeIndex: number): number {
    if (
      !this.startsPlaced.has(itemKey(bundle, typeIndex)) &&
      this.options.squadPlacedByDefault?.(bundle, typeIndex) === false
    ) {
      return 0;
    }
    return squadRosterSize(
      this.types,
      this.options.bundles,
      { bundle, name: "", typeId: this.types.Squad, typeIndex },
      this.memberCounts.get(itemKey(bundle, typeIndex))
    );
  }

  // For a squad the incidents name only they count: a reported alive count
  // can drop to 0 while the squad still stands.
  squadDeathsOf(key: string): number | undefined {
    if (this.squadNamedByKills(key)) {
      const ident = this.identOf(key);
      return ident === undefined ? 0 : (this.world.identKills.get(ident) ?? 0);
    }
    const credited = this.world.at(key)?.creditedKills;
    const sensed = this.world.at(key)?.deaths;
    return credited === undefined ? sensed : Math.max(credited, sensed ?? 0);
  }

  // Each identifier once.
  scopeDeaths(keys: ReadonlySet<string>): number {
    let drops = 0;
    const named = new Set<string>();
    for (const key of keys) {
      if (this.identOf(key) === undefined) {
        drops += this.world.at(key)?.deaths ?? 0;
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
      kills += this.world.identKills.get(ident) ?? 0;
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
    const thread = this.scheduler.spawn(name, handler, args);
    // The handler's `self`, the instance whose script armed the listener.
    if (args[0] instanceof LuaTable) {
      this.handlerOwners.set(thread, args[0]);
    }
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
    this.world.record(itemKey(item.bundle, item.typeIndex)).health = {
      current,
      max,
    };
  }

  // undefined = the last drop id stands.
  reportActorDropAck(
    item: ItemKey,
    dropId: number | undefined,
    inProgress: boolean
  ): void {
    const key = itemKey(item.bundle, item.typeIndex);
    const record = this.world.record(key);
    record.actorDropAck = {
      dropId: dropId ?? record.actorDropAck?.dropId,
      inProgress,
    };
  }

  // Dirty-gated as the command script is: the epoch is carried when it moves,
  // and a new one starts the combatant over, with no actor until one is
  // reported.
  reportActorStanding(
    item: ItemKey,
    epoch: number | undefined,
    standing: boolean
  ): void {
    const record = this.world.record(itemKey(item.bundle, item.typeIndex));
    const last = record.actorStanding ?? { epoch: 0, standing: false };
    const fresh = epoch !== undefined && epoch !== last.epoch;
    record.actorStanding = {
      epoch: fresh ? epoch : last.epoch,
      standing: standing || (!fresh && last.standing),
    };
  }

  reportActorCommandScript(
    item: ItemKey,
    progress: { cookieRunning?: number; heartbeat?: number; pcReached?: number }
  ): void {
    // Reports are dirty-gated: the last cookie stands.
    const key = itemKey(item.bundle, item.typeIndex);
    const record = this.world.record(key);
    const last = record.actorCommandScript;
    record.actorCommandScript = {
      cookieRunning: progress.cookieRunning ?? last?.cookieRunning,
      heartbeat: progress.heartbeat ?? last?.heartbeat,
      pcReached: progress.pcReached ?? last?.pcReached,
    };
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
      lifetime.lifetime.state === LIFETIME_CINEMATIC_STATE ||
      lifetime.lifetime.state >= LIFETIME_RESULTS_STATE
    ) {
      return;
    }
    lifetime.lifetime.state = LIFETIME_CINEMATIC_STATE;
    sequenceNatives.pushLifetime(lifetime, "cinematic hold");
  }

  // A bubble's scripts run only while it is loaded; undefined = not yet
  // known, everything runs.
  setActiveBundles(bundles: ReadonlySet<number>): void {
    this.activeBundles = bundles;
  }

  // Rebuilt once per assignInfluencers() pass; squadScopeOf is O(objects).
  squadGroupMembership = new Map<string, ReadonlySet<string>>();

  // The Objective the scripts author a squad against (@objective): what its
  // SquadAuth carries as ref0 until a script sets another.
  squadObjective(
    bundle: number,
    typeIndex: number
  ): { bundle: number; typeIndex: number } | undefined {
    return this.squadObjectives.get(itemKey(bundle, typeIndex));
  }

  bound(path: string, row: BoundRow | undefined): BoundInstance {
    return instanceBuilding.bound(this, path, row);
  }

  // Reached by the runtime tests as instance["..."].
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
