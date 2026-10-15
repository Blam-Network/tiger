# es\cosmo\act_cosmo_m0_highway\unknown_3c2f5ed5.es
#
# Music and Ghost lines for A Guardian Rises. True name unknown.
# Each line plays off a point trigger or a mission event; the music cues move
# through their sections as the player advances.

c_sequence_host seq_m_cue2  # true name unknown
c_sequence_host seq_m_cue1  # true name unknown
c_sequence_host seq_d_o1_10  # true name unknown
c_sequence_host seq_fallen_scream_far  # true name unknown
c_sequence_host seq_fallen_scream_mid  # true name unknown
c_player_trigger_sensor_host pt_ab_2  # true name unknown
c_sequence_host seq_fallen_scream_close  # true name unknown
c_sequence_host seq_d_o1_15  # true name unknown
trigger_volume_objective obj_m0_phase00_m1
c_sequence_host seq_d_o2_10  # true name unknown
c_sequence_host seq_drone_2  # true name unknown
c_player_trigger_sensor_host pt_fallen_above  # true name unknown
c_sequence_host seq_fallen_above  # true name unknown
c_sequence_host seq_d_o2_20  # true name unknown
c_player_trigger_sensor_host pt_nux_ghost_light_up_start  # true name unknown
c_sequence_host seq_d_o2_40  # true name unknown
c_sequence_host seq_d_o2_50  # true name unknown
c_sequence_host seq_fallen_scramble  # true name unknown
c_sequence_host seq_drone_3  # true name unknown
c_sequence_host seq_fallen_scamper_amb  # true name unknown
c_sequence_host seq_d_o2_80  # true name unknown
c_player_trigger_sensor_host pt_fallen_around_corner  # true name unknown
c_sequence_host seq_d_o2_90  # true name unknown
c_sequence_host seq_d_o3_30  # true name unknown
c_sequence_host seq_fallen_around_corner  # true name unknown
c_player_trigger_sensor_host pt_fallen_b_spawn  # true name unknown
c_sequence_host seq_d_o2_95  # true name unknown
c_player_trigger_sensor_host pt_fallen_arena_spawn  # true name unknown
c_sequence_host seq_ambush_garage  # true name unknown
c_player_trigger_sensor_host pt_fallen_c_spawn  # true name unknown
c_squad_sensor_host sq_fallen_first_vandal
c_sequence_host seq_d_o3_10  # true name unknown
c_player_trigger_sensor_host pt_corr_spawn_b_melee  # true name unknown
c_squad_sensor_host sq_fallen_garage_melee
c_squad_sensor_host sq_fallen_garage_vandals_2
c_squad_sensor_host sq_fallen_garage_vandals_3
c_player_trigger_sensor_host pt_mine_nux  # true name unknown
c_sequence_host seq_d_o3_40  # true name unknown
c_player_trigger_sensor_host pt_fallen_vandal_spawn  # true name unknown
c_sequence_host seq_ambush_finalroom  # true name unknown
c_player_trigger_sensor_host pt_audio_drone_end  # true name unknown
c_squad_sensor_host sq_fallen_garage_exit
c_sequence_host seq_d_o3_20  # true name unknown
c_player_trigger_sensor_host pt_graveyard_reveal  # true name unknown
c_sequence_host seq_d_o4_30  # true name unknown
c_player_trigger_sensor_host pt_ketch  # true name unknown
c_sequence_host seq_d_o4_40  # true name unknown
c_sequence_host seq_d_o4_45  # true name unknown
trigger_volume_objective obj_m0_m04a
c_sequence_host seq_d_o5_20  # true name unknown
c_squad_sensor_host sq_m0_fallen_2
c_squad_sensor_host sq_m0_fallen_gating
c_squad_sensor_host sq_ch1_fallen_on_playership_1
c_squad_sensor_host sq_ch1_fallen_on_playership_2
c_squad_sensor_host sq_ch1_fallen_on_playership_3
c_squad_sensor_host sq_m0_fallen_1
c_sequence_host seq_d_o5_30  # true name unknown
cinematic_midmission pf_105_cto
c_sequence_host seq_m_ascent  # true name unknown

startup thread sc_audio_main:
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

startup thread sc_wall_entry:
    sleep_until(obj_m0_phase00_m1._player_trigger.is_triggered())
    seq_d_o2_10.start()
    seq_drone_2.start()
    seq_m_cue1.set_switch_mask(3)

startup thread sc_fallen_above:
    sleep_until(pt_fallen_above.is_triggered())
    seq_fallen_above.start()
    sleep(2)
    seq_d_o2_20.start()

startup thread sc_ghost_lines:
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

startup thread sc_fallen_around_corner:
    sleep_until(pt_fallen_around_corner.is_triggered())
    seq_d_o2_90.start()
    seq_d_o3_30.start()
    seq_fallen_around_corner.start()

startup thread sc_fallen_b:
    sleep_until(pt_fallen_b_spawn.is_triggered())
    seq_d_o2_95.start()

startup thread sc_ambush_garage:
    sleep_until(pt_fallen_arena_spawn.is_triggered())
    seq_ambush_garage.start()

startup thread sc_fallen_c_music:
    sleep_until(pt_fallen_c_spawn.is_triggered())
    seq_m_cue1.set_switch_mask(15)

startup thread sc_first_vandal:
    sleep_until_dead(sq_fallen_first_vandal)
    sleep(1)
    seq_m_cue1.set_switch_mask(31)
    sleep(2)
    seq_d_o3_10.start()

startup thread sc_corridor_b_music:
    sleep_until(pt_corr_spawn_b_melee.is_triggered())
    seq_m_cue1.set_switch_mask(63)

startup thread sc_garage_music:
    sleep_until(sq_fallen_garage_melee.alive_count() > 0)
    sleep_until(sq_fallen_garage_vandals_2.alive_count() + sq_fallen_garage_vandals_3.alive_count() + sq_fallen_garage_melee.alive_count() == 0)
    sleep(4)
    seq_m_cue1.stop()

startup thread sc_mine:
    sleep_until(pt_mine_nux.is_triggered())
    seq_d_o3_40.start()

startup thread sc_ambush_finalroom:
    sleep_until(pt_fallen_vandal_spawn.is_triggered())
    seq_ambush_finalroom.start()

startup thread sc_drone_end:
    sleep_until(pt_audio_drone_end.is_triggered())
    seq_fallen_scamper_amb.stop()
    seq_drone_3.stop()

startup thread sc_garage_exit:
    sleep_until_dead(sq_fallen_garage_exit)
    sleep(4)
    seq_d_o3_20.start()

startup thread sc_graveyard_reveal:
    sleep_until(pt_graveyard_reveal.is_triggered())
    seq_d_o4_30.start()

startup thread sc_ketch_lines:
    sleep_until(pt_ketch.is_triggered())
    sleep(6)
    seq_d_o4_40.start()
    sleep(2)
    seq_d_o4_45.start()

startup thread sc_ship:
    sleep_until(obj_m0_m04a._player_trigger.is_triggered())
    seq_d_o5_20.start()
    seq_m_cue2.set_switch_mask(7)

startup thread sc_hangar_clear:
    sleep_until(sq_m0_fallen_2.alive_count() > 0)
    sleep_until(sq_m0_fallen_gating.alive_count() + sq_ch1_fallen_on_playership_1.alive_count() + sq_ch1_fallen_on_playership_2.alive_count() + sq_ch1_fallen_on_playership_3.alive_count() + sq_m0_fallen_1.alive_count() + sq_m0_fallen_2.alive_count() == 0)
    seq_m_cue2.stop()
    sleep(3)
    seq_d_o5_30.start()

startup thread sc_ascent:
    sleep_until(pf_105_cto._cinematic.is_done())
    sleep(1)
    seq_m_ascent.start()

def sleep_until_dead(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)
