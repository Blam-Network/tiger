# es\cosmo\act_cosmo_m4_dome_c\act_cosmo_m4_dome_c.es
#
# The Last Array. The root starts nothing; the phases are the missions beside
# it, run in order.
#
#   act_cosmo_m4_dome_c_mission1.esp  reach the Array, take the codes
#   act_cosmo_m4_dome_c_mission2.esp  find the console in dome_c
#   act_cosmo_m4_dome_c_mission3.esp  hold off the Hive while it works
#   act_cosmo_m4_dome_c_mission4.esp  back to the control room, the outro
#
# The area encounters (dome_a, dome_c) are scripts of their own.
# unknown_f9e600a7 holds the music and Ghost lines. From one retail capture

@activity_bundle("act_cosmo_m4_dome_c")
# The 2.3.1 capture starts it in bubble 6 (slice 48), spawn "default"; its
# lifetime runs the array phase (bubble 0, array), then the three dome_c phases
# (9). The region spawns are the ones the GAS named as the capture's players
# crossed: delta_n, dome_a, the array and dome_c.
@activity("act_cosmo_m4_dome_c")
@start_slice("delta_n")
@phase("cosmo_m4_phase00_array", "array")
@phase("cosmo_m4_phase01_dome_c", "dome_c")
@phase("cosmo_m4_phase02_dome_c", "dome_c")
@phase("cosmo_m4_phase_end", "dome_c")
@spawn_transition("default")
@region_spawn_transition(0, 0x50A4DA9A)
@region_spawn_transition(48, 0x2EA8FB98)
@region_spawn_transition(64, 0xF6B24FF4)
@region_spawn_transition(72, 0xEA3EDD0C)

act_cosmo_m4_dome_c_mission1 cosmo_m4_phase00_array
act_cosmo_m4_dome_c_mission2 cosmo_m4_phase01_dome_c
act_cosmo_m4_dome_c_mission3 cosmo_m4_phase02_dome_c
act_cosmo_m4_dome_c_mission4 cosmo_m4_phase_end
@startup()
script ss_cosmo_m4_dome_c():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
