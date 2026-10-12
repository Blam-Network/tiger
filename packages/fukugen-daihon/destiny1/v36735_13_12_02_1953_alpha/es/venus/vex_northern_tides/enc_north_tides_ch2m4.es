c_location_sensor_host northern_tides  # true name unknown
c_player_monitor_sensor_host pm_bubble_northern_tides bind(northern_tides)  # true name unknown
c_objective_sensor_host obj_north_tides_ch2m4  # true name unknown
c_squad_sensor_host sq_hill_btm01
c_squad_sensor_host sq_hill_btm02
c_squad_sensor_host sq_hill_btm03
c_squad_sensor_host sq_hill_mid01
c_squad_sensor_host sq_hill_mid02
c_squad_sensor_host sq_hill_mid03
c_squad_sensor_host sq_hill_mid04
c_squad_group_sensor_host sg_bottom  # true name unknown
c_trigger_volume_slot_host tv_mid_level_fall
c_player_trigger_sensor_host pt_mid_level_fall bind(tv_mid_level_fall)  # true name unknown
c_trigger_volume_slot_host tv_end_level_fall
c_player_trigger_sensor_host pt_end_level_fall bind(tv_end_level_fall)  # true name unknown
bool mid_obj_enc_c2m4 = true
bool end_obj_enc_c2m4 = true
loot_north_tides loot_venus_north_tides_1









startup thread ss_north_tides_ch2m4:
    print("script startup")

    sg_bottom.add_child(sq_hill_btm01)
    sg_bottom.add_child(sq_hill_btm02)
    sg_bottom.add_child(sq_hill_btm03)

    sc_obj_enc_c2m4a.wake()
    sc_obj_enc_c2m4b.wake()
    sc_spawn_guards.wake()



thread sc_obj_enc_c2m4a:
    sleep_until(pt_mid_level_fall.is_triggered())
    mid_obj_enc_c2m4 = false

thread sc_obj_enc_c2m4b:
    sleep_until(pt_end_level_fall.is_triggered())
    end_obj_enc_c2m4 = false

thread sc_spawn_guards:

    sq_hill_btm01.place()
    sq_hill_btm02.place()
    sq_hill_btm03.place()

    sq_hill_mid01.place()
    sq_hill_mid02.place()
    sq_hill_mid03.place()
    sq_hill_mid04.place()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B800E
