// The PS4 Alpha Trial's row type ids (the u8 of each 8080076E bundle row).
// They are TU0's: each type's rows carry the names the 360 release packages'
// rows of that type do, and each type with a sensor host carries the same
// definition class and auth schema (30 808006AE/8080040E, 40
// 80800386/80800556). The alpha has no rows of types 19, 27 or 54. Rows no
// native reads yet: objective_task (36) and new_user_experience (39).
import type { ActivityBundleItemTypes } from "../../../../host/tags/tag_types.ts";

export const ActivityBundleItemType = {
  // sq_*.
  Squad: 1,
  // <squad>__<cell>.
  Actor: 2,
  // obj_*.
  Objective: 3,
  // o_*.
  Object: 4,
  // seq_*.
  Sequence: 5,
  Cinematic: 6,
  // host.
  Fireteam: 9,
  // players[].
  Player: 12,
  // team1..team6.
  Faction: 13,
  TeamPicker: 14,
  Scoreboard: 15,
  Lifetime: 16,
  // lifetime_timer, _respawn_timer.
  Timer: 17,
  // No rows; TU0's id.
  Health: 19,
  // ho_*.
  HopOn: 24,
  // No rows; TU0's id.
  SafeZone: 27,
  // pm_*.
  PlayerMonitor: 28,
  // pt_*.
  PlayerTrigger: 29,
  // One row, t_pit_kill_volume.
  TriggerGroup: 30,
  PlayerObjective: 32,
  // _object_filter.
  ObjectFilter: 33,
  HardWipeGlobals: 34,
  // _loot[].
  Loot: 35,
  // dropship_passenger, skiff_passenger.
  Passenger: 37,
  // npc_*_sitter and the like: AI performance rows.
  Machine: 40,
  FiringArea: 41,
  // __influencer_firing_area_set_N.
  FiringAreaSet: 42,
  // sg_*.
  SquadGroup: 43,
  // ._nav_point.
  NavPoint: 44,
  ActionPoint: 45,
  LandingPoint: 46,
  SpawnPoint: 47,
  // negative_influence; type 62 `si_*` is the other candidate, as in TU0.
  SpawnInfluencer: 48,
  // No rows; TU0's id.
  NewMission: 54,
  // dome_a, hangar.
  Location: 55,
  // cps_*.
  ControlPoint: 56,
  // tv_*, killvolume.
  TriggerVolume: 58,
  Encounter: 59,
  // phaseN.
  Phase: 60,
  // ._squad, ._object.
  EncounterBinding: 61,
} as const satisfies ActivityBundleItemTypes;

export type ActivityBundleItemType = number;
