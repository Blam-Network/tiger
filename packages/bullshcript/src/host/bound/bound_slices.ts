// The per-row state a bound object keeps, one slice per domain. Each domain
// module reads and writes its own slice; the bound object only holds them.

import type { LuaValue } from "../../hks/vm/values.ts";
import {
  OBJECTIVE_IDLE_STATE,
  type TimerModel,
} from "../natives/native_support.ts";
import { newSequenceState, type SequenceState } from "../state/item_state.ts";
import {
  type CommandScriptAtom,
  type ItemRef,
  type NavPoint,
  type ObjectFilterPredicate,
  PlayerObjectiveStage,
} from "../state/items.ts";

// Loot row. A higher epoch destroys loot already spawned.
export interface LootSlice {
  count: number;
  enabled: boolean;
  epoch: number;
}

export function newLootSlice(): LootSlice {
  return { count: 0, enabled: false, epoch: 0 };
}

// Lifetime row. The defaults match what the join grant sends.
export interface LifetimeSlice {
  endGameAt: number | undefined;
  joinFlag: boolean;
  state: number;
  timeOfDay: number | undefined;
}

export function newLifetimeSlice(): LifetimeSlice {
  return {
    endGameAt: undefined,
    joinFlag: true,
    state: 2,
    timeOfDay: undefined,
  };
}

// Sequence, Timer and Cinematic rows.
export interface SequenceSlice {
  cinematicFinished: boolean;
  // One state, resent whole; the playing id cycles so a coalesced stop/start
  // still changes it. A Sequence row keeps its state in the shared item state.
  own: SequenceState;
  timer: TimerModel | undefined;
}

export function newSequenceSlice(): SequenceSlice {
  return {
    cinematicFinished: false,
    own: newSequenceState(),
    timer: undefined,
  };
}

// Object rows.
export interface ObjectSlice {
  // Pre-sense fallback (advanceCapture).
  capture: { progress: number } | undefined;
  // Object.is_alive's fallback until a real ObjectSense report arrives.
  destructibleKilled: boolean;
  filterPredicates: ObjectFilterPredicate[];
  interacted: boolean;
}

export function newObjectSlice(): ObjectSlice {
  return {
    capture: undefined,
    destructibleKilled: false,
    filterPredicates: [],
    interacted: false,
  };
}

// Squad rows (and the groups over them).
export interface SquadSlice {
  // Temperaments and set_channel_scalar share state field 4 behind one
  // generation the client diffs on (sub_835B7560).
  behaviourIncarnation: number;
  channelScalars: Map<number, number>;
  deathsAtPlace: number;
  desiredBodies: number;
  dropElapsed: number;
  incidentDeathsAtPlace: number;
  // A wiped squad respawned and not yet reported back: alive_count answers
  // the bodies asked for until the client counts them.
  respawnPending: boolean;
  temperaments: Set<number>;
}

export function newSquadSlice(): SquadSlice {
  return {
    behaviourIncarnation: 0,
    channelScalars: new Map(),
    deathsAtPlace: 0,
    desiredBodies: 0,
    dropElapsed: 0,
    incidentDeathsAtPlace: 0,
    respawnPending: false,
    temperaments: new Set(),
  };
}

// Actor rows: the placed actor and its command script.
export interface ActorSlice {
  dropId: number;
  dropRefs: ItemRef[];
  // The generation must change for the client to re-resolve the ref.
  healthIncarnation: number;
  // ActorAuth [0] without the kill flag: a place() of an actor already placed
  // is a new one (retail's Last Array wave ship came back as 2, then 3).
  incarnation: number;
  // ActorAuth kill flag and epoch, bumped each call.
  killEpoch: number | undefined;
  // Unset follows its squad.
  placed: boolean | undefined;
  script:
    | { atoms: readonly CommandScriptAtom[]; cookie: number; pc: number }
    | undefined;
  scriptCookie: number;
  scriptElapsed: number;
  scriptRearms: number;
  scriptWatch: { heartbeat?: number; pc: number; still: number } | undefined;
}

export function newActorSlice(): ActorSlice {
  return {
    dropId: 0,
    dropRefs: [],
    healthIncarnation: 0,
    incarnation: 1,
    killEpoch: undefined,
    placed: undefined,
    script: undefined,
    scriptCookie: 0,
    scriptElapsed: 0,
    scriptRearms: 0,
    scriptWatch: undefined,
  };
}

// Objective and PlayerObjective rows.
export interface ObjectiveSlice {
  generation: number;
  navPoint: NavPoint | undefined;
  progress: { max: number; min: number } | undefined;
  // The HUD shows its live count instead of `progress`.
  progressItem: ItemRef | undefined;
  // Shared so reset() always picks a byte that differs.
  slotValue: number;
  stage: PlayerObjectiveStage;
  tier: number | undefined;
}

export function newObjectiveSlice(): ObjectiveSlice {
  return {
    generation: 0,
    navPoint: undefined,
    progress: undefined,
    progressItem: undefined,
    slotValue: OBJECTIVE_IDLE_STATE,
    stage: PlayerObjectiveStage.None,
    tier: undefined,
  };
}

// Scoreboard row. Global is block 0; player/team blocks keyed by characterKey/team.
export interface ScoreboardSlice {
  global: Map<number, number>;
  notifications: {
    characterKey?: string;
    nameHash: number;
    team: number;
  }[];
  players: Map<string, Map<number, number>>;
  teams: Map<number, Map<number, number>>;
}

export function newScoreboardSlice(): ScoreboardSlice {
  return {
    global: new Map(),
    notifications: [],
    players: new Map(),
    teams: new Map(),
  };
}

// No IncidentListener row type exists; reportKill/dispatchIncident bump these.
export interface IncidentWatch {
  audienceHash?: number;
  bubbleHash?: number;
  count: number;
  deadCombatantHash?: number;
  // disable(): nothing counts until armed again.
  disabled?: boolean;
  handler?: LuaValue;
  handlerSelf?: LuaValue;
  nameHash?: number;
  objectIdentifierHash?: number;
  squadBaseline?: number;
  squads?: ReadonlySet<string>;
}

// Incident listeners and the player iterators.
export interface IncidentSlice {
  playerIterator: { index: number; players: readonly string[] } | undefined;
  watch: IncidentWatch | undefined;
}

export function newIncidentSlice(): IncidentSlice {
  return { playerIterator: undefined, watch: undefined };
}
