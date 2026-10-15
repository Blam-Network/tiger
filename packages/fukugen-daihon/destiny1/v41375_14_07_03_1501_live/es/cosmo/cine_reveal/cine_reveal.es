# es\cosmo\cine_reveal\cine_reveal.es
#
# The cutscenes after A Guardian Rises. Nobody spawns; each phase plays one
# cinematic. Mission file names are ours (true names unknown).
#
#   cine_reveal_mission1.esp  the Traveler
#   cine_reveal_mission2.esp  the Tower

cine_reveal_mission1 cine_106_trv_phase
cine_reveal_mission2 cine_107_twr_phase

startup thread ss_cine_reveal:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
