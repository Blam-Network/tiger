# es\cosmo\act_cosmo_m4_dome_c\unknown_f9e600a7.es
#
# The Last Array's music and Ghost lines (bundle F9E600A7; file name
# unknown). Each line plays off a trigger or a fight ending; the music cue
# and the lines tied to an objective are its mission's. From one retail
# capture, so the short gaps between lines are that run's.

@activity_bundle(0xF9E600A7)
c_sequence_host seq_m_intro
c_sequence_host seq_d_o1_s01
c_sequence_host seq_d_o1_s02
c_sequence_host seq_d_o1_s03
c_sequence_host seq_d_o1_s04
c_sequence_host seq_d_o2_s023
c_sequence_host seq_d_o2_s032
c_sequence_host seq_d_o3_s01
c_sequence_host seq_d_o3_s08
c_sequence_host seq_cosmo4_rasputin
c_squad_sensor_host sq_fallen_upper_front01
c_squad_sensor_host sq_fallen_upper_back01
c_squad_sensor_host sq_fallen_upper_sniper01
c_squad_sensor_host sq_fallen_upper_anchors01
c_object_sensor_host o_terminal_invis_device
c_player_monitor_sensor_host pm_outdoor_enc_start
c_player_monitor_sensor_host pm_trigger_volume
c_squad_sensor_host sq_ds_hive_assault03

startup thread sc_intro:
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_m_intro.start()
    seq_d_o1_s02.start()
    seq_d_o1_s04.start()
    sleep(3)
    seq_d_o1_s01.start()

# dome_a cleared; the Ghost's lines at the Array follow the codes picked up
# (the mission's obj_m4_o1b)
startup thread sc_array:
    sleep_until(dome_a_fallen_alive_count() > 0)
    sleep_until(dome_a_fallen_alive_count() == 0)
    seq_d_o1_s03.start()

# the console working
startup thread sc_console:
    sleep_until(o_terminal_invis_device.is_alive())
    sleep(3)
    seq_d_o2_s023.start()

# the Hive assault
startup thread sc_assault:
    sleep_until(o_terminal_invis_device.is_alive())
    sleep_until(pm_outdoor_enc_start.test_any_inside())
    seq_d_o3_s01.start()
    sleep_until(sq_ds_hive_assault03.alive_count() > 0)
    seq_d_o2_s032.start()

# back in the control room once the Hive are dealt with
startup thread sc_outro:
    sleep_until(o_terminal_invis_device.is_alive())
    sleep_until(not pm_trigger_volume.test_any_inside())
    sleep_until(pm_trigger_volume.test_any_inside())
    sleep(2)
    seq_d_o3_s08.start()
    sleep(12)
    seq_cosmo4_rasputin.start()

def dome_a_fallen_alive_count():
    return sq_fallen_upper_front01.alive_count() + sq_fallen_upper_back01.alive_count() + sq_fallen_upper_sniper01.alive_count() + sq_fallen_upper_anchors01.alive_count()

def sleep_until_dead(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)
