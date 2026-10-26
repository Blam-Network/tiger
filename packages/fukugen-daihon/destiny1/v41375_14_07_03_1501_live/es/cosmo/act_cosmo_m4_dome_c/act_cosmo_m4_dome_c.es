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
# unknown_f9e600a7 holds the music and Ghost lines. From two retail runs.

@activity_bundle("act_cosmo_m4_dome_c")
# The 2.3.1 capture starts it in bubble 6 (slice 48); its lifetime runs the array
# phase (bubble 0, array), then the three dome_c phases (9). The spawn is not
# decoded from the capture.
@activity("act_cosmo_m4_dome_c")
@start_slice("delta_n")
@phase("cosmo_m4_phase00_array", "array")
@phase("cosmo_m4_phase01_dome_c", "dome_c")
@phase("cosmo_m4_phase02_dome_c", "dome_c")
@phase("cosmo_m4_phase_end", "dome_c")

act_cosmo_m4_dome_c_mission1 cosmo_m4_phase00_array
act_cosmo_m4_dome_c_mission2 cosmo_m4_phase01_dome_c
act_cosmo_m4_dome_c_mission3 cosmo_m4_phase02_dome_c
act_cosmo_m4_dome_c_mission4 cosmo_m4_phase_end

@startup()
script ss_cosmo_m4_dome_c():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
