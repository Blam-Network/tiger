# es\cosmo\act_cosmo_m0_5_hangar\act_cosmo_m0_5_hangar.es
#
# The hangar, after the highway: the Ghost scans the crashed ship's flare and
# the next beacon, then the way back to the hangar, the Fallen ultra and the
# Vandals. The root starts nothing; the phases are the missions beside it, run
# in order. Mission file names are ours (true names unknown). From one retail
# capture, so every rule and wait here is unconfirmed.
#
#   act_cosmo_m0_5_hangar_mission1.esp  delta_s: two Ghost scans
#   act_cosmo_m0_5_hangar_mission2.esp  back to the hangar, the ultra, the loot
#   act_cosmo_m0_5_hangar_mission3.esp  clear out the Vandals, the ascent
#
# The hangar's own encounter is es\cosmo\hangar\enc_hangar_m0_5.es. The
# unknown_0de80b0d bundle holds the intro music.

startup thread ss_cosmo_m0_5_hangar:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
