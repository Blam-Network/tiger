# es\cosmo\cine_reveal\cine_reveal.es
#
# The cutscenes after A Guardian Rises. Nobody spawns; each phase plays one
# cinematic. From seven retail 2.3.1 sessions: five played both cinematics
# (each skipped), one signed out during the first, one capture stopped at the
# join.
#
#   cine_reveal_mission1.esp  the Traveler
#   cine_reveal_mission2.esp  the Tower

@activity_bundle("cine_reveal")
# The captures start it in plaza (bubble 3) at state 1, cine_106_trv_phase's;
# the client swaps to state 2 when the lifetime names cine_107_twr_phase.
@activity("cine_reveal")
@start_slice("plaza", "cine_106_trv_phase")
@phase("cine_106_trv_phase", "plaza")
@phase("cine_107_twr_phase", "plaza")

cine_reveal_mission1 cine_106_trv_phase
cine_reveal_mission2 cine_107_twr_phase

# Pregame as soon as the scripts run. Retail sends it 0.6-0.7 s after the
# client's first players[0] sense (1.8-3.6 s after world entry), and the
# first cinematic 1.0-1.2 s after that.
@startup()
script ss_cine_reveal():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
