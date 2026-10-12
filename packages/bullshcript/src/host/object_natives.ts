// Object, device, interactable, capturable, faction and object-timer verbs
// (plus Loot and the player-monitor/safe-zone sensors) - the receiver-side
// split of natives.ts's LuaBoundObject.

import type { LuaValue } from "../hks/values.ts";
import { toNumber } from "../hks/values.ts";
import type { BoundRow } from "./bindings.ts";
import { itemKey } from "./item_key.ts";
import { type ItemRef, itemRef, type ObjectFilterPredicate } from "./items.ts";
import { fnv1, parseHashLiteral } from "./name_hash.ts";
import {
  boundObjectOf,
  type LuaBoundObject,
  type ObjectItemState,
  rowKind,
  show,
} from "./natives.ts";
import * as squadNatives from "./squad_natives.ts";

// The interactable component: enabled, disabled, or gated by a filter.
// set_disabled_player_filter also sets enabled, so the filter is checked first.
function interactableOf(
  object: ObjectItemState
): { enabled: boolean; filter?: ItemRef } | undefined {
  if (object.interactableFilter) {
    return {
      enabled: object.interactableExcludeFilter,
      filter: object.interactableFilter,
    };
  }
  if (object.interactableEnabled) {
    return { enabled: true };
  }
  return object.interactableDisabled ? { enabled: false } : undefined;
}

// Capturable component payload, or undefined when no capturable verb has
// ever touched this Object row (the client's "keep").
function capturableOf(object: ObjectItemState):
  | {
      filter?: ItemRef;
      icon: number;
      lockStamp: number;
      locked: boolean;
      resetStamp: number;
    }
  | undefined {
  return object.capturablePresent
    ? {
        filter: object.capturableFilter,
        icon: object.capturableIcon,
        lockStamp: object.capturableLockStamp,
        locked: object.capturableLocked,
        resetStamp: object.capturableResetStamp,
      }
    : undefined;
}

// ObjectFaction component payload, or undefined when set_faction/
// set_team_index has never run on this row.
function factionOf(
  object: ObjectItemState
): { faction: number; stamp: number } | undefined {
  return object.factionPresent
    ? { faction: object.factionValue, stamp: object.factionStamp }
    : undefined;
}

// Pre-sense fallback only - the real progress is whatever the client's
// own simulation reports back (capturableSense).
function captureModel(self: LuaBoundObject): { progress: number } {
  self.capture ??= { progress: 0 };
  return self.capture;
}

// An unlocked zone fills while a player is inside it.
export function advanceCapture(self: LuaBoundObject, seconds: number): void {
  if (
    self.row?.typeId !== self.types.Object ||
    !objectState(self).capturablePresent ||
    capturableSenseValue(self) !== undefined
  ) {
    return;
  }
  const capture = captureModel(self);
  if (objectState(self).capturableLocked || capture.progress >= 1) {
    return;
  }
  const zone = self.context.reports.zonePlayers?.(self.row);
  let inside = true;
  if (zone === undefined) {
    inside = self.context.reports.bubbleOccupied(self.row.bundle) ?? true;
  } else {
    inside = zone > 0;
  }
  if (!inside) {
    return;
  }
  // Every Capturable row resolves to a blueprint: nothing to guess a rate for.
  const captureSeconds = self.rows.capturableDefinition?.(
    self.row
  )?.captureSeconds;
  if (captureSeconds === undefined) {
    return;
  }
  capture.progress = Math.min(1, capture.progress + seconds / captureSeconds);
  if (capture.progress >= 1) {
    self.writer.note(`${self.path} captured (fallback, no sense yet)`);
  }
}

// Capturable sense (0x80802E50), or undefined for a row with none yet.
function capturableSenseValue(self: LuaBoundObject) {
  if (self.row?.typeId !== self.types.Object) {
    return;
  }
  return self.context.reports.capturableSense?.(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
}

// A sense report is trusted once its echoed resetStamp has caught up with ours.
function capturableCaughtUpSense(self: LuaBoundObject) {
  const sense = capturableSenseValue(self);
  if (!sense || sense.resetStamp < objectState(self).capturableResetStamp) {
    return;
  }
  return sense;
}

export function capturableProgress(self: LuaBoundObject): number {
  const sense = capturableCaughtUpSense(self);
  return sense ? (sense.progressTenths ?? 0) / 10 : captureModel(self).progress;
}

export function capturableOwner(self: LuaBoundObject): number {
  return capturableCaughtUpSense(self)?.owner ?? -1;
}

export function capturableIsCaptured(self: LuaBoundObject): boolean {
  const owner = capturableOwner(self);
  if (owner !== -1 && owner !== 0xff) {
    return true;
  }
  return capturableProgress(self) >= 1;
}

// Faction = 16 + team index; anything else is not a team.
export function capturableOwnerTeamIndex(self: LuaBoundObject): number {
  const owner = capturableOwner(self);
  return owner >= 16 && owner <= 23 ? owner - 16 : -1;
}

export function capturableLock(self: LuaBoundObject, locked: boolean): boolean {
  const object = objectState(self);
  object.capturablePresent = true;
  object.capturableLocked = locked;
  object.capturableLockStamp += 1;
  return pushObject(self, `${locked ? "lock" : "unlock"}()`);
}

// reset(): bumps the stamp that clears the client's owner, and drops our
// own fallback/sense reading back to none/0 until it reports again.
export function capturableReset(self: LuaBoundObject): boolean {
  const object = objectState(self);
  object.capturablePresent = true;
  object.capturableResetStamp += 1;
  self.capture = { progress: 0 };
  return pushObject(self, "reset() (capture zone)");
}

export function capturableSetIcon(self: LuaBoundObject, icon: number): boolean {
  const object = objectState(self);
  object.capturablePresent = true;
  object.capturableIcon = icon;
  return pushObject(self, `set_icon_index(${icon})`);
}

// ObjectFaction sense (0x80801620), or undefined for a row with none yet.
function factionSenseValue(self: LuaBoundObject): number | undefined {
  if (self.row?.typeId !== self.types.Object) {
    return;
  }
  return self.context.reports.factionSense?.(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
}

export function setFaction(self: LuaBoundObject, faction: number): boolean {
  const object = objectState(self);
  object.factionPresent = true;
  object.factionValue = faction;
  object.factionStamp += 1;
  object.factionSentAt = self.context.time();
  return pushObject(self, `set_faction(${faction})`);
}

// get_team_index(): -1 until a sense arrives; once our own auth has had a
// tick to land with no sense back, fall back to the last value we set.
export function getTeamIndex(self: LuaBoundObject): number {
  const sense = factionSenseValue(self);
  if (sense !== undefined) {
    return sense >= 16 && sense <= 23 ? sense - 16 : -1;
  }
  const object = objectState(self);
  if (object.factionPresent && self.context.time() > object.factionSentAt) {
    const faction = object.factionValue;
    return faction >= 16 && faction <= 23 ? faction - 16 : -1;
  }
  return -1;
}

export function noteLootGathered(self: LuaBoundObject): void {
  self.lootCount += 1;
  self.writer.note(`${self.path} loot gathered -> ${self.lootCount}`);
}

// collect_loot_objective's verbs on `_loot`: LootAuth [bool enabled][ref
// filter][i32 epoch]; the count stays host-side.
export function lootVerb(
  self: LuaBoundObject,
  method: string
): LuaValue | undefined {
  switch (method) {
    case "enable":
    case "disable":
      self.lootEnabled = method === "enable";
      return pushLoot(self, `${method}()`);
    case "reset":
      self.lootCount = 0;
      self.lootEpoch += 1;
      return pushLoot(self, `reset() epoch ${self.lootEpoch}`);
    case "get_count":
      return self.lootCount;
    default:
      return;
  }
}

function pushLoot(self: LuaBoundObject, label: string): boolean {
  if (self.row?.typeId !== self.types.Loot) {
    self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
    return true;
  }
  self.writer.set(
    self.row,
    {
      kind: "loot",
      state: { enabled: self.lootEnabled, epoch: self.lootEpoch },
    },
    label
  );
  return true;
}

// Object row: a destructible_kill (or other kill-family incident) named this
// row's victim descriptor - see LuaEncounterHost.reportKill.
export function noteDestructibleKill(
  self: LuaBoundObject,
  hashes: readonly number[],
  namesOf: (row: BoundRow) => number[]
): void {
  if (
    self.row?.typeId !== self.types.Object ||
    self.destructibleKilled ||
    !namesOf(self.row).some((name) => hashes.includes(name))
  ) {
    return;
  }
  self.destructibleKilled = true;
  self.writer.note(`${self.path} destroyed (destructible kill)`);
}

// A SafeZone's / PlayerMonitor's ref: the ObjectFilter this row applies to.
export function setFilter(
  self: LuaBoundObject,
  value: LuaValue | undefined
): boolean {
  const filterRow = value === undefined ? undefined : boundObjectOf(value)?.row;
  const label =
    value === undefined ? "clear_filter()" : `set_filter(${show(value)})`;
  if (value !== undefined && filterRow?.typeId !== self.types.ObjectFilter) {
    self.writer.note(
      `${self.path}:${label} (argument is not an ObjectFilter row)`
    );
    return true;
  }
  const state = { filter: filterRow && itemRef(filterRow) };
  if (self.row?.typeId === self.types.SafeZone) {
    self.writer.set(self.row, { kind: "safeZone", state }, label);
    return true;
  }
  if (self.row?.typeId === self.types.PlayerMonitor) {
    self.writer.set(self.row, { kind: "playerMonitor", state }, label);
    return true;
  }
  if (self.row?.typeId === self.types.HopOn) {
    self.writer.set(self.row, { kind: "hopOn", state }, `hop-on ${label}`);
    return true;
  }
  // self._capturable:set_filter(of) - only players passing it count as
  // inside the zone. Object rows only; not a ControlPoint.
  if (self.row?.typeId === self.types.Object) {
    const object = objectState(self);
    object.capturablePresent = true;
    object.capturableFilter = filterRow && itemRef(filterRow);
    return pushObject(self, `${label} (capture zone)`);
  }
  self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
  return true;
}

// activate() / deactivate() on a trigger group (tg_*): the 2-bit state the
// client reads beside the group's volume.
export function setTriggerGroup(
  self: LuaBoundObject,
  active: boolean
): boolean {
  const label = active ? "activate()" : "deactivate()";
  if (!self.row || self.row.typeId !== self.types.TriggerGroup) {
    self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
    return true;
  }
  self.writer.set(
    self.row,
    { kind: "triggerGroup", state: { state: active ? 1 : 0 } },
    `trigger group ${label}`
  );
  return true;
}

// Shared by every handle bound to the object, so a device change never drops
// an interactable filter.
export function objectState(self: LuaBoundObject): ObjectItemState {
  const key = self.row
    ? `${self.row.bundle}:${self.row.typeId}:${self.row.typeIndex}`
    : self.path;
  let state = self.context.objectStates.get(key);
  if (!state) {
    state = {
      capturableFilter: undefined,
      capturableIcon: 0,
      capturableLockStamp: 0,
      capturableLocked: false,
      capturablePresent: false,
      capturableResetStamp: 0,
      componentsHeld: false,
      devicePosition: 0,
      deviceRevision: 0,
      factionPresent: false,
      factionSentAt: 0,
      factionStamp: 0,
      factionValue: 0,
      incarnation: 0,
      interactableDisabled: false,
      interactableEnabled: false,
      interactableExcludeFilter: false,
      interactableFilter: undefined,
      interactableUsed: false,
      interactableUsedStamp: 0,
      objectTimer: undefined,
      present: false,
    };
    self.context.objectStates.set(key, state);
  }
  return state;
}

export function pushObject(self: LuaBoundObject, label: string): boolean {
  if (self.row?.typeId !== self.types.Object) {
    self.writer.note(`${self.path} object ${label} (no Object row)`);
    return true;
  }
  const object = objectState(self);
  const interactable = object.componentsHeld
    ? undefined
    : interactableOf(object);
  self.writer.set(
    self.row,
    {
      kind: "object",
      state: {
        capturable: object.componentsHeld ? undefined : capturableOf(object),
        device:
          object.deviceRevision > 0 && !object.componentsHeld
            ? {
                position: object.devicePosition,
                revision: object.deviceRevision,
              }
            : undefined,
        faction: object.componentsHeld ? undefined : factionOf(object),
        incarnation: object.incarnation,
        interactable: interactable && {
          ...interactable,
          used: {
            stamp: object.interactableUsedStamp,
            value: object.interactableUsed,
          },
        },
        objectTimer: object.componentsHeld ? undefined : object.objectTimer,
        present: object.present,
      },
    },
    label
  );
  return true;
}

// State field 1, the non-networked existence gate: sub_835C15F0 creates on
// true, destroys on false; a bubble-authority row goes through sub_835C1A60.
export function create(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.Object) {
    self.writer.note(`${self.path}:create() (no row)`);
    return true;
  }
  bumpObjectIncarnation(self);
  objectState(self).present = true;
  objectState(self).componentsHeld = true;
  // A fresh object is not the one a kill destroyed.
  self.destructibleKilled = false;
  return pushObject(
    self,
    `object present gen ${objectState(self).incarnation}`
  );
}

// Strictly increasing, and host-authored: the client never reports an Object's
// state to us, so there is no value of the client's to follow.
export function bumpObjectIncarnation(self: LuaBoundObject): void {
  objectState(self).incarnation += 1;
}

// Re-send the body with its components once the object has had a tick to
// exist. Nothing to do for a row that never held any back.
export function releaseHeldComponents(self: LuaBoundObject): void {
  if (!objectState(self).componentsHeld) {
    return;
  }
  objectState(self).componentsHeld = false;
  if (
    objectState(self).deviceRevision > 0 ||
    interactableOf(objectState(self))
  ) {
    pushObject(self, "components attached");
  }
}

export function deleteObject(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.Object) {
    self.writer.note(`${self.path}:delete_object() (${rowKind(self.row)})`);
    return true;
  }
  bumpObjectIncarnation(self);
  objectState(self).present = false;
  return pushObject(
    self,
    `object absent gen ${objectState(self).incarnation} (delete_object)`
  );
}

// An object's reported field 1: the guest's own "this row has a placed sobject
// and it is live" bit, when a report has arrived.
export function isAlive(self: LuaBoundObject): boolean {
  if (self.row?.typeId === self.types.Actor) {
    const alive = squadNatives.aliveCount(self) > 0;
    self.writer.notePoll(
      `${self.path}:is_alive`,
      `${self.path}:is_alive() -> ${alive} (squad)`
    );
    return alive;
  }
  if (self.row?.typeId !== self.types.Object) {
    return self.unknownPredicate("is_alive");
  }
  const reported = self.context.reports.objectAlive(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
  if (reported !== undefined) {
    self.writer.notePoll(
      `${self.path}:is_alive`,
      `${self.path}:is_alive() -> ${reported} (reported)`
    );
    return reported;
  }
  const alive = objectState(self).present && !self.destructibleKilled;
  self.writer.notePoll(
    `${self.path}:is_alive`,
    `${self.path}:is_alive() -> ${alive} (created, no destructible kill)`
  );
  return alive;
}

export function setDevicePosition(
  self: LuaBoundObject,
  position: number
): boolean {
  objectState(self).devicePosition = position;
  if (!self.row) {
    self.writer.note(`${self.path}:set_device_position(${position}) (no row)`);
    return true;
  }
  // The client keeps the last stamp it saw, so every write counts up.
  objectState(self).deviceRevision += 1;
  return pushObject(
    self,
    `device position ${position} stamp ${objectState(self).deviceRevision}`
  );
}

// `_interactable` is bound to the Object row; the wire slot is its
// mission-interactable component (0x6400227C, payload 80802DA2, sub_8381C2B8).
export function setEnabledPlayerFilter(
  self: LuaBoundObject,
  value: LuaValue
): boolean {
  const filterRow = boundObjectOf(value)?.row;
  const label = `set_enabled_player_filter(${show(value)})`;
  if (filterRow?.typeId !== self.types.ObjectFilter) {
    self.writer.note(
      `${self.path}:${label} (argument is not an ObjectFilter row)`
    );
    return true;
  }
  objectState(self).interactableDisabled = false;
  objectState(self).interactableEnabled = false;
  objectState(self).interactableExcludeFilter = false;
  objectState(self).interactableFilter = itemRef(filterRow);
  return pushObject(self, `interactable ${label}`);
}

// set_disabled_player_filter(f) = mode 2 + ref f: everyone except players
// passing f may use it - pvp salvage disables its probe for the capturing team.
export function setDisabledPlayerFilter(
  self: LuaBoundObject,
  value: LuaValue
): boolean {
  const filterRow = boundObjectOf(value)?.row;
  const label = `set_disabled_player_filter(${show(value)})`;
  if (filterRow?.typeId !== self.types.ObjectFilter) {
    self.writer.note(
      `${self.path}:${label} (argument is not an ObjectFilter row)`
    );
    return true;
  }
  objectState(self).interactableDisabled = false;
  objectState(self).interactableEnabled = false;
  objectState(self).interactableExcludeFilter = true;
  objectState(self).interactableFilter = itemRef(filterRow);
  return pushObject(self, `interactable ${label}`);
}

// enable_all_players(): m_enabled true, no filter.
export function enableAllPlayers(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.Object) {
    self.writer.note(
      `${self.path}:enable_all_players() (${rowKind(self.row)})`
    );
    return true;
  }
  objectState(self).interactableDisabled = false;
  objectState(self).interactableEnabled = true;
  objectState(self).interactableExcludeFilter = false;
  objectState(self).interactableFilter = undefined;
  return pushObject(self, "interactable enable_all_players()");
}

// Used since our last clear(): the interaction incident, or the client's used
// latch at our stamp or later.
export function usedSinceClear(self: LuaBoundObject): boolean {
  if (self.interacted) {
    return true;
  }
  if (self.row?.typeId !== self.types.Object) {
    return false;
  }
  const sense = self.context.reports.interactableSense?.(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
  if (
    !sense?.used ||
    sense.usedStamp < objectState(self).interactableUsedStamp
  ) {
    return false;
  }
  self.interacted = true;
  self.writer.note(`${self.path} used (interactable sense)`);
  return true;
}

// clear(): forgets the use, drops enable_all_players back to disabled, and
// re-arms the latch by bumping its stamp.
export function clearInteractable(self: LuaBoundObject): boolean {
  self.interacted = false;
  const object = objectState(self);
  const configured =
    object.interactableEnabled ||
    object.interactableDisabled ||
    object.interactableFilter !== undefined;
  if (!configured) {
    self.writer.note(`${self.path}:clear() (interaction cleared)`);
    return true;
  }
  object.interactableUsedStamp += 1;
  object.interactableUsed = false;
  if (!object.interactableEnabled) {
    return pushObject(self, "interactable clear() (re-armed)");
  }
  object.interactableDisabled = true;
  object.interactableEnabled = false;
  return pushObject(self, "interactable clear() (interaction cleared)");
}

// `add` picks its predicate class off the row type: a Squad means every member
// (80800616), anything else the single-object resolver (80800615).
function addFilterPredicate(
  self: LuaBoundObject,
  predicate: ObjectFilterPredicate,
  label: string
): boolean {
  if (self.row?.typeId !== self.types.ObjectFilter) {
    self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
    return true;
  }
  self.filterPredicates.push(predicate);
  self.writer.set(
    self.row,
    {
      kind: "objectFilter",
      state: { predicates: [...self.filterPredicates] },
    },
    `${label} (${self.filterPredicates.length} predicate(s))`
  );
  return true;
}

// clear() on an ObjectFilter: no predicates at all.
export function clearFilter(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.ObjectFilter) {
    self.writer.note(`${self.path}:clear() (${rowKind(self.row)})`);
    return true;
  }
  self.filterPredicates.length = 0;
  self.writer.set(
    self.row,
    { kind: "objectFilter", state: { predicates: [] } },
    "clear() (0 predicate(s))"
  );
  return true;
}

export function removeFilterRow(
  self: LuaBoundObject,
  value: LuaValue
): boolean {
  const target = boundObjectOf(value)?.row;
  const label = `remove(${show(value)})`;
  if (!target) {
    self.writer.note(`${self.path}:${label} (argument has no row)`);
    return true;
  }
  const item = itemRef(target);
  return addFilterPredicate(
    self,
    target.typeId === self.types.Squad
      ? { kind: "squadMembers", item, remove: true }
      : { kind: "slotObject", item, remove: true },
    label
  );
}

export function addFilterRow(self: LuaBoundObject, value: LuaValue): boolean {
  const target = boundObjectOf(value)?.row;
  const label = `add(${show(value)})`;
  if (!target) {
    self.writer.note(`${self.path}:${label} (argument has no row)`);
    return true;
  }
  const item = itemRef(target);
  return addFilterPredicate(
    self,
    target.typeId === self.types.Squad
      ? { kind: "squadMembers", item }
      : { kind: "slotObject", item },
    label
  );
}

// add_players_with_activity_flag(flag) -> predicate 80800611 over the player's
// flag list (8080052A, sub_835BEAD8); the flag's identity is the bound identifier's hash.
export function activityFlagHash(self: LuaBoundObject): number | undefined {
  if (self.row !== undefined || self.handle === undefined) {
    return;
  }
  return flagHashOf(self.handle);
}

// The identifier's FNV-1, or the hash itself for a "0x" literal.
function flagHashOf(handle: string): number {
  return parseHashLiteral(handle) ?? fnv1(handle);
}

// The row's import identifier as a "0x" literal, for a TU0 archetype's
// row-less _activity_flag; nil without a row or identifier. Verb name ours.
export function importIdentifier(self: LuaBoundObject): string | undefined {
  const ident = self.row && self.rows.importIdentifier?.(self.row);
  if (ident === undefined) {
    self.writer.note(`${self.path}:import_identifier() -> nil`);
    return;
  }
  const literal = `0x${ident.toString(16).toUpperCase().padStart(8, "0")}`;
  self.writer.note(`${self.path}:import_identifier() -> ${literal}`);
  return literal;
}

// The flag lives on the player, in a nested 8080052A list.
export function setActivityFlag(
  self: LuaBoundObject,
  active: boolean
): boolean {
  const hash = activityFlagHash(self);
  if (hash === undefined) {
    return true;
  }
  const changed = self.writer.activityFlag(hash, active);
  self.writer.note(
    `${self.path} activity flag ${self.handle} ${active ? "set" : "cleared"}` +
      (changed ? "" : " (already)")
  );
  return true;
}

export function addPlayersWithActivityFlag(
  self: LuaBoundObject,
  value: LuaValue
): boolean {
  // The flag handle, or its name outright (a sub-field handle cannot keep one).
  const target = boundObjectOf(value);
  const name =
    typeof value === "string" ? value : (target?.handle ?? target?.row?.name);
  const label = `add_players_with_activity_flag(${show(value)})`;
  if (name === undefined) {
    self.writer.note(`${self.path}:${label} (flag handle has no name)`);
    return true;
  }
  return addFilterPredicate(
    self,
    { kind: "playersWithActivityFlag", flagNameHash: flagHashOf(name) },
    label
  );
}

// add_players_on_team(t) -> predicate 80800614, the team-index form of the
// same faction test (sub_8369C470): the wire value is t, not 16 + t.
export function addPlayersOnTeam(
  self: LuaBoundObject,
  value: LuaValue
): boolean {
  const teamIndex = toNumber(value) ?? 0;
  return addFilterPredicate(
    self,
    { kind: "playersOnTeam", teamIndex },
    `add_players_on_team(${teamIndex})`
  );
}

// add_combatant_type(x) -> predicate 80800619 on a combatant type name: a
// blueprint class tag (808CC910), not a bundle row.
export function addCombatantType(
  self: LuaBoundObject,
  value: LuaValue
): boolean {
  const target = boundObjectOf(value);
  // A blueprint class arrives as an inert handle whose path ends in the class name.
  const name =
    target?.handle ??
    target?.row?.name ??
    target?.path.split(".").at(-1) ??
    (typeof value === "string" ? value : undefined);
  const label = `add_combatant_type(${show(value)})`;
  if (name === undefined) {
    self.writer.note(`${self.path}:${label} (combatant type has no name)`);
    return true;
  }
  return addFilterPredicate(
    self,
    { kind: "combatantType", typeNameHash: fnv1(name) },
    label
  );
}

// A SafeZone's reported field 0 is how many objects passing the zone's own
// ObjectFilter are inside it.
export function anyObjectsAreInside(self: LuaBoundObject): boolean {
  if (self.row?.typeId !== self.types.SafeZone) {
    return self.unknownPredicate("any_objects_are_inside");
  }
  const inside =
    self.context.reports.safeZoneInside(
      itemKey(self.row.bundle, self.row.typeIndex)
    ) ?? 0;
  self.writer.note(
    `${self.path}:any_objects_are_inside() -> ${inside > 0} (${inside} inside)`
  );
  self.context.noteRowRead(true);
  return inside > 0;
}

export function playerCount(self: LuaBoundObject): number {
  if (self.row?.typeId === self.types.PlayerMonitor) {
    return (
      self.context.reports.playerMonitorCount(
        itemKey(self.row.bundle, self.row.typeIndex)
      ) ?? 0
    );
  }
  // A monitor slot bound to a Location means the bubble: answer from its
  // PlayerMonitor.
  if (self.row?.typeId === self.types.Location) {
    return self.context.reports.bubbleOccupied(self.row.bundle) ? 1 : 0;
  }
  return 0;
}
