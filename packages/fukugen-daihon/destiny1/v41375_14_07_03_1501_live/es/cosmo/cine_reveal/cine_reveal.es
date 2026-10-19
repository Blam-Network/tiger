# es\cosmo\cine_reveal\cine_reveal.es
#
# The cutscenes after A Guardian Rises. Nobody spawns; each phase plays one
# cinematic. Mission file names are ours (true names unknown).
#
#   cine_reveal_mission1.esp  the Traveler
#   cine_reveal_mission2.esp  the Tower

@activity_bundle("cine_reveal")
# The cutscenes after A Guardian Rises: the capture starts bubble 3 at state 1
# (cine_106_trv_phase's).
@activity("cine_reveal")
@start_slice("plaza", "cine_106_trv_phase")
@phase("cine_106_trv_phase", "plaza")
@phase("cine_107_twr_phase", "plaza")

cine_reveal_mission1 cine_106_trv_phase
cine_reveal_mission2 cine_107_twr_phase

startup thread ss_cine_reveal:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
