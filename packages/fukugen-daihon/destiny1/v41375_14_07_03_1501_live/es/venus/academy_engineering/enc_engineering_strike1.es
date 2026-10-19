# es\venus\academy_engineering\enc_engineering_strike1.es
#
# The strike's engineering top floor. Mission 1 wakes the Fallen once the
# floor below is clear.

@activity_bundle("enc_engineering_strike1")

c_squad_group_sensor_host gr_top_floor  # true name unknown
c_squad_sensor_host sq_floor2_fallen01
c_squad_sensor_host sq_floor2_fallen02
c_squad_sensor_host sq_floor2_fallen03
c_squad_sensor_host sq_floor2_fallen04
c_squad_sensor_host sq_floor2_fallen05
c_objective_sensor_host obj_engineering_strike  # true name unknown
c_location_sensor_host engineering  # true name unknown
c_player_monitor_sensor_host pm_bubble_engineering bind(engineering)  # true name unknown

startup thread sc_main_thread:
    gr_top_floor.add_child(sq_floor2_fallen01)
    gr_top_floor.add_child(sq_floor2_fallen02)
    gr_top_floor.add_child(sq_floor2_fallen03)
    gr_top_floor.add_child(sq_floor2_fallen04)
    gr_top_floor.add_child(sq_floor2_fallen05)

thread sc_engineering_trash:
    respawn(sq_floor2_fallen01, obj_engineering_strike)
    respawn(sq_floor2_fallen02, obj_engineering_strike)
    respawn(sq_floor2_fallen03, obj_engineering_strike)
    respawn(sq_floor2_fallen04, obj_engineering_strike)
    respawn(sq_floor2_fallen05, obj_engineering_strike)

def respawn(sq, obj):
    obj.add_squad(sq)
    sq.respawn()
