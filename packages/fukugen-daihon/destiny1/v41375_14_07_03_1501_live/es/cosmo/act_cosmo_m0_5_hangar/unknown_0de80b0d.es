# es\cosmo\act_cosmo_m0_5_hangar\unknown_0de80b0d.es
#
# The hangar mission's music and Ghost lines (bundle 0DE80B0D; file name
# unknown). The lines and the hangar cue follow the objectives, so the
# missions start them; the intro music starts as the players are in, with the
# lifetime going active. Its nav mode triggers and the basement and hangar
# volumes never moved in either retail 2.3.1 run, so nothing here uses them.

@activity_bundle(0x0DE80B0D)

sequence seq_m_intro

@startup()
script sc_intro():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_m_intro.start()
