// Objective-task assignment: assignInfluencers and friends - the AI influencer
// walk over an Objective's task tree (808015F0), split out of
// encounter_host.ts.

import { isTruthy } from "../../hks/vm/values.ts";
import type {
  EncounterHostContext,
  TaskGate,
} from "../activity/host_context.ts";
import type { BoundRow } from "../bound/bindings.ts";
import { squadRosterSize } from "../bound/bindings.ts";
import * as instanceBuilding from "../build/instance_building.ts";
import { itemKey } from "../tags/item_key.ts";
import { FNV1_EMPTY } from "../tags/name_hash.ts";
import type { ObjectiveTask } from "../tags/tag_types.ts";

// An Objective as the walk takes it: its bundle (whose script owns the
// conditions) and the scripts' @task gates, by task name hash.
interface WalkedObjective {
  bundle: number;
  gates: ReadonlyMap<number, TaskGate> | undefined;
}

// A task's condition (the scripts' @task condition): the empty hash is always
// true; otherwise the live bool field on the owning instance, defaulting true
// before it has written.
export function conditionTrue(
  self: EncounterHostContext,
  hash: number,
  objectiveBundle?: number
): boolean {
  if (hash === FNV1_EMPTY) {
    return true;
  }
  const instance =
    objectiveBundle === undefined
      ? undefined
      : instanceBuilding.instanceForBundle(self, objectiveBundle);
  let registry = instance
    ? self.instanceScalarFieldValues.get(instance)
    : undefined;
  if (!registry) {
    if (objectiveBundle !== undefined) {
      self.writer.notePoll(
        `objective-condition-fallback:${objectiveBundle}`,
        `bundle ${objectiveBundle.toString(16)}: no owning script ` +
          "instance resolved for its Objective conditions, " +
          "falling back to the cross-activity registry"
      );
    }
    registry = self.scalarFieldValues;
  }
  const value = registry.get(hash);
  return value === undefined ? true : isTruthy(value);
}

function rebuildSquadGroupMembership(self: EncounterHostContext): void {
  const membership = new Map<string, Set<string>>();
  for (const object of self.objects) {
    const row = object.row;
    if (row?.typeId !== self.types.SquadGroup) {
      continue;
    }
    const groupKey = itemKey(row.bundle, row.typeIndex);
    for (const squadKey of instanceBuilding.squadScopeOf(self, row) ?? []) {
      let groups = membership.get(squadKey);
      if (!groups) {
        groups = new Set();
        membership.set(squadKey, groups);
      }
      groups.add(groupKey);
    }
  }
  self.squadGroupMembership = membership;
}

// Every Squad row grouped by its Objective (the scripts' @objective), built
// once per assignInfluencers pass.
function squadsByObjective(
  self: EncounterHostContext
): Map<string, BoundRow[]> {
  const byObjective = new Map<string, BoundRow[]>();
  for (const tag of self.options.bundles) {
    for (const row of tag.rows) {
      const objective =
        row.typeId === self.types.Squad
          ? self.squadObjectives.get(itemKey(tag.bundle, row.typeIndex))
          : undefined;
      if (!objective) {
        continue;
      }
      const key = itemKey(objective.bundle, objective.typeIndex);
      const squad: BoundRow = {
        bundle: tag.bundle,
        name: row.name ?? `squad #${row.typeIndex}`,
        typeId: self.types.Squad,
        typeIndex: row.typeIndex,
      };
      const squads = byObjective.get(key);
      if (squads) {
        squads.push(squad);
      } else {
        byObjective.set(key, [squad]);
      }
    }
  }
  return byObjective;
}

// A task's filter (the scripts' @task squad): unset, a Squad row, or a
// SquadGroup (live membership).
function taskFilterMatches(
  self: EncounterHostContext,
  gate: TaskGate | undefined,
  squad: BoundRow
): boolean {
  const filter = gate?.filter;
  if (!filter) {
    return true;
  }
  if (filter.typeId === self.types.Squad) {
    return (
      filter.bundle === squad.bundle && filter.typeIndex === squad.typeIndex
    );
  }
  if (filter.typeId === self.types.SquadGroup) {
    const squadKey = itemKey(squad.bundle, squad.typeIndex);
    const groupKey = itemKey(filter.bundle, filter.typeIndex);
    return self.squadGroupMembership.get(squadKey)?.has(groupKey) ?? false;
  }
  return false;
}

// Children (+0x34 first, +0x38 next) in ascending +0x30 priority, sorted
// defensively.
function taskChildren(
  _self: EncounterHostContext,
  tasks: readonly ObjectiveTask[],
  nodeIndex: number
): number[] {
  const children: number[] = [];
  let child = tasks[nodeIndex]?.firstChild ?? -1;
  while (child >= 0 && child < tasks.length) {
    children.push(child);
    child = tasks[child].nextSibling;
  }
  return children
    .map((index, order) => ({ index, order }))
    .sort(
      (a, b) =>
        tasks[a.index].priority - tasks[b.index].priority || a.order - b.order
    )
    .map((entry) => entry.index);
}

// Filter, condition (a parent's gates its subtree) and capacity. Exhaustion
// is not checked: the threshold table has not been located.
function admitsTask(
  self: EncounterHostContext,
  tasks: readonly ObjectiveTask[],
  index: number,
  squad: BoundRow,
  bodies: number,
  used: ReadonlyMap<number, number>,
  objective: WalkedObjective
): boolean {
  const task = tasks[index];
  const gate = objective.gates?.get(task.name);
  if (!taskFilterMatches(self, gate, squad)) {
    return false;
  }
  if (!conditionTrue(self, gate?.condition ?? FNV1_EMPTY, objective.bundle)) {
    return false;
  }
  if (task.capacity >= 0 && (used.get(index) ?? 0) + bodies > task.capacity) {
    return false;
  }
  return true;
}

// The walk, modelled on Halo 3's objective system: descend into the first
// admitting child, abandon an empty subtree, else rest on the node's influencer.
function walkObjectiveTask(
  self: EncounterHostContext,
  tasks: readonly ObjectiveTask[],
  nodeIndex: number,
  squad: BoundRow,
  bodies: number,
  used: Map<number, number>,
  objective: WalkedObjective
): number[] | undefined {
  for (const childIndex of taskChildren(self, tasks, nodeIndex)) {
    if (!admitsTask(self, tasks, childIndex, squad, bodies, used, objective)) {
      continue;
    }
    const rest = walkObjectiveTask(
      self,
      tasks,
      childIndex,
      squad,
      bodies,
      used,
      objective
    );
    if (rest !== undefined) {
      return [childIndex, ...rest];
    }
  }
  return tasks[nodeIndex].influencer >= 0 ? [] : undefined;
}

// Pushed only when the walk moved the squad.
function setSquadInfluencer(
  self: EncounterHostContext,
  squad: BoundRow,
  influencer: number
): void {
  const key = itemKey(squad.bundle, squad.typeIndex);
  const record = self.world.record(key);
  if (record.influencer === influencer) {
    return;
  }
  record.influencer = influencer;
  self.writer.squad(
    {
      bundle: squad.bundle,
      typeId: self.types.Squad,
      typeIndex: squad.typeIndex,
    },
    { influencer }
  );
  self.writer.note(`${squad.name} influencer -> ${influencer}`);
}

// Table order, with capacity committed per squad as decided.
function assignObjectiveInfluencers(
  self: EncounterHostContext,
  squads: readonly BoundRow[],
  tasks: readonly ObjectiveTask[],
  objective: WalkedObjective
): void {
  const used = new Map<number, number>();
  for (const squad of squads) {
    const bodies = squadRosterSize(
      self.types,
      self.options.bundles,
      squad,
      self.memberCounts.get(itemKey(squad.bundle, squad.typeIndex))
    );
    const path = walkObjectiveTask(
      self,
      tasks,
      0,
      squad,
      bodies,
      used,
      objective
    );
    for (const index of path ?? []) {
      used.set(index, (used.get(index) ?? 0) + bodies);
    }
    const restIndex = path?.at(-1);
    setSquadInfluencer(
      self,
      squad,
      restIndex === undefined ? -1 : tasks[restIndex].influencer
    );
  }
}

// Re-run every tick: every input lands within the tick before it runs.
export function assignInfluencers(self: EncounterHostContext): void {
  rebuildSquadGroupMembership(self);
  const byObjective = squadsByObjective(self);
  for (const tag of self.options.bundles) {
    for (const row of tag.rows) {
      if (row.typeId !== self.types.Objective || !row.tasks?.length) {
        continue;
      }
      const squads = byObjective.get(itemKey(tag.bundle, row.typeIndex));
      if (squads) {
        assignObjectiveInfluencers(self, squads, row.tasks, {
          bundle: tag.bundle,
          gates: self.taskGates.get(itemKey(tag.bundle, row.typeIndex)),
        });
      }
    }
  }
}
