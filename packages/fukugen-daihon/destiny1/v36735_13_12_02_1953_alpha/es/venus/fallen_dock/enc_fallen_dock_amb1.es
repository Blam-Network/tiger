@activity_bundle("enc_fallen_dock_amb1")

u_globals utils
@task("den_entrance", squad: sq_den_entrance)
@task("dock_anchor", squad: sq_dock_anchor)
@task("dock_outdoors", squad: sqg_dock_outdoors)
@task("dock_snipers", squad: sqg_dock_snipers)
@task("dock_bridge", squad: sqg_dock_bridge)
@task("bridge_snipers", squad: sqg_bridge_snipers)
@task("bay", squad: sqg_bay)
@task("sniper", squad: sq_bay02)
objective obj_fallen_dock_amb1
@member_counts({dregs: 3, vandals: 2})
@objective(obj_fallen_dock_amb1)
squad sq_den_entrance
@member_counts({dregs: 3, servitor: 1})
@objective(obj_fallen_dock_amb1)
squad sq_dock01
@member_counts({dregs: 3, vandal: 1})
@objective(obj_fallen_dock_amb1)
squad sq_dock02
@member_counts({dregs: 2, vandal: 2})
@objective(obj_fallen_dock_amb1)
squad sq_dock03
@member_counts({shanks: 4})
@objective(obj_fallen_dock_amb1)
squad sq_dock04
@member_counts({captain: 1, vandal: 2})
@objective(obj_fallen_dock_amb1)
squad sq_dock_anchor
@member_counts({vandal_snipers: 1})
@objective(obj_fallen_dock_amb1)
squad sq_dock_sniper01
@member_counts({vandal_snipers: 1})
@objective(obj_fallen_dock_amb1)
squad sq_dock_sniper02
@member_counts({shanks: 4})
@objective(obj_fallen_dock_amb1)
squad sq_bridge01
@member_counts({dreg: 3, vandal: 1})
@objective(obj_fallen_dock_amb1)
squad sq_bridge02
@member_counts({vandal_snipers: 1})
@objective(obj_fallen_dock_amb1)
squad sq_bridge_sniper01
@member_counts({vandal_snipers: 1})
@objective(obj_fallen_dock_amb1)
squad sq_bridge_sniper02
@member_counts({dregs: 4})
@objective(obj_fallen_dock_amb1)
squad sq_bay01
@member_counts({dregs: 2})
@objective(obj_fallen_dock_amb1)
squad sq_bay02
@member_counts({vandal_snipers: 2})
@objective(obj_fallen_dock_amb1)
squad sq_bay_snipers
squad_group sqg_dock_outdoors
squad_group sqg_dock_snipers
squad_group sqg_dock_bridge
squad_group sqg_bridge_snipers
squad_group sqg_bay
trigger_volume tv_dock01
trigger_volume tv_dock02
player_trigger pt_dock01 bind(tv_dock01)
player_trigger pt_dock02 bind(tv_dock02)
loot_fallen_dock loot_venus_fallen_dock








@startup()
script sc_main_thread():

    sleep(3)
    print("---------------------------------------------------------")
    print("FALLEN DOCK ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")

    sqg_dock_outdoors.add_child(sq_dock01)
    sqg_dock_outdoors.add_child(sq_dock02)
    sqg_dock_outdoors.add_child(sq_dock03)
    sqg_dock_outdoors.add_child(sq_dock04)
    sqg_dock_snipers.add_child(sq_dock_sniper01)
    sqg_dock_snipers.add_child(sq_dock_sniper02)
    sqg_dock_bridge.add_child(sq_bridge01)
    sqg_dock_bridge.add_child(sq_bridge02)
    sqg_bridge_snipers.add_child(sq_bridge_sniper01)
    sqg_bridge_snipers.add_child(sq_bridge_sniper02)
    sqg_bay.add_child(sq_bay01)
    sqg_bay.add_child(sq_bay02)
    sqg_bay.add_child(sq_bay_snipers)

    sc_bridge_spawn.wake()


    sq_den_entrance.respawn()
    sq_dock01.respawn()
    sq_dock02.respawn()

    sq_dock04.respawn()
    sq_dock_anchor.respawn()
    sq_dock_sniper01.respawn()
    sq_dock_sniper02.respawn()


    sq_bay_snipers.respawn()
    sq_bridge_sniper01.respawn()
    sq_bridge_sniper02.respawn()

script sc_bridge_spawn():

    sleep_until(pt_dock01.is_triggered() and not pt_dock02.is_triggered() and sq_den_entrance.alive_count() + sq_dock_anchor.alive_count() + sqg_dock_outdoors.alive_count() <= 12)

    sq_bay01.respawn()

    sq_bridge01.respawn()
    sq_bridge02.respawn()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8007
