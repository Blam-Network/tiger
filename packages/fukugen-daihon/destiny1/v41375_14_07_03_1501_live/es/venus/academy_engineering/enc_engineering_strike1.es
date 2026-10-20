# es\venus\academy_engineering\enc_engineering_strike1.es
#
# The strike's engineering top floor. Mission 1 wakes the Fallen once the
# floor below is clear.

@activity_bundle("enc_engineering_strike1")

squad_group gr_top_floor
squad sq_floor2_fallen01
squad sq_floor2_fallen02
squad sq_floor2_fallen03
squad sq_floor2_fallen04
squad sq_floor2_fallen05
objective obj_engineering_strike
location engineering
player_monitor pm_bubble_engineering bind(engineering)

@startup()
script sc_main_thread():
    gr_top_floor.add_child(sq_floor2_fallen01)
    gr_top_floor.add_child(sq_floor2_fallen02)
    gr_top_floor.add_child(sq_floor2_fallen03)
    gr_top_floor.add_child(sq_floor2_fallen04)
    gr_top_floor.add_child(sq_floor2_fallen05)

script sc_engineering_trash():
    respawn(sq_floor2_fallen01, obj_engineering_strike)
    respawn(sq_floor2_fallen02, obj_engineering_strike)
    respawn(sq_floor2_fallen03, obj_engineering_strike)
    respawn(sq_floor2_fallen04, obj_engineering_strike)
    respawn(sq_floor2_fallen05, obj_engineering_strike)

def respawn(sq, obj):
    obj.add_squad(sq)
    sq.respawn()
