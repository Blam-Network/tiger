# es\cosmo\mission_elevator\mission_elevator.es
#
# The Cosmodrome's Taken King mission up the ball: from the blast, where
# Taken and Fallen fight, through the ship's hangar to the ball, along the
# bridge and the gantry, up the inside of the ball to its Taken boss, and the
# item the boss guarded. The root starts nothing; the phases are the missions
# beside it, run in order. Mission file names are ours. From one retail
# capture, so every rule and wait here is unconfirmed.
#
#   mission_elevator_mission1.esp  goto_ship_phase: the blast, on to the ship
#   mission_elevator_mission2.esp  gantry_ball_phase: to the ball, the bridge, the gantry
#   mission_elevator_mission3.esp  climb_ball_phase: up the ball
#   mission_elevator_mission4.esp  boss_ball_phase: the boss
#   mission_elevator_mission5.esp  get_item_ball_phase: the item, the end
#
# The blast's Taken and Fallen are unknown_4a0f2dd9's, the ship's
# unknown_73410941's, the ball's and the boss's unknown_9d6d5f70's. The
# Ghost's lines are rows of unknown_1142d37d, which has no script of its own:
# the phases play them.

@activity_bundle("mission_elevator")
# The 2.3.1 capture starts it in the blast (bubble 2) at spawn point
# 0x33CB2E8E; its lifetime runs goto_ship_phase there and the four ball
# phases in the ball (bubble 1). The region spawns are the ones the GAS named
# as the player reached the ship and the ball.
@activity("mission_elevator")
@start_slice("blast", "goto_ship_phase")
@phase("goto_ship_phase", "blast")
@phase("gantry_ball_phase", "ball")
@phase("climb_ball_phase", "ball")
@phase("boss_ball_phase", "ball")
@phase("get_item_ball_phase", "ball")
@spawn_transition(0x33CB2E8E)
@region_spawn_transition(168, "blast_to_ship")
@region_spawn_transition(8, "ship_to_ball")

mission_elevator_mission1 goto_ship_phase
mission_elevator_mission2 gantry_ball_phase
mission_elevator_mission3 climb_ball_phase
mission_elevator_mission4 boss_ball_phase
mission_elevator_mission5 get_item_ball_phase

@startup()
script ss_mission_elevator():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
