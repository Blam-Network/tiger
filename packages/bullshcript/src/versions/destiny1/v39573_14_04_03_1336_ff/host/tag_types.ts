// The PS4 ff build's row type ids (the u8 of each 8080076E bundle row).
// They are TU0's: each type's rows carry the names the Alpha Trial's and the
// 360 release packages' rows of that type do, and each type with a sensor
// host carries the Alpha Trial's definition class (1 squad 808005A7, 2 actor
// 80800904, 3 objective 80800688, 4 object 808007DD, 5 sequence 808028DA,
// 30 trigger group 808006AE, 40 machine 80800386, 56 control point
// 80800748). It has no rows of types 13, 14, 19, 27, 46, 47, 48 or 54 (no
// PvP maps ship). Rows no native reads yet: objective_task (36),
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
  // _incoming_sequence, _completion_sequence.
  Sequence: 5,
  // cine_hanger_a_landing, cine_hanger_b_landing.
  Cinematic: 6,
  // host.
  Fireteam: 9,
  // players[].
  Player: 12,
  // No rows; TU0's id.
  Faction: 13,
  // No rows; TU0's id.
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
  // pm_*, .pm_bubble.
  PlayerMonitor: 28,
  // pt_*, ._player_trigger.
  PlayerTrigger: 29,
  // t_kill_volume_tripwire01..03, t_pit_kill_volume.
  TriggerGroup: 30,
  // po_*, ._player_objective.
  PlayerObjective: 32,
  // of_*, ._object_filter.
  ObjectFilter: 33,
  HardWipeGlobals: 34,
  // _loot[].
  Loot: 35,
  // skiff_passenger, dropship_passenger.
  Passenger: 37,
  // vendor_performance_sensor_*.
  Machine: 40,
  // fa_*.
  FiringArea: 41,
  // __influencer_firing_area_set_N.
  FiringAreaSet: 42,
  // sqg_*.
  SquadGroup: 43,
  // ap_*, ._nav_point.
  NavPoint: 44,
  // ps_*, ap_*_guardian_*.
  ActionPoint: 45,
  // No rows; TU0's id.
  LandingPoint: 46,
  // No rows; TU0's id.
  SpawnPoint: 47,
  // No rows; TU0's id. Type 62 `si_test` is the other candidate, as in TU0.
  SpawnInfluencer: 48,
  // No rows; TU0's id.
  NewMission: 54,
  // blast, dome_c, graveyard.
  Location: 55,
  // cp_*, dropship_entry_path.
  ControlPoint: 56,
  // tv_*, ._trigger_volume.
  TriggerVolume: 58,
  Encounter: 59,
  // phase00..phase07.
  Phase: 60,
  // ._squad, ._object.
  EncounterBinding: 61,
} as const satisfies ActivityBundleItemTypes;

export type ActivityBundleItemType = number;
