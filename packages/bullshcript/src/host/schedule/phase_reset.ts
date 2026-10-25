// A hard wipe resets the running phase: its scripts, and the encounters that
// wrote beside it since it started, stop and are built again, and the phase
// starts from its beginning. Every row the phase wrote goes back to what it was
// when the phase started. An encounter starts from its start, so the rows it
// owns go back to how the host started them, whenever it wrote them. A
// debugger's jump to another phase leaves the running one the same way,
// without the rows.

import { LuaHostObject } from "../../hks/env/host_env.ts";
import { LuaTable } from "../../hks/vm/values.ts";
import type { EncounterHostContext } from "../activity/host_context.ts";
import * as instanceBuilding from "../build/instance_building.ts";
import {
  type BoundInstance,
  forgetActorHolders,
  forgetEngagements,
  forgetSquadPlacement,
  newObjectState,
} from "../natives/natives.ts";
import {
  type ActorState,
  type ItemChange,
  type ItemRef,
  itemRef,
} from "../state/items.ts";
import {
  type JournalledRow,
  type PhaseShadow,
  rowKey,
} from "../state/phase_journal.ts";
import { itemKey } from "../tags/item_key.ts";
import * as schedulingThreads from "./scheduling_threads.ts";

// A hard wipe. Not from a script's own thread, which would go on running
// through its own teardown.
export function resetCurrentPhase(self: EncounterHostContext): void {
  const phase = self.phases[self.phaseIndex];
  if (phase === undefined) {
    throw new Error("no mission phase is running");
  }
  if (self.scheduler.current !== undefined) {
    throw new Error("a phase resets between ticks, not from a script");
  }
  self.writer.note(`mission ${phase.declName} resetting (hard wipe)`);
  // The encounters that wrote a row since the phase started start again from
  // their start, with the phase: what they placed is put back, so what they
  // remember of it would be wrong.
  const encounters = [...self.journal.writers].filter(
    (writer) =>
      writer !== phase.instance &&
      self.built.some((script) => script.table === writer)
  );
  const roots = [phase.instance, ...encounters];
  // before discard forgets who owns what
  const restarted = ownedRows(self, encounters);
  const triggers = boundTriggers(self, roots);
  const dead = discard(self, roots);
  restoreRows(self, restarted);
  rearmTriggers(self, triggers);
  const fresh = build(self, roots, dead);
  for (const old of encounters) {
    const script = self.built.find(({ table }) => table === fresh.get(old));
    if (
      script &&
      !instanceBuilding.isDormantPhase(self, script.chunk) &&
      instanceBuilding.isTopLevelActor(self, script.chunk)
    ) {
      instanceBuilding.autostart(self, script);
    }
  }
  self.phaseCompleting = false;
  self.phaseFailed = false;
  schedulingThreads.startPhase(self, phase, " (hard wipe)");
}

// Makes `index` the running mission phase now, whatever the running one was
// doing: it stops (not completes) and is built again, so the activity can come
// back to it, and the new one starts as advanceMissions would start it. A
// debugger's jump.
export function jumpToPhase(self: EncounterHostContext, index: number): void {
  const target = self.phases[index];
  if (target === undefined) {
    throw new Error(`no mission phase ${index}`);
  }
  const current = self.phases[self.phaseIndex];
  if (current) {
    build(self, [current.instance], discard(self, [current.instance]));
    self.writer.note(`mission ${current.declName} left (debugger)`);
  }
  self.phaseIndex = index;
  self.phaseCompleting = false;
  self.phaseFailed = false;
  self.options.phaseProgress?.write(index);
  schedulingThreads.startPhase(self, target, " (debugger)");
}

// The rows these encounters' handles are bound to, by rowKey: the ones the
// encounter placed before the phase started and the ones the phase left alone
// too.
function ownedRows(
  self: EncounterHostContext,
  encounters: readonly LuaTable[]
): Map<string, ItemRef> {
  const trees = new Set(
    encounters.flatMap((encounter) => [...self.ownership.treeOf(encounter)])
  );
  const rows = new Map<string, ItemRef>();
  for (const bound of self.objects) {
    const owner = self.ownership.ownerOfObject(bound);
    if (bound.row !== undefined && owner !== undefined && trees.has(owner)) {
      rows.set(rowKey(bound.row), itemRef(bound.row));
    }
  }
  return rows;
}

// The player triggers the handles of these instances, and of everything built
// under them, are bound to, by rowKey.
function boundTriggers(
  self: EncounterHostContext,
  roots: readonly LuaTable[]
): Map<string, ItemRef> {
  const trees = new Set(
    roots.flatMap((root) => [...self.ownership.treeOf(root)])
  );
  const rows = new Map<string, ItemRef>();
  for (const bound of self.objects) {
    const owner = self.ownership.ownerOfObject(bound);
    if (
      bound.row?.typeId === self.types.PlayerTrigger &&
      owner !== undefined &&
      trees.has(owner)
    ) {
      rows.set(rowKey(bound.row), itemRef(bound.row));
    }
  }
  return rows;
}

// A player trigger fires once per arming (the client's last fire < the arm
// stamp), and the host keeps its fire until a script arms it again. One a
// script only polls (the m09 tower's skiff triggers, never armed) would read
// as fired from the reset phase's first tick, and the client would never fire
// it again. So each goes out armed afresh, enabled as the reset left it, and
// its fire is forgotten: the next player to walk in fires it.
function rearmTriggers(
  self: EncounterHostContext,
  triggers: ReadonlyMap<string, ItemRef>
): void {
  const armedAt = self.context.clock.activityTicks();
  for (const item of triggers.values()) {
    self.world.forget(itemKey(item.bundle, item.typeIndex));
    const last = self.journal.last("playerTrigger", item);
    const change: ItemChange = {
      item,
      kind: "playerTrigger",
      state: {
        armedAt,
        enabled: last?.kind === "playerTrigger" ? last.state.enabled : true,
      },
    };
    self.journal.noteRestored(change);
    self.options.onItemChange?.(change);
    self.context.onSent?.(change);
  }
}

// Stops the scripts of these top-level instances and everything built under
// them: their threads, the incident handlers they armed, their row bindings,
// encounter managers and the archetypes they own. Returns the instances.
function discard(
  self: EncounterHostContext,
  roots: readonly LuaTable[]
): Set<LuaTable> {
  const dead = new Set<LuaTable>();
  for (const root of roots) {
    for (const instance of self.ownership.treeOf(root)) {
      dead.add(instance);
    }
  }
  for (const script of [...self.scheduler.threads]) {
    const owner =
      self.threadOwners.get(script) ?? self.handlerOwners.get(script);
    if (owner !== undefined && dead.has(owner)) {
      self.scheduler.remove(script);
      // a thread of the same name begins its waits afresh
      self.stalls.delete(script.name);
    }
  }
  const gone = new Set<BoundInstance>();
  for (const bound of [...self.objects]) {
    const owner = self.ownership.ownerOfObject(bound);
    if (owner !== undefined && dead.has(owner)) {
      gone.add(bound);
    }
  }
  removeAll(self.objects, gone);
  removeAll(self.importSlots, gone);
  forgetEngagements(self.context, gone);
  forgetActorHolders(self.context, gone);
  for (let i = self.managers.length - 1; i >= 0; i--) {
    const manager = self.managers[i];
    if (dead.has(manager.owner)) {
      self.managers.splice(i, 1);
    } else {
      manager.encounters = manager.encounters.filter(
        ({ instance }) => !dead.has(instance)
      );
    }
  }
  for (const [key, shared] of [...self.sharedArchetypes]) {
    if (dead.has(shared.table)) {
      self.sharedArchetypes.delete(key);
    }
  }
  for (const [name, instance] of [...self.instances]) {
    if (dead.has(instance)) {
      self.instances.delete(name);
    }
  }
  self.ownership.forget(dead);
  return dead;
}

function removeAll<T>(list: T[], gone: ReadonlySet<T>): void {
  for (let i = list.length - 1; i >= 0; i--) {
    if (gone.has(list[i])) {
      list.splice(i, 1);
    }
  }
}

// Builds the top-level scripts of `old` again, each from its chunk: the fresh
// instance for every old one. What held the old one holds the fresh one, and
// what held an instance built under it holds nothing, to find a fresh one the
// next time it looks. Imports and archetypes are in; threads are not started.
function build(
  self: EncounterHostContext,
  old: readonly LuaTable[],
  dead: ReadonlySet<LuaTable>
): Map<LuaTable, LuaTable> {
  const fresh = new Map<LuaTable, LuaTable>();
  const scripts = self.built.filter(({ table }) => old.includes(table));
  for (const script of scripts) {
    const made = instanceBuilding.buildInstance(
      self,
      script.chunk,
      "",
      self.options.childScripts,
      [],
      instanceBuilding.topLevelBundles(self, script.chunk)
    );
    fresh.set(script.table, made.table);
    script.table = made.table;
  }
  for (const phase of self.phases) {
    phase.instance = fresh.get(phase.instance) ?? phase.instance;
  }
  if (self.rootInstance !== undefined) {
    self.rootInstance = fresh.get(self.rootInstance) ?? self.rootInstance;
  }
  repoint(self, fresh, dead);
  for (const script of scripts) {
    instanceBuilding.callImport(self, script.table);
  }
  if (self.options.rowOwners !== undefined) {
    instanceBuilding.instantiateDeclaredArchetypes(self, scripts);
  }
  return fresh;
}

// Every live instance's fields that hold a dead instance: the fresh one in its
// place, else nothing.
function repoint(
  self: EncounterHostContext,
  fresh: ReadonlyMap<LuaTable, LuaTable>,
  dead: ReadonlySet<LuaTable>
): void {
  const fix = (holder: LuaTable, seen: Set<LuaTable>) => {
    for (const [key, value] of [...holder.entries()]) {
      if (!(value instanceof LuaTable) || value instanceof LuaHostObject) {
        continue;
      }
      if (dead.has(value)) {
        holder.set(key, fresh.get(value));
      } else if (!(seen.has(value) || self.ownership.isLive(value))) {
        // an array of instances, which no instance owns
        seen.add(value);
        fix(value, seen);
      }
    }
  };
  for (const instance of [...self.ownership.instances]) {
    fix(instance, new Set());
  }
}

// Puts every row the phase touched back to what it was when the phase
// started: sent again as the before-image, or as untouched. A row a restarted
// encounter owns goes back to how the host started it, touched by the phase or
// not, and the handles that outlive the reset forget what they did to it.
function restoreRows(
  self: EncounterHostContext,
  restarted: ReadonlyMap<string, ItemRef>
): void {
  const cleared: ItemRef[] = [];
  for (const row of self.journal.rows(new Set(restarted.keys()))) {
    const restart = restarted.has(rowKey(row.item));
    // no script has changed it since the host started it
    if (restart && row.current === row.origin) {
      continue;
    }
    const change = restart ? restartedChange(row) : restoredChange(row);
    restoreShadow(
      self,
      row,
      change,
      restart ? NOTHING_HELD : self.journal.shadow
    );
    if (change === undefined) {
      self.journal.noteCleared(row.kind, row.item);
      cleared.push(row.item);
    } else {
      self.journal.noteRestored(change);
      self.options.onItemChange?.(change);
      self.context.onSent?.(change);
      if (restart) {
        self.restartedRows.set(rowKey(row.item), change);
      }
    }
    // What the client said of the row is of a world that is gone.
    self.world.forget(itemKey(row.item.bundle, row.item.typeIndex));
    if (restart && row.kind === "squad") {
      forgetSquadPlacement(
        self.context,
        itemKey(row.item.bundle, row.item.typeIndex)
      );
    }
  }
  for (const bound of self.objects) {
    const key = bound.row && rowKey(bound.row);
    if (key !== undefined && restarted.has(key)) {
      bound.restart(self.restartedRows.get(key));
    }
  }
  restoreFlags(self);
  if (cleared.length > 0) {
    self.options.onItemsCleared?.(cleared);
  }
}

// The change that puts a row back; none for a row left to its encoder's idle.
// A row's counters (a squad's wave, an object's incarnation) only go up: the
// client takes a lower one for a stale write.
function restoredChange({
  before,
  current,
}: JournalledRow): ItemChange | undefined {
  return before === undefined ? untouched(current) : advanced(before, current);
}

// The change that puts a restarted encounter's row back: to the change the
// host started it with, else to untouched. An actor's behaviour starts over
// too, its generation past the one sent.
function restartedChange({
  current,
  origin,
}: JournalledRow): ItemChange | undefined {
  const change =
    origin === undefined ? untouched(current) : advanced(origin, current);
  return change?.kind === "actor" && current.kind === "actor"
    ? withoutBehaviour(change, current.state)
    : change;
}

function withoutBehaviour(
  change: ItemChange & { kind: "actor" },
  current: ActorState
): ItemChange {
  if (current.behaviour === undefined) {
    return change;
  }
  const { behaviour } = change.state;
  return {
    ...change,
    state: {
      ...change.state,
      behaviour: {
        awarenessFlags: behaviour?.awarenessFlags ?? 0,
        awarenessMask: behaviour?.awarenessMask ?? 0,
        channels: behaviour?.channels ?? [],
        incarnation:
          Math.max(behaviour?.incarnation ?? 0, current.behaviour.incarnation) +
          1,
        temperaments: behaviour?.temperaments ?? [],
      },
    },
  };
}

function untouched(current: ItemChange): ItemChange | undefined {
  const { item } = current;
  switch (current.kind) {
    case "squad":
      return {
        item,
        kind: "squad",
        state: { carried: false, wave: current.state.wave + 1 },
      };
    case "actor":
      return {
        item,
        kind: "actor",
        state: {
          placed: false,
          ...(current.state.incarnation === undefined
            ? {}
            : { incarnation: current.state.incarnation }),
        },
      };
    case "object":
      return {
        item,
        kind: "object",
        state: { incarnation: current.state.incarnation + 1, present: false },
      };
    case "objective":
      return {
        item,
        kind: "objective",
        state: { slots: [], unk1: (current.state.unk1 ?? 0) + 1 },
      };
    case "loot":
      return {
        item,
        kind: "loot",
        state: { enabled: false, epoch: current.state.epoch + 1 },
      };
    case "passenger":
      return { item, kind: "passenger", state: { state: 0 } };
    default:
      return;
  }
}

function advanced(before: ItemChange, current: ItemChange): ItemChange {
  const image = { ...before, initial: undefined };
  switch (image.kind) {
    case "squad": {
      const wave = current.kind === "squad" ? current.state.wave : 0;
      return {
        ...image,
        state: { ...image.state, wave: Math.max(image.state.wave, wave) + 1 },
      };
    }
    case "actor": {
      if (!image.state.placed) {
        return image;
      }
      // Placed again: a new actor, not the one that died.
      const was = current.kind === "actor" ? current.state.incarnation : 1;
      return {
        ...image,
        state: {
          ...image.state,
          incarnation: Math.max(image.state.incarnation ?? 1, was ?? 1) + 1,
          kill: undefined,
        },
      };
    }
    case "object":
      return current.kind === "object"
        ? { ...image, state: advancedObject(image.state, current.state) }
        : image;
    case "objective": {
      const was = current.kind === "objective" ? current.state.unk1 : 0;
      return {
        ...image,
        state: {
          ...image.state,
          unk1: Math.max(image.state.unk1 ?? 0, was ?? 0) + 1,
        },
      };
    }
    case "loot": {
      const was = current.kind === "loot" ? current.state.epoch : 0;
      return {
        ...image,
        state: {
          ...image.state,
          epoch: Math.max(image.state.epoch, was) + 1,
        },
      };
    }
    default:
      return image;
  }
}

type ObjectChange = Extract<ItemChange, { kind: "object" }>["state"];

// An object comes back as a new one, and every stamp its components apply on
// is past the ones they were last sent with.
function advancedObject(
  before: ObjectChange,
  current: ObjectChange
): ObjectChange {
  const stamp = (was: number | undefined, now: number | undefined) =>
    Math.max(was ?? 0, now ?? 0) + 1;
  return {
    ...before,
    capturable: before.capturable && {
      ...before.capturable,
      lockStamp: stamp(
        before.capturable.lockStamp,
        current.capturable?.lockStamp
      ),
      resetStamp: stamp(
        before.capturable.resetStamp,
        current.capturable?.resetStamp
      ),
    },
    device: before.device && {
      ...before.device,
      revision: stamp(before.device.revision, current.device?.revision),
    },
    faction: before.faction && {
      ...before.faction,
      stamp: stamp(before.faction.stamp, current.faction?.stamp),
    },
    incarnation: Math.max(before.incarnation, current.incarnation) + 1,
    interactable: before.interactable && {
      ...before.interactable,
      used: before.interactable.used && {
        ...before.interactable.used,
        stamp: stamp(
          before.interactable.used.stamp,
          current.interactable?.used?.stamp
        ),
      },
    },
  };
}

// What the host holds beside a row nothing has touched.
const NOTHING_HELD: PhaseShadow = {
  items: { flags: new Set(), sequences: new Map(), squads: new Map() },
  machines: new Map(),
  objects: new Map(),
};

// What the host keeps beside the rows it sent follows them back to `shadow`: the
// squads' and sequences' item state, and the object and machine state every
// handle on a row shares. A handle a timer's model is held by is stopped.
function restoreShadow(
  self: EncounterHostContext,
  { item, kind }: JournalledRow,
  change: ItemChange | undefined,
  shadow: PhaseShadow
): void {
  const { items, machines, objects } = shadow;
  const key = `${item.bundle}:${item.typeId}:${item.typeIndex}`;
  switch (kind) {
    case "squad":
      if (change?.kind === "squad") {
        self.itemState.setSquad(item, change.state);
      }
      break;
    case "sequence":
      self.itemState.restoreSequence(item, items);
      break;
    case "object": {
      const held = structuredClone(objects.get(key) ?? newObjectState());
      // The counters stay where the change put them, past what the client has.
      if (change?.kind === "object") {
        const { capturable, device, faction, incarnation, interactable } =
          change.state;
        held.incarnation = incarnation;
        if (device) {
          held.deviceRevision = device.revision;
        }
        if (interactable?.used) {
          held.interactableUsedStamp = interactable.used.stamp;
        }
        if (capturable) {
          held.capturableLockStamp = capturable.lockStamp;
          held.capturableResetStamp = capturable.resetStamp;
        }
        if (faction) {
          held.factionStamp = faction.stamp;
        }
      }
      self.context.objectStates.set(key, held);
      break;
    }
    case "machine": {
      const held = machines.get(key);
      if (held === undefined) {
        self.context.machineStates?.delete(key);
      } else {
        self.context.machineStates?.set(key, structuredClone(held));
      }
      break;
    }
    case "timer":
      for (const bound of self.objects) {
        if (
          bound.row?.bundle === item.bundle &&
          bound.row.typeId === item.typeId &&
          bound.row.typeIndex === item.typeIndex &&
          !(change?.kind === "timer" && change.state.running)
        ) {
          bound.sequence.timer = undefined;
        }
      }
      break;
    default:
      break;
  }
}

// The activity flags as they were when the phase started.
function restoreFlags(self: EncounterHostContext): void {
  const was = self.journal.shadow.items.flags;
  for (const flag of self.itemState.snapshot().flags) {
    if (!was.has(flag)) {
      self.writer.activityFlag(flag, false);
    }
  }
  for (const flag of was) {
    self.writer.activityFlag(flag, true);
  }
}
