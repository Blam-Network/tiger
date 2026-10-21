# es\venus\act_venus_m09_tower\act_venus_m09_tower.es
#
# The Terminus, the Venus story mission up the Vex tower beyond the Citadel.
# It never shipped and was never captured: the flow below is read off its
# bundles' rows. The root puts the lifetime in pregame; the phases are the
# missions beside it, run in order. Mission file names are ours; the phase
# names are the bundle's.
#
#   act_venus_m09_tower_mission1.esp  phase_lower_tower_goto: over the bridge into the lower tower
#   act_venus_m09_tower_mission2.esp  phase_lower_tower_elevator: the lift and the Fallen vanguard
#   act_venus_m09_tower_mission3.esp  phase_tower_find_boss: up the lift, find the captain
#   act_venus_m09_tower_mission4.esp  phase_tower_kill_boss: the ultra captain
#   act_venus_m09_tower_mission5.esp  phase_tower_outro: the end
#
# The lower tower and tower encounters (enc_lower_tower_m09, enc_tower_m09)
# are scripts of their own. unknown_190a6857 holds the music and Ghost lines.

@activity_bundle("act_venus_m09_tower")
# The Citadel (complex, bubble 4) at its default spawn point: its
# complex_to_tower crossing leads into the lower tower (12), whose lift tops
# out in the tower (24). No capture: unconfirmed.
@activity("act_venus_m09_tower")
@start_slice("complex")
@phase("phase_lower_tower_goto", "lower_tower")
@phase("phase_lower_tower_elevator", "lower_tower")
@phase("phase_tower_find_boss", "tower")
@phase("phase_tower_kill_boss", "tower")
@phase("phase_tower_outro", "tower")
# Where a region's players come back in: the lower tower's end of the
# crossing, and the top of the lift.
@region_spawn_transition(96, "complex_to_tower")
@region_spawn_transition(192, 0xE4814CE5)

act_venus_m09_tower_mission1 phase_lower_tower_goto
act_venus_m09_tower_mission2 phase_lower_tower_elevator
act_venus_m09_tower_mission3 phase_tower_find_boss
act_venus_m09_tower_mission4 phase_tower_kill_boss
act_venus_m09_tower_mission5 phase_tower_outro

@startup()
script ss_venus_m09_tower():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
