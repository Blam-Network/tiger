# es\venus\academy_dig_site\enc_dig_site_strike1.es
#
# The strike's dig site encounter.

@activity_bundle("enc_dig_site_strike1")
c_squad_group_sensor_host sg_fallen  # true name unknown
c_squad_sensor_host sq_strike09
c_squad_sensor_host sq_strike10
c_squad_group_sensor_host sqg_strike05  # true name unknown
c_squad_sensor_host sq_strike05a
c_squad_sensor_host sq_strike05b
c_squad_sensor_host sq_strike05c
c_squad_sensor_host sq_strike01
c_squad_sensor_host sq_strike02
c_squad_sensor_host sq_strike03
c_squad_sensor_host sq_strike04
c_squad_sensor_host sq_strike06
c_squad_sensor_host sq_strike08
c_location_sensor_host dig_site  # true name unknown
c_player_monitor_sensor_host pm_bubble_dig_site bind(dig_site)  # true name unknown
c_trigger_volume_slot_host tv_dig_site_suicide
c_player_trigger_sensor_host pt_dig_site_suicide bind(tv_dig_site_suicide)  # true name unknown
c_squad_sensor_host sq_strike07
c_trigger_volume_slot_host tv_dig_site_hydra
c_player_trigger_sensor_host pt_dig_site_hydra bind(tv_dig_site_hydra)  # true name unknown

startup thread sc_main_thread:
    sg_fallen.add_child(sq_strike09)
    sg_fallen.add_child(sq_strike10)
    sqg_strike05.add_child(sq_strike05a)
    sqg_strike05.add_child(sq_strike05b)
    sqg_strike05.add_child(sq_strike05c)
    sq_strike01.place()
    sq_strike02.place()
    sq_strike03.place()
    sq_strike04.place()
    sq_strike05a.place()
    sq_strike05b.place()
    sq_strike05c.place()
    sq_strike06.place()
    sq_strike08.place()
    sq_strike10.place()
    sleep_until(pt_dig_site_hydra.is_triggered())
    sq_strike09.place()
    sleep_until(pt_dig_site_suicide.is_triggered())
    sq_strike07.place()
