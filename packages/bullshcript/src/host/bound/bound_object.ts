// The bound object a script's `self` field resolves to: a row (or a slot
// bound to one later) plus the per-row state its verbs keep. Verbs dispatch
// through the native registry.

import {
  type LuaHostInvocation,
  type LuaHostInvoke,
  LuaHostObject,
} from "../../hks/env/host_env.ts";
import type { LuaValue } from "../../hks/vm/values.ts";
import { NativeRegistry } from "../natives/native_registry.ts";
import {
  type HostContext,
  type ItemWriter,
  type KillFilterDetails,
  type RowFacts,
  showArgs,
  unboundAnswer,
  unboundLabel,
} from "../natives/native_support.ts";
import { newSequenceState } from "../state/item_state.ts";
import type { ItemChange } from "../state/items.ts";
import { FNV1_EMPTY, fnv1, parseHashLiteral } from "../tags/name_hash.ts";
import type { ActivityBundleItemTypes } from "../tags/tag_types.ts";
import type { BoundRow } from "./bindings.ts";
import {
  newActorSlice,
  newIncidentSlice,
  newLifetimeSlice,
  newLootSlice,
  newObjectiveSlice,
  newObjectSlice,
  newScoreboardSlice,
  newSequenceSlice,
  newSquadSlice,
} from "./bound_slices.ts";

// Filled by natives.ts, which imports the domain modules that register into it.
export const nativeRegistry = new NativeRegistry<BoundInstance>();

// Member reads can name a thread or a row instead of binding a method.
class BoundTable extends LuaHostObject {
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
export class BoundInstance {
  readonly object: LuaHostObject;
  readonly path: string;
  row: BoundRow | undefined;
  handle: string | undefined;
  // The row a second import_only_bind() on a bound slot points at.
  watched: BoundRow | undefined;
  readonly context: HostContext;
  readonly types: ActivityBundleItemTypes;
  readonly writer: ItemWriter;
  readonly rows: RowFacts;
  private readonly member: (path: string, field: string) => LuaValue;
  // The squads add_child() put under a group; squadScopeOf walks it.
  readonly children: BoundInstance[] = [];
  appendIndex = 0;

  // Per-domain row state; each natives module owns its slice.
  readonly loot = newLootSlice();
  readonly lifetime = newLifetimeSlice();
  readonly sequence = newSequenceSlice();
  readonly objectRow = newObjectSlice();
  readonly squad = newSquadSlice();
  readonly actor = newActorSlice();
  readonly objective = newObjectiveSlice();
  readonly scoreboard = newScoreboardSlice();
  readonly incident = newIncidentSlice();

  constructor(
    context: HostContext,
    writer: ItemWriter,
    path: string,
    row: BoundRow | undefined,
    rows: RowFacts,
    member: (path: string, field: string) => LuaValue = () => undefined
  ) {
    this.context = context;
    this.types = context.types;
    this.writer = writer;
    this.path = path;
    this.row = row;
    this.rows = rows;
    this.member = member;
    this.object = new BoundTable(
      path,
      (invocation) => this.invoke(invocation),
      (field) => this.member(path, field)
    );
  }

  advance(seconds: number): void {
    nativeRegistry.advance(this, seconds);
  }

  // A hard wipe put the row back to how it started: the handle forgets what it
  // did to it. Its counters only go up, so they stay, and are past the ones
  // the wipe sent.
  restart(change: ItemChange | undefined): void {
    const { actor, loot, objective, squad } = this;
    Object.assign(this.squad, {
      ...newSquadSlice(),
      behaviourIncarnation: squad.behaviourIncarnation,
    });
    Object.assign(this.actor, {
      ...newActorSlice(),
      healthIncarnation: actor.healthIncarnation,
      incarnation: actor.incarnation,
      killEpoch: actor.killEpoch,
      scriptCookie: actor.scriptCookie,
    });
    Object.assign(this.loot, { ...newLootSlice(), epoch: loot.epoch });
    Object.assign(this.objective, {
      ...newObjectiveSlice(),
      generation: objective.generation,
    });
    Object.assign(this.objectRow, newObjectSlice());
    this.sequence.cinematicFinished = false;
    this.sequence.timer = undefined;
    this.sequence.own = {
      ...newSequenceState(),
      nextPlayingId: this.sequence.own.nextPlayingId,
    };
    switch (change?.kind) {
      case "actor":
        actor.incarnation = Math.max(
          actor.incarnation,
          change.state.incarnation ?? 1
        );
        squad.behaviourIncarnation = Math.max(
          squad.behaviourIncarnation,
          change.state.behaviour?.incarnation ?? 0
        );
        break;
      case "loot":
        loot.epoch = Math.max(loot.epoch, change.state.epoch);
        break;
      case "objective":
        objective.generation = Math.max(
          objective.generation,
          change.state.unk1 ?? 0
        );
        break;
      default:
        break;
    }
  }

  private invoke({ method, args }: LuaHostInvocation): readonly LuaValue[] {
    this.context.noteRowRead(
      this.row !== undefined ||
        this.incident.watch !== undefined ||
        this.handle !== undefined
    );
    const rowAnswer = nativeRegistry.rowAnswer(this, method, args);
    if (rowAnswer !== undefined) {
      return [rowAnswer];
    }
    const handler = nativeRegistry.lookup(method);
    if (handler) {
      return [handler(this, args, method)];
    }
    const answer = unboundAnswer(method);
    this.writer.note(
      `${this.path}:${method}(${showArgs(args)}) ${unboundLabel(answer)}`
    );
    return [answer];
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
    return this.loot.enabled ? this.row : undefined;
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
    nativeRegistry.events.noteInteraction?.(this, carries, namesOf);
  }

  noteLootGathered(): void {
    nativeRegistry.events.noteLootGathered?.(this);
  }

  // Back to idle, so a later start() is a new command.
  noteCinematicFinished(): void {
    nativeRegistry.events.noteCinematicFinished?.(this);
  }

  noteAnyKill(kill: KillFilterDetails): void {
    nativeRegistry.events.noteAnyKill?.(this, kill);
  }

  // Reset by create()/create_anew().
  noteDestructibleKill(
    hashes: readonly number[],
    namesOf: (row: BoundRow) => number[]
  ): void {
    nativeRegistry.events.noteDestructibleKill?.(this, hashes, namesOf);
  }

  // Exact-name match; the audience check is "no metadata or all_players".
  dispatchIncident(nameHash: number, metadata: LuaValue): void {
    nativeRegistry.events.dispatchIncident?.(this, nameHash, metadata);
  }

  // The row is the listener: a fire runs the handler unconditionally.
  dispatchTriggerFired(metadata: LuaValue): void {
    nativeRegistry.events.dispatchTriggerFired?.(this, metadata);
  }

  applyScoreboardTeamIncident(incidentName: number, team: number): void {
    nativeRegistry.events.applyScoreboardTeamIncident?.(
      this,
      incidentName,
      team
    );
  }

  // A monitored volume's players, the Objective's slot counter, or a listener's tally.
  count(): number {
    return nativeRegistry.events.count?.(this) ?? 0;
  }
}

// Every LuaHostObject handed to the script, so a native can recover its state.
const boundObjects = new WeakMap<LuaHostObject, BoundInstance>();

export function registerBoundObject(bound: BoundInstance): LuaHostObject {
  boundObjects.set(bound.object, bound);
  return bound.object;
}

export function boundObjectOf(value: LuaValue): BoundInstance | undefined {
  return value instanceof LuaHostObject ? boundObjects.get(value) : undefined;
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
