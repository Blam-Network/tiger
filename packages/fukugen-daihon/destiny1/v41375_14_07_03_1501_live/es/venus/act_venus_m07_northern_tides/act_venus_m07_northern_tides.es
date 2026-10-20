# es\venus\act_venus_m07_northern_tides\act_venus_m07_northern_tides.es
#
# Eye of a Gatelord. The root starts nothing; the phases are the missions
# beside it, run in order. Mission file names are ours (true names unknown).
#
#   act_venus_m07_northern_tides_mission1.esp  scan the Vex node in the complex
#   act_venus_m07_northern_tides_mission2.esp  fight through the southern tides
#   act_venus_m07_northern_tides_mission3.esp  climb the northern tides
#   act_venus_m07_northern_tides_mission4.esp  summon and kill the Gatelord
#   act_venus_m07_northern_tides_mission5.esp  the outro
#
# The area encounters (south tides, north tides) are scripts of their own.
# unknown_3854b365 holds the music and Ghost lines. From one retail capture:
# every wait below and in the missions is that run's, unconfirmed.

@activity_bundle("act_venus_m07_northern_tides")
# Bubble 3 at spawn FFBA6F9C, the complex's scan phase in 4, then the tides (21,
# 13). One 2.3.1 capture.
@activity("act_venus_m07_northern_tides")
@start_slice("baby_shat")
@phase("phase_complex_scan_node", "complex")
@phase("phase_southern_tides_goto", "southern_tides")
@phase("phase_northern_tides_ascend_steps", "northern_tides")
@phase("phase_northern_tides_boss", "northern_tides")
@phase("phase_northern_tides_outro", "northern_tides")
@spawn_transition(0xFFBA6F9C)

act_venus_m07_northern_tides_mission1 phase_complex_scan_node
act_venus_m07_northern_tides_mission2 phase_southern_tides_goto
act_venus_m07_northern_tides_mission3 phase_northern_tides_ascend_steps
act_venus_m07_northern_tides_mission4 phase_northern_tides_boss
act_venus_m07_northern_tides_mission5 phase_northern_tides_outro

@startup()
script ss_venus_m07_northern_tides():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
