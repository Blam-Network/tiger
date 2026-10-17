@activity_bundle("enc_thieves_den_amb1")
c_objective_sensor_host obj_thieves_den_amb1  # true name unknown
@member_counts({dregs: 3, vandal: 1}) c_squad_sensor_host sq_caldera_ent01
@member_counts({dregs: 2, shanks: 2}) c_squad_sensor_host sq_den_bottom01
@member_counts({dregs: 4}) c_squad_sensor_host sq_den_bottom02
@member_counts({vandals: 2, captain: 1}) c_squad_sensor_host sq_den_bottom03
@member_counts({dregs: 3}) c_squad_sensor_host sq_den_ledge01
@member_counts({dregs: 3}) c_squad_sensor_host sq_den_ledge02
@member_counts({shanks: 2, captain: 1}) c_squad_sensor_host sq_den_ledge03
@member_counts({dregs: 3}) c_squad_sensor_host sq_den_ledge04
@member_counts({vandal: 1}) c_squad_sensor_host sq_ledge_sniper01
@member_counts({vandal: 1}) c_squad_sensor_host sq_ledge_sniper02
@member_counts({dregs: 3}) c_squad_sensor_host sq_den_top01
c_squad_group_sensor_host sqg_den_bottom  # true name unknown
c_squad_group_sensor_host sqg_den_ledge  # true name unknown
c_squad_group_sensor_host sqg_den_top  # true name unknown
c_squad_group_sensor_host sqg_snipers  # true name unknown
c_trigger_volume_slot_host tv_bottom
c_trigger_volume_slot_host tv_top
c_player_trigger_sensor_host pt_bottom bind(tv_bottom)  # true name unknown
c_player_trigger_sensor_host pt_top bind(tv_top)  # true name unknown
loot_fallen_thieves_den loot_venus_fallen_thieves_den






startup thread sc_main_thread:
    thieves_den_high = false
    print("---------------------------------------------------------")
    print("THIEVES DEN ENCOUNTER AMBIENT ALL")
    print("---------------------------------------------------------")


    sqg_den_bottom.add_child(sq_den_bottom01)
    sqg_den_bottom.add_child(sq_den_bottom02)
    sqg_den_bottom.add_child(sq_den_bottom03)
    sqg_den_ledge.add_child(sq_den_ledge01)
    sqg_den_ledge.add_child(sq_den_ledge02)
    sqg_den_ledge.add_child(sq_den_ledge03)
    sqg_den_ledge.add_child(sq_den_ledge04)
    sqg_snipers.add_child(sq_ledge_sniper01)
    sqg_snipers.add_child(sq_ledge_sniper02)
    sqg_den_top.add_child(sq_den_top01)

    sq_caldera_ent01.respawn()
    sq_ledge_sniper01.respawn()
    sq_ledge_sniper02.respawn()

    sc_bottom.wake()
    sc_ledge.wake()
    sc_top.wake()


thread sc_bottom:

    sq_den_bottom01.respawn()
    sq_den_bottom02.respawn()
    sleep_until(sqg_den_bottom.alive_count() <= 6 and pt_bottom.is_triggered())
    sq_den_bottom03.respawn()

thread sc_ledge:

    sq_den_ledge01.respawn()
    sq_den_ledge02.respawn()
    sleep_until(sqg_den_ledge.alive_count() <= 4)
    sq_den_ledge03.respawn()
    sq_den_ledge04.respawn()

thread sc_top:

    sleep_until(pt_top.is_triggered())
    sq_den_top01.respawn()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8012
