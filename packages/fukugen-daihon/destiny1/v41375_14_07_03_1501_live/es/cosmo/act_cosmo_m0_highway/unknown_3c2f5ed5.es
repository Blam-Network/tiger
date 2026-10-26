# es\cosmo\act_cosmo_m0_highway\unknown_3c2f5ed5.es
#
# Music and Ghost lines for A Guardian Rises. True name unknown.
# Each line plays off a point trigger or a mission event; the music cues move
# through their sections as the player advances.

@activity_bundle(0x3C2F5ED5)

sequence seq_m_cue2
sequence seq_m_cue1
sequence seq_d_o1_10
sequence seq_fallen_scream_far
sequence seq_fallen_scream_mid
player_trigger pt_ab_2
sequence seq_fallen_scream_close
sequence seq_d_o1_15
trigger_volume_objective obj_m0_phase00_m1
sequence seq_d_o2_10
sequence seq_drone_2
player_trigger pt_fallen_above
sequence seq_fallen_above
sequence seq_d_o2_20
player_trigger pt_nux_ghost_light_up_start
sequence seq_d_o2_40
sequence seq_d_o2_50
sequence seq_fallen_scramble
sequence seq_drone_3
sequence seq_fallen_scamper_amb
sequence seq_d_o2_80
player_trigger pt_fallen_around_corner
sequence seq_d_o2_90
sequence seq_d_o3_30
sequence seq_fallen_around_corner
player_trigger pt_fallen_b_spawn
sequence seq_d_o2_95
player_trigger pt_fallen_arena_spawn
sequence seq_ambush_garage
player_trigger pt_fallen_c_spawn
squad sq_fallen_first_vandal
sequence seq_d_o3_10
player_trigger pt_corr_spawn_b_melee
squad sq_fallen_garage_melee
squad sq_fallen_garage_vandals_2
squad sq_fallen_garage_vandals_3
player_trigger pt_mine_nux
sequence seq_d_o3_40
player_trigger pt_fallen_vandal_spawn
sequence seq_ambush_finalroom
player_trigger pt_audio_drone_end
squad sq_fallen_garage_exit
sequence seq_d_o3_20
player_trigger pt_trans_graveyard
player_trigger pt_graveyard_reveal
sequence seq_d_o4_30
player_trigger pt_ketch
sequence seq_d_o4_40
sequence seq_d_o4_45
trigger_volume_objective obj_m0_m04a
sequence seq_d_o5_20
squad sq_m0_fallen_2
squad sq_m0_fallen_gating
squad sq_ch1_fallen_on_playership_1
squad sq_ch1_fallen_on_playership_2
squad sq_ch1_fallen_on_playership_3
squad sq_m0_fallen_1
sequence seq_d_o5_30
cinematic_midmission pf_105_cto
sequence seq_m_ascent

@startup()
script sc_audio_main():
    seq_m_cue2.start()
    seq_m_cue2.set_switch_mask(3)
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_m_cue1.start()
    seq_m_cue1.set_switch_mask(1)
    sleep(2)
    seq_d_o1_10.start()
    sleep(5)
    seq_fallen_scream_far.start()
    sleep(9)
    seq_fallen_scream_mid.start()
    sleep_until_timeout(pt_ab_2.is_triggered(), 15)
    if not pt_ab_2.is_triggered():
        seq_fallen_scream_close.start()
        sleep_until_timeout(pt_ab_2.is_triggered(), 2)
        if not pt_ab_2.is_triggered():
            seq_d_o1_15.start()

@startup()
script sc_wall_entry():
    sleep_until(obj_m0_phase00_m1._player_trigger.is_triggered())
    seq_d_o2_10.start()
    seq_drone_2.start()
    seq_m_cue1.set_switch_mask(3)

@startup()
script sc_fallen_above():
    sleep_until(pt_fallen_above.is_triggered())
    seq_fallen_above.start()
    sleep(2)
    seq_d_o2_20.start()

@startup()
script sc_ghost_lines():
    sleep_until(pt_nux_ghost_light_up_start.is_triggered())
    sleep(2)
    seq_d_o2_40.start()
    sleep(3)
    seq_d_o2_50.start()
    sleep(11)
    seq_fallen_scramble.start()
    seq_drone_2.stop()
    seq_drone_3.start()
    seq_m_cue1.set_switch_mask(7)
    sleep(5)
    seq_fallen_scamper_amb.start()
    sleep(6)
    seq_d_o2_80.start()

@startup()
script sc_fallen_around_corner():
    sleep_until(pt_fallen_around_corner.is_triggered())
    seq_d_o2_90.start()
    seq_d_o3_30.start()
    seq_fallen_around_corner.start()

@startup()
script sc_fallen_b():
    sleep_until(pt_fallen_b_spawn.is_triggered())
    seq_d_o2_95.start()

@startup()
script sc_ambush_garage():
    sleep_until(pt_fallen_arena_spawn.is_triggered())
    seq_ambush_garage.start()

@startup()
script sc_fallen_c_music():
    sleep_until(pt_fallen_c_spawn.is_triggered())
    seq_m_cue1.set_switch_mask(15)

@startup()
script sc_first_vandal():
    sleep_until_dead(sq_fallen_first_vandal)
    sleep(1)
    seq_m_cue1.set_switch_mask(31)
    sleep(2)
    seq_d_o3_10.start()

@startup()
script sc_corridor_b_music():
    sleep_until(pt_corr_spawn_b_melee.is_triggered())
    seq_m_cue1.set_switch_mask(63)

@startup()
script sc_garage_music():
    sleep_until(sq_fallen_garage_melee.alive_count() > 0)
    sleep_until(sq_fallen_garage_vandals_2.alive_count() + sq_fallen_garage_vandals_3.alive_count() + sq_fallen_garage_melee.alive_count() == 0)
    sleep(4)
    seq_m_cue1.stop()

@startup()
script sc_mine():
    sleep_until(pt_mine_nux.is_triggered())
    seq_d_o3_40.start()

@startup()
script sc_ambush_finalroom():
    sleep_until(pt_fallen_vandal_spawn.is_triggered())
    seq_ambush_finalroom.start()

@startup()
script sc_drone_end():
    sleep_until(pt_audio_drone_end.is_triggered())
    seq_fallen_scamper_amb.stop()
    seq_drone_3.stop()

@startup()
# the garage is clear, its last squad in, or a player ran on past it to the
# graveyard
script sc_garage_exit():
    sleep_until(sq_fallen_garage_exit.alive_count() > 0 or pt_trans_graveyard.is_triggered())
    sleep_until(garage_alive_count() == 0 or pt_trans_graveyard.is_triggered())
    sleep(4)
    seq_d_o3_20.start()

@startup()
script sc_graveyard_reveal():
    sleep_until(pt_graveyard_reveal.is_triggered())
    seq_d_o4_30.start()

@startup()
script sc_ketch_lines():
    sleep_until(pt_ketch.is_triggered())
    sleep(6)
    seq_d_o4_40.start()
    sleep(2)
    seq_d_o4_45.start()

@startup()
script sc_ship():
    sleep_until(obj_m0_m04a._player_trigger.is_triggered())
    seq_d_o5_20.start()
    seq_m_cue2.set_switch_mask(7)

@startup()
script sc_hangar_clear():
    sleep_until(sq_m0_fallen_2.alive_count() > 0)
    sleep_until(sq_m0_fallen_gating.alive_count() + sq_ch1_fallen_on_playership_1.alive_count() + sq_ch1_fallen_on_playership_2.alive_count() + sq_ch1_fallen_on_playership_3.alive_count() + sq_m0_fallen_1.alive_count() + sq_m0_fallen_2.alive_count() == 0)
    seq_m_cue2.stop()
    sleep(3)
    seq_d_o5_30.start()

@startup()
script sc_ascent():
    sleep_until(pf_105_cto._cinematic.is_done())
    sleep(1)
    seq_m_ascent.start()

def garage_alive_count():
    return sq_fallen_garage_vandals_2.alive_count() + sq_fallen_garage_vandals_3.alive_count() + sq_fallen_garage_melee.alive_count() + sq_fallen_garage_exit.alive_count()

def sleep_until_dead(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)
