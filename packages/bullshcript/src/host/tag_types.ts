// The tag data the runtime reads, as plain structures (80800533 bundles).
// A build supplies its row type ids by name; TriggerGroup and Machine rows
// exist in TU0 only.

import type { CommandScriptAtom } from "./items.ts";
export interface ActivityBundleItemTypes {
  readonly ActionPoint: number;
  readonly Actor: number;
  readonly Cinematic: number;
  readonly ControlPoint: number;
  readonly Encounter: number;
  readonly EncounterBinding: number;
  readonly Faction: number;
  readonly Fireteam: number;
  readonly FiringArea: number;
  readonly FiringAreaSet: number;
  readonly HardWipeGlobals: number;
  readonly Health: number;
  readonly HopOn: number;
  readonly LandingPoint: number;
  readonly Lifetime: number;
  readonly Location: number;
  readonly Loot: number;
  readonly Machine?: number;
  readonly NavPoint: number;
  readonly NewMission: number;
  readonly Object: number;
  readonly ObjectFilter: number;
  readonly Objective: number;
  readonly Phase: number;
  readonly Player: number;
  readonly PlayerMonitor: number;
  readonly PlayerObjective: number;
  readonly PlayerTrigger: number;
  readonly SafeZone: number;
  readonly Scoreboard: number;
  readonly Sequence: number;
  readonly SpawnInfluencer: number;
  readonly SpawnPoint: number;
  readonly Squad: number;
  readonly SquadGroup: number;
  readonly TeamPicker: number;
  readonly Timer: number;
  readonly TriggerGroup?: number;
  readonly TriggerVolume: number;
}

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

// One node of the 808015F0 tree (0x88 B each); index 0 is the root.
export interface ObjectiveTask {
  // -1 = uncapped.
  capacity: number;
  // A bool field's name hash on the owning script; the empty hash is always true.
  condition: number;
  // Unset admits any squad.
  filter?: { bundle: number; typeId: number; typeIndex: number };
  // -1 for none; children are in priority order.
  firstChild: number;
  // -1 = no bucket.
  influencer: number;
  name: number;
  nextSibling: number;
  parent: number;
  priority: number;
}

export interface ActivityBundleRow {
  cells?: readonly number[];
  childScript?: string;
  importIdent?: number;
  memberCount?: number;
  name?: string;
  nameHash: number;
  objective?: { bundle: number; typeIndex: number };
  // Object rows only: nav_point_activate's position when the item is the waypoint.
  objectPosition?: WorldPosition;
  sequenceDurationSeconds?: number;
  // has_sequence (+0x3D).
  sequenceHasBlueprint?: boolean;
  spawnPoints?: readonly WorldPosition[];
  // Objective rows only; TU0 keeps a flat list taken by set_task(name).
  tasks?: readonly ObjectiveTask[];
  typeId: number;
  typeIndex: number;
}

export interface ActivityBundleTag {
  bundle: number;
  rows: readonly ActivityBundleRow[];
  tag: number;
}

export interface ControlPointCommandScript {
  atoms: readonly CommandScriptAtom[];
  bundle: number;
  typeIndex: number;
}

export interface NavPointPosition {
  bundle: number;
  sliceSet?: number;
  typeIndex: number;
  x: number;
  y: number;
  z: number;
}
