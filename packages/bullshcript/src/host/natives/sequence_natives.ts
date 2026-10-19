// Sequence, Lifetime, Timer and Cinematic verbs - the receiver-side split of
// natives.ts's BoundInstance.

import { isTruthy, type LuaValue, toNumber } from "../../hks/vm/values.ts";
import type { BoundRow } from "../bound/bindings.ts";
import {
  type BoundInstance,
  boundObjectOf,
  resolveStringHash,
} from "../bound/bound_object.ts";
import type { SequenceState } from "../state/item_state.ts";
import { itemRef } from "../state/items.ts";
import { FNV1_EMPTY } from "../tags/name_hash.ts";
import type { NativeRegistry } from "./native_registry.ts";
import {
  LIFETIME_END_GAME_DELAY_SECONDS,
  LIFETIME_ENDED_STATE,
  LIFETIME_RESULTS_STATE,
  LIFETIME_STATE_BY_MEMBER,
  rowKind,
  show,
  type TimerModel,
} from "./native_support.ts";
import * as objectNatives from "./object_natives.ts";
import * as objectiveNatives from "./objective_natives.ts";

// The binder's Timer row the lifetime is bound to (story_common).
const LIFETIME_TIMER_ROW = "lifetime_timer";

// Any id but 255 is playing; the client replays only when the id changes
// (0x8381AB00), so start() cycles ids.
const SEQUENCE_PLAYING_ID_MODULUS = 255;

// A Sequence row keeps its state in the shared item state; any other handle
// keeps its own.
function sequenceStateOf(self: BoundInstance): SequenceState {
  return self.row?.typeId === self.types.Sequence
    ? self.context.state.sequence(itemRef(self.row))
    : self.sequence.own;
}

// cinematic_finished named this Cinematic item. It goes back to idle, so
// a later start() is a new command to clients.
export function noteCinematicFinished(self: BoundInstance): void {
  const row = self.row;
  if (row?.typeId !== self.types.Cinematic || self.sequence.cinematicFinished) {
    return;
  }
  self.sequence.cinematicFinished = true;
  self.writer.set(
    row,
    { kind: "cinematic", state: {} },
    "cinematic finished, idle"
  );
}

// No blueprint: done at once. Otherwise host-timed off the definition's
// duration; 0 is a music bed, never auto-done. A Cinematic waits for cinematic_finished.
export function isDone(self: BoundInstance): boolean {
  if (self.row?.typeId === self.types.Sequence) {
    const hasSequence = self.rows.hasSequence?.(self.row);
    if (hasSequence === false) {
      self.writer.notePoll(
        `${self.path}:is_done`,
        `${self.path}:is_done() -> true (sequence, no blueprint authored)`
      );
      return true;
    }
    const sequence = sequenceStateOf(self);
    if (sequence.playedAt === undefined) {
      self.writer.notePoll(
        `${self.path}:is_done`,
        `${self.path}:is_done() -> false (sequence, not played)`
      );
      return false;
    }
    if (sequence.stopped) {
      self.writer.notePoll(
        `${self.path}:is_done`,
        `${self.path}:is_done() -> true (sequence, stopped)`
      );
      return true;
    }
    const rawDuration = self.rows.sequenceDuration?.(self.row);
    if (hasSequence === true && rawDuration === 0) {
      self.writer.notePoll(
        `${self.path}:is_done`,
        `${self.path}:is_done() -> false (sequence, music bed, waits for stop())`
      );
      return false;
    }
    // Undefined only for a caller with no sequenceDuration: never block on it.
    if (!rawDuration || rawDuration <= 0) {
      self.writer.notePoll(
        `${self.path}:is_done`,
        `${self.path}:is_done() -> true (sequence, no duration wired)`
      );
      return true;
    }
    const done = self.context.time() >= sequence.playedAt + rawDuration;
    self.writer.notePoll(
      `${self.path}:is_done`,
      `${self.path}:is_done() -> ${done} (sequence, ${rawDuration}s)`
    );
    return done;
  }
  if (self.row?.typeId === self.types.Cinematic) {
    self.writer.notePoll(
      `${self.path}:is_done`,
      `${self.path}:is_done() -> ${self.sequence.cinematicFinished} (cinematic)`
    );
    return self.sequence.cinematicFinished;
  }
  if (self.row) {
    return self.unknownPredicate("is_done");
  }
  self.writer.notePoll(
    `${self.path}:is_done`,
    `${self.path}:is_done() -> true (nothing behind it)`
  );
  return true;
}

export function model(self: BoundInstance): TimerModel {
  self.sequence.timer ??= {
    bar: false,
    duration: 0,
    rate: 1,
    remaining: 0,
    running: false,
    started: false,
  };
  return self.sequence.timer;
}

export function timerStart(
  self: BoundInstance,
  seconds: number | undefined
): boolean {
  const timer = model(self);
  timer.duration = seconds ?? timer.duration;
  timer.remaining = timer.duration;
  timer.rate = 1;
  timer.running = true;
  timer.started = true;
  return pushTimer(self, `activate ${timer.duration}s`);
}

export function timerReset(
  self: BoundInstance,
  seconds: number | undefined
): boolean {
  const timer = model(self);
  timer.duration = seconds ?? timer.duration;
  timer.remaining = timer.duration;
  timer.rate = 1;
  timer.running = false;
  timer.started = false;
  return pushTimer(self, `reset ${timer.duration}s`);
}

// timer_activate loads the countdown without starting it: the dropship
// event pauses, loads and only starts once its carrier has moved.
export function countdownLoad(self: BoundInstance, seconds: number): boolean {
  const timer = model(self);
  timer.duration = seconds;
  timer.remaining = seconds;
  timer.rate = 1;
  timer.running = false;
  timer.started = false;
  return pushCountdown(self, `countdown ${seconds}s`);
}

export function countdownRun(self: BoundInstance, running: boolean): boolean {
  const timer = model(self);
  timer.running = running;
  timer.started ||= running;
  return pushCountdown(
    self,
    running ? "countdown running" : "countdown paused"
  );
}

export function countdownClear(self: BoundInstance): boolean {
  self.sequence.timer = undefined;
  return pushCountdown(self, "countdown cleared");
}

// Complete once started and run down, never before: read as done on the
// first poll, every public event failed the moment it was offered.
export function countdownComplete(self: BoundInstance): boolean {
  const timer = self.sequence.timer;
  const complete = timer?.started === true && timer.remaining <= 0;
  self.writer.notePoll(
    `${self.path}:timer_is_complete`,
    `${self.path}:timer_is_complete() -> ${complete}`
  );
  return complete;
}

function pushCountdown(self: BoundInstance, label: string): boolean {
  if (self.row?.typeId !== self.types.PlayerObjective) {
    self.writer.note(`${self.path} ${label} (host only)`);
    return true;
  }
  return objectiveNatives.pushPlayerObjective(self, label);
}

// `start` on a Sequence row plays it, on a Cinematic row plays that; on
// anything else it is the timer verb.
export function startRow(self: BoundInstance, target?: LuaValue): boolean {
  if (self.row?.typeId === self.types.Cinematic) {
    return startCinematic(self, self.row);
  }
  if (self.row?.typeId !== self.types.Sequence) {
    return timerRun(self, true);
  }
  if (self.rows.hasSequence?.(self.row) === false) {
    self.writer.note(`${self.path}:start() (no sequence authored)`);
    return true;
  }
  const targetRow =
    target === undefined ? undefined : boundObjectOf(target)?.row;
  if (targetRow) {
    sequenceStateOf(self).target = itemRef(targetRow);
  }
  sequenceStateOf(self).playedAt = self.context.time();
  sequenceStateOf(self).stopped = false;
  const id = sequenceStateOf(self).nextPlayingId;
  sequenceStateOf(self).nextPlayingId =
    (sequenceStateOf(self).nextPlayingId + 1) % SEQUENCE_PLAYING_ID_MODULUS;
  sequenceStateOf(self).playing = {
    id,
    startedAt: self.context.clock.activityTicks(),
  };
  return pushSequence(self, "sequence play");
}

// stop(): back to idle; playedAt is kept so is_done() can tell stopped from
// never played.
export function stopSequence(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.Sequence) {
    return timerRun(self, false);
  }
  sequenceStateOf(self).stopped = true;
  sequenceStateOf(self).playing = undefined;
  return pushSequence(self, "sequence stopped");
}

// set_state(name_hash, value_hash) - upsert this row's 2 pairs, same name
// replaces its pair; a third distinct name drops the oldest.
export function setSequenceState(
  self: BoundInstance,
  nameArg: LuaValue,
  valueArg: LuaValue
): boolean {
  const name = resolveStringHash(nameArg);
  const value = resolveStringHash(valueArg) ?? 0;
  const label = `set_state(${show(nameArg)}, ${show(valueArg)})`;
  if (self.row?.typeId !== self.types.Sequence || name === undefined) {
    self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
    return true;
  }
  const existing = sequenceStateOf(self).pairs.find(
    (pair) => pair.name === name
  );
  if (existing) {
    existing.value = value;
  } else {
    if (sequenceStateOf(self).pairs.length >= 2) {
      sequenceStateOf(self).pairs.shift();
    }
    sequenceStateOf(self).pairs.push({ name, value });
  }
  return pushSequence(self, label);
}

// set_switch_mask(mask): the switch's option bitmask (sub_8322FB58), stepped
// as sections unlock; pair 0 only. Verb name ours.
export function setSequenceSwitchMask(
  self: BoundInstance,
  maskArg: LuaValue
): boolean {
  const mask = resolveStringHash(maskArg);
  const label = `set_switch_mask(${show(maskArg)})`;
  if (self.row?.typeId !== self.types.Sequence || mask === undefined) {
    self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
    return true;
  }
  sequenceStateOf(self).pairs.splice(0, sequenceStateOf(self).pairs.length, {
    name: mask >>> 0,
    value: FNV1_EMPTY,
  });
  return pushSequence(self, label);
}

function pushSequence(self: BoundInstance, label: string): boolean {
  if (self.row?.typeId !== self.types.Sequence) {
    self.writer.note(`${self.path} ${label} (${rowKind(self.row)})`);
    return true;
  }
  self.writer.set(
    self.row,
    {
      kind: "sequence",
      state: {
        pairs:
          sequenceStateOf(self).pairs.length > 0
            ? [...sequenceStateOf(self).pairs]
            : undefined,
        playing: sequenceStateOf(self).playing,
        target: sequenceStateOf(self).target,
      },
    },
    label
  );
  return true;
}

// Lifetime (row type 16): set_state/allow_join_in_progress/end_game, the three
// verbs the row supports.
export function lifetimeVerb(
  self: BoundInstance,
  method: string,
  args: readonly LuaValue[]
): LuaValue | undefined {
  switch (method) {
    case "set_state":
      return setLifetimeState(self, args[0]);
    case "allow_join_in_progress":
      return setLifetimeJoin(self, isTruthy(args[0]));
    case "end_game":
      return endGame(self, args[0]);
    case "set_time_of_day":
      return setLifetimeTimeOfDay(self, args[0]);
    default:
      return;
  }
}

// set_time_of_day(fraction): the lifetime's time-of-day lock and time of day
// (808008A3 [9] bool, [10] f32; TU0 sub_831A3928) hold the clients' sun at the
// fraction; @time_of_day is the value before scripts run. Verb name ours.
function setLifetimeTimeOfDay(self: BoundInstance, arg: LuaValue): boolean {
  const fraction = typeof arg === "number" ? arg : undefined;
  if (fraction === undefined) {
    self.writer.note(
      `${self.path}:set_time_of_day(${show(arg)}) (not a number, ignored)`
    );
    return true;
  }
  self.lifetime.timeOfDay = fraction;
  return pushLifetime(self, `set_time_of_day(${fraction})`);
}

// Members read as their qualified name, so the host maps on the name.
function setLifetimeState(self: BoundInstance, arg: LuaValue): boolean {
  const member = typeof arg === "string" ? arg.split(".").at(-1) : undefined;
  const value =
    member === undefined ? undefined : LIFETIME_STATE_BY_MEMBER[member];
  if (value === undefined) {
    self.writer.note(
      `${self.path}:set_state(${show(arg)}) (unhandled lifetime state)`
    );
    return true;
  }
  self.lifetime.state = value;
  return pushLifetime(self, `set_state(${member})`);
}

// +0x101: 1 advertises the session as join-in-progress ALLOWED
// (sub_82962808's string select).
function setLifetimeJoin(self: BoundInstance, allowed: boolean): boolean {
  self.lifetime.joinFlag = allowed;
  return pushLifetime(self, `allow_join_in_progress(${allowed})`);
}

// State 5 (results screen) now; state 6 (ends the activity, sends everyone to
// orbit/matchmaking) after a hold - see advance().
function endGame(self: BoundInstance, hold?: LuaValue): boolean {
  const seconds =
    typeof hold === "number" && hold > 0
      ? hold
      : LIFETIME_END_GAME_DELAY_SECONDS;
  self.lifetime.state = LIFETIME_RESULTS_STATE;
  // Retail's results update also drops the join flag (2.3.1 lifetime [2]
  // true -> false with state 6, act_cosmo_m0_highway and cine_reveal).
  self.lifetime.joinFlag = false;
  self.lifetime.endGameAt = self.context.time() + seconds;
  startLifetimeTimer(self, seconds);
  return pushLifetime(
    self,
    seconds > 0 ? `end_game (results, ${seconds} s)` : "end_game (results)"
  );
}

// The binder's lifetime_timer starts with the results (min and max 0); the row
// is found by name when this handle watches nothing.
function startLifetimeTimer(self: BoundInstance, seconds: number): void {
  const timer =
    self.watched ?? self.rows.resolveByIdentifier(LIFETIME_TIMER_ROW);
  if (timer?.typeId !== self.types.Timer) {
    return;
  }
  self.writer.set(
    timer,
    {
      kind: "timer",
      state: {
        running: {
          progressBar: false,
          rate: 1,
          seconds,
          startedAt: self.context.clock.activityTicks(),
        },
      },
    },
    "lifetime timer running (end_game)"
  );
}

export function pushLifetime(self: BoundInstance, label: string): boolean {
  if (self.row?.typeId !== self.types.Lifetime) {
    self.writer.note(`${self.path} lifetime ${label} (${rowKind(self.row)})`);
    return true;
  }
  self.writer.set(
    self.row,
    {
      kind: "lifetime",
      state: {
        state: self.lifetime.state,
        joinFlag: self.lifetime.joinFlag,
        timeOfDay: self.lifetime.timeOfDay,
      },
    },
    `lifetime ${label}`
  );
  return true;
}

// Plays the item's cinematic on every client (no viewer filter); clients
// answer cinematic_finished when it ends.
function startCinematic(self: BoundInstance, row: BoundRow): boolean {
  self.sequence.cinematicFinished = false;
  self.writer.set(
    row,
    {
      kind: "cinematic",
      state: { playing: { startedAt: self.context.clock.activityTicks() } },
    },
    "cinematic start"
  );
  self.context.holdLifetimeForCinematic?.(row);
  return true;
}

export function timerRun(self: BoundInstance, running: boolean): boolean {
  const timer = model(self);
  timer.running = running;
  timer.started ||= running;
  return pushTimer(self, running ? "start" : "stop");
}

export function timerRate(self: BoundInstance, rate: number): boolean {
  model(self).rate = rate;
  return pushTimer(self, `rate ${rate}`);
}

export function timerBar(self: BoundInstance, bar: boolean): boolean {
  model(self).bar = bar;
  return pushTimer(self, bar ? "progress bar on" : "progress bar off");
}

// Only a Timer row carries the countdown on the wire; an Object row gets the
// ObjectTimer component (808037AC, wire tag 0x80802D9D).
export function pushTimer(self: BoundInstance, label: string): boolean {
  const timer = model(self);
  if (self.row?.typeId === self.types.Object) {
    objectNatives.objectState(self).objectTimer = {
      active: timer.started,
      running: timer.running
        ? {
            rate: timer.rate,
            seconds: timer.remaining,
            startedAt: self.context.clock.activityTicks(),
          }
        : undefined,
      // No verb sets it in this build - always false.
      showOnHud: false,
    };
    return objectNatives.pushObject(self, `timer ${label}`);
  }
  if (self.row?.typeId !== self.types.Timer) {
    self.writer.note(`${self.path} timer ${label} (host only)`);
    return true;
  }
  self.writer.set(
    self.row,
    {
      kind: "timer",
      state: {
        // A running timer is a duration and the tick it started at, so it
        // restarts from whatever time is left.
        running: timer.running
          ? {
              progressBar: timer.bar,
              rate: timer.rate,
              seconds: timer.remaining,
              startedAt: self.context.clock.activityTicks(),
            }
          : undefined,
      },
    },
    `timer ${label}`
  );
  return true;
}

export function register(registry: NativeRegistry<BoundInstance>): void {
  registry.verb("start", (self, args) => startRow(self, args[0]));
  registry.verb("stop", (self) =>
    self.row?.typeId === self.types.Sequence
      ? stopSequence(self)
      : timerRun(self, false)
  );
  registry.verb("set_state", (self, args) =>
    setSequenceState(self, args[0], args[1])
  );
  registry.verb("set_switch_mask", (self, args) =>
    setSequenceSwitchMask(self, args[0])
  );
  registry.verb("set_rate_multiplier", (self, args) =>
    timerRate(self, toNumber(args[0]) ?? 1)
  );
  registry.verb("show_progress_bar", (self) => timerBar(self, true));
  registry.verb("hide_progress_bar", (self) => timerBar(self, false));
  registry.verb(
    ["get_remaining_time_in_seconds", "timer_get_current"],
    (self) => model(self).remaining
  );
  registry.verb("is_expired", (self) => model(self).remaining <= 0);
  registry.verb("timer_activate", (self, args) =>
    countdownLoad(self, toNumber(args[0]) ?? 0)
  );
  registry.verb("timer_start", (self) => countdownRun(self, true));
  registry.verb("timer_pause", (self) => countdownRun(self, false));
  registry.verb("timer_clear", (self) => countdownClear(self));
  registry.verb("timer_is_complete", (self) => countdownComplete(self));
  // False, except is_done on a handle that is not a row: nothing waits.
  registry.verb("is_done", (self) => isDone(self));
  // Lifetime's set_state takes one argument, Sequence's two.
  registry.rowVerb(
    (self) => self.row?.typeId === self.types.Lifetime,
    (self, method, args) => lifetimeVerb(self, method, args)
  );
  registry.onAdvance(advanceLifetimeAndTimer);
  registry.events.noteCinematicFinished = noteCinematicFinished;
}

function advanceLifetimeAndTimer(self: BoundInstance, seconds: number): void {
  if (
    self.lifetime.endGameAt !== undefined &&
    self.context.time() >= self.lifetime.endGameAt
  ) {
    self.lifetime.endGameAt = undefined;
    self.lifetime.state = LIFETIME_ENDED_STATE;
    pushLifetime(self, "end_game (ended)");
    self.context.endActivity?.();
  }
  const timer = self.sequence.timer;
  if (!timer?.running) {
    return;
  }
  timer.remaining = Math.min(
    timer.duration,
    Math.max(0, timer.remaining - seconds * timer.rate)
  );
}
