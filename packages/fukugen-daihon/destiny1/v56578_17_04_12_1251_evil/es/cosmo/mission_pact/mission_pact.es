# es\cosmo\mission_pact\mission_pact.es
#
# The Fallen captains' pact, the Cosmodrome Taken King mission: through the
# hive shore's grotto to the first Servitor, across the refinery to the
# second, then into the command building for the three captains. The root
# starts nothing; the phases are the missions beside it, run in order. Mission
# file names are ours. From two retail captures, one slow and thorough, one
# fast that left the grotto and the refinery standing.
#
#   mission_pact_mission1.esp  phase_hive_shore: the grotto, the first Servitor
#   mission_pact_mission2.esp  phase_refinery: clear the grotto, the second Servitor
#   mission_pact_mission3.esp  phase_command: through the rocketyard into command
#   mission_pact_mission4.esp  phase_command_boss: the three captains
#   mission_pact_mission5.esp  phase_command_end: the outro
#
# The hive shore's Fallen and Hive are unknown_99f4fbfa's, the refinery's
# unknown_61b048de's, the command building's and the captains'
# unknown_66c01eb9's.

@activity_bundle("mission_pact")
# The 2.3.1 capture starts it on the hive shore (bubble 15) at spawn point
# 0x3E85C154; its lifetime runs phase_hive_shore, phase_refinery (bubble 19)
# and the three command phases (4). The region spawns are the ones the GAS
# named as the player reached the refinery, the rocketyard and command.
@activity("mission_pact")
@start_slice("hive_shore", "phase_hive_shore")
@phase("phase_hive_shore", "hive_shore")
@phase("phase_refinery", "refinery")
@phase("phase_command", "command")
@phase("phase_command_boss", "command")
@phase("phase_command_end", "command")
@spawn_transition(0x3E85C154)
@region_spawn_transition(152, "refinery_to_hive_shore")
@region_spawn_transition(160, "rocketyard_to_refinery")
@region_spawn_transition(32, "rocketyard_to_command")

mission_pact_mission1 phase_hive_shore
mission_pact_mission2 phase_refinery
mission_pact_mission3 phase_command
mission_pact_mission4 phase_command_boss
mission_pact_mission5 phase_command_end
sequence seq_captain_roar

@startup()
script ss_mission_pact():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
    # the captain's roar is already playing at world entry
    seq_captain_roar.start()
