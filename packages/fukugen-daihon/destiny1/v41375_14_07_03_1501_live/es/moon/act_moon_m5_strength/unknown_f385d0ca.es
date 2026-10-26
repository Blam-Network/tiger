# es\moon\act_moon_m5_strength\unknown_f385d0ca.es
#
# Music and Ghost lines for Chamber of Night (bundle name uncracked). The
# intro and the Ghost's first lines run from the spawn. The climax music
# starts at the chamber's gate and steps with the ritual here, with the
# waves in the chamber script, and ends with mission 8. The lines tied to
# an objective (the Hellmouth's, the launch tubes', the way to the chamber)
# are the phases' own.
#
# Two runs agree to a second: the intro lines 1.1 and 2.6 s after the
# spawn, the music two seconds after the wizards are out and a second after
# the casting breaks.

@activity_bundle(0xF385D0CA)

sequence seq_music_intro
sequence seq_d_o1_s02
sequence seq_d_o1_s04
sequence seq_d_o1_s01
player_trigger pt_gate
sequence seq_strength_music
sequence seq_d_o2_s05
squad sq_dark_ritual
encounter_handle specops_moon_anomaly

@startup()
script sc_audio_main():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_music_intro.start()
    seq_d_o1_s02.start()
    sleep(1)
    seq_d_o1_s04.start()
    sleep(2)
    seq_d_o1_s01.start()

@startup()
script sc_strength_music():
    sleep_until(pt_gate.is_triggered())
    seq_strength_music.start()
    seq_strength_music.set_switch_mask(1)
    sleep(2)
    seq_d_o2_s05.start()
    sleep_until(sq_dark_ritual.alive_count() > 0)
    sleep(2)
    seq_strength_music.set_switch_mask(3)
    sleep_until(specops_moon_anomaly.o_darkness.get_device_position() >= 0.5)
    sleep(1)
    seq_strength_music.set_switch_mask(7)
