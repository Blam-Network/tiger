# es\venus\act_venus_m02_southern_tides\seq_venus_m02_southern_tides.es
#
# Ishtar Collective's music and Ghost lines (bundle 7E8804EB; the file name
# is the fnv1 crack of it). The intro music starts once the player is in.
# The lines tied to an objective are their mission's, the ones between the
# Vex waves enc_southern_tides_m02's; here the dome's music moves up a section
# as each wave's first cloud opens, with the Ghost's warning on the first.
# One retail 2.3.1 run (unconfirmed). Never played in it: seq_vn02_010_s022
# (its trigger fired), seq_vn02_010_s030, seq_vn02_010_s050 and
# seq_vn02_020_s022.

@activity_bundle("seq_venus_m02_southern_tides")

sequence seq_act_venus_m2_intro_music
sequence seq_act_venus_m2_cue1_music
sequence seq_vn02_020_s050
encounter_handle enc_southern_tides_m02

@startup()
script sc_intro():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_act_venus_m2_intro_music.start()

@startup()
script sc_wave_music():
    sleep_until(enc_southern_tides_m02.i_wave >= 1)
    sleep(1)
    seq_act_venus_m2_cue1_music.set_switch_mask(3)
    sleep(1)
    seq_vn02_020_s050.start()
    sleep_until(enc_southern_tides_m02.i_wave >= 2)
    sleep(1)
    seq_act_venus_m2_cue1_music.set_switch_mask(7)
    sleep_until(enc_southern_tides_m02.i_wave >= 3)
    sleep(0.6)
    seq_act_venus_m2_cue1_music.set_switch_mask(15)
