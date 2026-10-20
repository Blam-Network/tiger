// Scheduling, thread lifecycle and tick support, split out of
// encounter_host.ts; every function takes the host as `self`.

import { LuaHostObject } from "../../hks/env/host_env.ts";
import type {
  LuaScriptThread,
  LuaThreadGate,
} from "../../hks/scheduler/scheduler.ts";
import { gateUntilTime } from "../../hks/scheduler/scheduler.ts";
import {
  isTruthy,
  LuaClosure,
  LuaTable,
  type LuaValue,
  toNumber,
} from "../../hks/vm/values.ts";
import {
  type EncounterHostContext,
  type EncounterManager,
  type HostPhase,
  type ManagedEncounter,
  PHASE_LIFECYCLE,
  RANDOM_MODULUS,
} from "../activity/host_context.ts";
import type { BoundRow } from "../bound/bindings.ts";
import { bundleRowByName } from "../bound/bindings.ts";
import {
  boundObjectOf,
  PredicatePack,
  registerBoundObject,
  resolveStringHash,
  SOLO_PLAYERS,
  show,
  showArgs,
  unboundAnswer,
  unboundLabel,
} from "../natives/natives.ts";
import { playerCount as monitorPlayerCount } from "../natives/object_natives.ts";
import { itemRef } from "../state/items.ts";
import { fnv1 } from "../tags/name_hash.ts";

// sleep() rounds anything shorter up to this (0x835CC7F0).
const SLEEP_FLOOR_SECONDS = 0.5;

// sleep_until_timeout polls at a fixed 1 s; its argument is the timeout.
const SLEEP_UNTIL_TIMEOUT_POLL_SECONDS = 1;

// The Timer item every activity's binder carries for its lifetime clock,
// which get_lifetime_timer answers with.
const LIFETIME_TIMER_ROW = "lifetime_timer";

// add_ambient_encounter's sixth argument (true name unknown) read as the first
// wait, capped.
const AMBIENT_FIRST_WAIT_MAX_SECONDS = 30;

const RANDOM_MULTIPLIER = 48_271;

// Ticks on one gate before the host calls a thread stalled, and before it
// gives up on one that is waiting for content that was never authored.
const STALL_TICKS = 20;
const ABANDON_TICKS = 40;

// A gate the host knows only ever read row-less handles.
interface PhantomAwareGate extends LuaThreadGate {
  phantomOnly: boolean;
}

function isPhantomGate(gate: LuaThreadGate | undefined): boolean {
  return (
    gate !== undefined && "phantomOnly" in gate && gate.phantomOnly === true
  );
}

class EncounterManagerObject extends LuaHostObject {
  private readonly onBudget: (value: LuaValue) => void;

  constructor(
    invoke: ConstructorParameters<typeof LuaHostObject>[1],
    onBudget: (value: LuaValue) => void
  ) {
    super("encounters", invoke);
    this.onBudget = onBudget;
  }

  // `actor_budget = N` is a field assignment, which LuaHostObject never routes
  // through invoke.
  override set(key: LuaValue, value: LuaValue): void {
    if (key === "actor_budget") {
      this.onBudget(value);
    }
    super.set(key, value);
  }
}
// Phase order is package data; when to advance is not. Conservative: forward
// only, once a phase's main has finished on its own.
export function advanceMissions(self: EncounterHostContext): void {
  const phase = self.phases[self.phaseIndex];
  if (phase === undefined || self.phaseFailed) {
    return;
  }
  if (isThreadAlive(self, phase.instance, phase.prefix, "main")) {
    return;
  }
  if (!self.phaseCompleting) {
    self.phaseCompleting = true;
    self.writer.note(`mission ${phase.declName} main finished, completing`);
    startThreadGuarded(
      self,
      phase.instance,
      phase.prefix,
      "complete",
      phase.declName
    );
    return;
  }
  if (isThreadAlive(self, phase.instance, phase.prefix, "complete")) {
    return;
  }
  self.phaseCompleting = false;
  const next = self.phases[self.phaseIndex + 1];
  if (next === undefined) {
    self.writer.note(`mission ${phase.declName} complete, no mission after`);
    self.phaseIndex = -1;
    armHardWipe(self, false);
    return;
  }
  self.phaseIndex += 1;
  self.options.phaseProgress?.write(self.phaseIndex);
  startPhase(self, next, "");
}

// A phase starts: the world as it stands is what a hard wipe puts back, then
// its class instances are built and its own scripts run. `how` says why it
// starts when it is not the activity reaching it.
export function startPhase(
  self: EncounterHostContext,
  phase: HostPhase,
  how: string
): void {
  self.writer.note(`mission ${phase.declName} starting${how}`);
  self.journal.begin(self.context);
  armHardWipe(self, phase.hardWipe);
  self.options.onPhaseStarted?.(phase.declName);
  phase.instantiate();
  for (const name of [...PHASE_LIFECYCLE, ...phase.startup]) {
    startThreadGuarded(
      self,
      phase.instance,
      phase.prefix,
      name,
      phase.declName
    );
  }
}

// The activity's hard_wipe_globals row says whether a hard wipe is armed, as
// the running phase has it (the client enables its hard wipe respawn rules and
// HUD off it). Sent when that changes; an activity with no such row has none
// to tell.
function armHardWipe(self: EncounterHostContext, armed: boolean): void {
  const row = hardWipeGlobalsRow(self);
  if (row === undefined) {
    return;
  }
  const last = self.journal.last("hardWipeGlobals", itemRef(row));
  const was = last?.kind === "hardWipeGlobals" && last.state.enabled;
  if (was !== armed) {
    self.writer.set(
      row,
      { kind: "hardWipeGlobals", state: { enabled: armed } },
      `hard wipe ${armed ? "armed" : "disarmed"}`
    );
  }
}

// The activity's one hard_wipe_globals row, found by type like the scoreboard.
function hardWipeGlobalsRow(self: EncounterHostContext): BoundRow | undefined {
  for (const tag of self.options.bundles) {
    for (const row of tag.rows) {
      if (row.typeId === self.types.HardWipeGlobals) {
        return {
          bundle: tag.bundle,
          name: row.name ?? "hard_wipe_globals",
          typeId: row.typeId,
          typeIndex: row.typeIndex,
        };
      }
    }
  }
  return;
}

// Same isolation the auto-start loop has: a phase whose thread raises on
// its first step takes itself out, not the activity.
export function startThreadGuarded(
  self: EncounterHostContext,
  instance: LuaTable,
  prefix: string,
  name: string,
  label: string
): void {
  try {
    restartThread(self, instance, prefix, name);
  } catch (error) {
    self.writer.note(
      `thread ${name} of ${label} did not start: ` +
        (error instanceof Error ? error.message : String(error))
    );
  }
}

function isThreadAlive(
  self: EncounterHostContext,
  instance: LuaTable,
  prefix: string,
  name: string
): boolean {
  const scoped = prefix ? `${prefix}.${name}` : name;
  return threadsOf(self, instance, scoped).length > 0;
}

// A thread is its owner's: top-level scripts share one flat name space, and
// every ambient encounter names its threads the same way (e.g. sc_main_thread).
export function threadsOf(
  self: EncounterHostContext,
  instance: LuaTable,
  scoped: string
) {
  return self.scheduler.threads.filter(
    (script) =>
      script.name === scoped && self.threadOwners.get(script) === instance
  );
}

type ThreadState = "finished" | "running" | "unstarted";

// The thread record's flags (xex thread instance +0x10 started, +0x11
// finished) read off the scheduler.
export function threadState(
  self: EncounterHostContext,
  instance: LuaTable,
  scoped: string
): ThreadState {
  if (threadsOf(self, instance, scoped).length > 0) {
    return "running";
  }
  return self.threadStarted.get(instance)?.has(scoped)
    ? "finished"
    : "unstarted";
}

// Say so once per gate.
export function watchStalls(self: EncounterHostContext): void {
  for (const script of self.scheduler.threads) {
    const gate = script.gate?.describe();
    if (gate === undefined) {
      self.stalls.delete(script.name);
      continue;
    }
    const seen = self.stalls.get(script.name);
    const ticks = seen?.gate === gate ? seen.ticks + 1 : 1;
    self.stalls.set(script.name, { gate, ticks });
    if (ticks === STALL_TICKS) {
      self.writer.note(
        `thread ${script.name} has waited ${ticks} ticks on "${gate}" - ` +
          "nothing it depends on is moving"
      );
    }
    // A gate whose predicate only ever read handles with no row behind them can
    // never come true: the rows it waits on were never authored.
    if (ticks >= ABANDON_TICKS && isPhantomGate(script.gate)) {
      self.scheduler.remove(script);
      self.stalls.delete(script.name);
      self.writer.note(
        `thread ${script.name} abandoned: "${gate}" reads nothing that exists`
      );
    }
  }
}

export function library(
  self: EncounterHostContext,
  className: string
): LuaHostObject {
  const short = className.split(".").pop() ?? className;
  return new LuaHostObject(short, ({ args, method }) =>
    libraryCall(self, short, method, args)
  );
}

export function libraryCall(
  self: EncounterHostContext,
  library: string,
  method: string,
  args: readonly LuaValue[]
): readonly LuaValue[] {
  switch (method) {
    case "sleep":
      return sleep(self, toNumber(args[0]) ?? 0);
    case "sleep_until":
      // The second argument is the poll period, in seconds.
      return sleepUntil(self, args[0], {
        pollSeconds: toNumber(args[1]) ?? 1,
      });
    case "sleep_until_timeout":
      // Here the argument is the TIMEOUT; the poll period is a fixed 1 s
      // whatever it says.
      return sleepUntil(self, args[0], {
        pollSeconds: SLEEP_UNTIL_TIMEOUT_POLL_SECONDS,
        timeoutSeconds: toNumber(args[1]),
      });
    case "random_int_inclusive":
      return [randomInt(self, toNumber(args[0]) ?? 0, toNumber(args[1]) ?? 0)];
    // "Never highest value" is an exclusive upper bound; host-side RNG.
    case "random_int_never_highest_value":
      return [
        randomInt(self, toNumber(args[0]) ?? 0, (toNumber(args[1]) ?? 1) - 1),
      ];
    // random_real(max): reads as a uniform float in [0, max) (random_chance(p)
    // wraps it as `random_real(1) <= p`).
    case "random_real":
      return [randomReal(self, toNumber(args[0]) ?? 0)];
    case "submit_incident_hash": {
      const hash = resolveStringHash(args[0]);
      if (hash !== undefined) {
        self.dispatchByHash(hash, undefined);
      }
      self.writer.note(
        `submit_incident_hash(${show(args[0])}) (announcement only, no ` +
          "wire effect" +
          (hash === undefined ? "; name unresolved, no listener to wake" : "") +
          ")"
      );
      return [true];
    }
    // submit_incident_hash's dispatch plus the dominion zone-flag pair
    // (3AE5F3E9/628DE2AD, audience 6EECD523) through the scoreboard engine.
    case "submit_incident_with_team": {
      const hash = resolveStringHash(args[0]);
      const team = toNumber(args[1]);
      if (hash !== undefined) {
        self.submitIncidentWithTeam(hash, team);
      }
      self.writer.note(
        `submit_incident_with_team(${show(args[0])}, ${team}) ` +
          "(announcement + scoreboard rules only, no wire incident)"
      );
      return [true];
    }
    // nil when the player is not in the activity.
    case "get_player_sensor": {
      const key = typeof args[0] === "string" ? args[0] : undefined;
      const player = key === undefined ? undefined : self.findPlayer(key);
      if (!player) {
        self.writer.note(`${library}:${method}(${showArgs(args)}) -> nil`);
        return [undefined];
      }
      self.writer.note(
        `${library}:${method}(${showArgs(args)}) -> player ${key}`
      );
      return [self.playerSensorObject(player)];
    }
    // c_lifetime_script_utilities:get_lifetime_sensor(): the activity's own
    // Lifetime (type 16) row.
    case "get_lifetime_sensor":
      return [lifetimeSensor(self, library)];
    case "get_lifetime_timer":
      return [lifetimeTimer(self, library)];
    // c_scoreboard_script_utilities:get_scoreboard(): the activity's own
    // Scoreboard (type 15) row.
    case "get_scoreboard":
      return [scoreboardSensor(self, library)];
    // c_player_script_utilities, from the caller's `players`.
    case "get_minimum_power_level": {
      const level = minimumPowerLevel(self);
      self.writer.note(
        `${library}:${method}() -> ${level ?? "nil (no power level known)"}`
      );
      return [level];
    }
    case "get_player_count":
    case "get_ready_player_count": {
      const players = playerCount(self, method === "get_ready_player_count");
      self.writer.note(`${library}:${method}() -> ${players}`);
      return [players];
    }
    case "all_players_are_ready": {
      const players = self.options.players?.();
      const ready = players
        ? players.length > 0 && players.every((player) => player.ready)
        : self.spawned;
      self.writer.note(`${library}:${method}() -> ${ready}`);
      return [ready];
    }
    default: {
      const answer = unboundAnswer(method);
      self.writer.note(
        `${library}:${method}(${showArgs(args)}) ${unboundLabel(answer)}`
      );
      return [answer];
    }
  }
}

// The lowest power level among the activity's players, or nil when there are
// none or any one of them is unknown.
function minimumPowerLevel(self: EncounterHostContext): number | undefined {
  let lowest: number | undefined;
  for (const player of self.options.players?.() ?? []) {
    if (player.powerLevel === undefined) {
      return;
    }
    lowest = Math.min(lowest ?? player.powerLevel, player.powerLevel);
  }
  return lowest;
}

export function playerCount(
  self: EncounterHostContext,
  readyOnly: boolean
): number {
  const players = self.options.players?.();
  if (!players) {
    return self.spawned ? SOLO_PLAYERS : 0;
  }
  return readyOnly
    ? players.filter((player) => player.ready).length
    : players.length;
}

// A handle the whole runtime shares belongs to no instance, whichever one asks
// for it first.
function shared<T>(self: EncounterHostContext, make: () => T): T {
  return self.ownership.scope(undefined, make);
}

// One handle for the whole runtime, so the timer a script resets and
// starts is the one it polls on the next call.
export function lifetimeTimer(
  self: EncounterHostContext,
  library: string
): LuaValue {
  if (self.lifetimeTimerHandle) {
    return self.lifetimeTimerHandle;
  }
  const item = self.options.lifetimeTimer;
  const row: BoundRow | undefined = item
    ? { ...itemRef(item), name: LIFETIME_TIMER_ROW }
    : bundleRowByName(self.options.bundles, LIFETIME_TIMER_ROW);
  if (row?.typeId === self.types.Timer) {
    self.writer.note(
      `${library}:get_lifetime_timer() -> t${row.typeId}#${row.typeIndex}`
    );
    self.lifetimeTimerHandle = shared(self, () =>
      registerBoundObject(self.bound(LIFETIME_TIMER_ROW, row))
    );
    return self.lifetimeTimerHandle;
  }
  self.writer.note(
    `${library}:get_lifetime_timer() (no Timer row, inert handle)`
  );
  self.lifetimeTimerHandle = new LuaHostObject(
    LIFETIME_TIMER_ROW,
    (invocation) => {
      const answer = unboundAnswer(invocation.method);
      self.writer.note(
        `lifetime_timer:${invocation.method}(${showArgs(invocation.args)}) ${unboundLabel(answer)}`
      );
      return [answer];
    }
  );
  return self.lifetimeTimerHandle;
}

// The activity's own Lifetime (type 16) row - one per activity, found by
// type rather than a fixed name like get_lifetime_timer's lifetime_timer.
// The activity's lifetime: the binder's row named `lifetime`, the one its
// players wait on. Other Lifetime rows belong to encounters (a patrol's
// cosmo_patrols_controller._lifetime came first in cosmo_patrols_1, and
// setting that one active spawned nobody); one is used only with no other.
const LIFETIME_ROW_HASH = fnv1("lifetime");

function lifetimeRow(self: EncounterHostContext): BoundRow | undefined {
  let first: BoundRow | undefined;
  for (const tag of self.options.bundles) {
    for (const row of tag.rows) {
      if (row.typeId !== self.types.Lifetime) {
        continue;
      }
      const bound = {
        bundle: tag.bundle,
        name: row.name ?? "lifetime",
        typeId: row.typeId,
        typeIndex: row.typeIndex,
      };
      if (row.nameHash === LIFETIME_ROW_HASH) {
        return bound;
      }
      first ??= bound;
    }
  }
  return first;
}

// One handle for the whole runtime, so the state a script sets is the one
// it chains further verbs off.
export function lifetimeSensor(
  self: EncounterHostContext,
  library: string
): LuaValue {
  if (self.lifetimeSensorHandle) {
    return self.lifetimeSensorHandle;
  }
  const row = lifetimeRow(self);
  if (row) {
    self.writer.note(
      `${library}:get_lifetime_sensor() -> t${row.typeId}#${row.typeIndex}`
    );
    self.lifetimeSensorHandle = shared(self, () =>
      registerBoundObject(self.bound("lifetime_sensor", row))
    );
    return self.lifetimeSensorHandle;
  }
  self.writer.note(
    `${library}:get_lifetime_sensor() (no Lifetime row, inert handle)`
  );
  self.lifetimeSensorHandle = new LuaHostObject(
    "lifetime_sensor",
    (invocation) => {
      const answer = unboundAnswer(invocation.method);
      self.writer.note(
        `lifetime_sensor:${invocation.method}(${showArgs(invocation.args)}) ${unboundLabel(answer)}`
      );
      return [answer];
    }
  );
  return self.lifetimeSensorHandle;
}

// The activity's own Scoreboard (type 15) row - one per activity, found
// by type like lifetimeRow.
function scoreboardRow(self: EncounterHostContext): BoundRow | undefined {
  for (const tag of self.options.bundles) {
    for (const row of tag.rows) {
      if (row.typeId === self.types.Scoreboard) {
        return {
          bundle: tag.bundle,
          name: row.name ?? "scoreboard",
          typeId: row.typeId,
          typeIndex: row.typeIndex,
        };
      }
    }
  }
  return;
}

// One handle for the whole runtime, so add_player_score/get_team_stat/...
// all read and write the same state.
export function scoreboardSensor(
  self: EncounterHostContext,
  library: string
): LuaValue {
  if (self.scoreboardHandle) {
    return self.scoreboardHandle;
  }
  const row = scoreboardRow(self);
  if (row) {
    self.writer.note(
      `${library}:get_scoreboard() -> t${row.typeId}#${row.typeIndex}`
    );
    self.scoreboardHandle = shared(self, () =>
      registerBoundObject(self.bound("scoreboard", row))
    );
    return self.scoreboardHandle;
  }
  self.writer.note(
    `${library}:get_scoreboard() (no Scoreboard row, inert handle)`
  );
  self.scoreboardHandle = new LuaHostObject("scoreboard", (invocation) => {
    const answer = unboundAnswer(invocation.method);
    self.writer.note(
      `scoreboard:${invocation.method}(${showArgs(invocation.args)}) ${unboundLabel(answer)}`
    );
    return [answer];
  });
  return self.scoreboardHandle;
}

// Under half a second rounds up, at least one tick, and never earlier than a
// wake already set (0x835CC818).
export function sleep(
  self: EncounterHostContext,
  seconds: number
): readonly LuaValue[] {
  const floored = Math.max(seconds, SLEEP_FLOOR_SECONDS);
  const wake = Math.max(
    self.now + Math.max(floored, self.options.tickSeconds),
    self.scheduler.wakeAt() ?? 0
  );
  self.scheduler.suspend(gateUntilTime(wake));
  return [];
}

// The pack's closure returns (value, description).
function sleepUntil(
  self: EncounterHostContext,
  pack: LuaValue,
  options: { pollSeconds: number; timeoutSeconds?: number }
): readonly LuaValue[] {
  const { timeoutSeconds } = options;
  // The predicate runs on its own period, not every tick. A period
  // shorter than a tick just means every tick.
  const pollSeconds = Math.max(options.pollSeconds, self.options.tickSeconds);
  // The first poll is one period after the wait starts (wait record +0x2C,
  // period +0x1C), so a just-woken sibling runs first.
  let nextPoll = self.now + pollSeconds;
  const predicate = pack instanceof PredicatePack ? pack.predicate : undefined;
  if (!(predicate instanceof LuaClosure)) {
    self.writer.note("sleep_until with no predicate (waiting one tick)");
    return sleep(self, self.options.tickSeconds);
  }
  const deadline =
    timeoutSeconds === undefined ? undefined : self.now + timeoutSeconds;
  let description = "predicate";
  const gate: PhantomAwareGate = {
    describe: () => description,
    isReady: () => {
      if (deadline !== undefined && self.now >= deadline) {
        return true;
      }
      if (self.now < nextPoll) {
        return false;
      }
      nextPoll = self.now + pollSeconds;
      self.sawAnyRead = false;
      self.sawRealRow = false;
      const results = self.vm.call(predicate);
      // Only a wait on a handle with nothing behind it is a phantom.
      gate.phantomOnly =
        deadline === undefined && self.sawAnyRead && !self.sawRealRow;
      if (typeof results[1] === "string") {
        description = results[1];
      }
      return isTruthy(results[0]);
    },
    phantomOnly: false,
  };
  self.scheduler.suspend(gate);
  return [];
}

function randomInt(
  self: EncounterHostContext,
  low: number,
  high: number
): number {
  self.random = (self.random * RANDOM_MULTIPLIER) % RANDOM_MODULUS;
  const span = Math.max(1, Math.floor(high) - Math.floor(low) + 1);
  return Math.floor(low) + (self.random % span);
}

export function pickRandom(
  self: EncounterHostContext,
  count: number,
  candidates: readonly LuaValue[]
) {
  const pool = candidates.filter((candidate) => candidate !== undefined);
  const picks: LuaValue[] = [];
  while (picks.length < count && pool.length > 0) {
    picks.push(...pool.splice(randomInt(self, 0, pool.length - 1), 1));
  }
  return picks;
}

function randomReal(self: EncounterHostContext, max: number): number {
  self.random = (self.random * RANDOM_MULTIPLIER) % RANDOM_MODULUS;
  return (self.random / RANDOM_MODULUS) * max;
}

// Thread names are scoped to the instance: all three pillar children run
// a thread called `main`, and a restart must only replace its own.
export function restartThread(
  self: EncounterHostContext,
  instance: LuaTable,
  prefix: string,
  name: string
): LuaScriptThread | undefined {
  const impl = instance.get(`${name}_d_execute_impl`);
  if (!(impl instanceof LuaClosure)) {
    self.writer.note(`thread ${name} has no _d_execute_impl`);
    return;
  }
  const scoped = prefix ? `${prefix}.${name}` : name;
  killThread(self, instance, scoped);
  const script = self.scheduler.spawn(scoped, impl, [instance]);
  self.threadOwners.set(script, instance);
  let started = self.threadStarted.get(instance);
  if (started === undefined) {
    started = new Set();
    self.threadStarted.set(instance, started);
  }
  started.add(scoped);
  self.options.onThreadStarted?.(scoped);
  self.writer.note(`thread ${scoped} start`);
  return script;
}

export function killThread(
  self: EncounterHostContext,
  instance: LuaTable,
  scoped: string
): void {
  for (const script of threadsOf(self, instance, scoped)) {
    self.scheduler.remove(script);
    self.writer.note(`thread ${scoped} kill`);
  }
}

// Instance construction ---------------------------------------------

export function threadBundle(
  self: EncounterHostContext,
  script: LuaScriptThread
): string | undefined {
  const owner = self.threadOwners.get(script);
  const bundle =
    owner === undefined ? undefined : self.instanceBundle.get(owner);
  return bundle?.toString(16);
}

// Autostarted and manager-driven threads wait for their bubble; one a mission
// script woke does not (threadHandle).
export function threadMayRun(
  self: EncounterHostContext,
  script: LuaScriptThread
): boolean {
  if (self.scriptStarted.has(script)) {
    return true;
  }
  const owner = self.threadOwners.get(script);
  return owner === undefined || instanceMayRun(self, owner);
}

export function encounterManager(
  self: EncounterHostContext,
  owner: LuaTable
): LuaHostObject {
  const manager: EncounterManager = {
    budget: Number.POSITIVE_INFINITY,
    encounters: [],
    exclusions: [],
    name: "",
    owner,
  };
  self.managers.push(manager);
  const number = (value: LuaValue, fallback: number) =>
    typeof value === "number" ? value : fallback;
  return new EncounterManagerObject(
    ({ args, method }) => {
      manager.name ||= instanceName(self, owner);
      const encounter = args[0];
      if (method === "add_exclusion") {
        if (encounter instanceof LuaTable && args[1] instanceof LuaTable) {
          manager.exclusions.push([encounter, args[1]]);
        }
        return [true];
      }
      if (method === "suppress_encounter") {
        return [suppressEncounter(self, manager, encounter, isTruthy(args[1]))];
      }
      if (
        (method !== "add_ambient_encounter" &&
          method !== "add_unmanaged_encounter") ||
        !(encounter instanceof LuaTable)
      ) {
        self.writer.note(`encounters:${method}() (unknown manager verb)`);
        return [true];
      }
      const kind = method === "add_ambient_encounter" ? "ambient" : "unmanaged";
      manager.encounters.push({
        cooldown: number(args[4], 0),
        cost: number(args[1], 0),
        instance: encounter,
        kind,
        name: instanceName(self, encounter),
        state: "waiting",
        suppressed: false,
        // Staggered: with every first wait 0, a bubble's ambients all
        // started on one tick and their rosters landed together.
        wait:
          kind === "ambient"
            ? Math.min(number(args[5], 0), AMBIENT_FIRST_WAIT_MAX_SECONDS)
            : 0,
      });
      // The manager, not an autostart, runs a registered encounter: stop the
      // main (and an ambient's init) building it started. Its other startup
      // threads keep running: simple_encounter's ss_initial_placement closes
      // the window after which a run respawns rather than places.
      stopEncounterThreads(self, encounter, kind === "ambient");
      self.writer.note(
        `encounters: ${kind} ${instanceName(self, encounter)} cost ${number(args[1], 0)}`
      );
      return [true];
    },
    (value) => {
      manager.budget = number(value, manager.budget);
    }
  );
}

// venus_raid's disable_public_encounters / enable_public_encounters.
function suppressEncounter(
  self: EncounterHostContext,
  manager: EncounterManager,
  encounter: LuaValue,
  suppressed: boolean
): boolean {
  const managed = manager.encounters.find(
    (candidate) => candidate.instance === encounter
  );
  if (!managed) {
    self.writer.note(
      `encounters:suppress_encounter(${show(encounter)}, ${suppressed}) ` +
        "(not managed here)"
    );
    return true;
  }
  managed.suppressed = suppressed;
  self.writer.note(
    `encounters: ${managed.name} ${suppressed ? "suppressed" : "unsuppressed"}`
  );
  return true;
}

function instanceName(self: EncounterHostContext, instance: LuaTable): string {
  return self.instancePrefix.get(instance) || "script";
}

function stopEncounterThreads(
  self: EncounterHostContext,
  instance: LuaTable,
  andInit: boolean
): void {
  for (const script of [...self.scheduler.threads]) {
    if (
      self.threadOwners.get(script) === instance &&
      (threadNamed(script.name, "main") ||
        (andInit && threadNamed(script.name, "init")))
    ) {
      self.scheduler.remove(script);
    }
  }
}

// A scoped thread name ("amb_x.main") or a root instance's bare one.
function threadNamed(scoped: string, name: string): boolean {
  return scoped === name || scoped.endsWith(`.${name}`);
}

function encounterRunning(
  self: EncounterHostContext,
  encounter: ManagedEncounter
): boolean {
  return (
    threadsOf(self, encounter.instance, `${encounter.name}.main`).length > 0
  );
}

// Ambient encounters only; an unmanaged one (the public event) is driven
// by its own controller and just counts against the budget while running.
export function advanceManager(
  self: EncounterHostContext,
  manager: EncounterManager,
  seconds: number
): void {
  if (!instanceMayRun(self, manager.owner)) {
    return;
  }
  let spent = 0;
  for (const encounter of manager.encounters) {
    const running = encounterRunning(self, encounter);
    // A template may start itself, so running is active whoever started it.
    if (running && encounter.state !== "active") {
      encounter.state = "active";
    } else if (!running && encounter.state === "active") {
      encounter.state = "cooling";
      encounter.wait = encounter.cooldown;
      self.writer.note(`encounters: ${encounter.name} ended, cooling`);
    }
    if (encounter.state === "active") {
      spent += encounter.cost;
    }
  }
  // At most one activation a pass, so a bubble's ambients arrive a tick
  // apart rather than all at once; every wait still counts down.
  let activated = false;
  for (const encounter of manager.encounters) {
    if (encounter.kind !== "ambient" || encounter.state === "active") {
      continue;
    }
    encounter.wait = Math.max(0, encounter.wait - seconds);
    if (
      activated ||
      encounter.suppressed ||
      encounter.wait > 0 ||
      spent + encounter.cost > manager.budget
    ) {
      continue;
    }
    if (excluded(self, manager, encounter)) {
      continue;
    }
    // A wiped encounter comes back out of sight: retail's dome A Fallen went
    // back in a second after the player left their volume (the Last Array's
    // public host), the rule simple_encounter's own init applies.
    if (encounter.state === "cooling" && playerInside(encounter)) {
      continue;
    }
    if (activateEncounter(self, encounter)) {
      encounter.state = "active";
      spent += encounter.cost;
      activated = true;
    }
  }
}

function playerInside(encounter: ManagedEncounter): boolean {
  const monitor = boundObjectOf(encounter.instance.get("_player_monitor"));
  return monitor !== undefined && monitorPlayerCount(monitor) > 0;
}

export function excluded(
  self: EncounterHostContext,
  manager: EncounterManager,
  encounter: ManagedEncounter
): boolean {
  return manager.exclusions.some(([a, b]) => {
    if (a !== encounter.instance && b !== encounter.instance) {
      return false;
    }
    const other = a === encounter.instance ? b : a;
    const running = manager.encounters.find(
      (candidate) => candidate.instance === other
    );
    return running !== undefined && encounterRunning(self, running);
  });
}

function activateEncounter(
  self: EncounterHostContext,
  encounter: ManagedEncounter
): boolean {
  const activate = encounter.instance.get("activate");
  try {
    if (activate instanceof LuaClosure) {
      self.ownership.scope(encounter.instance, () =>
        self.vm.call(activate, [encounter.instance])
      );
    } else {
      restartThread(self, encounter.instance, encounter.name, "main");
    }
  } catch (error) {
    self.writer.note(
      `encounters: ${encounter.name} did not activate: ` +
        (error instanceof Error ? error.message : String(error))
    );
    return false;
  }
  self.writer.note(`encounters: ${encounter.name} activated`);
  return true;
}

function instanceMayRun(
  self: EncounterHostContext,
  instance: LuaTable
): boolean {
  const bundle = self.instanceBundle.get(instance);
  return (
    self.activeBundles === undefined ||
    bundle === undefined ||
    self.activeBundles.has(bundle)
  );
}
