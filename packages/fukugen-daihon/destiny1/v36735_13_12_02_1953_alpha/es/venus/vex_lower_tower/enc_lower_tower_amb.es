@activity_bundle("enc_lower_tower_amb")

c_objective_sensor_host obj_lower_tower_amb  # true name unknown
@member_counts({goblins: 3, harpies: 2})
c_squad_sensor_host sq_vex_btm01
@member_counts({goblins: 5})
c_squad_sensor_host sq_vex_btm02
@member_counts({minotaur: 1, goblins: 2})
c_squad_sensor_host sq_vex_btm03
@member_counts({goblins: 2, minotaur: 1})
c_squad_sensor_host sq_vex_btm04
c_squad_group_sensor_host sqg_vex_btm  # true name unknown
loot_lower_tower loot_venus_lower_tower_1





startup thread sc_main_thread:

    print("---------------------------------------------------------")
    print("TOWER ENCOUNTER CH4M4")
    print("---------------------------------------------------------")

    sqg_vex_btm.add_child(sq_vex_btm01)
    sqg_vex_btm.add_child(sq_vex_btm02)

    sc_tower_btm.wake()

thread sc_tower_btm:

    sq_vex_btm01.respawn()
    sq_vex_btm02.respawn()

    sq_vex_btm03.respawn()
    sq_vex_btm04.respawn()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B800D
