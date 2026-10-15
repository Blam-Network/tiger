# es\mars\act_mars_m05_warbase\unknown_3d68033c.es
#
# Music and Ghost lines for The Garden's Spire. True name unknown. The
# intro music and the first lines play once the players are in; the rest of
# the lines and the warbase and ascent music belong to the phases that play
# them (the lines follow the objectives, not the trigger volumes beside
# them, in the one run captured).

c_sequence_host seq_music_intro
c_sequence_host seq_d_o1_s01
c_sequence_host seq_d_o1_s03

startup thread sc_audio_main:
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_music_intro.start()
    seq_d_o1_s03.start()
    sleep(2.5)
    seq_d_o1_s01.start()
