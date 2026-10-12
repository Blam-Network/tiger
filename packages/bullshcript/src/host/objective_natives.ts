// Objective and PlayerObjective verbs - the receiver-side split of natives.ts's
// LuaBoundObject.

import type { LuaValue } from "../hks/values.ts";
import * as incidentNatives from "./incident_natives.ts";
import { itemRef, type NavPoint, PlayerObjectiveStage } from "./items.ts";
import {
  boundObjectOf,
  describe,
  type LuaBoundObject,
  OBJECTIVE_ACTIVE_STATE,
  OBJECTIVE_SLOT,
  rowKind,
  SOLO_PLAYERS,
  show,
} from "./natives.ts";
import type { ActivityBundleItemTypes } from "./tag_types.ts";

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
  self: LuaBoundObject,
  stage: PlayerObjectiveStage,
  method: string
): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(`${self.path}:${method}() (${rowKind(self.row)})`);
    return true;
  }
  self.playerObjectiveStage = stage;
  return pushPlayerObjective(self, `player objective ${STAGE_NAMES[stage]}`);
}

// clear(): the line goes, and its tier, progress and countdown with it so
// the next show starts clean.
export function playerObjectiveClear(self: LuaBoundObject): boolean {
  self.playerObjectiveStage = PlayerObjectiveStage.None;
  self.playerObjectiveTier = undefined;
  self.playerObjectiveProgress = undefined;
  self.playerObjectiveProgressItem = undefined;
  self.timer = undefined;
  return pushPlayerObjective(self, "player objective cleared");
}

export function publicEventTier(self: LuaBoundObject, tier: number): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(
      `${self.path}:set_public_event_tier(${tier}) (${rowKind(self.row)})`
    );
    return true;
  }
  self.playerObjectiveTier = tier;
  return pushPlayerObjective(self, `public event tier ${tier}`);
}

// A PlayerObjective's progress min/max, read "when ref7 [a Squad/Actor/ Object
// live count] is null" - progress_bind is the only verb that sets ref7.
export function progressActivate(
  self: LuaBoundObject,
  min: number,
  max: number
): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(
      `${self.path}:progress_activate(${min}, ${max}) (${rowKind(self.row)})`
    );
    return true;
  }
  self.playerObjectiveProgress = { min, max };
  return pushPlayerObjective(self, `progress ${min}..${max}`);
}

// Copies a NavPoint's position into nav slot 0, falling back on the squad's
// spawn point (80801603) or the Object's placement; unresolved is a no-op.
export function navPointActivate(
  self: LuaBoundObject,
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
  self.playerObjectiveNavPoint = point;
  return pushPlayerObjective(
    self,
    `${label} -> (${point.x}, ${point.y}, ${point.z}) (${source})`
  );
}

export function navPointClear(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(`${self.path}:nav_point_clear() (${rowKind(self.row)})`);
    return true;
  }
  self.playerObjectiveNavPoint = undefined;
  return pushPlayerObjective(self, "nav point cleared");
}

// set_active/set_incoming/clear/progress_activate/nav_point_* write one state,
// rebuilt whole on every write. The solo player takes part in every stage but None.
export function pushPlayerObjective(
  self: LuaBoundObject,
  label: string
): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(`${self.path} player objective ${label} (no row)`);
    return true;
  }
  const timer = self.timer;
  const shown = self.playerObjectiveStage !== PlayerObjectiveStage.None;
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
        navPoints: self.playerObjectiveNavPoint
          ? [self.playerObjectiveNavPoint]
          : [],
        participants: shown ? SOLO_PARTICIPANTS : undefined,
        progress: self.playerObjectiveProgress,
        progressItem: self.playerObjectiveProgressItem,
        state: self.playerObjectiveStage,
        tier: self.playerObjectiveTier,
      },
    },
    label
  );
  return true;
}

// progress_bind(target): the item the HUD counts; with it set the
// progress fields are not read.
export function progressBind(self: LuaBoundObject, value: LuaValue): boolean {
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
  self.playerObjectiveProgressItem = itemRef(target);
  return pushPlayerObjective(self, `${label} -> ${describe(target)}`);
}

// progress_clear(): progress and its bound item back to their defaults.
export function progressClear(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(`${self.path}:progress_clear() (${rowKind(self.row)})`);
    return true;
  }
  self.playerObjectiveProgress = undefined;
  self.playerObjectiveProgressItem = undefined;
  return pushPlayerObjective(self, "progress cleared");
}

// Our own last current (progress_update), 0 before any.
export function progressCurrent(self: LuaBoundObject): number {
  const current =
    self.row?.typeId === self.types.PlayerObjective
      ? (self.playerObjectiveProgress?.min ?? 0)
      : 0;
  self.writer.notePoll(
    `${self.path}:progress_get_current`,
    `${self.path}:progress_get_current() -> ${current}`
  );
  return current;
}

// The solo player once any engagement source has fired; the handler itself is
// not run.
export function engagedPlayerCount(self: LuaBoundObject): number {
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
export function progressIsComplete(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    return self.unknownPredicate("progress_is_complete");
  }
  const progress = self.playerObjectiveProgress;
  const complete = progress !== undefined && progress.min >= progress.max;
  self.writer.notePoll(
    `${self.path}:progress_is_complete`,
    `${self.path}:progress_is_complete() -> ${complete}`
  );
  return complete;
}

export function progressUpdate(self: LuaBoundObject, current: number): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(
      `${self.path}:progress_update(${current}) (${rowKind(self.row)})`
    );
    return true;
  }
  self.playerObjectiveProgress = {
    min: current,
    max: self.playerObjectiveProgress?.max ?? 0,
  };
  return pushPlayerObjective(self, `progress ${current} (current)`);
}

export function objectiveState(self: LuaBoundObject, state: number): boolean {
  if (self.row?.typeId !== self.types.Objective) {
    self.writer.note(
      `${self.path} objective state ${state} (${rowKind(self.row)})`
    );
    return true;
  }
  self.objectiveSlotValue = state;
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
export function objectiveReset(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.Objective) {
    self.writer.note(`${self.path}:reset() (${rowKind(self.row)})`);
    return true;
  }
  const next = self.objectiveSlotValue === 1 ? 2 : 1;
  self.objectiveSlotValue = next;
  self.objectiveGeneration += 1;
  const slots: (number | undefined)[] = [];
  slots[OBJECTIVE_SLOT] = next;
  self.writer.set(
    self.row,
    {
      kind: "objective",
      state: { slots, unk1: self.objectiveGeneration },
    },
    `reset: slot ${OBJECTIVE_SLOT} state ${next}, unk1 ${self.objectiveGeneration}`
  );
  return true;
}

// The Objective row's slot is driven to its active state so the client zeroes
// its counters.
export function addSquad(self: LuaBoundObject, value: LuaValue): boolean {
  const squad = boundObjectOf(value);
  if (!(self.row && squad?.row)) {
    self.writer.note(`${self.path}:add_squad(${show(value)}) (no row)`);
    return true;
  }
  self.objectiveSlotValue = OBJECTIVE_ACTIVE_STATE;
  const slots: (number | undefined)[] = [];
  slots[OBJECTIVE_SLOT] = OBJECTIVE_ACTIVE_STATE;
  self.writer.set(
    self.row,
    { kind: "objective", state: { slots } },
    `slot ${OBJECTIVE_SLOT} state ${OBJECTIVE_ACTIVE_STATE}`
  );
  return true;
}
