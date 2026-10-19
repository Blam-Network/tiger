@activity_bundle("enc_north_tides_ch2m4")

c_location_sensor_host northern_tides  # true name unknown
c_player_monitor_sensor_host pm_bubble_northern_tides bind(northern_tides)  # true name unknown
@task(0x73B0C464, squad: sg_bottom, condition: mid_obj_enc_c2m4)
@task(0x8C09B1D0, squad: sq_hill_btm02)
@task(0x8C09B1D3, squad: sq_hill_btm01)
@task(0x8C09B1D1, squad: sq_hill_btm03)
@task(0xD85A22BB, condition: end_obj_enc_c2m4)
@task(0xCFB51993, squad: sq_hill_mid04)
@task(0x1B1F51C9, squad: sq_hill_mid01)
c_objective_sensor_host obj_north_tides_ch2m4  # true name unknown
@member_counts({goblins: 3})
@objective(obj_north_tides_ch2m4)
c_squad_sensor_host sq_hill_btm01
@member_counts({goblins: 3})
@objective(obj_north_tides_ch2m4)
c_squad_sensor_host sq_hill_btm02
@member_counts({hobgoblin: 2})
@objective(obj_north_tides_ch2m4)
c_squad_sensor_host sq_hill_btm03
@member_counts({hobgoblins: 2})
@objective(obj_north_tides_ch2m4)
c_squad_sensor_host sq_hill_mid01
@member_counts({goblins: 3})
@objective(obj_north_tides_ch2m4)
c_squad_sensor_host sq_hill_mid02
@member_counts({goblins: 3})
@objective(obj_north_tides_ch2m4)
c_squad_sensor_host sq_hill_mid03
@member_counts({goblins: 1})
@objective(obj_north_tides_ch2m4)
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
