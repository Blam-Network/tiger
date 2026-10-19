# es\cosmo\act_cosmo_m1_dome_a\unknown_8bd80dbe.es
#
# Dome A's music and Ghost lines (bundle 8BD80DBE; file name unknown). The
# lines tied to an objective are started by its mission; the rest play off
# the dome's point triggers, and the music cue moves through its sections as
# the fights begin. From one retail capture.

@activity_bundle(0x8BD80DBE)

c_sequence_host seq_d_o1_s018
c_sequence_host seq_d_o1_s02
c_sequence_host seq_d_o2_s015
c_sequence_host seq_d_o2_s04
c_sequence_host seq_m_intro
c_sequence_host seq_m_cue1
c_sequence_host seq_d_o3_s01
c_sequence_host seq_d_o3_s016
c_sequence_host seq_m_outro
c_sequence_host seq_d_o3_s05
c_player_trigger_sensor_host pt_spawn_hive_intro01
c_player_trigger_sensor_host pt_spawn_hive_intro02
c_player_trigger_sensor_host pt_thrall_unfreeze
c_player_trigger_sensor_host pt_upper_rush01_spawn
c_player_trigger_sensor_host pt_upper_rush02_spawn
c_player_trigger_sensor_host pt_upper_wizard_fallback_disable

startup thread sc_intro:
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_d_o1_s018.start()
    seq_d_o1_s02.start()
    seq_d_o2_s015.start()
    seq_d_o2_s04.start()
    seq_m_intro.start()
    seq_m_cue1.start()
    seq_m_cue1.set_switch_mask(3)

startup thread sc_pt_spawn_hive_intro01:
    sleep_until(pt_spawn_hive_intro01.is_triggered())
    seq_m_cue1.set_switch_mask(7)

startup thread sc_pt_spawn_hive_intro02:
    sleep_until(pt_spawn_hive_intro02.is_triggered())
    seq_d_o3_s01.start()

startup thread sc_pt_thrall_unfreeze:
    sleep_until(pt_thrall_unfreeze.is_triggered())
    seq_m_cue1.set_switch_mask(15)

startup thread sc_pt_upper_rush01_spawn:
    sleep_until(pt_upper_rush01_spawn.is_triggered())
    seq_d_o3_s016.start()

startup thread sc_pt_upper_rush02_spawn:
    sleep_until(pt_upper_rush02_spawn.is_triggered())
    seq_m_outro.start()

startup thread sc_pt_upper_wizard_fallback_disable:
    sleep_until(pt_upper_wizard_fallback_disable.is_triggered())
    seq_d_o3_s05.start()
