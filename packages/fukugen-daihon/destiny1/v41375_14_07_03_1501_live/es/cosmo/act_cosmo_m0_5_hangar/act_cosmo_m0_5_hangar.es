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

@activity_bundle("act_cosmo_m0_5_hangar")
# Restoration. From the 2.3.1 capture; its first slice is 56 (bubble 7, state 0).
@activity("act_cosmo_m0_5_hangar")
@start_slice("delta_s", "cosmo_m0_5_phase00_delta_s")
@phase("cosmo_m0_5_phase00_delta_s", "delta_s")
@phase("cosmo_m0_5_phase01_hangar", "hangar")
@phase("cosmo_m0_5_phase02_hangar", "hangar")

act_cosmo_m0_5_hangar_mission1 cosmo_m0_5_phase00_delta_s
act_cosmo_m0_5_hangar_mission2 cosmo_m0_5_phase01_hangar
act_cosmo_m0_5_hangar_mission3 cosmo_m0_5_phase02_hangar

@startup()
script ss_cosmo_m0_5_hangar():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
