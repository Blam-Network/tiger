// TU0's row type ids (80800533 bundles). Types from 40 up are the alpha's +1
// (new types in 36..40 and 62); TU0-only types with no entry: 18, 26, 36,
// 37, 38, 39, 62. True names unknown.
import type { ActivityBundleItemTypes } from "../../../../host/tag_types.ts";

export const ActivityBundleItemType = {
  Squad: 1,
  Actor: 2,
  Objective: 3,
  Object: 4,
  Sequence: 5,
  Cinematic: 6,
  Fireteam: 9,
  Player: 12,
  Faction: 13,
  TeamPicker: 14,
  Scoreboard: 15,
  Lifetime: 16,
  Timer: 17,
  // Unverified: TU0 has no row of type 19.
  Health: 19,
  HopOn: 24,
  SafeZone: 27,
  PlayerMonitor: 28,
  PlayerTrigger: 29,
  // `tg_*` rows (TU0 only; true name unknown): a 2-bit state beside the
  // `sv_*` TriggerVolume of the same name.
  TriggerGroup: 30,
  PlayerObjective: 32,
  ObjectFilter: 33,
  HardWipeGlobals: 34,
  Loot: 35,
  // AI-managed performance rows (auth 80800556); TU0 only, true name unknown.
  Machine: 40,
  // 41..47 and 53..60 are alpha id + 1, joined by name hash.
  FiringArea: 41,
  FiringAreaSet: 42,
  SquadGroup: 43,
  NavPoint: 44,
  // Name pattern only.
  ActionPoint: 45,
  LandingPoint: 46,
  SpawnPoint: 47,
  // Unverified; type 62 `si_*` is the other candidate.
  SpawnInfluencer: 48,
  // Unverified: TU0 has no rows of type 54.
  NewMission: 54,
  Location: 55,
  ControlPoint: 56,
  TriggerVolume: 58,
  Encounter: 59,
  Phase: 60,
  EncounterBinding: 61,
} as const satisfies ActivityBundleItemTypes;

export type ActivityBundleItemType = number;
