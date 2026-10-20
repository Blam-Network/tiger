# es\cosmo\act_cosmo_m1_dome_a\unknown_8bd80dbe.es
#
# Dome A's music and Ghost lines (bundle 8BD80DBE; file name unknown). The
# lines tied to an objective are started by its mission; the rest play off
# the dome's point triggers, and the music cue moves through its sections as
# the fights begin. From one retail capture.

@activity_bundle(0x8BD80DBE)

sequence seq_d_o1_s018
sequence seq_d_o1_s02
sequence seq_d_o2_s015
sequence seq_d_o2_s04
sequence seq_m_intro
sequence seq_m_cue1
sequence seq_d_o3_s01
sequence seq_d_o3_s016
sequence seq_m_outro
sequence seq_d_o3_s05
player_trigger pt_spawn_hive_intro01
player_trigger pt_spawn_hive_intro02
player_trigger pt_thrall_unfreeze
player_trigger pt_upper_rush01_spawn
player_trigger pt_upper_rush02_spawn
player_trigger pt_upper_wizard_fallback_disable

@startup()
script sc_intro():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_d_o1_s018.start()
    seq_d_o1_s02.start()
    seq_d_o2_s015.start()
    seq_d_o2_s04.start()
    seq_m_intro.start()
    seq_m_cue1.start()
    seq_m_cue1.set_switch_mask(3)

@startup()
script sc_pt_spawn_hive_intro01():
    sleep_until(pt_spawn_hive_intro01.is_triggered())
    seq_m_cue1.set_switch_mask(7)

@startup()
script sc_pt_spawn_hive_intro02():
    sleep_until(pt_spawn_hive_intro02.is_triggered())
    seq_d_o3_s01.start()

@startup()
script sc_pt_thrall_unfreeze():
    sleep_until(pt_thrall_unfreeze.is_triggered())
    seq_m_cue1.set_switch_mask(15)

@startup()
script sc_pt_upper_rush01_spawn():
    sleep_until(pt_upper_rush01_spawn.is_triggered())
    seq_d_o3_s016.start()

@startup()
script sc_pt_upper_rush02_spawn():
    sleep_until(pt_upper_rush02_spawn.is_triggered())
    seq_m_outro.start()

@startup()
script sc_pt_upper_wizard_fallback_disable():
    sleep_until(pt_upper_wizard_fallback_disable.is_triggered())
    seq_d_o3_s05.start()
