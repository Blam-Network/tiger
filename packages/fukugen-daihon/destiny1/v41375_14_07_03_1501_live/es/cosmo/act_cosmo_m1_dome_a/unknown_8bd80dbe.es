# es\cosmo\act_cosmo_m1_dome_a\unknown_8bd80dbe.es
#
# The Dark Within's music and Ghost lines (bundle 8BD80DBE, name unknown).
# The approach lines and the music start with the activity; most lines play
# off their own volumes once started. The lines tied to an objective are
# started and stopped by its mission, the outro music by the last one; the
# rest follow the dome's triggers, and the music cue moves up a section as
# each fight begins. From three full retail 2.3.1 runs.

@activity_bundle(0x8BD80DBE)

sequence seq_d_o1_s018
sequence seq_d_o1_s02
sequence seq_d_o2_s015
sequence seq_d_o2_s04
sequence seq_m_intro
sequence seq_m_cue1
player_trigger pt_spawn_hive_intro01
sequence seq_d_o3_s01
player_trigger pt_thrall_unfreeze
squad sq_hive_upper_rush01
sequence seq_d_o3_s016

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
# the basement fight: the music moves up, the Ghost's line 2 s after
script sc_pt_spawn_hive_intro01():
    sleep_until(pt_spawn_hive_intro01.is_triggered())
    seq_m_cue1.set_switch_mask(7)
    sleep(2)
    seq_d_o3_s01.start()

@startup()
script sc_pt_thrall_unfreeze():
    sleep_until(pt_thrall_unfreeze.is_triggered())
    seq_m_cue1.set_switch_mask(15)

@startup()
# the Ghost's line as the first thrall rush on the upper floor is nearly
# done (the first run: its third thrall died in the same frame; the second
# played it on pt_upper_rush01_spawn, the third before the rush came, so
# what starts it is not settled)
script sc_upper_rush01():
    sleep_until(sq_hive_upper_rush01.alive_count() > 0)
    sleep_until(sq_hive_upper_rush01.alive_count() <= 1)
    seq_d_o3_s016.start()
