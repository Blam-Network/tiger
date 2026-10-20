@activity_bundle("enc_engineering_strike1")

u_globals utils
location engineering
player_monitor pm_bubble_engineering bind(engineering)
@member_counts({vandals: 3})
@objective(obj_engineering_strike)
squad sq_floor2_fallen01
@member_counts({vandal: 3})
@objective(obj_engineering_strike)
squad sq_floor2_fallen02
@member_counts({shank: 1})
@objective(obj_engineering_strike)
squad sq_floor2_fallen03
@member_counts({shank: 1})
@objective(obj_engineering_strike)
squad sq_floor2_fallen04
squad_group gr_top_floor
loot_engineering loot_venus_engineering_1
@task("floor2", squad: gr_top_floor)
@task("captain", squad: sq_floor2_fallen01)
objective obj_engineering_strike







@startup()
script sc_main_thread():

    gr_top_floor.add_child(sq_floor2_fallen01)
    gr_top_floor.add_child(sq_floor2_fallen02)
    gr_top_floor.add_child(sq_floor2_fallen03)
    gr_top_floor.add_child(sq_floor2_fallen04)




script sc_engineering_trash():
    respawn(sq_floor2_fallen01, obj_engineering_strike)
    respawn(sq_floor2_fallen02, obj_engineering_strike)
    respawn(sq_floor2_fallen03, obj_engineering_strike)
    respawn(sq_floor2_fallen04, obj_engineering_strike)




def respawn(sq, obj):
    obj.add_squad(sq)
    sq.respawn()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B801A
