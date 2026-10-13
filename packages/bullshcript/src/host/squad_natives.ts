// Squad/SquadGroup/Actor verbs (placement, alive_count, drops, command scripts)
// and the Health combatant-bar verbs - the receiver-side split of natives.ts's
// LuaBoundObject.

import type { LuaValue } from "../hks/values.ts";
import type { BoundRow } from "./bindings.ts";
import { commandScriptBuilderOf } from "./command_script.ts";
import { itemKey } from "./item_key.ts";
import { type ActorState, itemRef } from "./items.ts";
import { fnv1, parseHashLiteral } from "./name_hash.ts";
import {
  boundObjectOf,
  describe,
  type LuaBoundObject,
  type LuaHostContext,
  type LuaItemWriter,
  resolveStringHash,
  rowKind,
  show,
} from "./natives.ts";

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
const actorHolders = new WeakMap<LuaHostContext, Map<string, LuaBoundObject>>();

function actorHoldersOf(context: LuaHostContext): Map<string, LuaBoundObject> {
  let holders = actorHolders.get(context);
  if (!holders) {
    holders = new Map();
    actorHolders.set(context, holders);
  }
  return holders;
}

// Per squad (itemKey): its deaths when a drop last gave it a new wave - see
// dropBodies.
const dropWaveDeaths = new WeakMap<LuaHostContext, Map<string, number>>();

function dropWaveDeathsOf(context: LuaHostContext): Map<string, number> {
  let deaths = dropWaveDeaths.get(context);
  if (!deaths) {
    deaths = new Map();
    dropWaveDeaths.set(context, deaths);
  }
  return deaths;
}

// Kills credited when a script last placed the squad, so a handle that did not
// place it counts only the kills since.
const placementKills = new WeakMap<LuaHostContext, Map<string, number>>();

function placementKillsOf(context: LuaHostContext): Map<string, number> {
  let kills = placementKills.get(context);
  if (!kills) {
    kills = new Map();
    placementKills.set(context, kills);
  }
  return kills;
}

// A squad group's roster is the squads added to it.
export function addChild(self: LuaBoundObject, value: LuaValue): boolean {
  const child = boundObjectOf(value);
  if (child) {
    self.children.push(child);
  }
  self.writer.note(`${self.path}:add_child(${show(value)})`);
  return true;
}

// The client only resolves the combatant again when the incarnation
// changes.
export function bindCombatant(self: LuaBoundObject, value: LuaValue): boolean {
  const combatant = boundObjectOf(value);
  if (self.row?.typeId !== self.types.Health || !combatant?.row) {
    self.writer.note(
      `${self.path}:bind_combatant(${show(value)}) (${rowKind(self.row)})`
    );
    return true;
  }
  self.healthIncarnation += 1;
  self.writer.set(
    self.row,
    {
      kind: "health",
      state: {
        combatant: {
          incarnation: self.healthIncarnation,
          item: itemRef(combatant.row),
        },
      },
    },
    `bind ${show(value)} generation ${self.healthIncarnation}`
  );
  return true;
}

// A health item's unk0 >= 0 - it resolved. Health rows only; anything
// else answers false.
export function isReady(self: LuaBoundObject): boolean {
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
export function healthFraction(self: LuaBoundObject): number {
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
export function dropSquad(self: LuaBoundObject, value: LuaValue): boolean {
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
    self.actorDropRefs = [];
  }
  for (const row of squads) {
    const key = itemKey(row.bundle, row.typeIndex);
    if (
      !self.actorDropRefs.some(
        (ref) => itemKey(ref.bundle, ref.typeIndex) === key
      )
    ) {
      self.actorDropRefs.push({
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
  self.dropElapsed = 0;
  while (self.actorDropRefs.length > MAX_DROP_QUEUE) {
    self.actorDropRefs.shift();
  }
  self.actorDropId += 1;
  return pushActor(
    self,
    `drop #${self.actorDropId} queue ${self.actorDropRefs.length}`
  );
}

// A new wave makes the client destroy the squad's anonymous members (or kill
// them, the other policy): neither keeps survivors.
function dropBodies(
  self: LuaBoundObject,
  dropped: LuaBoundObject,
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
function seatNamedMembers(self: LuaBoundObject, squad: BoundRow): void {
  const label = `seated by ${self.path} drop`;
  for (const member of self.rows.namedMembers?.(squad) ?? []) {
    const holder = actorHoldersOf(self.context).get(
      itemKey(member.bundle, member.typeIndex)
    );
    if (holder) {
      holder.actorPlaced = undefined;
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
export function dropInProgress(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.Actor || self.actorDropId === 0) {
    return false;
  }
  const ack = self.context.reports.actorDropAck(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
  if (ack === undefined) {
    return self.dropElapsed < DROP_TIMEOUT_SECONDS;
  }
  return ack.dropId !== self.actorDropId || ack.inProgress;
}

export function isDropping(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.Actor || self.actorDropId === 0) {
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
export function execute(self: LuaBoundObject, value: LuaValue): boolean {
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
  self.actorScriptCookie += 1;
  self.actorScriptElapsed = 0;
  self.actorScriptWatch = undefined;
  self.actorScriptRearms = 0;
  self.actorScript = {
    atoms: [...(atoms ?? [])],
    cookie: self.actorScriptCookie,
    pc: 0,
  };
  self.writer.note(
    `${self.path}:execute(${show(value)}) - command script cookie ` +
      `#${self.actorScriptCookie}, ${self.actorScript.atoms.length} atoms` +
      (atoms ? "" : " (not a command script)")
  );
  return pushActor(self, `command script cookie #${self.actorScriptCookie}`);
}

// abort_command_script(): a fresh cookie with 0 atoms - same shape as
// execute() with nothing to run, so PC 0 >= count 0 reads not executing.
export function abortCommandScript(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.Actor) {
    self.writer.note(
      `${self.path}:abort_command_script() (${rowKind(self.row)})`
    );
    return true;
  }
  self.actorScriptCookie += 1;
  self.actorScriptElapsed = 0;
  self.actorScriptWatch = undefined;
  self.actorScriptRearms = 0;
  self.actorScript = { atoms: [], cookie: self.actorScriptCookie, pc: 0 };
  self.writer.note(
    `${self.path}:abort_command_script() - command script cookie ` +
      `#${self.actorScriptCookie}, 0 atoms`
  );
  return pushActor(
    self,
    `command script aborted, cookie #${self.actorScriptCookie}`
  );
}

// A cookie stalled before placement is latched and never runs; the same atoms
// go again under a fresh cookie, which primes once placed (sub_835B7560).
export function rearmUnprimedScript(
  self: LuaBoundObject,
  seconds: number
): void {
  const script = self.actorScript;
  if (self.row?.typeId !== self.types.Actor || !script) {
    return;
  }
  const sense = self.context.reports.actorCommandScript(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
  const pc = sense?.pcReached ?? 0;
  if (sense?.cookieRunning !== script.cookie || pc >= script.atoms.length) {
    self.actorScriptWatch = undefined;
    return;
  }
  const watch = self.actorScriptWatch;
  if (!watch || watch.heartbeat !== sense.heartbeat || watch.pc !== pc) {
    self.actorScriptWatch = { heartbeat: sense.heartbeat, pc, still: 0 };
    return;
  }
  watch.still += seconds;
  if (
    watch.still < COMMAND_SCRIPT_STALL_SECONDS ||
    self.actorScriptRearms >= MAX_COMMAND_SCRIPT_REARMS
  ) {
    return;
  }
  self.actorScriptRearms += 1;
  self.actorScriptCookie += 1;
  self.actorScriptElapsed = 0;
  self.actorScriptWatch = undefined;
  self.actorScript = {
    atoms: script.atoms,
    cookie: self.actorScriptCookie,
    pc,
  };
  self.writer.note(
    `${self.path} command script re-armed as cookie ` +
      `#${self.actorScriptCookie} (not primed: cookie #${script.cookie} ` +
      `pc ${pc}/${script.atoms.length}, heartbeat ` +
      `${sense.heartbeat ?? "none"}, re-arm ${self.actorScriptRearms}/` +
      `${MAX_COMMAND_SCRIPT_REARMS})`
  );
  pushActor(self, `command script cookie #${self.actorScriptCookie}`);
}

// What the client reports for the command script (808006A2): f0 is the PC it
// has reached, f1 the cookie it is running.
export function commandScriptState(self: LuaBoundObject): LuaValue {
  const script = self.actorScript;
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
    : count > 0 && self.actorScriptElapsed < COMMAND_SCRIPT_ACK_TIMEOUT_SECONDS;
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
  self: LuaBoundObject,
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
    if (self.temperaments.size >= MAX_TEMPERAMENTS) {
      self.writer.note(
        `${self.path}:${verb}(${text}) (already 4 active, dropped)`
      );
      return true;
    }
    self.temperaments.add(hash);
  } else {
    self.temperaments.delete(hash);
  }
  return pushBehaviour(self, `${verb}(${text})`);
}

// set_objective(objective): the Objective a squad fights for (SquadAuth ref0).
export function setObjective(self: LuaBoundObject, value: LuaValue): boolean {
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
export function setTask(self: LuaBoundObject, value: LuaValue): boolean {
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
  self: LuaBoundObject,
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
    !self.channelScalars.has(text ? fnv1(text) : 0) &&
    self.channelScalars.size >= MAX_CHANNEL_SCALARS
  ) {
    self.writer.note(
      `${self.path}:set_channel_scalar(${text}, ${value}) (already 4 channels, dropped)`
    );
    return true;
  }
  self.channelScalars.set(fnv1(text), value);
  return pushBehaviour(self, `set_channel_scalar(${text}, ${value})`);
}

// The actor form needs a fresh generation: sub_835B7560 re-applies field 4
// only when it differs.
function pushBehaviour(self: LuaBoundObject, label: string): boolean {
  if (!self.row) {
    self.writer.note(`${self.path} ${label} (no row)`);
    return true;
  }
  if (self.row.typeId === self.types.Actor) {
    self.behaviourIncarnation += 1;
    return pushActor(self, label);
  }
  if (self.row.typeId === self.types.Squad) {
    self.writer.temperaments(self.row, [...self.temperaments], label);
    return true;
  }
  self.writer.note(`${self.path} ${label} (${rowKind(self.row)})`);
  return true;
}

// Resends the whole state. A script-placed actor says it is placed, or the
// client logs "Combatant is dead. Drop #%d failed." (0x835B5844); named cells go out at 0.
export function squadPlaced(self: LuaBoundObject): boolean {
  const squad = self.row && self.rows.owningSquad(self.row);
  return squad !== undefined && squadBodies(self, squad) > 0;
}

// A named member of a carrier's cargo is the carrier's to seat, never the
// ground placement's. It stays so, as its squad's carried does.
function carrierSeated(self: LuaBoundObject): boolean {
  const squad = self.row && self.rows.owningSquad(self.row);
  return squad !== undefined && self.context.state.squad(squad).carried;
}

// Bodies a squad stands with: what a script placed (or reserved), else
// what the table places by default.
function squadBodies(self: LuaBoundObject, squad: BoundRow): number {
  return (
    self.context.state.bodiesFor(squad.bundle, squad.typeIndex) ??
    self.rows.defaultBodies?.(squad) ??
    0
  );
}

export function pushActor(self: LuaBoundObject, label: string): boolean {
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
          self.actorPlaced ?? (self.context.placeActors || squadPlaced(self)),
        carried: carrierSeated(self),
        behaviour:
          self.behaviourIncarnation > 0
            ? {
                channels: [...self.channelScalars].map(([id, scalar]) => ({
                  id,
                  // A channel holds four floats; a scalar write gives one
                  // and nothing says what the other three are.
                  values: [scalar],
                })),
                incarnation: self.behaviourIncarnation,
                temperaments: [...self.temperaments],
              }
            : undefined,
        commandScript: self.actorScript,
        drop:
          self.actorDropRefs.length > 0
            ? { id: self.actorDropId, squads: [...self.actorDropRefs] }
            : undefined,
        kill:
          self.actorKillEpoch === undefined
            ? undefined
            : { epoch: self.actorKillEpoch },
      },
    },
    label
  );
  return true;
}

export function place(self: LuaBoundObject): boolean {
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
export function removeBodies(self: LuaBoundObject): boolean {
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
export function kill(self: LuaBoundObject): boolean {
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

function killSquad(self: LuaBoundObject): boolean {
  if (!self.row) {
    return true;
  }
  const epoch = (self.context.state.squad(self.row).killed ?? 0) + 1;
  self.writer.squad(self.row, { killed: epoch });
  self.writer.note(`${describe(self.row)} killed by host (epoch ${epoch})`);
  return true;
}

export function killActor(self: LuaBoundObject): boolean {
  if (!self.row) {
    return true;
  }
  self.actorKillEpoch = (self.actorKillEpoch ?? 0) + 1;
  self.writer.note(
    `${describe(self.row)} killed by host (epoch ${self.actorKillEpoch})`
  );
  return pushActor(self, `killed, epoch ${self.actorKillEpoch}`);
}

// The bodies a group or squad stands with at full strength: a squad's
// authored roster, one for an actor, summed over a group's children.
export function maxCount(self: LuaBoundObject): number {
  if (self.children.length > 0) {
    return self.children.reduce((sum, child) => sum + maxCount(child), 0);
  }
  if (self.row?.typeId === self.types.Squad) {
    return self.rows.roster(self.row);
  }
  return self.row?.typeId === self.types.Actor ? 1 : 0;
}

// Actor place()/remove(): the actor's own placed flag (read at 0x835B5844).
function placeActor(self: LuaBoundObject, placed: boolean): boolean {
  self.actorPlaced = placed;
  notePlacement(self, placed ? 1 : 0);
  return pushActor(self, placed ? "place()" : "remove()");
}

// Refill to what was placed.
export function respawn(self: LuaBoundObject): boolean {
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
  if (self.desiredBodies === 0 && fielded === 0) {
    return place(self);
  }
  // The bodies the squad is short go on top of what it has fielded: retail's
  // dome A Fallen went 2 -> 4 and 1 -> 2 as they came back (the Last Array's
  // public host). A fielded count the client already has is no change at all.
  const desired =
    self.desiredBodies > 0 ? self.desiredBodies : self.rows.roster(self.row);
  const missing = Math.max(0, desired - aliveCount(self));
  if (missing === 0) {
    return true;
  }
  self.writer.bodies(self.row, fielded + missing);
  // A new placement: deaths count from here, and alive_count answers the
  // bodies asked for until the client reports them.
  notePlacement(self, desired);
  self.respawnPending = true;
  return true;
}

function setBodies(self: LuaBoundObject, count: number): boolean {
  notePlacement(self, count);
  if (self.row) {
    self.writer.bodies(self.row, count);
    if (count > 0) {
      placeNamedMembers(self, self.row);
    }
  }
  return true;
}

// What aliveCount measures a placement against: the bodies asked for and
// the squad's death tallies at that moment. An Actor's are its squad's.
function notePlacement(self: LuaBoundObject, count: number): void {
  self.desiredBodies = count;
  if (self.row) {
    const squad =
      self.row.typeId === self.types.Actor
        ? (self.rows.owningSquad(self.row) ?? self.row)
        : self.row;
    const key = itemKey(squad.bundle, squad.typeIndex);
    self.squadDeathsAtPlace = self.context.reports.squadDeaths?.(key) ?? 0;
    self.incidentDeathsAtPlace =
      self.context.reports.squadIncidentDeaths?.(key) ?? 0;
    placementKillsOf(self.context).set(key, self.incidentDeathsAtPlace);
  }
}

// A squad whose every member is named places those actors; the roster leaves
// their cells at 0.
export function placeNamedMembers(self: LuaBoundObject, squad: BoundRow): void {
  if (self.context.state.squad(squad).carried) {
    return;
  }
  const label = `placed with ${squad.name}`;
  for (const member of self.rows.namedMembers?.(squad) ?? []) {
    const holder = actorHoldersOf(self.context).get(
      itemKey(member.bundle, member.typeIndex)
    );
    if (holder) {
      holder.actorPlaced = undefined;
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

// The host's placement of a table-placed squad's named members.
export function pushActors(
  context: LuaHostContext,
  writer: LuaItemWriter,
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

export function aliveCount(self: LuaBoundObject): number {
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
  const reported = self.context.reports.squadAliveCount(key);
  if (self.respawnPending) {
    if (!reported) {
      return self.desiredBodies;
    }
    self.respawnPending = false;
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
      self.desiredBodies > 0 ? self.desiredBodies : squadBodies(self, squad);
    const killsAtPlace =
      self.desiredBodies > 0
        ? self.incidentDeathsAtPlace
        : (placementKillsOf(self.context).get(key) ?? 0);
    const died = incidentDeaths - killsAtPlace;
    return Math.min(alive, Math.max(0, placed - died));
  }
  // Before the first tally: placed less what the incidents say died, unless the
  // raw report shows more.
  if (incidentDeaths !== undefined) {
    const placedHere = self.desiredBodies > 0;
    const placed = placedHere ? self.desiredBodies : squadBodies(self, squad);
    const died = incidentDeaths - (placedHere ? self.incidentDeathsAtPlace : 0);
    return Math.max(reported ?? 0, placed - died, 0);
  }
  // Before any report: as alive as it was asked to be, by this handle or the
  // placing script.
  return (
    reported ??
    (self.desiredBodies > 0 ? self.desiredBodies : squadBodies(self, squad))
  );
}

// alive_count()'s named-member share, summed once per squad (unlike the
// anonymous roster, named members are not cells - see namedMemberPlaced).
function namedMembersPlaced(self: LuaBoundObject, squad: BoundRow): number {
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
  self: LuaBoundObject,
  squad: BoundRow,
  member: BoundRow
): boolean {
  const holder = actorHoldersOf(self.context).get(
    itemKey(member.bundle, member.typeIndex)
  );
  return (
    holder?.actorPlaced ??
    (self.context.placeActors || squadBodies(self, squad) > 0)
  );
}

// Placed and not spent: ActorSense f7 (TU0 [9]) is the member's own death
// edge - a named death never reaches the squad's tally.
function namedMembersAlive(self: LuaBoundObject, squad: BoundRow): number {
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
export function currentInCombatCount(self: LuaBoundObject): number {
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
export function countAtFiringArea(self: LuaBoundObject): number {
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
