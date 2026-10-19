// 01.29's row type ids (the i8 of each group record element). The slotted
// vocabulary is named in the 01.29 group records themselves and matches TU0's
// ids one for one; 01.29 also has hud (8), music (11), navigation (18), device
// (22) and objective_task (36) rows, which no native reads yet. The 41..61
// band is TU0's, checked against 01.29 element names where they exist (44
// `._nav_point`, 58 `view_volume`, 59 controller, 60 phases).
import type { ActivityBundleItemTypes } from "../../../../host/tags/tag_types.ts";

export const ActivityBundleItemType = {
  Squad: 1,
  // squad_member.
  Actor: 2,
  // encounter_objective.
  Objective: 3,
  // placed_object_spawner.
  Object: 4,
  Sequence: 5,
  Cinematic: 6,
  Fireteam: 9,
  // players.
  Player: 12,
  // team1..team6.
  Faction: 13,
  TeamPicker: 14,
  Scoreboard: 15,
  Lifetime: 16,
  // lifetime_timer.
  Timer: 17,
  // Unverified, as in TU0.
  Health: 19,
  // hop_on_effect.
  HopOn: 24,
  SafeZone: 27,
  PlayerMonitor: 28,
  PlayerTrigger: 29,
  // a seat an actor rides (phogoth_chains_seat)
  Passenger: 37,
  // toggle.
  TriggerGroup: 30,
  PlayerObjective: 32,
  // filter.
  ObjectFilter: 33,
  HardWipeGlobals: 34,
  Loot: 35,
  // ai_performance.
  Machine: 40,
  FiringArea: 41,
  FiringAreaSet: 42,
  SquadGroup: 43,
  NavPoint: 44,
  ActionPoint: 45,
  LandingPoint: 46,
  SpawnPoint: 47,
  SpawnInfluencer: 48,
  NewMission: 54,
  Location: 55,
  ControlPoint: 56,
  TriggerVolume: 58,
  // controller.
  Encounter: 59,
  // phases.
  Phase: 60,
  EncounterBinding: 61,
} as const satisfies ActivityBundleItemTypes;

export type ActivityBundleItemType = number;
