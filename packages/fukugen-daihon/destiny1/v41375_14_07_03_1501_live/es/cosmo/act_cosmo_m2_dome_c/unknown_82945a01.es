# es\cosmo\act_cosmo_m2_dome_c\unknown_82945a01.es
#
# Dome C's music and Ghost lines (bundle 82945A01; file name unknown). The
# lines tied to an objective, and the music's second cue, are started by
# their missions; the opening music plays as the players are ready. From
# three retail runs. The trigger volumes beside the lines (tv_d_o1_s014,
# tv_d_o1_s02, tv_d_o1_s032a/b, tv_d_o2_s005, tv_d_o2_s01, tv_m_cue2) have no
# sensor, so the wire never shows a player in them; the lines play where
# the run's objectives and fights had them. seq_d_o1_s018, seq_d_o1_s034
# and seq_d_o2_s02 never played.

@activity_bundle(0x82945A01)

sequence seq_m_intro

@startup()
script sc_intro():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_m_intro.start()
