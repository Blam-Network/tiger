// What the natives share without reaching back into the bound object: the
// host context and report shapes, the item writer, and the hash and label helpers.

import { LuaHostObject } from "../../hks/env/host_env.ts";
import { type LuaValue, luaToString } from "../../hks/vm/values.ts";
import {
  type AuthoredCells,
  authoredRoster,
  type BoundRow,
} from "../bound/bindings.ts";
import type { ScriptItemState } from "../state/item_state.ts";
import {
  type CommandScriptAtom,
  type ItemChange,
  type ItemRef,
  type ItemState,
  itemRef,
  type MachineState,
  type NavPoint,
  type ScoreboardDefinition,
  type SquadState,
} from "../state/items.ts";
import { itemKey } from "../tags/item_key.ts";
import type {
  ActivityBundleItemTypes,
  ObjectiveTask,
} from "../tags/tag_types.ts";

export interface RowFacts {
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
export interface HostReports {
  // Flag 7 spent, flag 8 auth received.
  actorBound(key: string): { flag7: boolean; flag8: boolean } | undefined;
  actorCommandScript(
    key: string
  ):
    | { cookieRunning?: number; heartbeat?: number; pcReached?: number }
    | undefined;
  actorStanding(key: string): { epoch: number; standing: boolean } | undefined;
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
  // The device an Object's sense carries: the position the client holds and
  // its stamp.
  deviceSense?(
    key: string
  ): { position: number; positionStamp: number } | undefined;
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

export interface HostClock {
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

interface ActivityPlayerRef {
  characterKey: string;
  // PlayerAuth faction - 16; undefined where no team is known.
  team?: number;
}

export interface HostContext {
  activityFlagChanged(hash: number, active: boolean): void;
  clock: HostClock;
  // What set_handler captures as a later handler's `self`.
  currentInstance(): LuaValue | undefined;
  endActivity?(): void;
  holdLifetimeForCinematic?(row: BoundRow): void;
  log(line: string): void;
  machineStates?: Map<string, MachineState>;
  // The scripts' @member_counts by itemKey; unset, no squad has any.
  memberCounts?: ReadonlyMap<string, AuthoredCells>;
  namedHandles: ReadonlyMap<string, boolean>;
  // A gate whose predicate only touches row-less handles can never change.
  noteRowRead(hasRow: boolean): void;
  objectStates: Map<string, ObjectItemState>;
  // A debugger's taps on what the scripts note and send.
  onNote?(line: string): void;
  onSent?(change: ItemChange): void;
  onSquadEpochBump?(key: string): void;
  placeActors: boolean;
  playerSensor(characterKey: string): LuaValue | undefined;
  players(): readonly ActivityPlayerRef[];
  reports: HostReports;
  // A non-function logs and does nothing.
  runHandler(handler: LuaValue, args: readonly LuaValue[]): void;
  scoreboardDefinition?: ScoreboardDefinition;
  sink(change: ItemChange): void;
  state: ScriptItemState;
  time(): number;
  trace: string[];
  types: ActivityBundleItemTypes;
}

export class ItemWriter {
  private readonly context: HostContext;
  private readonly lastPoll = new Map<string, string>();

  constructor(context: HostContext) {
    this.context = context;
  }

  note(line: string): void {
    this.context.trace.push(line);
    this.context.log(`lua ${line}`);
    this.context.onNote?.(line);
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
    this.context.onSent?.(change);
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
    const state: SquadState = { ...previous, ...change };
    const authored = this.context.memberCounts?.get(
      itemKey(row.bundle, row.typeIndex)
    );
    if (authored !== undefined) {
      // A squad nothing placed has no bodies, not its authored total.
      state.roster = authoredRoster(authored, state.bodies ?? 0);
    }
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
    const previous = this.context.state.squad(row).bodies ?? 0;
    this.squad(row, {
      ...change,
      bodies: count,
      ...(count > previous
        ? { placedAt: this.context.clock.activityTicks() }
        : {}),
    });
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

// A host object prints as its script-side name.
export function show(value: LuaValue): string {
  return value instanceof LuaHostObject ? value.hostName : luaToString(value);
}

export function showArgs(args: readonly LuaValue[]): string {
  return args.map((arg) => show(arg)).join(", ");
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
export const LIFETIME_ENDED_STATE = 6;
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
export const OBJECTIVE_IDLE_STATE = 0;
