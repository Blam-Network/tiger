# es\cosmo\mission_pact\unknown_61b048de.es
#
# The refinery in the pact mission: its Fallen, their Servitor and the Hive
# are already fighting as the player comes in, each squad on its own task.
# Walking on sends in the Hive runners, and the Hive faction trigger their
# guards. Names that were never cracked are written as "0x" literals. From
# one retail capture.

@activity_bundle(0x61B048DE)

objective obj_fallen_refinery
objective obj_hive_refinery
squad sq_fallen_strike01
squad sq_fallen_strike02
squad sq_fallen_pod01
squad sq_fallen_pod02
squad sq_fallen_guards01
squad sq_fallen_guards02
squad sq_fallen_servitor
squad sq_hive_strike01
squad sq_hive_strike02
squad sq_hive_pod01
squad sq_hive_pod02
squad sq_hive_runners01
squad sq_hive_guards01
trigger_volume tv_hive_runners_spawn
player_monitor pm_hive_runners_spawn bind(tv_hive_runners_spawn)
player_trigger pt_hive_faction_spawn
bool placed = false

@startup()
script sc_refinery_main():
    for sq in [sq_fallen_strike01, sq_fallen_strike02, sq_fallen_pod01, sq_fallen_pod02, sq_fallen_guards01, sq_fallen_guards02, sq_fallen_servitor]:
        sq.set_objective(obj_fallen_refinery)
    for sq in [sq_hive_strike01, sq_hive_strike02, sq_hive_pod01, sq_hive_pod02, sq_hive_runners01, sq_hive_guards01]:
        sq.set_objective(obj_hive_refinery)
    sq_fallen_strike01.set_task("task_1")
    sq_fallen_strike02.set_task("task_2")
    sq_fallen_pod01.set_task("task_3")
    sq_fallen_pod02.set_task("task_4")
    sq_fallen_guards01.set_task("task_5")
    sq_fallen_guards02.set_task("task_6")
    sq_fallen_servitor.set_task("task")
    sq_hive_strike01.set_task("task")
    sq_hive_strike02.set_task("task_1")
    sq_hive_pod01.set_task("task_3")
    sq_hive_pod02.set_task("task_4")
    for sq in [sq_hive_pod02, sq_fallen_strike02, sq_fallen_pod01, sq_fallen_guards01, sq_fallen_strike01, sq_fallen_guards02, sq_hive_strike02, sq_fallen_pod02, sq_hive_pod01, sq_fallen_servitor, sq_hive_strike01]:
        sq.place()
    placed = true
    sc_hive_runners.wake()
    sc_hive_guards.wake()

script sc_hive_runners():
    sleep_until(pm_hive_runners_spawn.test_any_inside())
    sq_hive_runners01.set_task("task_5")
    sq_hive_runners01.place()

script sc_hive_guards():
    sleep_until(pt_hive_faction_spawn.is_triggered())
    sq_hive_guards01.set_task("task_8")
    sq_hive_guards01.place()

def servitor_is_dead():
    return placed and sq_fallen_servitor.alive_count() == 0
