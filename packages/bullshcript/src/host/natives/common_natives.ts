// Verbs that mean different things by row type (activate, reset, clear, remove,
// ...) plus the binding verbs every handle answers. They sit above the domain
// modules and pick the domain's function for the row.

import { LuaHostObject } from "../../hks/env/host_env.ts";
import { LuaTable, type LuaValue, toNumber } from "../../hks/vm/values.ts";
import { type BoundInstance, boundObjectOf } from "../bound/bound_object.ts";
import { PlayerObjectiveStage } from "../state/items.ts";
import { itemKey } from "../tags/item_key.ts";
import * as incidentNatives from "./incident_natives.ts";
import type { NativeRegistry } from "./native_registry.ts";
import {
  describe,
  OBJECTIVE_SLOT,
  rowKind,
  show,
  showArgs,
} from "./native_support.ts";
import * as objectNatives from "./object_natives.ts";
import * as objectiveNatives from "./objective_natives.ts";
import * as sequenceNatives from "./sequence_natives.ts";
import * as squadNatives from "./squad_natives.ts";

export function register(registry: NativeRegistry<BoundInstance>): void {
  registry.verb("import_only_bind", (self, args) => bind(self, args[0]));
  registry.verb("import_only_bind_object", (self, args) =>
    bindObject(self, args[0])
  );
  // The unbound host object is a LuaTable, so enum_of() and `t[i]` read these entries.
  registry.verb("append", (self, args) => append(self, args[0]));
  registry.verb("get_count", (self) => count(self));
  registry.verb("is_active", (self) => isActive(self));
  registry.verb("is_complete", (self, _args, method) =>
    self.unknownPredicate(method)
  );
  // activate() shows a PlayerObjective too; which state it writes is unknown.
  registry.verb("activate", (self, args, method) => {
    if (self.row?.typeId === self.types.TriggerGroup) {
      return objectNatives.setTriggerGroup(self, true);
    }
    if (self.row?.typeId === self.types.PlayerObjective) {
      return objectiveNatives.playerObjectiveSet(
        self,
        PlayerObjectiveStage.Incoming,
        method
      );
    }
    if (objectNatives.activityFlagHash(self) !== undefined) {
      return objectNatives.setActivityFlag(self, true);
    }
    return sequenceNatives.timerStart(self, toNumber(args[0]));
  });
  registry.verb("deactivate", (self) => {
    if (self.row?.typeId === self.types.TriggerGroup) {
      return objectNatives.setTriggerGroup(self, false);
    }
    // Encounter rows are client-side only.
    self.writer.note(`${self.path}:deactivate() (no-op)`);
    return true;
  });
  // reset() is a timer verb on a Timer row and the arm verb on a PlayerTrigger.
  registry.verb("reset", (self, args, method) => {
    // The only capturable stamp that clears the owner.
    if (self.row?.typeId === self.types.Object) {
      return objectNatives.capturableReset(self);
    }
    if (self.row?.typeId === self.types.Objective) {
      return objectiveNatives.objectiveReset(self);
    }
    if (self.row?.typeId === self.types.PlayerTrigger) {
      return incidentNatives.armTrigger(self, method);
    }
    // A fresh listener's first reset() falls through harmlessly.
    if (self.incident.watch) {
      self.incident.watch.count = 0;
      // Re-baseline a scoped listener's count too.
      if (self.incident.watch.squads) {
        self.incident.watch.squadBaseline = incidentNatives.sumSquadDeaths(
          self,
          self.incident.watch.squads
        );
      }
      self.writer.note(
        `${self.path}:reset() (incident listener count cleared)`
      );
      return true;
    }
    return sequenceNatives.timerReset(self, toNumber(args[0]));
  });
  registry.verb("remove", (self, args) => {
    // On an ObjectFilter, takes an object out of the filter.
    if (self.row?.typeId === self.types.ObjectFilter) {
      return objectNatives.removeFilterRow(self, args[0]);
    }
    return squadNatives.removeBodies(self);
  });
  // A PlayerObjective stops showing its line; a SquadGroup drops its children.
  registry.verb("clear", (self) => {
    if (self.row?.typeId === self.types.PlayerObjective) {
      return objectiveNatives.playerObjectiveClear(self);
    }
    if (objectNatives.activityFlagHash(self) !== undefined) {
      return objectNatives.setActivityFlag(self, false);
    }
    if (self.row?.typeId === self.types.Object) {
      return objectNatives.clearInteractable(self);
    }
    if (self.row?.typeId === self.types.ObjectFilter) {
      return objectNatives.clearFilter(self);
    }
    self.children.length = 0;
    self.writer.note(`${self.path}:clear()`);
    return true;
  });
  registry.verb("get_active", (self, _args, method) => {
    if (self.row?.typeId === self.types.Object) {
      return objectNatives.usedSinceClear(self);
    }
    return self.unknownPredicate(method);
  });
  registry.verb("get_team_index", (self, _args, method) => {
    // Capturable's reads the zone's owner; ObjectFaction's this row's faction.
    if (self.row?.typeId === self.types.Object) {
      return objectNatives.getTeamIndex(self);
    }
    self.writer.note(`${self.path}:${method}() (${rowKind(self.row)})`);
    return -1;
  });
  // city_tower's own verbs, with no established wire effect:
  registry.verb("insertion_point", (self) => {
    // "insertion-point-index" (0x820E199C) is a peer replication message field
    // (codec sub_8309D020), not an activity item: nothing to send.
    self.writer.note(
      `${self.path}:insertion_point() (peer replication only, no item)`
    );
    return true;
  });
  registry.verb("display", (self, args) => {
    // A NewMission row gets no state slot in this build.
    self.writer.note(
      `${self.path}:display(${showArgs(args)}) (NewMission items carry no state, no-op)`
    );
    return true;
  });
  // self.host is a Fireteam (8080127A); true once a player has joined.
  registry.verb("t30_hack_bind_host", (self) => {
    const bound = self.context.players().length > 0;
    self.writer.notePoll(
      `${self.path}:t30_hack_bind_host`,
      `${self.path}:t30_hack_bind_host() -> ${bound}`
    );
    return bound;
  });
  registry.events.count = count;
}

function copyLuaTable(source: LuaTable): LuaTable {
  const copy = new LuaTable();
  for (const [key, value] of source.entries()) {
    copy.set(key, value);
  }
  return copy;
}

// Compiled structs are value types, so a table argument is copied.
function append(self: BoundInstance, value: LuaValue): boolean {
  const copied = value instanceof LuaTable ? copyLuaTable(value) : value;
  self.object.set(self.appendIndex, copied);
  self.appendIndex += 1;
  self.writer.note(
    `${self.path}:append(${show(value)}) -> [${self.appendIndex - 1}]`
  );
  return true;
}

function bind(self: BoundInstance, value: LuaValue): boolean {
  if (typeof value === "string") {
    self.handle = value;
    self.writer.note(`${self.path}:import_only_bind("${value}")`);
    return true;
  }
  if (value instanceof LuaHostObject) {
    const target = boundObjectOf(value);
    // A slot with no row adopts the argument's.
    if (self.row === undefined) {
      self.row = target?.row;
    } else {
      self.watched = target?.row;
    }
    self.writer.note(
      `${self.path}:import_only_bind(${value.hostName})` +
        (self.row ? ` -> ${describe(self.row)}` : "")
    );
    return true;
  }
  self.writer.note(
    `${self.path}:import_only_bind(${show(value)}) (unknown argument)`
  );
  return true;
}

function bindObject(self: BoundInstance, value: LuaValue): boolean {
  if (typeof value !== "string") {
    self.writer.note(
      `${self.path}:import_only_bind_object(${show(value)}) (unknown argument)`
    );
    return true;
  }
  const row = self.rows.resolveByIdentifier(value);
  self.row ??= row;
  self.writer.note(
    `${self.path}:import_only_bind_object("${value}")` +
      (row ? ` -> ${describe(row)}` : " (no row named that identifier)")
  );
  return true;
}

// A monitored volume's players, the Objective's slot counter, or a listener's tally.
function count(self: BoundInstance): number {
  if (self.incident.watch?.squads) {
    const baseline = self.incident.watch.squadBaseline ?? 0;
    return Math.max(
      0,
      incidentNatives.sumSquadDeaths(self, self.incident.watch.squads) -
        baseline
    );
  }
  if (self.incident.watch) {
    return self.incident.watch.count;
  }
  if (self.row?.typeId === self.types.Objective) {
    return (
      self.context.reports.objectiveCount(
        itemKey(self.row.bundle, self.row.typeIndex),
        OBJECTIVE_SLOT
      ) ?? 0
    );
  }
  return objectNatives.playerCount(self);
}

function isActive(self: BoundInstance): boolean {
  // An Object bound by identifier (an interactable_placement's _object) is
  // still the object: active once used.
  if (self.row?.typeId === self.types.Object) {
    const used = objectNatives.usedSinceClear(self);
    self.writer.notePoll(
      `${self.path}:is_active`,
      `${self.path}:is_active() -> ${used} (interaction)`
    );
    return used;
  }
  if (self.handle === undefined) {
    if (self.row?.typeId === self.types.PlayerObjective) {
      return self.objective.stage === PlayerObjectiveStage.Active;
    }
    return self.row !== undefined;
  }
  // activate()/clear() write the player's flag list, so is_active() reads it.
  const hash = objectNatives.activityFlagHash(self);
  const flagged =
    hash !== undefined && self.context.state.hasActivityFlag(hash);
  const active =
    flagged || (self.context.namedHandles.get(self.handle) ?? false);
  self.writer.notePoll(
    `${self.path}:is_active`,
    `${self.path}:is_active() -> ${active} (handle "${self.handle}")`
  );
  return active;
}
