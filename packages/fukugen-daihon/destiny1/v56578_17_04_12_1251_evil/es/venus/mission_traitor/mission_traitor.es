# es\venus\mission_traitor\mission_traitor.es
#
# The Shattered Coast's tower on Venus (House of Wolves): from the warp
# ruins down into the lower tower, where the Fallen vanguard holds the
# grav lift, up the lift, over the chasm on the timed blocks, through the
# Fallen at the top to the boss, an ultra captain the Awoken take prisoner
# once he is beaten down. The root puts the lifetime in pregame and arms
# the route's lines and the music once the players are ready; the phases
# are the missions beside it, run in order. Mission file names are ours.
#
#   mission_traitor_mission1.esp  get into the lower tower
#   mission_traitor_mission2.esp  kill the vanguard, take the grav lift
#   mission_traitor_mission3.esp  climb the tower, cross the chasm
#   mission_traitor_mission4.esp  find the boss
#   mission_traitor_mission5.esp  the boss and his capture
#   mission_traitor_mission6.esp  the outro
#
# Each area's encounter is a script of its own beside this one:
# unknown_253d3c66 (the lower tower), unknown_4c527387 (the chasm's timed
# blocks) and unknown_8a595800 (the tower's top). This bundle holds the
# Ghost's lines and the music, which the missions play. Authored from one
# retail 2.3.1 capture for the PS4 1.33 build (tiger-packet-analysis
# docs/missions/mission_traitor.md): every wait is that run's, unconfirmed.

@activity_bundle("mission_traitor")
# The player spawns in the public warp ruins (224, bubble 28 state 0), where
# no phase plays, at the GAS's spawn 2EA8FB98; the lifetime runs the first
# two phases in the lower tower (12) and the rest at the tower's top (24).
# The region transitions are the ones the GAS named once the client had
# been there: the warp ruins, the Vex complex (32), the lower tower (96)
# and the tower (192).
@activity("mission_traitor")
@start_slice("warp_ruins")
@phase("phase_lower_tower_main", "lower_tower")
@phase("phase_lower_tower_elevator", "lower_tower")
@phase("phase_tower_cross", "tower")
@phase("phase_tower_find", "tower")
@phase("phase_tower_kill", "tower")
@phase("phase_tower_outro", "tower")
@spawn_transition(0x2EA8FB98)
@region_spawn_transition(224, 0x2EA8FB98)
@region_spawn_transition(32, 0xEE9A1F90)
@region_spawn_transition(96, 0x6614A7D5)
@region_spawn_transition(192, 0x1C0920D0)

mission_traitor_mission1 phase_lower_tower_main
mission_traitor_mission2 phase_lower_tower_elevator
mission_traitor_mission3 phase_tower_cross
mission_traitor_mission4 phase_tower_find
mission_traitor_mission5 phase_tower_kill
mission_traitor_mission6 phase_tower_outro
sequence landing_dialog
sequence ruins_exit_dialog
sequence citadel_exit_dialog
sequence grav_view_dialog
sequence grav_enter_dialog
sequence jump_enter_dialog
sequence jump_mid_dialog
sequence jump_end_dialog
sequence clouds_dialog
sequence skolas_spawn_dialog
sequence tower_done_dialog
sequence mission_done_dialog
sequence music_intro
sequence music_cue1
sequence music_outro
# set once a player has climbed into the tower: a wipe after that puts the
# players back at the top, and mission 3 does not send them up again
bool tower_reached = false

@startup()
script ss_mission_traitor():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)

@startup()
# the route's lines play off their own volumes once armed
script sc_intro():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    landing_dialog.start()
    ruins_exit_dialog.start()
    citadel_exit_dialog.start()
    music_intro.start()
    music_cue1.start()
    music_cue1.set_switch_mask(1)
