# es\cosmo\mission_pact\unknown_99f4fbfa.es
#
# The hive shore in the pact mission: the Fallen and Hive at the grotto's
# entrance are fighting as the player arrives; the entrance trigger sends in
# the Hive thralls, the cave trigger the Servitor and the cave's Fallen and
# Hive, and a trigger deeper in the last two Fallen squads. The grotto is
# clear once all of the cave's squads are dead. Names that were never cracked
# are written as "0x" literals. From one retail capture: the road squads, the
# pike guards and the entrance dropship never went in.

@activity_bundle(0x99F4FBFA)

objective obj_fallen_hive_shore
objective obj_hive_hive_shore
squad sq_fallen_pike_guards01
squad sq_fallen_pike_guards02
squad sq_fallen_entrance01
squad sq_fallen_entrance02
squad sq_fallen_entrance03
squad sq_fallen_servitor
squad sq_fallen_cave02
squad sq_fallen_cave03
squad sq_fallen_cave04a
squad sq_fallen_cave04b
squad sq_hive_road_base01
squad sq_hive_road_mid01
squad sq_hive_road_mid03
squad sq_hive_entrance_front01
squad sq_hive_entrance_front02
squad sq_hive_entrance_shrieker01
squad sq_hive_entrance_back01
squad sq_hive_entrance_back02
squad sq_hive_entrance_thrall01
squad sq_hive_cave_left01
squad sq_hive_cave_right01
player_trigger pt_entrance_activate
player_trigger pt_cave_spawn
player_trigger pt_fallen_cave_04_spawn

@startup()
script sc_hive_shore_main():
    for sq in [sq_fallen_pike_guards01, sq_fallen_pike_guards02, sq_fallen_entrance01, sq_fallen_entrance02, sq_fallen_entrance03, sq_fallen_servitor, sq_fallen_cave02, sq_fallen_cave03, sq_fallen_cave04a, sq_fallen_cave04b]:
        sq.set_objective(obj_fallen_hive_shore)
    for sq in [sq_hive_road_base01, sq_hive_road_mid01, sq_hive_road_mid03, sq_hive_entrance_front01, sq_hive_entrance_front02, sq_hive_entrance_shrieker01, sq_hive_entrance_back01, sq_hive_entrance_back02, sq_hive_entrance_thrall01, sq_hive_cave_left01, sq_hive_cave_right01]:
        sq.set_objective(obj_hive_hive_shore)
    sq_fallen_entrance02.set_task("task_2")
    sq_fallen_entrance03.set_task("task_3")
    sq_hive_entrance_front01.set_task("task_3")
    sq_hive_entrance_front02.set_task("task_4")
    sq_hive_entrance_back01.set_task("task_5")
    sq_hive_entrance_back02.set_task("task_6")
    for sq in [sq_hive_entrance_shrieker01, sq_hive_entrance_front01, sq_hive_entrance_front02, sq_fallen_entrance03, sq_fallen_entrance02, sq_hive_entrance_back01, sq_hive_entrance_back02]:
        sq.place()
    sc_entrance.wake()
    sc_cave.wake()
    sc_cave04.wake()

script sc_entrance():
    sleep_until(pt_entrance_activate.is_triggered())
    sq_hive_entrance_thrall01.set_task("task_7")
    sq_hive_entrance_thrall01.place()

script sc_cave():
    sleep_until(pt_cave_spawn.is_triggered())
    sq_fallen_servitor.set_task("task_4")
    sq_fallen_cave02.set_task("task_5")
    sq_fallen_cave03.set_task("task_8")
    sq_hive_cave_left01.set_task("task_8")
    sq_hive_cave_right01.set_task("task_9")
    for sq in [sq_fallen_servitor, sq_fallen_cave02, sq_fallen_cave03, sq_hive_cave_left01, sq_hive_cave_right01]:
        sq.place()

script sc_cave04():
    sleep_until(pt_fallen_cave_04_spawn.is_triggered())
    sq_fallen_cave04a.set_task("task_7")
    sq_fallen_cave04a.place()
    sleep(1)
    sq_fallen_cave04b.set_task("task_7")
    sq_fallen_cave04b.place()

def servitor_is_dead():
    return pt_cave_spawn.is_triggered() and sq_fallen_servitor.alive_count() == 0

def grotto_is_clear():
    if not pt_fallen_cave_04_spawn.is_triggered():
        return false
    return sq_fallen_cave02.alive_count() + sq_fallen_cave03.alive_count() + sq_fallen_cave04a.alive_count() + sq_fallen_cave04b.alive_count() + sq_hive_cave_left01.alive_count() + sq_hive_cave_right01.alive_count() == 0
