# es\cosmo\act_cosmo_m1_dome_a\act_cosmo_m1_dome_a.es
#
# Dome A, the first Cosmodrome story mission after the Tower: into the Hive's
# dome, a Ghost scan on the way down, the thrall and trooper waves in the
# basement, then the upper floor and the wizard. The root starts nothing; the
# phases are the missions beside it, run in order. Mission file names are ours
# (true names unknown). From one retail capture, so every rule and wait here
# is unconfirmed.
#
#   act_cosmo_m1_dome_a_mission1.esp  into the dome, the scan, the basement
#   act_cosmo_m1_dome_a_mission2.esp  the upper floor, kill the wizard
#   act_cosmo_m1_dome_a_mission3.esp  the way out, the activity ends
#
# The dome's own encounter is es\cosmo\dome_a\enc_dome_a_m1.es. The
# unknown_8bd80dbe bundle holds the music and Ghost lines.

@activity_bundle("act_cosmo_m1_dome_a")
# From the 2.3.1 capture.
@activity("act_cosmo_m1_dome_a")
@start_slice("delta_s")
@phase("cosmo_m1_phase00_dome_a", "dome_a")
@phase("cosmo_m1_phase01_dome_a", "dome_a")
@phase("cosmo_m1_phase_end", "dome_a")

act_cosmo_m1_dome_a_mission1 cosmo_m1_phase00_dome_a
act_cosmo_m1_dome_a_mission2 cosmo_m1_phase01_dome_a
act_cosmo_m1_dome_a_mission3 cosmo_m1_phase_end
@startup()
script ss_cosmo_m1_dome_a():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
