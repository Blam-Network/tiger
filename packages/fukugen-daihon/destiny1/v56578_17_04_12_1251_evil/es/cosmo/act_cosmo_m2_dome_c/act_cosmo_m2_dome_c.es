# es\cosmo\act_cosmo_m2_dome_c\act_cosmo_m2_dome_c.es
#
# Dome C, the second Cosmodrome story mission: across the Dry Sea to the dome,
# the Fallen in the pipe room and the guards' hall, the console, then the
# Fallen waves and the beacon. The root starts nothing; the phases are the
# missions beside it, run in order. Mission file names are ours (true names
# unknown). From one retail capture, so every rule and wait here is
# unconfirmed.
#
#   act_cosmo_m2_dome_c_mission1.esp  delta_n: nothing moved on the wire
#   act_cosmo_m2_dome_c_mission2.esp  dry_sea: reach the sea, then the dome
#   act_cosmo_m2_dome_c_mission3.esp  dome_c: use the console
#   act_cosmo_m2_dome_c_mission4.esp  dome_c: the Fallen waves
#   act_cosmo_m2_dome_c_mission5.esp  dome_c: destroy the beacon, the activity ends
#
# The dome's own encounter is es\cosmo\dome_c\enc_dome_c_m2.es. The
# unknown_82945a01 bundle holds the music and the first Ghost lines.

@activity_bundle("act_cosmo_m2_dome_c")
startup thread ss_cosmo_m2_dome_c:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
