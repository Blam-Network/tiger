// Objective and PlayerObjective verbs - the receiver-side split of natives.ts's
// BoundInstance.

import { type LuaValue, toNumber } from "../../hks/vm/values.ts";
import { type BoundInstance, boundObjectOf } from "../bound/bound_object.ts";
import {
  itemRef,
  type NavPoint,
  PlayerObjectiveStage,
} from "../state/items.ts";
import type { ActivityBundleItemTypes } from "../tags/tag_types.ts";
import * as incidentNatives from "./incident_natives.ts";
import type { NativeRegistry } from "./native_registry.ts";
import {
  describe,
  OBJECTIVE_ACTIVE_STATE,
  OBJECTIVE_IDLE_STATE,
  OBJECTIVE_SLOT,
  rowKind,
  SOLO_PLAYERS,
  show,
} from "./native_support.ts";

// A shown player objective's participants: bit 0, the solo player's activity
// player index. Nothing here knows a fireteam member's index yet.
const SOLO_PARTICIPANTS = 1;
// PlayerObjectiveStage by value, for the trace.
const STAGE_NAMES = ["none", "incoming", "active", "complete", "failed"];
// What the HUD can take a player objective's progress from: "progress
// bound to unsupported slot type" for anything else.
function progressItemTypes(types: ActivityBundleItemTypes): number[] {
  return [types.Squad, types.Actor, types.Object];
}

export function playerObjectiveSet(
  self: BoundInstance,
  stage: PlayerObjectiveStage,
  method: string
): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(`${self.path}:${method}() (${rowKind(self.row)})`);
    return true;
  }
  self.objective.stage = stage;
  return pushPlayerObjective(self, `player objective ${STAGE_NAMES[stage]}`);
}

// clear(): the line goes, and its tier, progress and countdown with it so
// the next show starts clean.
export function playerObjectiveClear(self: BoundInstance): boolean {
  self.objective.stage = PlayerObjectiveStage.None;
  self.objective.tier = undefined;
  self.objective.progress = undefined;
  self.objective.progressItem = undefined;
  self.sequence.timer = undefined;
  return pushPlayerObjective(self, "player objective cleared");
}

export function publicEventTier(self: BoundInstance, tier: number): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(
      `${self.path}:set_public_event_tier(${tier}) (${rowKind(self.row)})`
    );
    return true;
  }
  self.objective.tier = tier;
  return pushPlayerObjective(self, `public event tier ${tier}`);
}

// A PlayerObjective's progress min/max, read "when ref7 [a Squad/Actor/ Object
// live count] is null" - progress_bind is the only verb that sets ref7.
export function progressActivate(
  self: BoundInstance,
  min: number,
  max: number
): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(
      `${self.path}:progress_activate(${min}, ${max}) (${rowKind(self.row)})`
    );
    return true;
  }
  self.objective.progress = { min, max };
  return pushPlayerObjective(self, `progress ${min}..${max}`);
}

// Copies a NavPoint's position into nav slot 0, falling back on the squad's
// spawn point (80801603) or the Object's placement; unresolved is a no-op.
export function navPointActivate(
  self: BoundInstance,
  target: LuaValue,
  fallback?: LuaValue
): boolean {
  const label = fallback
    ? `nav_point_activate_with_fallback(${show(fallback)}, ${show(target)})`
    : `nav_point_activate(${show(target)})`;
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
    return true;
  }
  const targetRow = boundObjectOf(target)?.row;
  let point: NavPoint | undefined =
    targetRow && self.rows.navPointPosition(targetRow);
  let source = "NavPoint";
  if (!point) {
    const fallbackRow =
      fallback === undefined ? targetRow : boundObjectOf(fallback)?.row;
    if (fallbackRow?.typeId === self.types.Squad) {
      point = self.rows.squadSpawnPoint?.(fallbackRow);
      source = "squad spawn point";
    } else if (fallbackRow?.typeId === self.types.Object) {
      point = self.rows.objectPosition?.(fallbackRow);
      source = "object position";
    }
  }
  if (!point) {
    self.writer.note(
      `${self.path}:${label} (no NavPoint position for this row, no-op)`
    );
    return true;
  }
  self.objective.navPoint = point;
  return pushPlayerObjective(
    self,
    `${label} -> (${point.x}, ${point.y}, ${point.z}) (${source})`
  );
}

export function navPointClear(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(`${self.path}:nav_point_clear() (${rowKind(self.row)})`);
    return true;
  }
  self.objective.navPoint = undefined;
  return pushPlayerObjective(self, "nav point cleared");
}

// set_active/set_incoming/clear/progress_activate/nav_point_* write one state,
// rebuilt whole on every write. The solo player takes part in every stage but None.
export function pushPlayerObjective(
  self: BoundInstance,
  label: string
): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(`${self.path} player objective ${label} (no row)`);
    return true;
  }
  const timer = self.sequence.timer;
  const shown = self.objective.stage !== PlayerObjectiveStage.None;
  self.writer.set(
    self.row,
    {
      kind: "playerObjective",
      state: {
        countdown:
          timer && timer.duration > 0
            ? {
                at: self.context.clock.activityTicks(),
                duration: timer.duration,
                remaining: timer.remaining,
                running: timer.running,
              }
            : undefined,
        navPoints: self.objective.navPoint ? [self.objective.navPoint] : [],
        participants: shown ? SOLO_PARTICIPANTS : undefined,
        progress: self.objective.progress,
        progressItem: self.objective.progressItem,
        state: self.objective.stage,
        tier: self.objective.tier,
      },
    },
    label
  );
  return true;
}

// progress_bind(target): the item the HUD counts; with it set the
// progress fields are not read.
export function progressBind(self: BoundInstance, value: LuaValue): boolean {
  const target = boundObjectOf(value)?.row;
  const label = `progress_bind(${show(value)})`;
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
    return true;
  }
  if (!(target && progressItemTypes(self.types).includes(target.typeId))) {
    self.writer.note(
      `${self.path}:${label} (not a Squad, Actor or Object row, no-op)`
    );
    return true;
  }
  self.objective.progressItem = itemRef(target);
  return pushPlayerObjective(self, `${label} -> ${describe(target)}`);
}

// progress_clear(): progress and its bound item back to their defaults.
export function progressClear(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(`${self.path}:progress_clear() (${rowKind(self.row)})`);
    return true;
  }
  self.objective.progress = undefined;
  self.objective.progressItem = undefined;
  return pushPlayerObjective(self, "progress cleared");
}

// Our own last current (progress_update), 0 before any.
export function progressCurrent(self: BoundInstance): number {
  const current =
    self.row?.typeId === self.types.PlayerObjective
      ? (self.objective.progress?.min ?? 0)
      : 0;
  self.writer.notePoll(
    `${self.path}:progress_get_current`,
    `${self.path}:progress_get_current() -> ${current}`
  );
  return current;
}

// The solo player once any engagement source has fired; the handler itself is
// not run.
export function engagedPlayerCount(self: BoundInstance): number {
  const sources =
    incidentNatives.engagementsOf(self.context).get(self.path) ?? [];
  const count = sources.some((source) => incidentNatives.hasEngaged(source))
    ? SOLO_PLAYERS
    : 0;
  self.writer.notePoll(
    `${self.path}:get_engaged_player_count`,
    `${self.path}:get_engaged_player_count() -> ${count} ` +
      `(${sources.length} engagement source(s))`
  );
  return count;
}

// progress_is_complete()/progress_update(n) - see the case block above for why
// "min" doubles as "current".
export function progressIsComplete(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    return self.unknownPredicate("progress_is_complete");
  }
  const progress = self.objective.progress;
  const complete = progress !== undefined && progress.min >= progress.max;
  self.writer.notePoll(
    `${self.path}:progress_is_complete`,
    `${self.path}:progress_is_complete() -> ${complete}`
  );
  return complete;
}

export function progressUpdate(self: BoundInstance, current: number): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(
      `${self.path}:progress_update(${current}) (${rowKind(self.row)})`
    );
    return true;
  }
  self.objective.progress = {
    min: current,
    max: self.objective.progress?.max ?? 0,
  };
  return pushPlayerObjective(self, `progress ${current} (current)`);
}

export function objectiveState(self: BoundInstance, state: number): boolean {
  if (self.row?.typeId !== self.types.Objective) {
    self.writer.note(
      `${self.path} objective state ${state} (${rowKind(self.row)})`
    );
    return true;
  }
  self.objective.slotValue = state;
  const slots: (number | undefined)[] = [];
  slots[OBJECTIVE_SLOT] = state;
  self.writer.set(
    self.row,
    { kind: "objective", state: { slots } },
    `slot ${OBJECTIVE_SLOT} state ${state}`
  );
  return true;
}

// The influencer's exhausted-option state is only forgotten on a slot byte
// change, so reset() toggles between the two non-zero values.
export function objectiveReset(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.Objective) {
    self.writer.note(`${self.path}:reset() (${rowKind(self.row)})`);
    return true;
  }
  const next = self.objective.slotValue === 1 ? 2 : 1;
  self.objective.slotValue = next;
  self.objective.generation += 1;
  const slots: (number | undefined)[] = [];
  slots[OBJECTIVE_SLOT] = next;
  self.writer.set(
    self.row,
    {
      kind: "objective",
      state: { slots, unk1: self.objective.generation },
    },
    `reset: slot ${OBJECTIVE_SLOT} state ${next}, unk1 ${self.objective.generation}`
  );
  return true;
}

// The Objective row's slot is driven to its active state so the client zeroes
// its counters.
export function addSquad(self: BoundInstance, value: LuaValue): boolean {
  const squad = boundObjectOf(value);
  if (!(self.row && squad?.row)) {
    self.writer.note(`${self.path}:add_squad(${show(value)}) (no row)`);
    return true;
  }
  self.objective.slotValue = OBJECTIVE_ACTIVE_STATE;
  const slots: (number | undefined)[] = [];
  slots[OBJECTIVE_SLOT] = OBJECTIVE_ACTIVE_STATE;
  self.writer.set(
    self.row,
    { kind: "objective", state: { slots } },
    `slot ${OBJECTIVE_SLOT} state ${OBJECTIVE_ACTIVE_STATE}`
  );
  return true;
}

export function register(registry: NativeRegistry<BoundInstance>): void {
  registry.verb("add_squad", (self, args) => addSquad(self, args[0]));
  registry.verb("set_incoming", (self, _args, method) =>
    playerObjectiveSet(self, PlayerObjectiveStage.Incoming, method)
  );
  registry.verb("set_active", (self, _args, method) =>
    playerObjectiveSet(self, PlayerObjectiveStage.Active, method)
  );
  registry.verb("set_complete", (self, _args, method) =>
    playerObjectiveSet(self, PlayerObjectiveStage.Complete, method)
  );
  registry.verb("set_failed", (self, _args, method) =>
    playerObjectiveSet(self, PlayerObjectiveStage.Failed, method)
  );
  // 0 ribbon, 1 bronze, 2 silver, 3 gold.
  registry.verb("set_public_event_tier", (self, args) =>
    publicEventTier(self, toNumber(args[0]) ?? 0)
  );
  // Progress min/max, used "when ref7 is null" (client 0x8232B73C).
  registry.verb("progress_activate", (self, args) =>
    progressActivate(self, toNumber(args[0]) ?? 0, toNumber(args[1]) ?? 0)
  );
  // Copies the NavPoint row's position into nav slot 0, the only slot used.
  registry.verb("nav_point_activate", (self, args) =>
    navPointActivate(self, args[0])
  );
  // The squad fallback has no position source and stays a no-op.
  registry.verb("nav_point_activate_with_fallback", (self, args) =>
    navPointActivate(self, args[1], args[0])
  );
  registry.verb("nav_point_clear", (self) => navPointClear(self));
  // The "min" field is reused as "current"; complete once it reaches max.
  registry.verb("progress_is_complete", (self) => progressIsComplete(self));
  registry.verb("progress_update", (self, args) =>
    progressUpdate(self, toNumber(args[0]) ?? 0)
  );
  registry.verb("progress_get_current", (self) => progressCurrent(self));
  registry.verb("progress_bind", (self, args) => progressBind(self, args[0]));
  registry.verb("progress_clear", (self) => progressClear(self));
  registry.verb("get_engaged_player_count", (self) => engagedPlayerCount(self));
  // Aliases objective_begin: there is no incoming step to skip.
  registry.verb(["objective_begin", "objective_begin_immediate"], (self) =>
    objectiveState(self, OBJECTIVE_ACTIVE_STATE)
  );
  registry.verb(["objective_end", "objective_end_silent"], (self) =>
    objectiveState(self, OBJECTIVE_IDLE_STATE)
  );
  // The PlayerObjective clear() that follows drops the waypoints anyway.
  registry.verb("nav_point_clear_all", (self) => {
    self.writer.note(`${self.path}:nav_point_clear_all() (host-only, no-op)`);
    return true;
  });
}
