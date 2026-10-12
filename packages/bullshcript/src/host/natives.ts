// The natives an authored host script calls, bound to activity items.

import {
  type LuaHostInvocation,
  type LuaHostInvoke,
  LuaHostObject,
} from "../hks/host_env.ts";
import {
  LuaTable,
  type LuaValue,
  luaToString,
  toNumber,
} from "../hks/values.ts";
import type { BoundRow } from "./bindings.ts";
import * as incidentNatives from "./incident_natives.ts";
import { itemKey } from "./item_key.ts";
import {
  newSequenceState,
  type ScriptItemState,
  type SequenceState,
} from "./item_state.ts";
import {
  type CommandScriptAtom,
  type ItemChange,
  type ItemRef,
  type ItemState,
  itemRef,
  type MachineState,
  type NavPoint,
  type ObjectFilterPredicate,
  PlayerObjectiveStage,
  type ScoreboardDefinition,
  type SquadState,
} from "./items.ts";
import { FNV1_EMPTY, fnv1, parseHashLiteral } from "./name_hash.ts";
import * as objectNatives from "./object_natives.ts";
import * as objectiveNatives from "./objective_natives.ts";
import * as performanceNatives from "./performance_natives.ts";
import * as scoreboardNatives from "./scoreboard_natives.ts";
import * as sequenceNatives from "./sequence_natives.ts";
import * as squadNatives from "./squad_natives.ts";
import type { ActivityBundleItemTypes, ObjectiveTask } from "./tag_types.ts";

export interface LuaRowFacts {
  // Blueprint 808004C5 +0x240, class 80802E53; `flags` bit0 is lock-on-capture.
  capturableDefinition?(row: BoundRow):
    | {
        captureIncidentName: number;
        captureSeconds: number;
        emptyRateIndex: number;
        flags: number;
        occupantRateIndices: readonly number[];
      }
    | undefined;
  commandScript?(row: BoundRow): readonly CommandScriptAtom[] | undefined;
  defaultBodies?(squad: BoundRow): number;
  // Definition +0x3D; the archetype placeholder rows carry none.
  hasSequence?(row: BoundRow): boolean | undefined;
  importIdentifier?(row: BoundRow): number | undefined;
  namedMembers?(squad: BoundRow): readonly BoundRow[];
  navPointPosition(row: BoundRow): NavPoint | undefined;
  // The Objective row's AI influencer assignment tree (808015F0).
  objectiveTasks?(row: BoundRow): readonly ObjectiveTask[] | undefined;
  objectPosition?(row: BoundRow): NavPoint | undefined;
  owningSquad(row: BoundRow): BoundRow | undefined;
  // FNV-1 row-name lookup for a runtime string (import_only_bind_object).
  resolveByIdentifier(identifier: string): BoundRow | undefined;
  roster(row: BoundRow): number;
  // Definition +0x30; undefined, is_done() never blocks on it.
  sequenceDuration?(row: BoundRow): number | undefined;
  // Itself, or a SquadGroup's add_child() children.
  squadScopeOf?(row: BoundRow): ReadonlySet<string> | undefined;
  // The squad's authored spawn point (80801603), for the nav point fallback.
  squadSpawnPoint?(row: BoundRow): NavPoint | undefined;
  // The identifier is an import-group label, not a row name.
  squadsForIdentifier?(identifier: string): ReadonlySet<string> | undefined;
}

// Keyed by itemKey; undefined = nothing reported yet.
export interface LuaReports {
  // Flag 7 spent, flag 8 auth received.
  actorBound(key: string): { flag7: boolean; flag8: boolean } | undefined;
  actorCommandScript(
    key: string
  ):
    | { cookieRunning?: number; heartbeat?: number; pcReached?: number }
    | undefined;
  actorDropAck(
    key: string
  ): { dropId: number; inProgress: boolean } | undefined;
  bubbleOccupied(bundle: number): boolean | undefined;
  // Capturable sense 0x80802E50: owner (engine faction), echoed stamps, progress in tenths.
  capturableSense?(key: string):
    | {
        locked: boolean;
        lockStamp: number;
        owner: number;
        progressTenths?: number;
        resetStamp: number;
      }
    | undefined;
  // ObjectFaction sense 0x80801620.
  factionSense?(key: string): number | undefined;
  health(key: string): { current: number; max: number } | undefined;
  // Mission-interactable sense 0x80802DA3: the used latch and its stamp.
  interactableSense?(
    key: string
  ): { used: boolean; usedStamp: number } | undefined;
  killIncidents?(): number;
  objectAlive(key: string): boolean | undefined;
  objectiveCount(key: string, slot: number): number | undefined;
  playerMonitorCount(key: string): number | undefined;
  safeZoneInside(key: string): number | undefined;
  // Incident kills where a squad can be named, alive-count drops where not.
  scopeDeaths?(keys: ReadonlySet<string>): number;
  scopeKills?(keys: ReadonlySet<string>): number;
  squadAliveCount(key: string): number | undefined;
  // SquadSense squad +452, summed over a group's children.
  squadCombatCount(key: string): number | undefined;
  squadDeaths?(key: string): number | undefined;
  // undefined for a squad with no identifier.
  squadIncidentDeaths?(key: string): number | undefined;
  // Per-cell failed-placement tally (SquadSense squad +0x110) for the current epoch.
  squadTally?(key: string): readonly number[] | undefined;
  // Arming forgets the last fire.
  triggerArmed?(key: string): void;
  triggerFired(key: string): boolean;
  zonePlayers?(row: BoundRow): number | undefined;
}

export interface LuaHostClock {
  activityTicks(): number;
}

// Shared by every handle bound to the item.
export interface ObjectItemState {
  // Capturable component 808037C6 (wire tag 0x80802E4F).
  capturableFilter: ItemRef | undefined;
  capturableIcon: number;
  capturableLocked: boolean;
  // Stamps start at 0 (never sent) and count up.
  capturableLockStamp: number;
  capturablePresent: boolean;
  capturableResetStamp: number;
  // Components stay out until the tick after the create.
  componentsHeld: boolean;
  devicePosition: number;
  deviceRevision: number;
  factionPresent: boolean;
  factionSentAt: number;
  factionStamp: number;
  factionValue: number;
  // Follows the client's reported generation: sub_835C15F0 skips a
  // bubble-authority row, sub_835C1A60 creates it while the generation lags.
  incarnation: number;
  // m_enabled false with no filter, so the prompt goes away.
  interactableDisabled: boolean;
  interactableEnabled: boolean;
  interactableExcludeFilter: boolean;
  interactableFilter: ItemRef | undefined;
  // The trailing stamp/bool "used" latch (true name unknown).
  interactableUsed: boolean;
  interactableUsedStamp: number;
  // ObjectTimer component 808037AC (wire tag 0x80802D9D).
  objectTimer:
    | {
        active: boolean;
        running?: { rate: number; seconds: number; startedAt: number };
        showOnHud: boolean;
      }
    | undefined;
  present: boolean;
}

interface LuaActivityPlayerRef {
  characterKey: string;
  // PlayerAuth faction - 16; undefined where no team is known.
  team?: number;
}

export interface LuaHostContext {
  activityFlagChanged(hash: number, active: boolean): void;
  clock: LuaHostClock;
  // What set_handler captures as a later handler's `self`.
  currentInstance(): LuaValue | undefined;
  endActivity?(): void;
  holdLifetimeForCinematic?(row: BoundRow): void;
  log(line: string): void;
  machineStates?: Map<string, MachineState>;
  namedHandles: ReadonlyMap<string, boolean>;
  // A gate whose predicate only touches row-less handles can never change.
  noteRowRead(hasRow: boolean): void;
  objectStates: Map<string, ObjectItemState>;
  onSquadEpochBump?(key: string): void;
  placeActors: boolean;
  playerSensor(characterKey: string): LuaValue | undefined;
  players(): readonly LuaActivityPlayerRef[];
  reports: LuaReports;
  // A non-function logs and does nothing.
  runHandler(handler: LuaValue, args: readonly LuaValue[]): void;
  scoreboardDefinition?: ScoreboardDefinition;
  sink(change: ItemChange): void;
  state: ScriptItemState;
  time(): number;
  trace: string[];
  types: ActivityBundleItemTypes;
}

export class LuaItemWriter {
  private readonly context: LuaHostContext;
  private readonly lastPoll = new Map<string, string>();

  constructor(context: LuaHostContext) {
    this.context = context;
  }

  note(line: string): void {
    this.context.trace.push(line);
    this.context.log(`lua ${line}`);
  }

  notePoll(key: string, line: string): void {
    if (this.lastPoll.get(key) === line) {
      return;
    }
    this.lastPoll.set(key, line);
    this.note(line);
  }

  private send(change: ItemChange): void {
    this.context.sink(change);
  }

  set(row: BoundRow, change: ItemState, label: string): void {
    this.notePoll(
      itemKey(row.bundle, row.typeIndex),
      `${describe(row)} ${label}`
    );
    this.send({ ...change, item: itemRef(row) } as ItemChange);
  }

  // Each change carries the whole squad state.
  squad(row: ItemRef, change: Partial<SquadState>, initial = false): void {
    const previous = this.context.state.squad(row);
    const state = { ...previous, ...change };
    this.context.state.setSquad(row, state);
    if (state.wave !== previous.wave || state.killed !== previous.killed) {
      this.context.onSquadEpochBump?.(itemKey(row.bundle, row.typeIndex));
    }
    this.send({ item: itemRef(row), kind: "squad", state, initial });
  }

  bodies(row: BoundRow, count: number, change: Partial<SquadState> = {}): void {
    this.notePoll(
      `${itemKey(row.bundle, row.typeIndex)}:bodies`,
      `${describe(row)} bodies=${count}`
    );
    this.squad(row, { ...change, bodies: count });
  }

  reserve(row: ItemRef): void {
    this.squad(row, { bodies: 0 }, true);
  }

  temperaments(row: BoundRow, hashes: readonly number[], label: string): void {
    this.note(`${describe(row)} temperaments ${label}`);
    this.squad(row, { temperaments: [...hashes] });
  }

  activityFlag(hash: number, active: boolean): boolean {
    const changed = this.context.state.setActivityFlag(hash, active);
    if (changed) {
      this.context.activityFlagChanged(hash, active);
    }
    return changed;
  }
}

export function rowKind(row: BoundRow | undefined): string {
  return row === undefined
    ? "no row"
    : `not driveable on t${row.typeId}#${row.typeIndex}`;
}

export function describe(row: BoundRow): string {
  return `${row.name} t${row.typeId}#${row.typeIndex}`;
}

function copyLuaTable(source: LuaTable): LuaTable {
  const copy = new LuaTable();
  for (const [key, value] of source.entries()) {
    copy.set(key, value);
  }
  return copy;
}

// A host object prints as its script-side name.
export function show(value: LuaValue): string {
  return value instanceof LuaHostObject ? value.hostName : luaToString(value);
}

export function showArgs(args: readonly LuaValue[]): string {
  return args.map((arg) => show(arg)).join(", ");
}

// FNV-1 of the name minus the `sh_` prefix or `_hash` suffix; `invalid` is the empty hash.
export function resolveStringHash(value: LuaValue): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return parseHashLiteral(value) ?? fnv1(value);
  }
  const bound = boundObjectOf(value);
  if (!bound || bound.row !== undefined) {
    return;
  }
  // `self.invalid`: a placeholder hash scripts compare against.
  const field = bound.path.split(".").at(-1);
  return field === "invalid" ? FNV1_EMPTY : undefined;
}

// A player when characterKey is set; faction is the wire's 6-bit field (player 0, AI 6/2, world -1).
export interface KillParty {
  characterKey?: string;
  faction?: number;
  fah?: bigint;
}

// The wire's 2-bit kind, bias 1.
export interface KillAssist extends KillParty {
  kind: number;
}

export interface KillFilterDetails {
  assists: readonly KillAssist[];
  bubbleHash?: number;
  deadCombatantHash?: number;
  killer: KillParty;
  objectIdentifierHashes?: readonly number[];
  victim: KillParty;
}

export interface IncidentMetadata {
  kill?: KillFilterDetails;
  players: readonly string[];
}

const PREDICATE_VERB = /^(is|has)_/;
const NUMERIC_VERB = /^get_|_count$|^progress_/;

// A getter or count reads 0, a predicate false, a command true.
export function unboundAnswer(method: string): LuaValue {
  if (PREDICATE_VERB.test(method)) {
    return false;
  }
  return NUMERIC_VERB.test(method) ? 0 : true;
}

export function unboundLabel(answer: LuaValue, what = "unbound"): string {
  return answer === true ? `(${what})` : `(${what}, ${luaToString(answer)})`;
}

// Host-side countdown model; Object rows driven like timers get only this.
export interface TimerModel {
  bar: boolean;
  duration: number;
  rate: number;
  remaining: number;
  running: boolean;
  // Started since it was last loaded, as opposed to never started.
  started: boolean;
}

// The only slot the kill accounting uses; scripts never name one.
export const OBJECTIVE_SLOT = 0;
// State 5 shows the results screen, 6 ends the activity (sub_835BF790,
// sub_82A476E0). How long 5 holds is unknown.
export const LIFETIME_RESULTS_STATE = 5;
const LIFETIME_ENDED_STATE = 6;
// The hold a phase's own cinematic puts the lifetime in; true name unknown.
export const LIFETIME_CINEMATIC_STATE = 3;
export const LIFETIME_END_GAME_DELAY_SECONDS = 0;
// set_state() members the scripts use; any other logs and no-ops.
export const LIFETIME_STATE_BY_MEMBER: Readonly<Record<string, number>> = {
  active: 2,
  countdown: 1,
  pregame: 0,
};
export const OBJECTIVE_ACTIVE_STATE = 1;
// Nothing here counts a fireteam yet.
export const SOLO_PLAYERS = 1;
const OBJECTIVE_IDLE_STATE = 0;

// Member reads can name a thread or a row instead of binding a method.
class LuaBoundTable extends LuaHostObject {
  private readonly member: (field: string) => LuaValue;

  constructor(
    hostName: string,
    invoke: LuaHostInvoke,
    member: (field: string) => LuaValue
  ) {
    super(hostName, invoke);
    this.member = member;
  }

  override get(key: LuaValue): LuaValue {
    if (typeof key !== "string") {
      return super.get(key);
    }
    const named = this.member(key);
    return named === undefined ? super.get(key) : named;
  }
}

// A `self` field the script calls methods on: a row, or a slot bound to one later.
export class LuaBoundObject {
  readonly object: LuaHostObject;
  readonly path: string;
  row: BoundRow | undefined;
  handle: string | undefined;
  readonly context: LuaHostContext;
  readonly types: ActivityBundleItemTypes;
  readonly writer: LuaItemWriter;
  readonly rows: LuaRowFacts;
  private readonly member: (path: string, field: string) => LuaValue;
  // The squads add_child() put under a group; squadScopeOf walks it.
  readonly children: LuaBoundObject[] = [];
  timer: TimerModel | undefined;

  readonly filterPredicates: ObjectFilterPredicate[] = [];

  desiredBodies = 0;
  dropElapsed = 0;
  // Pre-sense fallback (advanceCapture).
  capture: { progress: number } | undefined;
  interacted = false;
  watched: BoundRow | undefined;
  // A higher epoch destroys loot already spawned.
  lootEnabled = false;
  lootCount = 0;
  lootEpoch = 0;
  // The defaults match what the join grant sends.
  lifetimeState = 2;
  lifetimeJoinFlag = true;
  lifetimeTimeOfDay: number | undefined;
  lifetimeEndGameAt: number | undefined;
  // One state, resent whole; the playing id cycles so a coalesced stop/start still changes it.
  private readonly ownSequence = newSequenceState();
  private get sequence(): SequenceState {
    return this.row?.typeId === this.types.Sequence
      ? this.context.state.sequence(itemRef(this.row))
      : this.ownSequence;
  }
  get sequencePlaying(): SequenceState["playing"] {
    return this.sequence.playing;
  }
  set sequencePlaying(value: SequenceState["playing"]) {
    this.sequence.playing = value;
  }
  get sequenceTarget(): ItemRef | undefined {
    return this.sequence.target;
  }
  set sequenceTarget(value: ItemRef | undefined) {
    this.sequence.target = value;
  }
  get sequencePairs(): { name: number; value: number }[] {
    return this.sequence.pairs;
  }
  get sequenceNextPlayingId(): number {
    return this.sequence.nextPlayingId;
  }
  set sequenceNextPlayingId(value: number) {
    this.sequence.nextPlayingId = value;
  }
  get sequenceStopped(): boolean {
    return this.sequence.stopped;
  }
  set sequenceStopped(value: boolean) {
    this.sequence.stopped = value;
  }
  // Object.is_alive's fallback until a real ObjectSense report arrives.
  destructibleKilled = false;
  playerIterator: { index: number; players: readonly string[] } | undefined;
  squadDeathsAtPlace = 0;
  incidentDeathsAtPlace = 0;
  get playedAt(): number | undefined {
    return this.sequence.playedAt;
  }
  set playedAt(value: number | undefined) {
    this.sequence.playedAt = value;
  }
  // Shared so reset() always picks a byte that differs.
  objectiveSlotValue = OBJECTIVE_IDLE_STATE;
  objectiveGeneration = 0;
  playerObjectiveStage: PlayerObjectiveStage = PlayerObjectiveStage.None;
  playerObjectiveTier: number | undefined;
  playerObjectiveProgress: { max: number; min: number } | undefined;
  // The HUD shows its live count instead of `progress`.
  playerObjectiveProgressItem: ItemRef | undefined;
  // Unset follows its squad.
  actorPlaced: boolean | undefined;
  // ActorAuth kill flag and epoch, bumped each call.
  actorKillEpoch: number | undefined;
  cinematicFinished = false;
  playerObjectiveNavPoint: NavPoint | undefined;
  // The generation must change for the client to re-resolve the ref.
  healthIncarnation = 0;
  actorScript:
    | { atoms: readonly CommandScriptAtom[]; cookie: number; pc: number }
    | undefined;
  actorScriptCookie = 0;
  actorScriptElapsed = 0;
  actorScriptWatch:
    | { heartbeat?: number; pc: number; still: number }
    | undefined;
  actorScriptRearms = 0;
  actorDropRefs: ItemRef[] = [];
  actorDropId = 0;
  // Temperaments and set_channel_scalar share state field 4 behind one
  // generation the client diffs on (sub_835B7560).
  readonly temperaments = new Set<number>();
  readonly channelScalars = new Map<number, number>();
  behaviourIncarnation = 0;

  private appendIndex = 0;
  // No IncidentListener row type exists; reportKill/dispatchIncident bump these.
  incidentWatch:
    | {
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
    | undefined;

  // Global is block 0; player/team blocks keyed by characterKey/team.
  readonly scoreboardGlobal = new Map<number, number>();
  readonly scoreboardPlayers = new Map<string, Map<number, number>>();
  readonly scoreboardTeams = new Map<number, Map<number, number>>();
  scoreboardNotifications: {
    characterKey?: string;
    nameHash: number;
    team: number;
  }[] = [];

  constructor(
    context: LuaHostContext,
    writer: LuaItemWriter,
    path: string,
    row: BoundRow | undefined,
    rows: LuaRowFacts,
    member: (path: string, field: string) => LuaValue = () => undefined
  ) {
    this.context = context;
    this.types = context.types;
    this.writer = writer;
    this.path = path;
    this.row = row;
    this.rows = rows;
    this.member = member;
    this.object = new LuaBoundTable(
      path,
      (invocation) => this.invoke(invocation),
      (field) => this.member(path, field)
    );
  }

  advance(seconds: number): void {
    objectNatives.releaseHeldComponents(this);
    objectNatives.advanceCapture(this, seconds);
    this.dropElapsed += seconds;
    this.actorScriptElapsed += seconds;
    squadNatives.rearmUnprimedScript(this, seconds);
    if (
      this.lifetimeEndGameAt !== undefined &&
      this.context.time() >= this.lifetimeEndGameAt
    ) {
      this.lifetimeEndGameAt = undefined;
      this.lifetimeState = LIFETIME_ENDED_STATE;
      sequenceNatives.pushLifetime(this, "end_game (ended)");
      this.context.endActivity?.();
    }
    const timer = this.timer;
    if (!timer?.running) {
      return;
    }
    timer.remaining = Math.min(
      timer.duration,
      Math.max(0, timer.remaining - seconds * timer.rate)
    );
  }

  private invoke({ method, args }: LuaHostInvocation): readonly LuaValue[] {
    this.context.noteRowRead(
      this.row !== undefined ||
        this.incidentWatch !== undefined ||
        this.handle !== undefined
    );
    if (this.row?.typeId === this.types.Loot) {
      const loot = objectNatives.lootVerb(this, method);
      if (loot !== undefined) {
        return [loot];
      }
    }
    // Lifetime's set_state takes one argument, Sequence's two.
    if (this.row?.typeId === this.types.Lifetime) {
      const lifetime = sequenceNatives.lifetimeVerb(this, method, args);
      if (lifetime !== undefined) {
        return [lifetime];
      }
    }
    if (this.row?.typeId === this.types.Scoreboard) {
      const scoreboard = scoreboardNatives.scoreboardVerb(this, method, args);
      if (scoreboard !== undefined) {
        return [scoreboard];
      }
    }
    switch (method) {
      case "import_only_bind":
        return [this.bind(args[0])];
      case "import_only_bind_object":
        return [this.bindObject(args[0])];
      case "import_identifier":
        return [objectNatives.importIdentifier(this)];
      // Objects -------------------------------------------------------
      case "create":
        return [objectNatives.create(this)];
      case "create_anew":
        return [objectNatives.create(this)];
      case "delete_object":
        return [objectNatives.deleteObject(this)];
      case "set_device_position":
        return [objectNatives.setDevicePosition(this, toNumber(args[0]) ?? 0)];
      case "get_device_position":
        return [objectNatives.objectState(this).devicePosition];
      // Machines (AI-managed performances) ------------------------------
      case "start_performance":
        return [performanceNatives.startPerformance(this, args[0])];
      case "cue_performance":
        return [performanceNatives.cuePerformance(this, args[0])];
      // Squads and actors ---------------------------------------------
      case "place":
        return [squadNatives.place(this)];
      case "respawn":
        return [squadNatives.respawn(this)];
      case "remove":
        // On an ObjectFilter, takes an object out of the filter.
        if (this.row?.typeId === this.types.ObjectFilter) {
          return [objectNatives.removeFilterRow(this, args[0])];
        }
        return [squadNatives.removeBodies(this)];
      case "alive_count":
        return [squadNatives.aliveCount(this)];
      case "max_count":
        return [squadNatives.maxCount(this)];
      // SquadSense squad +452, not the live-member count +0x1C4.
      case "current_in_combat_count":
        return [squadNatives.currentInCombatCount(this)];
      // With no firing area the client's comparison degenerates to -1 == -1.
      case "count_at_firing_area":
        return [squadNatives.countAtFiringArea(this)];
      case "activate_temperament":
        return [squadNatives.setTemperament(this, args[0], true)];
      case "deactivate_temperament":
        return [squadNatives.setTemperament(this, args[0], false)];
      case "set_objective":
        return [squadNatives.setObjective(this, args[0])];
      case "set_task":
        return [squadNatives.setTask(this, args[0])];
      case "add_combatant_type":
        return [objectNatives.addCombatantType(this, args[0])];
      case "drop_squad":
        return [squadNatives.dropSquad(this, args[0])];
      case "is_dropping":
        return [squadNatives.isDropping(this)];
      // Command scripts / player iterators -----------------------------
      case "begin":
        return [
          incidentNatives.playerIteratorBegin(this, args[0], args[1], args[2]),
        ];
      case "is_valid":
        return [
          this.playerIterator !== undefined &&
            this.playerIterator.index < this.playerIterator.players.length,
        ];
      case "next":
        if (this.playerIterator) {
          this.playerIterator.index += 1;
        }
        return [true];
      case "get_character_id":
        return [incidentNatives.currentIteratorPlayer(this)];
      // Anything but a live walk is a stand-in, so a chained call logs.
      case "get_sensor": {
        const key = incidentNatives.currentIteratorPlayer(this);
        const sensor =
          key === undefined ? undefined : this.context.playerSensor(key);
        if (sensor !== undefined) {
          this.writer.note(`${this.path}:get_sensor() -> player ${key}`);
          return [sensor];
        }
        this.writer.note(`${this.path}:get_sensor() (unknown, inert handle)`);
        return [
          new LuaHostObject("player_sensor", (invocation) => {
            const answer = unboundAnswer(invocation.method);
            this.writer.note(
              `player_sensor:${invocation.method}(${showArgs(invocation.args)}) ${unboundLabel(answer)}`
            );
            return [answer];
          }),
        ];
      }
      case "execute":
        return [squadNatives.execute(this, args[0])];
      // ActorAuth has no stop field: a fresh cookie with 0 atoms is not executing.
      case "abort_command_script":
        return [squadNatives.abortCommandScript(this)];
      case "get_command_script_state":
        return [squadNatives.commandScriptState(this)];
      case "set_channel_scalar":
        return [
          squadNatives.setChannelScalar(this, args[0], toNumber(args[1]) ?? 0),
        ];
      case "add_squad":
        return [objectiveNatives.addSquad(this, args[0])];
      // activate() shows a PlayerObjective too; which state it writes is unknown.
      case "activate":
        if (this.row?.typeId === this.types.TriggerGroup) {
          return [objectNatives.setTriggerGroup(this, true)];
        }
        if (this.row?.typeId === this.types.PlayerObjective) {
          return [
            objectiveNatives.playerObjectiveSet(
              this,
              PlayerObjectiveStage.Incoming,
              method
            ),
          ];
        }
        if (objectNatives.activityFlagHash(this) !== undefined) {
          return [objectNatives.setActivityFlag(this, true)];
        }
        return [sequenceNatives.timerStart(this, toNumber(args[0]))];
      // reset() is a timer verb on a Timer row and the arm verb on a PlayerTrigger.
      case "reset":
        // The only capturable stamp that clears the owner.
        if (this.row?.typeId === this.types.Object) {
          return [objectNatives.capturableReset(this)];
        }
        if (this.row?.typeId === this.types.Objective) {
          return [objectiveNatives.objectiveReset(this)];
        }
        if (this.row?.typeId === this.types.PlayerTrigger) {
          return [incidentNatives.armTrigger(this, method)];
        }
        // A fresh listener's first reset() falls through harmlessly.
        if (this.incidentWatch) {
          this.incidentWatch.count = 0;
          // Re-baseline a scoped listener's count too.
          if (this.incidentWatch.squads) {
            this.incidentWatch.squadBaseline = incidentNatives.sumSquadDeaths(
              this,
              this.incidentWatch.squads
            );
          }
          this.writer.note(
            `${this.path}:reset() (incident listener count cleared)`
          );
          return [true];
        }
        return [sequenceNatives.timerReset(this, toNumber(args[0]))];
      case "start":
        return [sequenceNatives.startRow(this, args[0])];
      case "stop":
        if (this.row?.typeId === this.types.Sequence) {
          return [sequenceNatives.stopSequence(this)];
        }
        return [sequenceNatives.timerRun(this, false)];
      case "set_state":
        return [sequenceNatives.setSequenceState(this, args[0], args[1])];
      case "set_switch_mask":
        return [sequenceNatives.setSequenceSwitchMask(this, args[0])];
      case "set_rate_multiplier":
        return [sequenceNatives.timerRate(this, toNumber(args[0]) ?? 1)];
      case "show_progress_bar":
        return [sequenceNatives.timerBar(this, true)];
      case "hide_progress_bar":
        return [sequenceNatives.timerBar(this, false)];
      case "get_remaining_time_in_seconds":
        return [sequenceNatives.model(this).remaining];
      case "is_expired":
        return [sequenceNatives.model(this).remaining <= 0];
      case "timer_activate":
        return [sequenceNatives.countdownLoad(this, toNumber(args[0]) ?? 0)];
      case "timer_start":
        return [sequenceNatives.countdownRun(this, true)];
      case "timer_pause":
        return [sequenceNatives.countdownRun(this, false)];
      case "timer_clear":
        return [sequenceNatives.countdownClear(this)];
      case "timer_is_complete":
        return [sequenceNatives.countdownComplete(this)];
      case "timer_get_current":
        return [sequenceNatives.model(this).remaining];
      case "set_filter":
        return [objectNatives.setFilter(this, args[0])];
      case "clear_filter":
        return [objectNatives.setFilter(this, undefined)];
      case "add":
        return [objectNatives.addFilterRow(this, args[0])];
      case "add_players_with_activity_flag":
        return [objectNatives.addPlayersWithActivityFlag(this, args[0])];
      case "add_players_on_team":
        return [objectNatives.addPlayersOnTeam(this, args[0])];
      case "any_objects_are_inside":
        return [objectNatives.anyObjectsAreInside(this)];
      case "get_count":
        return [this.count()];
      case "test_any_inside":
        return [objectNatives.playerCount(this) > 0];
      // Objectives ----------------------------------------------------
      case "set_incoming":
        return [
          objectiveNatives.playerObjectiveSet(
            this,
            PlayerObjectiveStage.Incoming,
            method
          ),
        ];
      case "set_active":
        return [
          objectiveNatives.playerObjectiveSet(
            this,
            PlayerObjectiveStage.Active,
            method
          ),
        ];
      case "set_complete":
        return [
          objectiveNatives.playerObjectiveSet(
            this,
            PlayerObjectiveStage.Complete,
            method
          ),
        ];
      case "set_failed":
        return [
          objectiveNatives.playerObjectiveSet(
            this,
            PlayerObjectiveStage.Failed,
            method
          ),
        ];
      // 0 ribbon, 1 bronze, 2 silver, 3 gold.
      case "set_public_event_tier":
        return [objectiveNatives.publicEventTier(this, toNumber(args[0]) ?? 0)];
      // Progress min/max, used "when ref7 is null" (client 0x8232B73C).
      case "progress_activate":
        return [
          objectiveNatives.progressActivate(
            this,
            toNumber(args[0]) ?? 0,
            toNumber(args[1]) ?? 0
          ),
        ];
      // Copies the NavPoint row's position into nav slot 0, the only slot used.
      case "nav_point_activate":
        return [objectiveNatives.navPointActivate(this, args[0])];
      // The squad fallback has no position source and stays a no-op.
      case "nav_point_activate_with_fallback":
        return [objectiveNatives.navPointActivate(this, args[1], args[0])];
      case "nav_point_clear":
        return [objectiveNatives.navPointClear(this)];
      // The "min" field is reused as "current"; complete once it reaches max.
      case "progress_is_complete":
        return [objectiveNatives.progressIsComplete(this)];
      case "progress_update":
        return [objectiveNatives.progressUpdate(this, toNumber(args[0]) ?? 0)];
      case "progress_get_current":
        return [objectiveNatives.progressCurrent(this)];
      case "progress_bind":
        return [objectiveNatives.progressBind(this, args[0])];
      case "progress_clear":
        return [objectiveNatives.progressClear(this)];
      case "get_engaged_player_count":
        return [objectiveNatives.engagedPlayerCount(this)];
      // Aliases objective_begin: there is no incoming step to skip.
      case "objective_begin":
      case "objective_begin_immediate":
        return [objectiveNatives.objectiveState(this, OBJECTIVE_ACTIVE_STATE)];
      case "objective_end":
      case "objective_end_silent":
        return [objectiveNatives.objectiveState(this, OBJECTIVE_IDLE_STATE)];
      // The unbound host object is a LuaTable, so enum_of() and `t[i]` read these entries.
      case "append":
        return [this.append(args[0])];
      case "add_child":
        return [squadNatives.addChild(this, args[0])];
      // A PlayerObjective stops showing its line; a SquadGroup drops its children.
      case "clear": {
        if (this.row?.typeId === this.types.PlayerObjective) {
          return [objectiveNatives.playerObjectiveClear(this)];
        }
        if (objectNatives.activityFlagHash(this) !== undefined) {
          return [objectNatives.setActivityFlag(this, false)];
        }
        if (this.row?.typeId === this.types.Object) {
          return [objectNatives.clearInteractable(this)];
        }
        if (this.row?.typeId === this.types.ObjectFilter) {
          return [objectNatives.clearFilter(this)];
        }
        this.children.length = 0;
        this.writer.note(`${this.path}:clear()`);
        return [true];
      }
      case "get_active":
        if (this.row?.typeId === this.types.Object) {
          return [objectNatives.usedSinceClear(this)];
        }
        return [this.unknownPredicate(method)];
      case "enable_all_players":
        return [objectNatives.enableAllPlayers(this)];
      // A kill flag plus an epoch bump, not remove()'s placed=false.
      case "kill":
        return [squadNatives.kill(this)];
      // Player triggers -----------------------------------------------
      case "enable":
      case "reset_trigger_in_bubble":
        return [incidentNatives.armTrigger(this, method)];
      case "disable":
        if (this.row?.typeId === this.types.PlayerTrigger) {
          return [incidentNatives.disarmTrigger(this, this.row)];
        }
        this.writer.note(`${this.path}:${method}(${showArgs(args)}) (unbound)`);
        return [true];
      // Encounter activation state ------------------------------------
      case "is_active":
        return [this.isActive()];
      case "deactivate":
        if (this.row?.typeId === this.types.TriggerGroup) {
          return [objectNatives.setTriggerGroup(this, false)];
        }
        // Encounter rows are client-side only.
        this.writer.note(`${this.path}:deactivate() (no-op)`);
        return [true];
      // False, except is_done on a handle that is not a row: nothing waits.
      case "is_done":
        return [sequenceNatives.isDone(this)];
      case "is_ready":
        return [squadNatives.isReady(this)];
      case "is_complete":
        return [this.unknownPredicate(method)];
      case "is_triggered":
        return [incidentNatives.isTriggered(this)];
      // placed && flag 8 && !flag 7; before any sense report, placed alone.
      case "is_bound": {
        if (this.row?.typeId !== this.types.Actor) {
          return [this.unknownPredicate("is_bound")];
        }
        const placed = this.actorPlaced ?? squadNatives.squadPlaced(this);
        const sense = this.context.reports.actorBound(
          itemKey(this.row.bundle, this.row.typeIndex)
        );
        const bound =
          sense === undefined ? placed : placed && sense.flag8 && !sense.flag7;
        this.writer.notePoll(
          `${this.path}:is_bound`,
          `${this.path}:is_bound() -> ${bound}`
        );
        return [bound];
      }
      case "bind_combatant":
        return [squadNatives.bindCombatant(this, args[0])];
      case "get_health_fraction":
        return [squadNatives.healthFraction(this)];
      // city_tower's own verbs, with no established wire effect:
      case "insertion_point":
        // "insertion-point-index" (0x820E199C) is a peer replication message field
        // (codec sub_8309D020), not an activity item: nothing to send.
        this.writer.note(
          `${this.path}:insertion_point() (peer replication only, no item)`
        );
        return [true];
      case "display":
        // A NewMission row gets no state slot in this build.
        this.writer.note(
          `${this.path}:display(${showArgs(args)}) (NewMission items carry no state, no-op)`
        );
        return [true];
      // self.host is a Fireteam (8080127A); true once a player has joined.
      case "t30_hack_bind_host": {
        const bound = this.context.players().length > 0;
        this.writer.notePoll(
          `${this.path}:t30_hack_bind_host`,
          `${this.path}:t30_hack_bind_host() -> ${bound}`
        );
        return [bound];
      }
      // The PlayerObjective clear() that follows drops the waypoints anyway.
      case "nav_point_clear_all":
        this.writer.note(
          `${this.path}:nav_point_clear_all() (host-only, no-op)`
        );
        return [true];
      // No IncidentListener row type exists: host-side bookkeeping.
      case "bind_hash":
      case "set_handler":
      case "bind_squad_identifier":
      case "bind_incident_name_hash":
      case "bind_audience_hash":
      case "bind_squad":
      case "bind_object_identifier":
      case "bind_audience":
      case "bind_dead_combatant_name":
      case "bind_dead_combatant_name_hash":
      case "bind_bubble_name":
      case "bind_bubble_name_hash":
        return [incidentNatives.armIncidentListener(this, method, args)];
      // 1 = enemy of PvE faction 0, so shootable.
      case "set_faction":
        return [objectNatives.setFaction(this, toNumber(args[0]) ?? 0)];
      // set_faction(16 + t), the PvP team numbering PlayerAuth carries.
      case "set_team_index":
        return [objectNatives.setFaction(this, 16 + (toNumber(args[0]) ?? 0))];
      case "get_team_index":
        // Capturable's reads the zone's owner; ObjectFaction's this row's faction.
        if (this.row?.typeId === this.types.Object) {
          return [objectNatives.getTeamIndex(this)];
        }
        this.writer.note(`${this.path}:${method}() (${rowKind(this.row)})`);
        return [-1];
      case "is_alive":
        return [objectNatives.isAlive(this)];
      case "lock":
      case "unlock":
        return [objectNatives.capturableLock(this, method === "lock")];
      case "set_icon_index":
        return [objectNatives.capturableSetIcon(this, toNumber(args[0]) ?? 0)];
      case "set_enabled_player_filter":
        return [objectNatives.setEnabledPlayerFilter(this, args[0])];
      case "set_disabled_player_filter":
        return [objectNatives.setDisabledPlayerFilter(this, args[0])];
      case "get_capture_progress":
        return [objectNatives.capturableProgress(this)];
      case "is_captured":
        return [objectNatives.capturableIsCaptured(this)];
      case "get_owner_team_index":
        return [objectNatives.capturableOwnerTeamIndex(this)];
      default: {
        const answer = unboundAnswer(method);
        this.writer.note(
          `${this.path}:${method}(${showArgs(args)}) ${unboundLabel(answer)}`
        );
        return [answer];
      }
    }
  }

  // Compiled structs are value types, so a table argument is copied.
  private append(value: LuaValue): boolean {
    const copied = value instanceof LuaTable ? copyLuaTable(value) : value;
    this.object.set(this.appendIndex, copied);
    this.appendIndex += 1;
    this.writer.note(
      `${this.path}:append(${show(value)}) -> [${this.appendIndex - 1}]`
    );
    return true;
  }

  unknownPredicate(method: string): boolean {
    this.writer.notePoll(
      `${this.path}:${method}`,
      `${this.path}:${method}() (unknown, false)`
    );
    return false;
  }

  // A Loot row reports nothing: a pickup arrives as a gather_material incident
  // carrying the row's material.
  get enabledLootRow(): BoundRow | undefined {
    return this.lootEnabled ? this.row : undefined;
  }

  // The identifier import_only_bind gave a row by name; the material a pickup
  // carries when the row has none authored.
  get boundIdentifier(): number | undefined {
    return this.handle === undefined
      ? undefined
      : resolveStringHash(this.handle);
  }

  get watchedRow(): BoundRow | undefined {
    return this.watched;
  }

  noteInteraction(
    carries: (name: number) => boolean,
    namesOf: (row: BoundRow) => number[]
  ): void {
    incidentNatives.noteInteraction(this, carries, namesOf);
  }

  noteLootGathered(): void {
    objectNatives.noteLootGathered(this);
  }

  // Back to idle, so a later start() is a new command.
  noteCinematicFinished(): void {
    sequenceNatives.noteCinematicFinished(this);
  }

  noteAnyKill(kill: KillFilterDetails): void {
    incidentNatives.noteAnyKill(this, kill);
  }

  // Reset by create()/create_anew().
  noteDestructibleKill(
    hashes: readonly number[],
    namesOf: (row: BoundRow) => number[]
  ): void {
    objectNatives.noteDestructibleKill(this, hashes, namesOf);
  }

  // Exact-name match; the audience check is "no metadata or all_players".
  dispatchIncident(nameHash: number, metadata: LuaValue): void {
    incidentNatives.dispatchIncident(this, nameHash, metadata);
  }

  // The row is the listener: a fire runs the handler unconditionally.
  dispatchTriggerFired(metadata: LuaValue): void {
    incidentNatives.dispatchTriggerFired(this, metadata);
  }

  private bind(value: LuaValue): boolean {
    if (typeof value === "string") {
      this.handle = value;
      this.writer.note(`${this.path}:import_only_bind("${value}")`);
      return true;
    }
    if (value instanceof LuaHostObject) {
      const target = boundObjects.get(value);
      // A slot with no row adopts the argument's.
      if (this.row === undefined) {
        this.row = target?.row;
      } else {
        this.watched = target?.row;
      }
      this.writer.note(
        `${this.path}:import_only_bind(${value.hostName})` +
          (this.row ? ` -> ${describe(this.row)}` : "")
      );
      return true;
    }
    this.writer.note(
      `${this.path}:import_only_bind(${show(value)}) (unknown argument)`
    );
    return true;
  }

  private bindObject(value: LuaValue): boolean {
    if (typeof value !== "string") {
      this.writer.note(
        `${this.path}:import_only_bind_object(${show(value)}) (unknown argument)`
      );
      return true;
    }
    const row = this.rows.resolveByIdentifier(value);
    this.row ??= row;
    this.writer.note(
      `${this.path}:import_only_bind_object("${value}")` +
        (row ? ` -> ${describe(row)}` : " (no row named that identifier)")
    );
    return true;
  }

  applyScoreboardTeamIncident(incidentName: number, team: number): void {
    scoreboardNatives.applyScoreboardTeamIncident(this, incidentName, team);
  }

  // A monitored volume's players, the Objective's slot counter, or a listener's tally.
  count(): number {
    if (this.incidentWatch?.squads) {
      const baseline = this.incidentWatch.squadBaseline ?? 0;
      return Math.max(
        0,
        incidentNatives.sumSquadDeaths(this, this.incidentWatch.squads) -
          baseline
      );
    }
    if (this.incidentWatch) {
      return this.incidentWatch.count;
    }
    if (this.row?.typeId === this.types.Objective) {
      return (
        this.context.reports.objectiveCount(
          itemKey(this.row.bundle, this.row.typeIndex),
          OBJECTIVE_SLOT
        ) ?? 0
      );
    }
    return objectNatives.playerCount(this);
  }

  private isActive(): boolean {
    if (this.handle === undefined) {
      if (this.row?.typeId === this.types.PlayerObjective) {
        return this.playerObjectiveStage === PlayerObjectiveStage.Active;
      }
      if (this.row?.typeId === this.types.Object) {
        const used = objectNatives.usedSinceClear(this);
        this.writer.notePoll(
          `${this.path}:is_active`,
          `${this.path}:is_active() -> ${used} (interaction)`
        );
        return used;
      }
      return this.row !== undefined;
    }
    // activate()/clear() write the player's flag list, so is_active() reads it.
    const hash = objectNatives.activityFlagHash(this);
    const flagged =
      hash !== undefined && this.context.state.hasActivityFlag(hash);
    const active =
      flagged || (this.context.namedHandles.get(this.handle) ?? false);
    this.writer.notePoll(
      `${this.path}:is_active`,
      `${this.path}:is_active() -> ${active} (handle "${this.handle}")`
    );
    return active;
  }
}

// Every LuaHostObject handed to the script, so a native can recover its state.
const boundObjects = new WeakMap<LuaHostObject, LuaBoundObject>();

export function registerBoundObject(bound: LuaBoundObject): LuaHostObject {
  boundObjects.set(bound.object, bound);
  return bound.object;
}

export function boundObjectOf(value: LuaValue): LuaBoundObject | undefined {
  return value instanceof LuaHostObject ? boundObjects.get(value) : undefined;
}

// The pack a sleep_until waits on: the closure returns (value, description).
export class LuaPredicatePack extends LuaTable {
  readonly predicate: LuaValue;

  constructor(predicate: LuaValue) {
    super();
    this.predicate = predicate;
  }
}
