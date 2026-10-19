@activity_bundle("enc_engineering_strike1")

u_globals utils
c_location_sensor_host engineering  # true name unknown
c_player_monitor_sensor_host pm_bubble_engineering bind(engineering)  # true name unknown
@member_counts({vandals: 3})
c_squad_sensor_host sq_floor2_fallen01
@member_counts({vandal: 3})
c_squad_sensor_host sq_floor2_fallen02
@member_counts({shank: 1})
c_squad_sensor_host sq_floor2_fallen03
@member_counts({shank: 1})
c_squad_sensor_host sq_floor2_fallen04
c_squad_group_sensor_host gr_top_floor  # true name unknown
loot_engineering loot_venus_engineering_1
c_objective_sensor_host obj_engineering_strike  # true name unknown







startup thread sc_main_thread:

    gr_top_floor.add_child(sq_floor2_fallen01)
    gr_top_floor.add_child(sq_floor2_fallen02)
    gr_top_floor.add_child(sq_floor2_fallen03)
    gr_top_floor.add_child(sq_floor2_fallen04)




thread sc_engineering_trash:
    respawn(sq_floor2_fallen01, obj_engineering_strike)
    respawn(sq_floor2_fallen02, obj_engineering_strike)
    respawn(sq_floor2_fallen03, obj_engineering_strike)
    respawn(sq_floor2_fallen04, obj_engineering_strike)




def respawn(sq, obj):
    obj.add_squad(sq)
    sq.respawn()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B801A
