// Object, device, interactable, capturable, faction and object-timer verbs
// (plus Loot and the player-monitor/safe-zone sensors) - the receiver-side
// split of natives.ts's BoundInstance.

import type { LuaValue } from "../../hks/vm/values.ts";
import { toNumber } from "../../hks/vm/values.ts";
import type { BoundRow } from "../bound/bindings.ts";
import { type BoundInstance, boundObjectOf } from "../bound/bound_object.ts";
import {
  type ItemRef,
  itemRef,
  type ObjectFilterPredicate,
} from "../state/items.ts";
import { itemKey } from "../tags/item_key.ts";
import { fnv1, parseHashLiteral } from "../tags/name_hash.ts";
import type { NativeRegistry } from "./native_registry.ts";
import { type ObjectItemState, rowKind, show } from "./native_support.ts";
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
function captureModel(self: BoundInstance): { progress: number } {
  self.objectRow.capture ??= { progress: 0 };
  return self.objectRow.capture;
}

// An unlocked zone fills while a player is inside it.
export function advanceCapture(self: BoundInstance, seconds: number): void {
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
function capturableSenseValue(self: BoundInstance) {
  if (self.row?.typeId !== self.types.Object) {
    return;
  }
  return self.context.reports.capturableSense?.(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
}

// A sense report is trusted once its echoed resetStamp has caught up with ours.
function capturableCaughtUpSense(self: BoundInstance) {
  const sense = capturableSenseValue(self);
  if (!sense || sense.resetStamp < objectState(self).capturableResetStamp) {
    return;
  }
  return sense;
}

export function capturableProgress(self: BoundInstance): number {
  const sense = capturableCaughtUpSense(self);
  return sense ? (sense.progressTenths ?? 0) / 10 : captureModel(self).progress;
}

export function capturableOwner(self: BoundInstance): number {
  return capturableCaughtUpSense(self)?.owner ?? -1;
}

export function capturableIsCaptured(self: BoundInstance): boolean {
  const owner = capturableOwner(self);
  if (owner !== -1 && owner !== 0xff) {
    return true;
  }
  return capturableProgress(self) >= 1;
}

// Faction = 16 + team index; anything else is not a team.
export function capturableOwnerTeamIndex(self: BoundInstance): number {
  const owner = capturableOwner(self);
  return owner >= 16 && owner <= 23 ? owner - 16 : -1;
}

export function capturableLock(self: BoundInstance, locked: boolean): boolean {
  const object = objectState(self);
  object.capturablePresent = true;
  object.capturableLocked = locked;
  object.capturableLockStamp += 1;
  return pushObject(self, `${locked ? "lock" : "unlock"}()`);
}

// reset(): bumps the stamp that clears the client's owner, and drops our
// own fallback/sense reading back to none/0 until it reports again.
export function capturableReset(self: BoundInstance): boolean {
  const object = objectState(self);
  object.capturablePresent = true;
  object.capturableResetStamp += 1;
  self.objectRow.capture = { progress: 0 };
  return pushObject(self, "reset() (capture zone)");
}

export function capturableSetIcon(self: BoundInstance, icon: number): boolean {
  const object = objectState(self);
  object.capturablePresent = true;
  object.capturableIcon = icon;
  return pushObject(self, `set_icon_index(${icon})`);
}

// ObjectFaction sense (0x80801620), or undefined for a row with none yet.
function factionSenseValue(self: BoundInstance): number | undefined {
  if (self.row?.typeId !== self.types.Object) {
    return;
  }
  return self.context.reports.factionSense?.(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
}

export function setFaction(self: BoundInstance, faction: number): boolean {
  const object = objectState(self);
  object.factionPresent = true;
  object.factionValue = faction;
  object.factionStamp += 1;
  object.factionSentAt = self.context.time();
  return pushObject(self, `set_faction(${faction})`);
}

// get_team_index(): -1 until a sense arrives; once our own auth has had a
// tick to land with no sense back, fall back to the last value we set.
export function getTeamIndex(self: BoundInstance): number {
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

export function noteLootGathered(self: BoundInstance): void {
  self.loot.count += 1;
  self.writer.note(`${self.path} loot gathered -> ${self.loot.count}`);
}

// collect_loot_objective's verbs on `_loot`: LootAuth [bool enabled][ref
// filter][i32 epoch]; the count stays host-side.
// A seat (a Passenger row): seat(actor) puts the actor in it, release() lets
// it go. Retail serves the seated state as 1 and the released one as 2
// (Phogoth's chains). Verb names ours.
function passengerVerb(
  self: BoundInstance,
  method: string,
  value: LuaValue
): LuaValue | undefined {
  if (!self.row) {
    return;
  }
  switch (method) {
    case "seat": {
      const actor = value === undefined ? undefined : boundObjectOf(value)?.row;
      if (actor?.typeId !== self.types.Actor) {
        self.writer.note(
          `${self.path}:seat(${show(value)}) (not an Actor row)`
        );
        return true;
      }
      self.writer.set(
        self.row,
        { kind: "passenger", state: { passenger: itemRef(actor), state: 1 } },
        `seat(${actor.name})`
      );
      return true;
    }
    case "release":
      self.writer.set(
        self.row,
        { kind: "passenger", state: { state: 2 } },
        "release()"
      );
      return true;
    default:
      return;
  }
}

export function lootVerb(
  self: BoundInstance,
  method: string
): LuaValue | undefined {
  switch (method) {
    case "enable":
    case "disable":
      self.loot.enabled = method === "enable";
      return pushLoot(self, `${method}()`);
    case "reset":
      self.loot.count = 0;
      self.loot.epoch += 1;
      return pushLoot(self, `reset() epoch ${self.loot.epoch}`);
    case "get_count":
      return self.loot.count;
    default:
      return;
  }
}

function pushLoot(self: BoundInstance, label: string): boolean {
  if (self.row?.typeId !== self.types.Loot) {
    self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
    return true;
  }
  self.writer.set(
    self.row,
    {
      kind: "loot",
      state: { enabled: self.loot.enabled, epoch: self.loot.epoch },
    },
    label
  );
  return true;
}

// Object row: a destructible_kill (or other kill-family incident) named this
// row's victim descriptor - see EncounterScriptHost.reportKill.
export function noteDestructibleKill(
  self: BoundInstance,
  hashes: readonly number[],
  namesOf: (row: BoundRow) => number[]
): void {
  if (
    self.row?.typeId !== self.types.Object ||
    self.objectRow.destructibleKilled ||
    !namesOf(self.row).some((name) => hashes.includes(name))
  ) {
    return;
  }
  self.objectRow.destructibleKilled = true;
  self.writer.note(`${self.path} destroyed (destructible kill)`);
}

// A SafeZone's / PlayerMonitor's ref: the ObjectFilter this row applies to.
export function setFilter(
  self: BoundInstance,
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
export function setTriggerGroup(self: BoundInstance, active: boolean): boolean {
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

// An object no script has touched: not created, nothing attached.
export function newObjectState(): ObjectItemState {
  return {
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
}

// Shared by every handle bound to the object, so a device change never drops
// an interactable filter.
export function objectState(self: BoundInstance): ObjectItemState {
  const key = self.row
    ? `${self.row.bundle}:${self.row.typeId}:${self.row.typeIndex}`
    : self.path;
  let state = self.context.objectStates.get(key);
  if (!state) {
    state = newObjectState();
    self.context.objectStates.set(key, state);
  }
  return state;
}

export function pushObject(self: BoundInstance, label: string): boolean {
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
export function create(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.Object) {
    self.writer.note(`${self.path}:create() (no row)`);
    return true;
  }
  bumpObjectIncarnation(self);
  objectState(self).present = true;
  objectState(self).componentsHeld = true;
  // A fresh object is not the one a kill destroyed.
  self.objectRow.destructibleKilled = false;
  return pushObject(
    self,
    `object present gen ${objectState(self).incarnation}`
  );
}

// Strictly increasing, and host-authored: the client never reports an Object's
// state to us, so there is no value of the client's to follow.
export function bumpObjectIncarnation(self: BoundInstance): void {
  objectState(self).incarnation += 1;
}

// Re-send the body with its components once the object has had a tick to
// exist. Nothing to do for a row that never held any back.
export function releaseHeldComponents(self: BoundInstance): void {
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

export function deleteObject(self: BoundInstance): boolean {
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
export function isAlive(self: BoundInstance): boolean {
  if (self.row?.typeId === self.types.Actor) {
    const alive =
      squadNatives.aliveCount(self) > 0 ||
      squadNatives.namedMemberStanding(self);
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
  const alive = objectState(self).present && !self.objectRow.destructibleKilled;
  self.writer.notePoll(
    `${self.path}:is_alive`,
    `${self.path}:is_alive() -> ${alive} (created, no destructible kill)`
  );
  return alive;
}

export function setDevicePosition(
  self: BoundInstance,
  position: number
): boolean {
  objectState(self).devicePosition = position;
  if (!self.row) {
    self.writer.note(`${self.path}:set_device_position(${position}) (no row)`);
    return true;
  }
  // The client takes a position only with a stamp above the one it holds,
  // and a device in a group counts that stamp up once more as it applies
  // ours (40662's sub_9FB700 -> sub_A00030 -> sub_9FB1A0): the Devil's Lair
  // console reported stamp 2 for our 0.1 at stamp 1 and dropped the 1 we
  // sent at stamp 2. So a write goes one past the newer of the two.
  const sensed =
    self.context.reports.deviceSense?.(
      itemKey(self.row.bundle, self.row.typeIndex)
    )?.positionStamp ?? 0;
  objectState(self).deviceRevision =
    Math.max(objectState(self).deviceRevision, sensed) + 1;
  return pushObject(
    self,
    `device position ${position} stamp ${objectState(self).deviceRevision}`
  );
}

// `_interactable` is bound to the Object row; the wire slot is its
// mission-interactable component (0x6400227C, payload 80802DA2, sub_8381C2B8).
export function setEnabledPlayerFilter(
  self: BoundInstance,
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
  self: BoundInstance,
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
export function enableAllPlayers(self: BoundInstance): boolean {
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
export function usedSinceClear(self: BoundInstance): boolean {
  if (self.objectRow.interacted) {
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
  self.objectRow.interacted = true;
  self.writer.note(`${self.path} used (interactable sense)`);
  return true;
}

// clear(): forgets the use, drops enable_all_players back to disabled, and
// re-arms the latch by bumping its stamp.
export function clearInteractable(self: BoundInstance): boolean {
  self.objectRow.interacted = false;
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
  self: BoundInstance,
  predicate: ObjectFilterPredicate,
  label: string
): boolean {
  if (self.row?.typeId !== self.types.ObjectFilter) {
    self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
    return true;
  }
  self.objectRow.filterPredicates.push(predicate);
  self.writer.set(
    self.row,
    {
      kind: "objectFilter",
      state: { predicates: [...self.objectRow.filterPredicates] },
    },
    `${label} (${self.objectRow.filterPredicates.length} predicate(s))`
  );
  return true;
}

// clear() on an ObjectFilter: no predicates at all.
export function clearFilter(self: BoundInstance): boolean {
  if (self.row?.typeId !== self.types.ObjectFilter) {
    self.writer.note(`${self.path}:clear() (${rowKind(self.row)})`);
    return true;
  }
  self.objectRow.filterPredicates.length = 0;
  self.writer.set(
    self.row,
    { kind: "objectFilter", state: { predicates: [] } },
    "clear() (0 predicate(s))"
  );
  return true;
}

export function removeFilterRow(self: BoundInstance, value: LuaValue): boolean {
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

export function addFilterRow(self: BoundInstance, value: LuaValue): boolean {
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
export function activityFlagHash(self: BoundInstance): number | undefined {
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
export function importIdentifier(self: BoundInstance): string | undefined {
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
export function setActivityFlag(self: BoundInstance, active: boolean): boolean {
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
  self: BoundInstance,
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
  self: BoundInstance,
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
  self: BoundInstance,
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
export function anyObjectsAreInside(self: BoundInstance): boolean {
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

export function playerCount(self: BoundInstance): number {
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

export function register(registry: NativeRegistry<BoundInstance>): void {
  registry.verb("import_identifier", (self) => importIdentifier(self));
  registry.verb(["create", "create_anew"], (self) => create(self));
  registry.verb("delete_object", (self) => deleteObject(self));
  registry.verb("set_device_position", (self, args) =>
    setDevicePosition(self, toNumber(args[0]) ?? 0)
  );
  registry.verb(
    "get_device_position",
    (self) => objectState(self).devicePosition
  );
  registry.verb("add_combatant_type", (self, args) =>
    addCombatantType(self, args[0])
  );
  registry.verb("set_filter", (self, args) => setFilter(self, args[0]));
  registry.verb("clear_filter", (self) => setFilter(self, undefined));
  registry.verb("add", (self, args) => addFilterRow(self, args[0]));
  registry.verb("add_players_with_activity_flag", (self, args) =>
    addPlayersWithActivityFlag(self, args[0])
  );
  registry.verb("add_players_on_team", (self, args) =>
    addPlayersOnTeam(self, args[0])
  );
  registry.verb("any_objects_are_inside", (self) => anyObjectsAreInside(self));
  registry.verb("test_any_inside", (self) => playerCount(self) > 0);
  registry.verb("enable_all_players", (self) => enableAllPlayers(self));
  // 1 = enemy of PvE faction 0, so shootable.
  registry.verb("set_faction", (self, args) =>
    setFaction(self, toNumber(args[0]) ?? 0)
  );
  // set_faction(16 + t), the PvP team numbering PlayerAuth carries.
  registry.verb("set_team_index", (self, args) =>
    setFaction(self, 16 + (toNumber(args[0]) ?? 0))
  );
  registry.verb("is_alive", (self) => isAlive(self));
  registry.verb(["lock", "unlock"], (self, _args, method) =>
    capturableLock(self, method === "lock")
  );
  registry.verb("set_icon_index", (self, args) =>
    capturableSetIcon(self, toNumber(args[0]) ?? 0)
  );
  registry.verb("set_enabled_player_filter", (self, args) =>
    setEnabledPlayerFilter(self, args[0])
  );
  registry.verb("set_disabled_player_filter", (self, args) =>
    setDisabledPlayerFilter(self, args[0])
  );
  registry.verb("get_capture_progress", (self) => capturableProgress(self));
  registry.verb("is_captured", (self) => capturableIsCaptured(self));
  registry.verb("get_owner_team_index", (self) =>
    capturableOwnerTeamIndex(self)
  );
  registry.rowVerb(
    (self) => self.row?.typeId === self.types.Loot,
    (self, method) => lootVerb(self, method)
  );
  registry.rowVerb(
    (self) =>
      self.types.Passenger !== undefined &&
      self.row?.typeId === self.types.Passenger,
    (self, method, args) => passengerVerb(self, method, args[0])
  );
  registry.onAdvance((self, seconds) => {
    releaseHeldComponents(self);
    advanceCapture(self, seconds);
  });
  registry.events.noteLootGathered = noteLootGathered;
  registry.events.noteDestructibleKill = noteDestructibleKill;
}
