# es\cosmo\act_cosmo_m2_dome_c\unknown_82945a01.es
#
# Dome C's music and Ghost lines (bundle 82945A01; file name unknown). The
# lines tied to an objective are started by its mission; the opening ones
# play as the players are ready. From one retail capture. The trigger volumes
# that would start the rest (tv_d_o1_s014, tv_d_o1_s02, tv_d_o1_s032a/b,
# tv_m_cue2) have no sensor on the wire, so those lines wait in their
# missions on this run's timing.

@activity_bundle(0x82945A01)

c_sequence_host seq_m_intro
c_sequence_host seq_d_o1_s017

startup thread sc_intro:
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_m_intro.start()
    sleep(2.8)
    seq_d_o1_s017.start()
