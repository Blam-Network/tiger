# es\cosmo\dome_a\enc_dome_a_m4.es
#
# The Last Array's dome_a: Hive and Fallen fighting on the upper floor as the
# player passes through on the way to the Array. Both sides go to their posts
# when a player reaches the upper floor. From one retail capture: the later
# moves (the Hive pushing in, the Fallen falling back to their anchors) are
# that run's timings.

c_objective_sensor_host obj_dome_a_hive_m4
c_objective_sensor_host obj_dome_a_fallen_m4
c_player_monitor_sensor_host pm_players_domea_upper02
c_squad_sensor_host sq_hive_upper01
c_squad_sensor_host sq_hive_upper02
c_squad_sensor_host sq_hive_upper03
c_squad_sensor_host sq_fallen_upper_front01
c_squad_sensor_host sq_fallen_upper_back01
c_squad_sensor_host sq_fallen_upper_sniper01
c_squad_sensor_host sq_fallen_upper_anchors01
c_object_sensor_host o_door01

startup thread sc_dome_a:
    o_door01.create()
    o_door01.set_device_position(1)
    for sq in [sq_hive_upper01, sq_hive_upper02, sq_hive_upper03]:
        sq.set_objective(obj_dome_a_hive_m4)
    for sq in [sq_fallen_upper_front01, sq_fallen_upper_back01, sq_fallen_upper_sniper01, sq_fallen_upper_anchors01]:
        sq.set_objective(obj_dome_a_fallen_m4)
    sleep_until(pm_players_domea_upper02.test_any_inside())
    place_on_task(sq_hive_upper01, "0x185D6C4D")
    place_on_task(sq_hive_upper02, "task_4")
    place_on_task(sq_fallen_upper_front01, "task")
    place_on_task(sq_fallen_upper_back01, "task_1")
    place_on_task(sq_fallen_upper_sniper01, "task_5")
    place_on_task(sq_fallen_upper_anchors01, "0xE52F741B")
    sq_hive_upper03.set_task("task_8")
    sleep(17)
    sq_fallen_upper_front01.set_task("task_4")
    sq_hive_upper03.place()
    sq_hive_upper01.set_task("task")
    sq_hive_upper02.set_task("task")
    sq_hive_upper03.set_task("task")
    sleep(21)
    sq_fallen_upper_front01.set_task("0xE52F741B")
    sq_fallen_upper_back01.set_task("0xE52F741B")
    sq_fallen_upper_sniper01.set_task("0xE52F741B")

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
