// Squad/SquadGroup/Actor verbs (placement, alive_count, drops, command scripts)
// and the Health combatant-bar verbs - the receiver-side split of natives.ts's
// BoundInstance.

import { isTruthy, type LuaValue, toNumber } from "../../hks/vm/values.ts";
import type { BoundRow } from "../bound/bindings.ts";
import {
  type BoundInstance,
  boundObjectOf,
  resolveStringHash,
} from "../bound/bound_object.ts";
import { type ActorState, itemRef } from "../state/items.ts";
import { itemKey } from "../tags/item_key.ts";
import { fnv1, parseHashLiteral } from "../tags/name_hash.ts";
import { commandScriptBuilderOf } from "./command_script.ts";
import type { NativeRegistry } from "./native_registry.ts";
import {
  describe,
  type HostContext,
  type ItemWriter,
  rowKind,
  show,
} from "./native_support.ts";

// get_health_fraction answers this while the Health row is unresolved.
const FULL_HEALTH = 1;
// The longest a carrier drop is waited on without an ack from the client.
const DROP_TIMEOUT_SECONDS = 45;
// sub_835B5B10 asserts the drop queue is <= 8 refs.
const MAX_DROP_QUEUE = 8;
// 8080154C's count is 3 bits but its table (80800E85) is 4 entries; the same
// ceiling applies to 808006A6's channel-scalar list (80800E52).
const MAX_TEMPERAMENTS = 4;
const MAX_CHANNEL_SCALARS = 4;
// The e_command_script_state members are host-side Lua and their values
// unknown; scripts only ever test `~= e_command_script_state.executing`.
const COMMAND_SCRIPT_EXECUTING =
  "native.activitylib.e_command_script_state.executing";
const COMMAND_SCRIPT_NOT_EXECUTING =
  "lua-host:command_script_state:not_executing";
// A new cookie reads as executing until the client reports it, or the next
// check would see the last script's report and move on before this one started.
const COMMAND_SCRIPT_ACK_TIMEOUT_SECONDS = 30;
// The client primes a cookie only once the combatant is placed (sub_835B27A8)
// and bumps the heartbeat (808006A2) every 2.5 s; both flat this long = unprimed.
const COMMAND_SCRIPT_STALL_SECONDS = 6;
const MAX_COMMAND_SCRIPT_REARMS = 10;

// The handle each actor's state last went out from, so a change elsewhere
// resends it rather than a blank.
const actorHolders = new WeakMap<HostContext, Map<string, BoundInstance>>();

function actorHoldersOf(context: HostContext): Map<string, BoundInstance> {
  let holders = actorHolders.get(context);
  if (!holders) {
    holders = new Map();
    actorHolders.set(context, holders);
  }
  return holders;
}

// Drops the handles a reset took away: a state that went out from one is not
// theirs to resend any more.
export function forgetActorHolders(
  context: HostContext,
  gone: ReadonlySet<BoundInstance>
): void {
  const holders = actorHoldersOf(context);
  for (const [key, holder] of [...holders]) {
    if (gone.has(holder)) {
      holders.delete(key);
    }
  }
}

// Per squad (itemKey): its deaths when a drop last gave it a new wave - see
// dropBodies.
const dropWaveDeaths = new WeakMap<HostContext, Map<string, number>>();

function dropWaveDeathsOf(context: HostContext): Map<string, number> {
  let deaths = dropWaveDeaths.get(context);
  if (!deaths) {
    deaths = new Map();
    dropWaveDeaths.set(context, deaths);
  }
  return deaths;
}

// Kills credited when a script last placed the squad, so a handle that did not
// place it counts only the kills since.
const placementKills = new WeakMap<HostContext, Map<string, number>>();

function placementKillsOf(context: HostContext): Map<string, number> {
  let kills = placementKills.get(context);
  if (!kills) {
    kills = new Map();
    placementKills.set(context, kills);
  }
  return kills;
}

// A squad a reset put back to its start has no placement or drop to remember.
export function forgetSquadPlacement(context: HostContext, key: string): void {
  placementKillsOf(context).delete(key);
  dropWaveDeathsOf(context).delete(key);
}

// A squad group's roster is the squads added to it.
export function addChild(self: BoundInstance, value: LuaValue): boolean {
  const child = boundObjectOf(value);
  if (child) {
    self.children.push(child);
  }
  self.writer.note(`${self.path}:add_child(${show(value)})`);
  return true;
}

// The client only resolves the combatant again when the incarnation
// changes.
export function bindCombatant(self: BoundInstance, value: LuaValue): boolean {
  const combatant = boundObjectOf(value);
  if (self.row?.typeId !== self.types.Health || !combatant?.row) {
    self.writer.note(
      `${self.path}:bind_combatant(${show(value)}) (${rowKind(self.row)})`
    );
    return true;
  }
  self.actor.healthIncarnation += 1;
  self.writer.set(
    self.row,
    {
      kind: "health",
      state: {
        combatant: {
          incarnation: self.actor.healthIncarnation,
          item: itemRef(combatant.row),
        },
      },
    },
    `bind ${show(value)} generation ${self.actor.healthIncarnation}`
  );
  return true;
}

// A health item's unk0 >= 0 - it resolved. Health rows only; anything
// else answers false.
export function isReady(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.Health) {
    self.writer.notePoll(
      `${self.path}:is_ready`,
      `${self.path}:is_ready() (${rowKind(self.row)}, false)`
    );
    return false;
  }
  const sense = self.context.reports.health(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
  const ready = (sense?.current ?? -1) >= 0;
  self.writer.notePoll(
    `${self.path}:is_ready`,
    `${self.path}:is_ready() -> ${ready}`
  );
  return ready;
}

// A health item unk0 / unk1 (current/max); FULL_HEALTH while unresolved.
export function healthFraction(self: BoundInstance): number {
  if (self.row?.typeId !== self.types.Health) {
    self.writer.notePoll(
      `${self.path}:get_health_fraction`,
      `${self.path}:get_health_fraction() (${rowKind(self.row)}, ${FULL_HEALTH})`
    );
    return FULL_HEALTH;
  }
  const sense = self.context.reports.health(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
  if (!sense || sense.current < 0 || sense.max <= 0) {
    self.writer.notePoll(
      `${self.path}:get_health_fraction`,
      `${self.path}:get_health_fraction() -> ${FULL_HEALTH} (unresolved)`
    );
    return FULL_HEALTH;
  }
  const fraction = sense.current / sense.max;
  self.writer.notePoll(
    `${self.path}:get_health_fraction`,
    `${self.path}:get_health_fraction() -> ${fraction}`
  );
  return fraction;
}

// A drop (808006AB): the current drop's squads and a bumped id; at most
// MAX_DROP_QUEUE (sub_835B5B10).
export function dropSquad(self: BoundInstance, value: LuaValue): boolean {
  const squad = boundObjectOf(value);
  if (self.row?.typeId !== self.types.Actor || !squad?.row) {
    self.writer.note(
      `${self.path}:drop_squad(${show(value)}) (${rowKind(self.row)})`
    );
    return true;
  }
  // Squad rows only: a group row never gets a client reference (0x835B64D8),
  // so a group drops as its squads.
  const actorBundle = self.row.bundle;
  const squads = (
    squad.row.typeId === self.types.Squad
      ? [squad.row]
      : [...(self.rows.squadScopeOf?.(squad.row) ?? [])].map((key) => {
          const [bundle, typeIndex] = key.split(":");
          return {
            bundle: Number.parseInt(bundle, 16),
            typeId: self.types.Squad,
            typeIndex: Number(typeIndex),
          };
        })
  ).filter((row) => row.bundle === actorBundle);
  if (squads.length === 0) {
    self.writer.note(
      `${self.path}:drop_squad(${show(value)}) (no squad under it, no drop)`
    );
    return true;
  }
  if (!dropInProgress(self)) {
    self.actor.dropRefs = [];
  }
  for (const row of squads) {
    const key = itemKey(row.bundle, row.typeIndex);
    if (
      !self.actor.dropRefs.some(
        (ref) => itemKey(ref.bundle, ref.typeIndex) === key
      )
    ) {
      self.actor.dropRefs.push({
        bundle: row.bundle,
        typeId: self.types.Squad,
        typeIndex: row.typeIndex,
      });
    }
    // The drop is the squad's placement: its bodies go out with the drop.
    const squadRow = {
      bundle: row.bundle,
      name: `${self.path} drop`,
      typeId: self.types.Squad,
      typeIndex: row.typeIndex,
    };
    dropBodies(self, squad, squadRow);
    seatNamedMembers(self, squadRow);
  }
  self.squad.dropElapsed = 0;
  while (self.actor.dropRefs.length > MAX_DROP_QUEUE) {
    self.actor.dropRefs.shift();
  }
  // Squads dropped in one tick go out as one drop under one id: a Black
  // Garden cloud carries its three squads under drop 1, and its pilot
  // acknowledges drop 1.
  const tick = self.context.clock.activityTicks();
  if (self.actor.dropId === 0 || self.actor.dropTick !== tick) {
    self.actor.dropId += 1;
  }
  self.actor.dropTick = tick;
  return pushActor(
    self,
    `drop #${self.actor.dropId} queue ${self.actor.dropRefs.length}`
  );
}

// A new wave makes the client destroy the squad's anonymous members (or kill
// them, the other policy): neither keeps survivors.
function dropBodies(
  self: BoundInstance,
  dropped: BoundInstance,
  squadRow: BoundRow
): void {
  const key = itemKey(squadRow.bundle, squadRow.typeIndex);
  const holder = [dropped, ...dropped.children].find(
    (object) =>
      object.row?.typeId === self.types.Squad &&
      itemKey(object.row.bundle, object.row.typeIndex) === key
  );
  const alive = holder
    ? aliveCount(holder)
    : (self.context.reports.squadAliveCount(key) ?? 0);
  const deaths = self.context.reports.squadDeaths?.(key) ?? 0;
  const waveDeaths = dropWaveDeathsOf(self.context);
  const authored = self.rows.roster(squadRow);
  if (alive <= 0) {
    waveDeaths.set(key, deaths);
    self.writer.bodies(squadRow, authored, {
      carried: true,
      wave: self.context.state.squad(squadRow).wave + 1,
    });
    return;
  }
  const lost = Math.max(0, deaths - (waveDeaths.get(key) ?? 0));
  self.writer.note(
    `${self.path} drop keeps ${alive} alive in squad #${squadRow.typeIndex} ` +
      `(same wave, ${lost} lost)`
  );
  self.writer.bodies(
    squadRow,
    Math.max(squadBodies(self, squadRow), authored + lost),
    { carried: true }
  );
}

// Named members go with the drop: the deploy takes named actors first
// (sub_83831138), only ones placed, not dead, carried and bodiless (sub_835B3840).
function seatNamedMembers(self: BoundInstance, squad: BoundRow): void {
  const label = `seated by ${self.path} drop`;
  for (const member of self.rows.namedMembers?.(squad) ?? []) {
    const holder = actorHoldersOf(self.context).get(
      itemKey(member.bundle, member.typeIndex)
    );
    if (holder) {
      holder.actor.placed = undefined;
      pushActor(holder, label);
    } else {
      self.writer.set(
        member,
        { kind: "actor", state: { carried: true, placed: true } },
        label
      );
    }
  }
}

// Running from our drop id until "drop #N complete" clears field 5
// (0x835B5984, 0x835B5ADC, 0x835B632C, sub_835B67F8, 0x835B696C), else DROP_TIMEOUT_SECONDS.
// A report of an earlier drop has not taken ours yet: a placed-again actor's
// report starts again from 0 (retail), and the timeout still covers a drop
// the client never takes.
export function dropInProgress(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.Actor || self.actor.dropId === 0) {
    return false;
  }
  const ack = self.context.reports.actorDropAck(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
  if (ack === undefined || ack.dropId < self.actor.dropId) {
    return self.squad.dropElapsed < DROP_TIMEOUT_SECONDS;
  }
  return ack.dropId !== self.actor.dropId || ack.inProgress;
}

export function isDropping(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.Actor || self.actor.dropId === 0) {
    return false;
  }
  const dropping = dropInProgress(self);
  self.writer.notePoll(
    `${self.path}:is_dropping`,
    `${self.path}:is_dropping() -> ${dropping}`
  );
  return dropping;
}

// An actor's command script (808006A1): a fresh cookie with PC 0 starts it, and
// the atoms go with it.
export function execute(self: BoundInstance, value: LuaValue): boolean {
  if (self.row?.typeId !== self.types.Actor) {
    self.writer.note(
      `${self.path}:execute(${show(value)}) (${rowKind(self.row)})`
    );
    return true;
  }
  const target = boundObjectOf(value)?.row;
  const atoms =
    commandScriptBuilderOf(value)?.script ??
    (target && self.rows.commandScript?.(target));
  self.actor.scriptCookie += 1;
  self.actor.scriptElapsed = 0;
  self.actor.scriptWatch = undefined;
  self.actor.scriptRearms = 0;
  self.actor.script = {
    atoms: [...(atoms ?? [])],
    cookie: self.actor.scriptCookie,
    pc: 0,
  };
  self.writer.note(
    `${self.path}:execute(${show(value)}) - command script cookie ` +
      `#${self.actor.scriptCookie}, ${self.actor.script.atoms.length} atoms` +
      (atoms ? "" : " (not a command script)")
  );
  return pushActor(self, `command script cookie #${self.actor.scriptCookie}`);
}

// abort_command_script(): a fresh cookie with 0 atoms - same shape as
// execute() with nothing to run, so PC 0 >= count 0 reads not executing.
export function abortCommandScript(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.Actor) {
    self.writer.note(
      `${self.path}:abort_command_script() (${rowKind(self.row)})`
    );
    return true;
  }
  self.actor.scriptCookie += 1;
  self.actor.scriptElapsed = 0;
  self.actor.scriptWatch = undefined;
  self.actor.scriptRearms = 0;
  self.actor.script = { atoms: [], cookie: self.actor.scriptCookie, pc: 0 };
  self.writer.note(
    `${self.path}:abort_command_script() - command script cookie ` +
      `#${self.actor.scriptCookie}, 0 atoms`
  );
  return pushActor(
    self,
    `command script aborted, cookie #${self.actor.scriptCookie}`
  );
}

// A cookie stalled before placement is latched and never runs; the same atoms
// go again under a fresh cookie, which primes once placed (sub_835B7560). A
// script whose pc has moved past where it was issued has run, however long
// its current atom takes: the 01.29 Fallen skiff sat at pc 4 of 5 on its exit
// ability, and each re-arm started that ability over.
export function rearmUnprimedScript(
  self: BoundInstance,
  seconds: number
): void {
  const script = self.actor.script;
  if (self.row?.typeId !== self.types.Actor || !script) {
    return;
  }
  const sense = self.context.reports.actorCommandScript(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
  const pc = sense?.pcReached ?? 0;
  if (
    sense?.cookieRunning !== script.cookie ||
    pc !== (script.pc ?? 0) ||
    pc >= script.atoms.length
  ) {
    self.actor.scriptWatch = undefined;
    return;
  }
  const watch = self.actor.scriptWatch;
  if (!watch || watch.heartbeat !== sense.heartbeat || watch.pc !== pc) {
    self.actor.scriptWatch = { heartbeat: sense.heartbeat, pc, still: 0 };
    return;
  }
  watch.still += seconds;
  if (
    watch.still < COMMAND_SCRIPT_STALL_SECONDS ||
    self.actor.scriptRearms >= MAX_COMMAND_SCRIPT_REARMS
  ) {
    return;
  }
  self.actor.scriptRearms += 1;
  self.actor.scriptCookie += 1;
  self.actor.scriptElapsed = 0;
  self.actor.scriptWatch = undefined;
  self.actor.script = {
    atoms: script.atoms,
    cookie: self.actor.scriptCookie,
    pc,
  };
  self.writer.note(
    `${self.path} command script re-armed as cookie ` +
      `#${self.actor.scriptCookie} (not primed: cookie #${script.cookie} ` +
      `pc ${pc}/${script.atoms.length}, heartbeat ` +
      `${sense.heartbeat ?? "none"}, re-arm ${self.actor.scriptRearms}/` +
      `${MAX_COMMAND_SCRIPT_REARMS})`
  );
  pushActor(self, `command script cookie #${self.actor.scriptCookie}`);
}

// What the client reports for the command script (808006A2): f0 is the PC it
// has reached, f1 the cookie it is running.
export function commandScriptState(self: BoundInstance): LuaValue {
  const script = self.actor.script;
  if (self.row?.typeId !== self.types.Actor || !script) {
    self.writer.notePoll(
      `${self.path}:get_command_script_state`,
      `${self.path}:get_command_script_state() (${rowKind(self.row)})`
    );
    return COMMAND_SCRIPT_NOT_EXECUTING;
  }
  const sense = self.context.reports.actorCommandScript(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
  const count = script.atoms.length;
  const acknowledged = sense?.cookieRunning === script.cookie;
  const executing = acknowledged
    ? (sense.pcReached ?? 0) < count
    : count > 0 &&
      self.actor.scriptElapsed < COMMAND_SCRIPT_ACK_TIMEOUT_SECONDS;
  const state = executing
    ? COMMAND_SCRIPT_EXECUTING
    : COMMAND_SCRIPT_NOT_EXECUTING;
  const progress = acknowledged
    ? `pc ${sense.pcReached ?? 0}/${count}, heartbeat ${sense.heartbeat ?? "none"}`
    : `cookie #${script.cookie} not reported`;
  self.writer.notePoll(
    `${self.path}:get_command_script_state`,
    `${self.path}:get_command_script_state() -> ${state} (${progress})`
  );
  return state;
}

// Adds or drops a name hash in the temperament list (8080154C, up to 4); the
// AI reads squad and combatant copies (sub_83790C10, sub_83768D18, sub_83791190, sub_83799F98).
export function setTemperament(
  self: BoundInstance,
  name: LuaValue,
  active: boolean
): boolean {
  const verb = active ? "activate_temperament" : "deactivate_temperament";
  if (self.children.length > 0) {
    for (const child of self.children) {
      setTemperament(child, name, active);
    }
    return true;
  }
  const text = typeof name === "string" ? name : undefined;
  if (text === undefined || !self.row) {
    self.writer.note(
      `${self.path}:${verb}(${show(name)}) (${rowKind(self.row)})`
    );
    return true;
  }
  // A "0x" literal is a temperament whose name is not cracked (retail's
  // hangar squads carry three such).
  const hash = parseHashLiteral(text) ?? fnv1(text);
  if (active) {
    // The wire holds 4; the guest's own list is 4 long too, so a fifth is
    // dropped rather than silently shifting one out.
    if (self.squad.temperaments.size >= MAX_TEMPERAMENTS) {
      self.writer.note(
        `${self.path}:${verb}(${text}) (already 4 active, dropped)`
      );
      return true;
    }
    self.squad.temperaments.add(hash);
  } else {
    self.squad.temperaments.delete(hash);
  }
  return pushBehaviour(self, `${verb}(${text})`);
}

// set_objective(objective): the Objective a squad fights for (SquadAuth ref0).
export function setObjective(self: BoundInstance, value: LuaValue): boolean {
  if (self.children.length > 0) {
    for (const child of self.children) {
      setObjective(child, value);
    }
    return true;
  }
  const objective = boundObjectOf(value)?.row;
  if (
    self.row?.typeId !== self.types.Squad ||
    objective?.typeId !== self.types.Objective
  ) {
    self.writer.note(
      `${self.path}:set_objective(${show(value)}) (${rowKind(self.row)})`
    );
    return true;
  }
  self.writer.note(`${self.path}:set_objective(${objective.name})`);
  self.writer.squad(self.row, { objective: itemRef(objective) });
  return true;
}

// set_task(task): the Objective task the squad is linked under (SquadAuth
// [10], sub_82572890), by name, "0x" literal or index. Verb name ours.
export function setTask(self: BoundInstance, value: LuaValue): boolean {
  if (self.children.length > 0) {
    for (const child of self.children) {
      setTask(child, value);
    }
    return true;
  }
  if (self.row?.typeId !== self.types.Squad) {
    self.writer.note(
      `${self.path}:set_task(${show(value)}) (${rowKind(self.row)})`
    );
    return true;
  }
  const objective = self.context.state.squad(self.row).objective;
  if (!objective) {
    self.writer.note(`${self.path}:set_task(${show(value)}) (no objective)`);
    return true;
  }
  const tasks =
    self.rows.objectiveTasks?.({
      bundle: objective.bundle,
      name: "objective",
      typeId: self.types.Objective,
      typeIndex: objective.typeIndex,
    }) ?? [];
  let index: number | undefined;
  if (typeof value === "number") {
    index = value;
  } else {
    const hash = resolveStringHash(value);
    const at = tasks.findIndex((task) => task.name === hash);
    index = at >= 0 ? at : undefined;
  }
  if (index === undefined || index < 0 || index >= Math.max(tasks.length, 1)) {
    self.writer.note(
      `${self.path}:set_task(${show(value)}) (no such task of the objective)`
    );
    return true;
  }
  self.writer.note(`${self.path}:set_task(${show(value)}) -> task ${index}`);
  self.writer.squad(self.row, {
    task: index,
    taskInfluencer: tasks[index]?.influencer,
  });
  return true;
}

// State field 4 (808006A7), Actor form; the channel id is FNV-1 of the name.
// A miss logs "attempted to modify an unknown channel" (sub_835B3F40).
export function setChannelScalar(
  self: BoundInstance,
  name: LuaValue,
  value: number
): boolean {
  const text = typeof name === "string" ? name : undefined;
  if (self.row?.typeId !== self.types.Actor || !text) {
    self.writer.note(
      `${self.path}:set_channel_scalar(${show(name)}, ${value}) (${rowKind(self.row)})`
    );
    return true;
  }
  if (
    !self.squad.channelScalars.has(text ? fnv1(text) : 0) &&
    self.squad.channelScalars.size >= MAX_CHANNEL_SCALARS
  ) {
    self.writer.note(
      `${self.path}:set_channel_scalar(${text}, ${value}) (already 4 channels, dropped)`
    );
    return true;
  }
  self.squad.channelScalars.set(fnv1(text), value);
  return pushBehaviour(self, `set_channel_scalar(${text}, ${value})`);
}

// The actor's perception overrides, field 4's two nibbles after the
// generation. The alpha's one 2-bit field lands in the combatant's flags
// (sub_835B3F40): bit 0 gates its perception queries (sub_83713B18), bit 1
// its stimuli (sub_8364EAA8). Later builds pair the bits with a mask.
export const AWARENESS_BLIND = 1;
export const AWARENESS_DEAF = 2;

export function setAwareness(
  self: BoundInstance,
  bit: number,
  value: LuaValue,
  verb: string
): boolean {
  if (self.children.length > 0) {
    for (const child of self.children) {
      setAwareness(child, bit, value, verb);
    }
    return true;
  }
  const on = isTruthy(value);
  if (self.row?.typeId !== self.types.Actor) {
    self.writer.note(`${self.path}:${verb}(${on}) (${rowKind(self.row)})`);
    return true;
  }
  self.squad.awarenessMask |= bit;
  self.squad.awarenessFlags = on
    ? self.squad.awarenessFlags | bit
    : self.squad.awarenessFlags & ~bit;
  return pushBehaviour(self, `${verb}(${on})`);
}

// The actor form needs a fresh generation: sub_835B7560 re-applies field 4
// only when it differs.
function pushBehaviour(self: BoundInstance, label: string): boolean {
  if (!self.row) {
    self.writer.note(`${self.path} ${label} (no row)`);
    return true;
  }
  if (self.row.typeId === self.types.Actor) {
    self.squad.behaviourIncarnation += 1;
    return pushActor(self, label);
  }
  if (self.row.typeId === self.types.Squad) {
    self.writer.temperaments(self.row, [...self.squad.temperaments], label);
    return true;
  }
  self.writer.note(`${self.path} ${label} (${rowKind(self.row)})`);
  return true;
}

// Resends the whole state. A script-placed actor says it is placed, or the
// client logs "Combatant is dead. Drop #%d failed." (0x835B5844); named cells go out at 0.
export function squadPlaced(self: BoundInstance): boolean {
  const squad = self.row && self.rows.owningSquad(self.row);
  return squad !== undefined && squadBodies(self, squad) > 0;
}

// A named member of a carrier's cargo is the carrier's to seat, never the
// ground placement's. It stays so, as its squad's carried does.
function carrierSeated(self: BoundInstance): boolean {
  const squad = self.row && self.rows.owningSquad(self.row);
  return squad !== undefined && self.context.state.squad(squad).carried;
}

// Bodies a squad stands with: what a script placed (or reserved), else
// what the table places by default.
function squadBodies(self: BoundInstance, squad: BoundRow): number {
  return (
    self.context.state.bodiesFor(squad.bundle, squad.typeIndex) ??
    self.rows.defaultBodies?.(squad) ??
    0
  );
}

export function pushActor(self: BoundInstance, label: string): boolean {
  if (self.row?.typeId !== self.types.Actor) {
    self.writer.note(`${self.path} actor ${label} (${rowKind(self.row)})`);
    return true;
  }
  actorHoldersOf(self.context).set(
    itemKey(self.row.bundle, self.row.typeIndex),
    self
  );
  self.writer.set(
    self.row,
    {
      kind: "actor",
      state: {
        placed:
          self.actor.placed ?? (self.context.placeActors || squadPlaced(self)),
        carried: carrierSeated(self),
        behaviour:
          self.squad.behaviourIncarnation > 0
            ? {
                awarenessFlags: self.squad.awarenessFlags,
                awarenessMask: self.squad.awarenessMask,
                channels: [...self.squad.channelScalars].map(
                  ([id, scalar]) => ({
                    id,
                    // A channel holds four floats; a scalar write gives one
                    // and nothing says what the other three are.
                    values: [scalar],
                  })
                ),
                incarnation: self.squad.behaviourIncarnation,
                temperaments: [...self.squad.temperaments],
              }
            : undefined,
        commandScript: self.actor.script,
        drop:
          self.actor.dropRefs.length > 0
            ? { id: self.actor.dropId, squads: [...self.actor.dropRefs] }
            : undefined,
        kill:
          self.actor.killEpoch === undefined
            ? undefined
            : { epoch: self.actor.killEpoch },
        incarnation:
          self.actor.incarnation > 1 ? self.actor.incarnation : undefined,
      },
    },
    label
  );
  return true;
}

export function place(self: BoundInstance): boolean {
  if (self.children.length > 0) {
    for (const child of self.children) {
      place(child);
    }
    return true;
  }
  if (!self.row) {
    self.writer.note(`${self.path}:place() (no row)`);
    return true;
  }
  if (self.row.typeId === self.types.Actor) {
    return placeActor(self, true);
  }
  return setBodies(self, self.rows.roster(self.row));
}

// remove(): a group clears every squad under it, the same walk place() and
// respawn() make; the group item itself carries no state.
export function removeBodies(self: BoundInstance): boolean {
  if (self.children.length > 0) {
    for (const child of self.children) {
      removeBodies(child);
    }
    return true;
  }
  if (self.row?.typeId === self.types.Actor) {
    return placeActor(self, false);
  }
  return setBodies(self, 0);
}

// kill(): a Squad gets the kill flag with an epoch bump, a named Actor its
// own; whether this produces kill incidents on the client is not known.
export function kill(self: BoundInstance): boolean {
  if (self.children.length > 0) {
    for (const child of self.children) {
      kill(child);
    }
    return true;
  }
  if (self.row?.typeId === self.types.Actor) {
    return killActor(self);
  }
  if (self.row?.typeId === self.types.Squad) {
    return killSquad(self);
  }
  self.writer.note(`${self.path}:kill() (${rowKind(self.row)})`);
  return true;
}

function killSquad(self: BoundInstance): boolean {
  if (!self.row) {
    return true;
  }
  const epoch = (self.context.state.squad(self.row).killed ?? 0) + 1;
  self.writer.squad(self.row, { killed: epoch });
  self.writer.note(`${describe(self.row)} killed by host (epoch ${epoch})`);
  return true;
}

export function killActor(self: BoundInstance): boolean {
  if (!self.row) {
    return true;
  }
  self.actor.killEpoch = (self.actor.killEpoch ?? 0) + 1;
  self.writer.note(
    `${describe(self.row)} killed by host (epoch ${self.actor.killEpoch})`
  );
  return pushActor(self, `killed, epoch ${self.actor.killEpoch}`);
}

// The bodies a group or squad stands with at full strength: a squad's
// authored roster, one for an actor, summed over a group's children.
export function maxCount(self: BoundInstance): number {
  if (self.children.length > 0) {
    return self.children.reduce((sum, child) => sum + maxCount(child), 0);
  }
  if (self.row?.typeId === self.types.Squad) {
    return self.rows.roster(self.row);
  }
  return self.row?.typeId === self.types.Actor ? 1 : 0;
}

// Actor place()/remove(): the actor's own placed flag (read at 0x835B5844).
function placeActor(self: BoundInstance, placed: boolean): boolean {
  // Placed again: a new actor, with nothing left to drop from the last one.
  // Its drops count from 1 again, as retail's do (the Last Array's wave ship,
  // row 62: drop id 1, 2, then 1 after each place).
  if (placed && self.actor.placed) {
    self.actor.incarnation += 1;
    self.actor.dropRefs = [];
    self.actor.dropId = 0;
  }
  self.actor.placed = placed;
  notePlacement(self, placed ? 1 : 0);
  return pushActor(self, placed ? "place()" : "remove()");
}

// Refill to what was placed.
export function respawn(self: BoundInstance): boolean {
  if (self.children.length > 0) {
    for (const child of self.children) {
      respawn(child);
    }
    return true;
  }
  if (self.row?.typeId !== self.types.Squad) {
    return (self.row !== undefined && aliveCount(self) > 0) || place(self);
  }
  // A squad this handle never placed but the table did (its default bodies)
  // refills to its roster like one it placed.
  const fielded = squadBodies(self, self.row);
  if (self.squad.desiredBodies === 0 && fielded === 0) {
    return place(self);
  }
  // The bodies the squad is short go on top of what it has fielded: retail's
  // dome A Fallen went 2 -> 4 and 1 -> 2 as they came back (the Last Array's
  // public host). A fielded count the client already has is no change at all.
  const desired =
    self.squad.desiredBodies > 0
      ? self.squad.desiredBodies
      : self.rows.roster(self.row);
  const missing = Math.max(0, desired - aliveCount(self));
  if (missing === 0) {
    return true;
  }
  self.writer.bodies(self.row, fielded + missing);
  // A new placement: deaths count from here, and alive_count answers the
  // bodies asked for until the client reports them.
  notePlacement(self, desired);
  self.squad.respawnPending = true;
  return true;
}

function setBodies(self: BoundInstance, count: number): boolean {
  notePlacement(self, count);
  if (self.row) {
    const standing =
      (self.context.state.bodiesFor(self.row.bundle, self.row.typeIndex) ?? 0) >
      0;
    self.writer.bodies(self.row, count);
    if (count > 0) {
      placeNamedMembers(self, self.row, !standing);
    } else if (standing) {
      removeNamedMembers(self, self.row);
    }
  }
  return true;
}

// What aliveCount measures a placement against: the bodies asked for and
// the squad's death tallies at that moment. An Actor's are its squad's.
function notePlacement(self: BoundInstance, count: number): void {
  self.squad.desiredBodies = count;
  if (self.row) {
    const squad =
      self.row.typeId === self.types.Actor
        ? (self.rows.owningSquad(self.row) ?? self.row)
        : self.row;
    const key = itemKey(squad.bundle, squad.typeIndex);
    self.squad.deathsAtPlace = self.context.reports.squadDeaths?.(key) ?? 0;
    self.squad.incidentDeathsAtPlace =
      self.context.reports.squadIncidentDeaths?.(key) ?? 0;
    placementKillsOf(self.context).set(key, self.squad.incidentDeathsAtPlace);
  }
}

// A squad whose every member is named places those actors; the roster leaves
// their cells at 0. Placed after a remove(), each actor's drops count from 1
// again, as placeActor's do (a Black Garden cloud's pilot takes drop 1 on each
// of its three trips); placed again while it stands, it is a new actor too
// (the upper garden's gulch cloud came back as incarnation 3 for its second
// wave).
export function placeNamedMembers(
  self: BoundInstance,
  squad: BoundRow,
  fresh: boolean
): void {
  if (self.context.state.squad(squad).carried) {
    return;
  }
  const label = `placed with ${squad.name}`;
  for (const member of self.rows.namedMembers?.(squad) ?? []) {
    const holder = actorHoldersOf(self.context).get(
      itemKey(member.bundle, member.typeIndex)
    );
    if (holder) {
      if (!fresh) {
        holder.actor.incarnation += 1;
      }
      holder.actor.dropRefs = [];
      holder.actor.dropId = 0;
      holder.actor.placed = undefined;
      pushActor(holder, label);
    } else {
      self.writer.set(
        member,
        { kind: "actor", state: { placed: true } },
        label
      );
    }
  }
}

// remove() on a squad whose every member is named takes those actors out
// with it: a Vex cloud's pilot goes when its squad does.
function removeNamedMembers(self: BoundInstance, squad: BoundRow): void {
  if (self.context.state.squad(squad).carried) {
    return;
  }
  const label = `removed with ${squad.name}`;
  for (const member of self.rows.namedMembers?.(squad) ?? []) {
    const holder = actorHoldersOf(self.context).get(
      itemKey(member.bundle, member.typeIndex)
    );
    if (holder) {
      holder.actor.placed = undefined;
      pushActor(holder, label);
    } else {
      self.writer.set(
        member,
        { kind: "actor", state: { placed: false } },
        label
      );
    }
  }
}

// The host's placement of a table-placed squad's named members.
export function pushActors(
  context: HostContext,
  writer: ItemWriter,
  actors: readonly BoundRow[],
  bare: ActorState,
  label: string
): void {
  for (const actor of actors) {
    const holder = actorHoldersOf(context).get(
      itemKey(actor.bundle, actor.typeIndex)
    );
    if (holder) {
      pushActor(holder, label);
    } else {
      writer.set(actor, { kind: "actor", state: bare }, label);
    }
  }
}

export function aliveCount(self: BoundInstance): number {
  if (self.children.length > 0) {
    return self.children.reduce((sum, child) => sum + aliveCount(child), 0);
  }
  if (!self.row) {
    return 0;
  }
  // An Actor is one combatant of a squad; what gets reported is the
  // squad's, from the SQUAD row's own bundle (not necessarily this.row's).
  const squad = self.rows.owningSquad(self.row) ?? self.row;
  const key = itemKey(squad.bundle, squad.typeIndex);
  // Primary source: roster minus tally, summed over the anonymous cells, plus
  // named members that are placed and not spent.
  const incidentDeaths = self.context.reports.squadIncidentDeaths?.(key);
  const tally = self.context.reports.squadTally?.(key);
  let reported = self.context.reports.squadAliveCount(key);
  if (self.squad.respawnPending) {
    if (reported) {
      self.squad.respawnPending = false;
    } else {
      // The 0 is still the wipe's; some respawned squads never report again
      // (the refinery's last push), so a death since the respawn ends the hold
      // and the tally and incidents count it from there.
      const died =
        (self.context.reports.squadDeaths?.(key) ?? 0) >
          self.squad.deathsAtPlace ||
        (incidentDeaths ?? 0) > self.squad.incidentDeathsAtPlace;
      if (!died) {
        return self.squad.desiredBodies;
      }
      reported = undefined;
    }
  }
  if (tally !== undefined) {
    const lost = tally.reduce((sum, cell) => sum + Math.max(0, cell), 0);
    // A placed named member's cell goes out as 0 (sensor-auth's roster),
    // so it is not an anonymous body the tally could ever count down.
    const named = namedMembersPlaced(self, squad);
    const anonymous = Math.max(0, squadBodies(self, squad) - named - lost);
    // The tally counts cells that died, not ones that never spawned; once a cell
    // has died, a [3] at 0 says the rest are gone. A 0 with nothing tallied is stale.
    const alive =
      reported === 0 && lost > 0
        ? 0
        : anonymous + namedMembersAlive(self, squad);
    // Named deaths never bump the tally; a kill credited since placement caps
    // what can still stand.
    if (incidentDeaths === undefined) {
      return alive;
    }
    const placed =
      self.squad.desiredBodies > 0
        ? self.squad.desiredBodies
        : squadBodies(self, squad);
    const killsAtPlace =
      self.squad.desiredBodies > 0
        ? self.squad.incidentDeathsAtPlace
        : (placementKillsOf(self.context).get(key) ?? 0);
    const died = incidentDeaths - killsAtPlace;
    return Math.min(alive, Math.max(0, placed - died));
  }
  // Before the first tally: placed less what the incidents say died, unless the
  // raw report shows more.
  if (incidentDeaths !== undefined) {
    const placedHere = self.squad.desiredBodies > 0;
    const placed = placedHere
      ? self.squad.desiredBodies
      : squadBodies(self, squad);
    const died =
      incidentDeaths - (placedHere ? self.squad.incidentDeathsAtPlace : 0);
    return lessNamedDeaths(
      self,
      squad,
      Math.max(reported ?? 0, placed - died, 0)
    );
  }
  // Before any report: as alive as it was asked to be, by this handle or the
  // placing script.
  return lessNamedDeaths(
    self,
    squad,
    reported ??
      (self.squad.desiredBodies > 0
        ? self.squad.desiredBodies
        : squadBodies(self, squad))
  );
}

// Without a tally the count stands for the named members too, and a named
// death never reaches it: no more than the anonymous bodies and the named
// members still standing can be alive.
function lessNamedDeaths(
  self: BoundInstance,
  squad: BoundRow,
  count: number
): number {
  if ((self.rows.namedMembers?.(squad) ?? []).length === 0) {
    return count;
  }
  const anonymous = Math.max(
    0,
    squadBodies(self, squad) - namedMembersPlaced(self, squad)
  );
  return Math.min(count, anonymous + namedMembersAlive(self, squad));
}

// alive_count()'s named-member share, summed once per squad (unlike the
// anonymous roster, named members are not cells - see namedMemberPlaced).
function namedMembersPlaced(self: BoundInstance, squad: BoundRow): number {
  let count = 0;
  for (const member of self.rows.namedMembers?.(squad) ?? []) {
    if (namedMemberPlaced(self, squad, member)) {
      count += 1;
    }
  }
  return count;
}

// A named member stands when its own handle placed it, or when its squad
// (the one passed in) has bodies.
function namedMemberPlaced(
  self: BoundInstance,
  squad: BoundRow,
  member: BoundRow
): boolean {
  const holder = actorHoldersOf(self.context).get(
    itemKey(member.bundle, member.typeIndex)
  );
  return (
    holder?.actor.placed ??
    (self.context.placeActors || squadBodies(self, squad) > 0)
  );
}

// Placed and not spent: ActorSense f7 (TU0 [9]) is the member's own death
// edge - a named death never reaches the squad's tally.
function namedMembersAlive(self: BoundInstance, squad: BoundRow): number {
  let count = 0;
  for (const member of self.rows.namedMembers?.(squad) ?? []) {
    const spent =
      self.context.reports.actorBound(itemKey(member.bundle, member.typeIndex))
        ?.flag7 ?? false;
    if (namedMemberPlaced(self, squad, member) && !spent) {
      count += 1;
    }
  }
  return count;
}

// SquadSense f3, summed over a group's children.
export function currentInCombatCount(self: BoundInstance): number {
  if (self.children.length > 0) {
    return self.children.reduce(
      (sum, child) => sum + currentInCombatCount(child),
      0
    );
  }
  if (!self.row) {
    return 0;
  }
  const squad = self.rows.owningSquad(self.row) ?? self.row;
  const key = itemKey(squad.bundle, squad.typeIndex);
  const reported = self.context.reports.squadCombatCount(key);
  return reported ?? aliveCount(self);
}

// SquadSense f4, summed over a group's children - the raw report
// alive_count() also reads, before it folds in incident-death bookkeeping.
export function countAtFiringArea(self: BoundInstance): number {
  if (self.children.length > 0) {
    return self.children.reduce(
      (sum, child) => sum + countAtFiringArea(child),
      0
    );
  }
  if (!self.row) {
    return 0;
  }
  const squad = self.rows.owningSquad(self.row) ?? self.row;
  const key = itemKey(squad.bundle, squad.typeIndex);
  const reported = self.context.reports.squadAliveCount(key);
  return reported ?? aliveCount(self);
}

export function register(registry: NativeRegistry<BoundInstance>): void {
  registry.verb("place", (self) => place(self));
  registry.verb("respawn", (self) => respawn(self));
  registry.verb("alive_count", (self) => aliveCount(self));
  registry.verb("max_count", (self) => maxCount(self));
  // SquadSense squad +452, not the live-member count +0x1C4.
  registry.verb("current_in_combat_count", (self) =>
    currentInCombatCount(self)
  );
  // With no firing area the client's comparison degenerates to -1 == -1.
  registry.verb("count_at_firing_area", (self) => countAtFiringArea(self));
  registry.verb("activate_temperament", (self, args) =>
    setTemperament(self, args[0], true)
  );
  registry.verb("deactivate_temperament", (self, args) =>
    setTemperament(self, args[0], false)
  );
  registry.verb("set_objective", (self, args) => setObjective(self, args[0]));
  registry.verb("set_task", (self, args) => setTask(self, args[0]));
  registry.verb("drop_squad", (self, args) => dropSquad(self, args[0]));
  registry.verb("is_dropping", (self) => isDropping(self));
  registry.verb("execute", (self, args) => execute(self, args[0]));
  // ActorAuth has no stop field: a fresh cookie with 0 atoms is not executing.
  registry.verb("abort_command_script", (self) => abortCommandScript(self));
  registry.verb("get_command_script_state", (self) => commandScriptState(self));
  registry.verb("set_channel_scalar", (self, args) =>
    setChannelScalar(self, args[0], toNumber(args[1]) ?? 0)
  );
  registry.verb("set_blind", (self, args) =>
    setAwareness(self, AWARENESS_BLIND, args[0], "set_blind")
  );
  registry.verb("set_deaf", (self, args) =>
    setAwareness(self, AWARENESS_DEAF, args[0], "set_deaf")
  );
  registry.verb("add_child", (self, args) => addChild(self, args[0]));
  // A kill flag plus an epoch bump, not the placed=false of remove.
  registry.verb("kill", (self) => kill(self));
  registry.verb("is_ready", (self) => isReady(self));
  registry.verb("is_bound", (self) => isBound(self));
  registry.verb("bind_combatant", (self, args) => bindCombatant(self, args[0]));
  registry.verb("get_health_fraction", (self) => healthFraction(self));
  registry.onAdvance((self, seconds) => {
    self.squad.dropElapsed += seconds;
    self.actor.scriptElapsed += seconds;
    rearmUnprimedScript(self, seconds);
  });
}

// placed && flag 8 && !flag 7; before any sense report, placed alone.
function isBound(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.Actor) {
    return self.unknownPredicate("is_bound");
  }
  const placed = self.actor.placed ?? squadPlaced(self);
  const sense = self.context.reports.actorBound(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
  const bound =
    sense === undefined ? placed : placed && sense.flag8 && !sense.flag7;
  self.writer.notePoll(
    `${self.path}:is_bound`,
    `${self.path}:is_bound() -> ${bound}`
  );
  return bound;
}
