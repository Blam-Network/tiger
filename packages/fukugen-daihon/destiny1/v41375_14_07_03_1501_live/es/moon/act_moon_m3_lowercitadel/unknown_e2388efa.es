# es\moon\act_moon_m3_lowercitadel\unknown_e2388efa.es
#
# The World's Grave's music and Ghost lines (bundle E2388EFA; file name
# unknown). The intro music and the wisdom hall's lines play once the players
# are in; the lines tied to an objective are their mission's (they stop there too), as is the chamber's music start. The chamber's
# music steps through its sections as the fight goes on and gives way to the
# ascent once the scan is done. From one retail capture, so the gaps are that
# run's.

@activity_bundle(0xE2388EFA)

sequence seq_music_intro
sequence seq_strength_music
sequence seq_music_ascent
sequence seq_d_o1_s01
sequence seq_d_o1_s03
sequence seq_d_o1_s031
sequence seq_d_o1_s05
sequence seq_d_o2_s05
sequence seq_wis_wave_announce1
trigger_volume tv_wis_spawn_thrall
player_trigger pt_wis_spawn_thrall bind(tv_wis_spawn_thrall)
squad sq_m3_guard_rear
object o_m3_spec_ops
object o_m3_console_scan

@startup()
script sc_intro():
    seq_strength_music.set_switch_mask(0)
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_music_intro.start()
    seq_d_o1_s03.start()
    seq_d_o1_s031.start()
    seq_d_o1_s05.start()
    sleep(3)
    seq_d_o1_s01.start()

@startup()
script sc_wave_announce():
    sleep_until(pt_wis_spawn_thrall.is_triggered())
    sleep(1)
    seq_wis_wave_announce1.start()

@startup()
# the guards nearly down
script sc_strength_music_guards():
    sleep_until(sq_m3_guard_rear.alive_count() > 1)
    sleep_until(sq_m3_guard_rear.alive_count() <= 1)
    seq_strength_music.set_switch_mask(7)

@startup()
# the waves coming for the Ghost
script sc_strength_music_waves():
    sleep_until(o_m3_spec_ops.is_alive())
    sleep(4)
    seq_strength_music.set_switch_mask(31)

@startup()
script sc_ascent():
    sleep_until(o_m3_console_scan.get_device_position() >= 1)
    seq_strength_music.set_switch_mask(63)
    seq_strength_music.stop()
    seq_music_ascent.start()
    sleep(3)
    seq_d_o2_s05.start()
