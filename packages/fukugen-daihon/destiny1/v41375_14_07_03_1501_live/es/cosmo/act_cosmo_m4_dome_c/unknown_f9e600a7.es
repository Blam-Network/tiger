# es\cosmo\act_cosmo_m4_dome_c\unknown_f9e600a7.es
#
# The Last Array's music and Ghost lines (bundle F9E600A7; file name
# unknown). Each line plays off a trigger or a fight ending; the music cue
# and the lines tied to an objective are its mission's. From two retail
# runs, which agree on every gap below to within a second.

@activity_bundle(0xF9E600A7)

sequence seq_m_intro
sequence seq_d_o1_s01
sequence seq_d_o1_s02
sequence seq_d_o1_s03
sequence seq_d_o1_s04
sequence seq_d_o2_s023
sequence seq_d_o2_s032
sequence seq_d_o3_s08
sequence seq_cosmo4_rasputin
squad sq_fallen_upper_front01
squad sq_fallen_upper_back01
squad sq_fallen_upper_sniper01
squad sq_fallen_upper_anchors01
object o_terminal_invis_device
player_monitor pm_trigger_volume
squad sq_ds_hive_assault03

@startup()
script sc_intro():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_m_intro.start()
    seq_d_o1_s02.start()
    seq_d_o1_s04.start()
    sleep(3)
    seq_d_o1_s01.start()

@startup()
# dome_a cleared; the Ghost's lines at the Array follow the codes picked up
# (the mission's obj_m4_o1b)
script sc_array():
    sleep_until(dome_a_fallen_alive_count() > 0)
    sleep_until(dome_a_fallen_alive_count() == 0)
    seq_d_o1_s03.start()

@startup()
# the console working
script sc_console():
    sleep_until(o_terminal_invis_device.is_alive())
    sleep(3)
    seq_d_o2_s023.start()

@startup()
# the Hive ship that brings the waves arrives
script sc_assault():
    sleep_until(o_terminal_invis_device.is_alive())
    sleep_until(sq_ds_hive_assault03.alive_count() > 0)
    seq_d_o2_s032.start()

@startup()
# back in the control room once the Hive are dealt with
script sc_outro():
    sleep_until(o_terminal_invis_device.is_alive())
    sleep_until(not pm_trigger_volume.test_any_inside())
    sleep_until(pm_trigger_volume.test_any_inside())
    sleep(2)
    seq_d_o3_s08.start()
    sleep(12)
    seq_cosmo4_rasputin.start()

def dome_a_fallen_alive_count():
    return sq_fallen_upper_front01.alive_count() + sq_fallen_upper_back01.alive_count() + sq_fallen_upper_sniper01.alive_count() + sq_fallen_upper_anchors01.alive_count()
