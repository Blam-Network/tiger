# es\moon\act_moon_m5_strength\unknown_f385d0ca.es
#
# Music and Ghost lines for Chamber of Night (bundle name uncracked). The
# intro and the Hellmouth lines run from the spawn; the launch tubes lines
# stop at the cinematic's trigger; the chamber line plays after the cinematic
# and stops on arrival. The climax music starts at the chamber's gate and
# steps with the ritual here, with the waves in the chamber script, and ends
# with mission 8.
#
# One run: the Hellmouth lines are on this run's clock.

@activity_bundle(0xF385D0CA)

c_sequence_host seq_music_intro
c_sequence_host seq_d_o1_s02
c_sequence_host seq_d_o1_s04
c_sequence_host seq_d_o1_s01
c_sequence_host seq_d_o1_s075
c_sequence_host seq_d_o1_s078
c_sequence_host seq_d_o1_s08
c_sequence_host seq_d_o2_s01
c_sequence_host seq_d_o2_s012
c_sequence_host seq_d_o2_s014
trigger_volume_objective pf_obj_cine_trigger
cinematic_midmission pf_cine_110a_mrt
c_sequence_host seq_d_o2_s03
c_location_sensor_host strength
c_player_trigger_sensor_host pt_gate
c_sequence_host seq_strength_music
c_sequence_host seq_d_o2_s05
c_squad_sensor_host sq_dark_ritual
c_encounter_handle specops_moon_anomaly

startup thread sc_audio_main:
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_music_intro.start()
    seq_d_o1_s02.start()
    sleep(1)
    seq_d_o1_s04.start()
    sleep(2)
    seq_d_o1_s01.start()
    sleep(37)
    seq_d_o1_s075.start()
    sleep(46)
    seq_d_o1_s078.start()
    sleep(5)
    seq_d_o1_s08.start()
    sleep(2)
    for line in [seq_d_o2_s01, seq_d_o2_s012, seq_d_o2_s014]:
        line.start()
    sleep_until(pf_obj_cine_trigger._player_trigger.is_triggered())
    for line in [seq_d_o2_s01, seq_d_o2_s012, seq_d_o2_s014]:
        line.stop()
    sleep_until(pf_cine_110a_mrt._cinematic.is_done())
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_d_o2_s03.start()
    sleep_until(strength.is_triggered())
    seq_d_o2_s03.stop()

startup thread sc_strength_music:
    sleep_until(pt_gate.is_triggered())
    sleep(1)
    seq_strength_music.start()
    seq_strength_music.set_switch_mask(1)
    sleep(2)
    seq_d_o2_s05.start()
    sleep_until(sq_dark_ritual.alive_count() > 0)
    sleep(1)
    seq_strength_music.set_switch_mask(3)
    sleep_until(specops_moon_anomaly.o_darkness.get_device_position() >= 0.5)
    sleep(1)
    seq_strength_music.set_switch_mask(7)
