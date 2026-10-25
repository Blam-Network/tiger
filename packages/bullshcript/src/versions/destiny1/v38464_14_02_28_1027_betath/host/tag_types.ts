// The PS4 pre-alpha's row type ids (the u8 of each 808007AE bundle row).
// They are TU0's: each type's rows carry the names the Alpha Trial's and the
// 360 release packages' rows of that type do, and each type with a sensor
// host carries the definition class gibbon's build names for it (1 squad
// 8080057E, 2 actor 808008DD, 3 objective 80800667, 4 object 808007B9, 5
// sequence 80802A7A, 29 player trigger 8080033C, 32 player objective
// 80802622, 56 control point 8080072A). The build numbers its classes its own
// way, so no class matches another build's. It has no rows of types 19, 27,
// 40 or 54, so no Machine. Rows no native reads yet: objective_task (36),
// new_user_experience (39) and si_test (62).
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
  // m01_x10, seq_*.
  Sequence: 5,
  // cine_*_landing, pvp_controller's landing cinematics.
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
  // pm_*, _player_monitor.
  PlayerMonitor: 28,
  // pt_*.
  PlayerTrigger: 29,
  // t_kill_volume_tripwire01..03, t_pit_kill_volume.
  TriggerGroup: 30,
  // po_*, _player_objective.
  PlayerObjective: 32,
  // of_*, _object_filter.
  ObjectFilter: 33,
  HardWipeGlobals: 34,
  // _loot[].
  Loot: 35,
  // skiff_passenger, dropship_passenger.
  Passenger: 37,
  // fa_*.
  FiringArea: 41,
  // __influencer_firing_area_set_N.
  FiringAreaSet: 42,
  // sqg_*.
  SquadGroup: 43,
  // ap_*, ._nav_point.
  NavPoint: 44,
  // ps_*, ap_guardian_*.
  ActionPoint: 45,
  // landingpoint_N.
  LandingPoint: 46,
  // spawnpoint_N.
  SpawnPoint: 47,
  // team_1_front, spawninfluencer; type 62 `si_test` is the other candidate,
  // as in TU0.
  SpawnInfluencer: 48,
  // No rows; TU0's id.
  NewMission: 54,
  // graveyard, rocketyard, delta_n.
  Location: 55,
  // cps_*, cp_*.
  ControlPoint: 56,
  // tv_*, kill_volume_tripwire01.
  TriggerVolume: 58,
  Encounter: 59,
  // phase00..phase07.
  Phase: 60,
  // ._squad, ._object.
  EncounterBinding: 61,
} as const satisfies ActivityBundleItemTypes;

export type ActivityBundleItemType = number;
