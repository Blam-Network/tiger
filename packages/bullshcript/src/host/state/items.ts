// What the scripts do to an activity's items: the rows of its activity bundles
// (squads, objectives, timers, objects and the rest).

export interface ItemRef {
  bundle: number;
  typeId: number;
  typeIndex: number;
}

export type ItemKey = Pick<ItemRef, "bundle" | "typeIndex">;

export interface NavPoint {
  ref?: ItemRef;
  sliceSet?: number;
  x: number;
  y: number;
  z: number;
}

export interface ObjectiveProgress {
  max: number;
  min: number;
}

export type ObjectFilterPredicate =
  | { kind: "combatantType"; typeNameHash: number }
  // add_players_on_team(t): predicate 80800614 compares the team index t
  // directly, not 16 + t (sub_8369C470).
  | { kind: "playersOnTeam"; teamIndex: number }
  | { kind: "playersWithActivityFlag"; flagNameHash: number }
  | { kind: "slotObject"; item: ItemRef; remove?: boolean }
  | { kind: "squadMembers"; item: ItemRef; remove?: boolean };

export type CommandScriptCommand =
  | { kind: 0; point: ItemRef; index: number }
  | { kind: 1; name: number }
  | { kind: 2; seconds: number }
  | { kind: 3; point: ItemRef; index: number; stop: boolean }
  | { kind: 4 }
  | { kind: 5; which: number; value: number }
  | { kind: 6; temperament: number; add: boolean }
  | { kind: 7; channel: number; values: readonly number[] }
  | { kind: 8; point: ItemRef; index: number }
  | {
      kind: 9;
      name: number;
      argument: number;
      // undefined: the plain ability(name, arg) form.
      point?: ItemRef;
      slot: number;
      index: number;
    };

// 0 the command's own duration, 1 the AI moving on, 2 after `seconds`.
export type CommandScriptEndCondition =
  | { kind: 0 }
  | { kind: 1 }
  | { kind: 2; seconds: number };

export type CommandScriptAtom = CommandScriptCommand & {
  end: CommandScriptEndCondition;
};

export const MAX_COMMAND_SCRIPT_ATOMS = 32;

export interface ActorState {
  // Renumbered on every change.
  behaviour?: {
    // Perception overrides: bit 0 blind, bit 1 deaf. The mask names the bits
    // the host sets; a bit outside it is the AI's own (2.3.1 capture: the
    // servitor placed at 3 under 3|16, then 0 as its guards die).
    awarenessFlags: number;
    awarenessMask: number;
    channels: readonly { id: number; values: readonly number[] }[];
    incarnation: number;
    temperaments: readonly number[];
  };
  // Seated by a carrier's drop, never placed on the ground.
  carried?: boolean;
  // A new cookie starts the atoms from pc.
  commandScript?: {
    atoms: readonly CommandScriptAtom[];
    cookie: number;
    pc?: number;
  };
  // A new id is a new drop.
  drop?: { id: number; squads: readonly ItemRef[] };
  // ActorAuth [0] for an actor placed again, from 2: the client spawns it
  // afresh (a dropship that flew its exit is gone until then).
  incarnation?: number;
  // ActorAuth's kill flag plus an epoch bump; remove() unlinks instead.
  kill?: { epoch: number };
  placed: boolean;
}

export interface HealthState {
  // Renumbered on every rebind so the client resolves it again.
  combatant?: { incarnation: number; item: ItemRef };
}

export interface FilteredState {
  filter?: ItemRef;
}

// Capturable component 808037C6 (wire tag 0x80802E4F), auth only; stamps
// apply when strictly greater, so both start at 1. The sense is 0x80802E50.
export interface CapturableState {
  filter?: ItemRef;
  icon: number;
  locked: boolean;
  lockStamp: number;
  resetStamp: number;
}

// ObjectFaction component 808037C8 (wire tag 0x8080161F).
export interface FactionState {
  faction: number;
  stamp: number;
}

// ObjectTimer component 808037AC (wire tag 0x80802D9D).
export interface ObjectTimerState {
  active: boolean;
  running?: { rate: number; seconds: number; startedAt: number };
  showOnHud: boolean;
}

export interface ObjectState {
  // All five components go out in one vec, re-sent whole.
  capturable?: CapturableState;
  device?: { position: number; revision: number };
  faction?: FactionState;
  // Counts every create and delete.
  incarnation: number;
  interactable?: {
    enabled: boolean;
    filter?: ItemRef;
    used?: { stamp: number; value: boolean };
  };
  objectTimer?: ObjectTimerState;
  present: boolean;
}

export interface ObjectFilterState {
  predicates: readonly ObjectFilterPredicate[];
}

// -1 until a script writes it; the volume is its sv_ twin.
export interface TriggerGroupState {
  state: number;
}

// Machine row (type 40); the second hash and generation are not understood (9A5F60C9).
export interface MachineState {
  cues: readonly number[];
  performance?: { generation: number; name: number };
}

export interface ObjectiveState {
  slots: readonly (number | undefined)[];
  // ObjectiveAuth's second field (true name unknown): bumped by reset(); re-arms
  // the definition's "player entered trigger volume" latch (+84).
  unk1?: number;
}

// In seconds at activity tick `at`; paused while not running.
export interface ObjectiveCountdown {
  at: number;
  duration: number;
  remaining: number;
  running: boolean;
}

export const PlayerObjectiveStage = {
  None: 0,
  Incoming: 1,
  Active: 2,
  Complete: 3,
  Failed: 4,
} as const;

export type PlayerObjectiveStage =
  (typeof PlayerObjectiveStage)[keyof typeof PlayerObjectiveStage];

export interface PlayerObjectiveState {
  countdown?: ObjectiveCountdown;
  navPoints: readonly NavPoint[];
  // bit = activity player index.
  participants?: number;
  progress?: ObjectiveProgress;
  progressItem?: ItemRef;
  state: PlayerObjectiveStage;
  // 0 ribbon, 1 bronze, 2 silver, 3 gold.
  tier?: number;
}

export interface CinematicState {
  // Unset is idle; clients report cinematic_finished when it ends.
  playing?: { startedAt: number };
}

// Passenger (01.29 and later): a seat an actor rides, served as 80802213
// {state, the actor}. Phogoth waits in his chains seated, state 1, until the
// fight releases him, state 2 with no actor (retail 2.3.1 Summoning Pits).
export interface PassengerState {
  passenger?: ItemRef;
  state: number;
}

export interface PlayerTriggerState {
  // Fires at most once per arming.
  armedAt: number;
  enabled: boolean;
}

export interface SequenceState {
  // Up to 2 pairs, upserted by name; unused slots are the FNV-1 empty hash.
  pairs?: readonly { name: number; value: number }[];
  playing?: { id: number; startedAt: number };
  // TU0 SequenceAuth [3].
  target?: ItemRef;
}

export interface LootState {
  enabled: boolean;
  // Bumped so leftover quest items vanish.
  epoch: number;
}

// Lifetime (row type 16): set_state's value and the +0x101 join flag.
export interface LifetimeState {
  joinFlag: boolean;
  state: number;
  // A fraction of a day the clients are locked to; on the TU0 wire the
  // lifetime's time-of-day lock and time of day.
  timeOfDay?: number;
}

// The activity's hard_wipe_globals row (type 34): whether a hard wipe is
// armed, which the clients read off it. A phase that says @hard_wipe() arms it
// as it starts.
export interface HardWipeGlobalsState {
  enabled: boolean;
}

export interface TimerState {
  running?: {
    progressBar: boolean;
    rate: number;
    seconds: number;
    startedAt: number;
  };
}

export interface SquadState {
  // Unset leaves the authored count.
  bodies?: number;
  carried: boolean;
  // SquadAuth's influencer field (true name unknown): the task tree's admission, -1 none.
  influencer?: number;
  // SquadAuth's kill flag (true name unknown) with an epoch bump; a wave's destroy policy is 0.
  killed?: number;
  // SquadAuth ref0 and [10]: the TU0 client hands the squad a firing area set from the task.
  objective?: ItemRef;
  // The activity tick its bodies last went up: SquadAuth [6]. Retail's moves
  // with every placement (the Last Array's dome A Fallen, 7681 ticks between
  // the first and the respawn).
  placedAt?: number;
  // SquadAuth [3], the bodies per cell, for a squad whose script authored
  // its counts (@member_counts): a named cell is 0, its actor the body.
  // Unset, the sink splits `bodies` over the cells.
  roster?: readonly number[];
  task?: number;
  // The task's +0xC, sent as [9] as retail does; the TU0 client never reads it.
  taskInfluencer?: number;
  temperaments?: readonly number[];
  // A new wave: the client forgets what the last one left.
  wave: number;
}

export interface ScoreboardStatEntry {
  nameHash: number;
  value: number;
}

export interface ScoreboardPlayerStats {
  characterKey: string;
  stats: readonly ScoreboardStatEntry[];
  // PlayerAuth faction - 16.
  team?: number;
}

export interface ScoreboardTeamStats {
  stats: readonly ScoreboardStatEntry[];
  team: number;
}

// -1 = every team.
export interface ScoreboardNotificationEvent {
  characterKey?: string;
  nameHash: number;
  team: number;
}

export interface ScoreboardState {
  global: readonly ScoreboardStatEntry[];
  notifications: readonly ScoreboardNotificationEvent[];
  players: readonly ScoreboardPlayerStats[];
  teams: readonly ScoreboardTeamStats[];
}

// Class 8080261A, duplicated here since this package reads no tags.
export interface ScoreboardColumn {
  nameHash: number;
  type: number;
}

export interface ScoreboardNotificationDefinition {
  icon: number;
  nameHash: number;
  textEnemy: number;
  textEveryone: number;
  textMe: number;
  textMyTeam: number;
}

// Stack bytecode: 3C n push var n, 34 n push const n, 01 add, 02 sub,
// 3E end. 09/04 (derived stats only) read as max/divide, true ops unknown.
export interface ScoreboardRule {
  audience: number;
  bytecode: readonly number[];
  consts: readonly number[];
  flags: number;
  incidentName: number;
  statName: number;
}

export interface ScoreboardDerivedStat {
  bytecode: readonly number[];
  consts: readonly number[];
  flags: number;
  operands: readonly number[];
  statName: number;
}

export interface ScoreboardDefinition {
  derivedStats: readonly ScoreboardDerivedStat[];
  global: readonly ScoreboardColumn[];
  notifications: readonly ScoreboardNotificationDefinition[];
  player: readonly ScoreboardColumn[];
  rules: readonly ScoreboardRule[];
  tag: number;
  team: readonly ScoreboardColumn[];
}

export type ItemState =
  | { kind: "actor"; state: ActorState }
  | { kind: "cinematic"; state: CinematicState }
  | { kind: "health"; state: HealthState }
  | { kind: "hardWipeGlobals"; state: HardWipeGlobalsState }
  | { kind: "hopOn"; state: FilteredState }
  | { kind: "lifetime"; state: LifetimeState }
  | { kind: "loot"; state: LootState }
  | { kind: "machine"; state: MachineState }
  | { kind: "object"; state: ObjectState }
  | { kind: "objectFilter"; state: ObjectFilterState }
  | { kind: "objective"; state: ObjectiveState }
  | { kind: "playerMonitor"; state: FilteredState }
  | { kind: "playerObjective"; state: PlayerObjectiveState }
  | { kind: "passenger"; state: PassengerState }
  | { kind: "playerTrigger"; state: PlayerTriggerState }
  | { kind: "safeZone"; state: FilteredState }
  | { kind: "scoreboard"; state: ScoreboardState }
  | { kind: "sequence"; state: SequenceState }
  | { kind: "squad"; state: SquadState }
  | { kind: "timer"; state: TimerState }
  | { kind: "triggerGroup"; state: TriggerGroupState };

// Set before any script ran.
export type ItemChange = ItemState & { initial?: boolean; item: ItemRef };

export function itemRef(item: ItemRef): ItemRef {
  return {
    bundle: item.bundle,
    typeId: item.typeId,
    typeIndex: item.typeIndex,
  };
}
