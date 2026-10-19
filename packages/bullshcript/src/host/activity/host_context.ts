// What the host's building and scheduling code (instance_building,
// scheduling_threads, objective_task_assignment) reads and writes of the host.
// A leaf: encounter_host implements it, the rest of the host depends on it
// instead of on the class.

import type { BsSchema, BsSchemaMember } from "../../bungiescript/schema.ts";
import type { HksBytecode } from "../../hks/bytecode/proto.ts";
import type { LuaHostObject } from "../../hks/env/host_env.ts";
import type {
  LuaScheduler,
  LuaScriptThread,
} from "../../hks/scheduler/scheduler.ts";
import type { LuaState } from "../../hks/vm/interpreter.ts";
import type { LuaTable, LuaValue } from "../../hks/vm/values.ts";
import type {
  AuthoredCells,
  BoundRow,
  navPointIndex,
} from "../bound/bindings.ts";
import type { CommandScriptIndex } from "../natives/command_script.ts";
import type {
  BoundInstance,
  HostClock,
  HostContext,
  ItemWriter,
} from "../natives/natives.ts";
import type { ScriptItemState } from "../state/item_state.ts";
import type {
  ItemChange,
  ItemRef,
  ScoreboardDefinition,
} from "../state/items.ts";
import type { WorldState } from "../state/world_state.ts";
import type { ActivityOptionSet } from "../tags/activity_options.ts";
import type {
  ActivityBundleItemTypes,
  ActivityBundleTag,
  ControlPointCommandScript,
  NavPointPosition,
} from "../tags/tag_types.ts";

// `complete` runs separately once `main` has finished.
export const PHASE_LIFECYCLE = ["init", "main"] as const;

// The scripts' RNG is a 2^31-1 Lehmer generator.
export const RANDOM_MODULUS = 2_147_483_647;

// `self.encounters`: host-only scheduling against actor_budget. `c` reads as
// the cooldown after main ends; `a`, `b`, `d` are unknown and unused.
export interface ManagedEncounter {
  cooldown: number;
  cost: number;
  instance: LuaTable;
  kind: "ambient" | "unmanaged";
  name: string;
  state: "waiting" | "active" | "cooling";
  // suppress_encounter(enc, true): the manager does not activate it until
  // suppress_encounter(enc, false).
  suppressed: boolean;
  // Seconds left before a waiting/cooling encounter may activate.
  wait: number;
}

export interface EncounterManager {
  budget: number;
  encounters: ManagedEncounter[];
  exclusions: [LuaTable, LuaTable][];
  name: string;
  owner: LuaTable;
}

// The engine (options.rowOwners) runs one archetype instance per Encounter
// row. Its owner is a script of the row's own bundle that declares it (the
// bundle's script, then its missions, in load order); every other script
// declaring the row shares that instance - no second instance, no second
// set of threads. A row no script of its bundle declares (a bundle with no
// script, or one that leaves the row to another) is owned by the first
// top-level script in load order that declares it.
export interface SharedArchetype {
  owner: string;
  path: string;
  table: LuaTable;
}

// A task's gate as the scripts' @task write it: the Squad or SquadGroup row
// it admits, and the name hash of the bool field on the owning script that
// must hold. Either is left out where the task has none.
export interface TaskGate {
  readonly condition?: number;
  readonly filter?: { bundle: number; typeId: number; typeIndex: number };
}

export interface HostPhase {
  declName: string;
  instance: LuaTable;
  // Builds the phase's class instances, as the phase starts.
  instantiate: () => void;
  prefix: string;
  // Threads nothing wakes, started with init and main.
  startup: string[];
}

export interface EncounterHostContext {
  activeBundles: ReadonlySet<number> | undefined;
  // instance_building.bound, which scheduling_threads needs but sits above it.
  bound(path: string, row: BoundRow | undefined): BoundInstance;
  chunksByClassName: Map<string, HksBytecode> | undefined;
  chunksByScriptName: Map<string, HksBytecode> | undefined;
  chunksByTagId: Map<string, HksBytecode> | undefined;
  readonly commandScripts: CommandScriptIndex;
  readonly context: HostContext;
  defaultBodies(bundle: number, typeIndex: number): number;
  dispatchByHash(nameHash: number, metadata: LuaValue): void;
  findPlayer(characterKey: string): ActivityPlayer | undefined;
  readonly handles: Set<string>;
  readonly importSlots: BoundInstance[];
  readonly instanceBundle: WeakMap<LuaTable, number>;
  readonly instancePrefix: WeakMap<LuaTable, string>;
  readonly instanceScalarFieldValues: WeakMap<LuaTable, Map<number, LuaValue>>;
  readonly instances: Map<string, LuaTable>;
  readonly itemState: ScriptItemState;
  lifetimeSensorHandle: LuaHostObject | undefined;
  lifetimeTimerHandle: LuaHostObject | undefined;
  readonly managers: EncounterManager[];
  // The scripts' @member_counts by itemKey, as the instances bind them.
  readonly memberCounts: Map<string, AuthoredCells>;
  readonly navPoints: ReturnType<typeof navPointIndex>;
  now: number;
  readonly objects: BoundInstance[];
  readonly options: EncounterScriptHostOptions;
  readonly parentShapes: WeakMap<
    HksBytecode,
    {
      calls: Map<string, Set<string>>;
      handoffs: Map<string, Set<string>>;
    }
  >;
  phaseCompleting: boolean;
  phaseFailed: boolean;
  phaseIndex: number;
  phaseMembers: readonly BsSchemaMember[] | undefined;
  readonly phases: HostPhase[];
  playerSensorObject(player: ActivityPlayer): LuaHostObject;
  random: number;
  rootInstance: LuaTable | undefined;
  sawAnyRead: boolean;
  sawRealRow: boolean;
  readonly scalarDefaultCache: Map<
    string,
    Readonly<Record<string, boolean | number>>
  >;
  readonly scalarFieldValues: Map<number, LuaValue>;
  readonly scheduler: LuaScheduler;
  readonly scopeOwner: WeakMap<readonly ActivityBundleTag[], number>;
  scoreboardHandle: LuaHostObject | undefined;
  readonly scriptStarted: WeakSet<LuaScriptThread>;
  readonly sharedArchetypes: Map<string, SharedArchetype>;
  spawned: boolean;
  // Rebuilt once per assignInfluencers() pass; squadScopeOf is O(objects).
  squadGroupMembership: Map<string, ReadonlySet<string>>;
  // The Objective each squad is authored against (SquadAuth ref0), by the
  // squad's itemKey, as the scripts' @objective say.
  readonly squadObjectives: Map<string, { bundle: number; typeIndex: number }>;
  readonly stalls: Map<string, { gate: string; ticks: number }>;
  // The squads that start placed (@placed), by itemKey: they stand their
  // named members from the first apply, whatever squadPlacedByDefault says.
  readonly startsPlaced: Set<string>;
  submitIncidentWithTeam(nameHash: number, team: number | undefined): void;
  readonly tableFields: Set<string>;
  // The scripts' @task gates, by the Objective's itemKey and the task's name
  // hash.
  readonly taskGates: Map<string, Map<number, TaskGate>>;
  readonly threadOwners: WeakMap<LuaScriptThread, LuaTable>;
  readonly threadStarted: WeakMap<LuaTable, Set<string>>;
  readonly topLevelBundles: Map<HksBytecode, readonly ActivityBundleTag[]>;
  readonly types: ActivityBundleItemTypes;
  readonly unresolved: string[];
  readonly unresolvedBindings: string[];
  readonly vm: LuaState;
  readonly world: WorldState;
  readonly writer: ItemWriter;
}

export interface EncounterScriptHostOptions {
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
  childScripts?: ReadonlyMap<string, HksBytecode>;
  // The bundle whose own script each root chunk is; a root resolves its rows
  // against it first.
  chunkOwners?: ReadonlyMap<string, number>;
  // A phase script and a bubble's encounter script run as sibling instances.
  chunks: readonly HksBytecode[];
  // Class chain (base first) and delegate names per tag id. Omitted, an
  // instance answers only its own chunk's methods.
  classChainMap?: Readonly<
    Record<
      string,
      Readonly<{ chain: readonly string[]; delegates: readonly string[] }>
    >
  >;
  clock: HostClock;
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
  // The bundle whose Encounter rows each script owns: a root's own, and its
  // missions'. Given, a row runs one archetype instance, its owner's
  // (instance_building.ts SharedArchetype); omitted, each declarer builds
  // its own.
  rowOwners?: ReadonlyMap<string, number>;
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
