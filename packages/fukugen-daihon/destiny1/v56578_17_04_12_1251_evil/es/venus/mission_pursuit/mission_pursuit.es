# es\venus\mission_pursuit\mission_pursuit.es
#
# On Skolas' trail on Venus (House of Wolves): from the Fallen's baby dock,
# where a spider tank holds the pool, over the dock, where Skolas shows
# himself and flees, into the Thieves' Den, where the Fallen hold the pit
# against the players. The root puts the lifetime in pregame; the phases are
# the missions beside it, run in order. Mission file names are ours.
#
#   mission_pursuit_mission1.esp  the baby dock: the pike, the pool, the tank
#   mission_pursuit_mission2.esp  the dock: Skolas, the summit
#   mission_pursuit_mission3.esp  the ledge into the Thieves' Den
#   mission_pursuit_mission4.esp  the den: the mesa, then the pit
#   mission_pursuit_mission5.esp  the outro
#
# Each area's encounter is a script of its own beside this one:
# unknown_6d57825c (the baby dock), unknown_53a9d3d7 (the dock) and
# unknown_a4930efa (the Thieves' Den). This bundle holds the Ghost's lines
# and the music, which the missions play. Authored from one retail 2.3.1
# capture for the PS4 1.33 build (tiger-packet-analysis
# docs/missions/mission_pursuit.md): every wait is that run's, unconfirmed.

@activity_bundle("mission_pursuit")
# The player spawns in the baby dock (8, bubble 1 state 0), where the first
# phase plays, at the GAS's spawn 7D89A6CD; the lifetime runs the second
# phase on the dock (48) and the last three in the Thieves' Den (184). The
# region transitions are the ones the GAS named once the client had been
# there.
@activity("mission_pursuit")
@start_slice("baby_dock", "phase_baby_dock_main")
@phase("phase_baby_dock_main", "baby_dock")
@phase("phase_dock_main", "dock")
@phase("phase_thieves_den_main", "thieves_den")
@phase("phase_thieves_den_boss", "thieves_den")
@phase("phase_thieves_den_end", "thieves_den")
@spawn_transition(0x7D89A6CD)
@region_spawn_transition(8, 0x7D89A6CD)
@region_spawn_transition(48, 0xA38CA7C3)
@region_spawn_transition(184, 0x23F1A6D9)

mission_pursuit_mission1 phase_baby_dock_main
mission_pursuit_mission2 phase_dock_main
mission_pursuit_mission3 phase_thieves_den_main
mission_pursuit_mission4 phase_thieves_den_boss
mission_pursuit_mission5 phase_thieves_den_end

@startup()
script ss_mission_pursuit():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
