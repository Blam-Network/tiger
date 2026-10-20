@activity_bundle("enc_lower_tower_amb")

@task(0x6CA06FA2, squad: sq_vex_btm01)
@task("goblins", squad: sq_vex_btm02)
objective obj_lower_tower_amb
@member_counts({goblins: 3, harpies: 2})
@objective(obj_lower_tower_amb)
squad sq_vex_btm01
@member_counts({goblins: 5})
@objective(obj_lower_tower_amb)
squad sq_vex_btm02
@member_counts({minotaur: 1, goblins: 2})
@objective(obj_lower_tower_amb)
squad sq_vex_btm03
@member_counts({goblins: 2, minotaur: 1})
@objective(obj_lower_tower_amb)
squad sq_vex_btm04
squad_group sqg_vex_btm
loot_lower_tower loot_venus_lower_tower_1





@startup()
script sc_main_thread():

    print("---------------------------------------------------------")
    print("TOWER ENCOUNTER CH4M4")
    print("---------------------------------------------------------")

    sqg_vex_btm.add_child(sq_vex_btm01)
    sqg_vex_btm.add_child(sq_vex_btm02)

    sc_tower_btm.wake()

script sc_tower_btm():

    sq_vex_btm01.respawn()
    sq_vex_btm02.respawn()

    sq_vex_btm03.respawn()
    sq_vex_btm04.respawn()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B800D
