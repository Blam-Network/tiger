# es\cosmo\act_cosmo_m0_5_hangar\unknown_0de80b0d.es
#
# The hangar mission's music and Ghost lines (bundle 0DE80B0D; file name
# unknown). The lines tied to an objective are started by its mission; the
# intro music starts as the player arrives. From one retail capture.

@activity_bundle(0x0DE80B0D)
c_sequence_host seq_m_intro

startup thread sc_intro:
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_m_intro.start()
