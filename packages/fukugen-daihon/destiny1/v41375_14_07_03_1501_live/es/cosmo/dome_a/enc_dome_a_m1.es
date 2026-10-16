# es\cosmo\dome_a\enc_dome_a_m1.es
#
# Dome A in the first dome mission: the Hive hold the basement and the upper
# floor, each group coming on as the player reaches its trigger. The door
# scan is a placement the player uses; once its device finishes the thrall
# and troopers are loosed, and the door below opens as the thralls fall.
# The upper floor wakes when a player reaches the top of the stairs, and the
# wizard's death releases the last of the rush. From one retail capture: the
# gaps without a trigger on the wire are that run's waits.

@activity_bundle("enc_dome_a_m1")
c_objective_sensor_host obj_hive_dome_a01
c_object_sensor_host o_door01
c_player_monitor_sensor_host pm_basement_cleanup
c_player_trigger_sensor_host pt_spawn_hive_intro01
c_player_trigger_sensor_host pt_spawn_hive_intro02
c_player_trigger_sensor_host pt_spawn_hive_intro02_force
c_player_trigger_sensor_host pt_thrall_unfreeze
c_sequence_host seq_hive_wave_announce
interactable_placement obj_placement_m1_o1b bind("0x3EA60D3D")
c_squad_sensor_host sq_hive_scare02a
c_squad_sensor_host sq_hive_scare02b
c_squad_sensor_host sq_hive_scare02c
c_squad_sensor_host sq_hive_scare02d
c_squad_sensor_host sq_hive_basement_thrall01
c_squad_sensor_host sq_hive_basement_troopers01
c_squad_sensor_host sq_hive_basement_troopers02
c_squad_sensor_host sq_hive_upper_front01
c_squad_sensor_host sq_hive_upper_front02
c_squad_sensor_host sq_hive_upper_front03
c_squad_sensor_host sq_hive_upper_back01
c_squad_sensor_host sq_hive_upper_back02
c_squad_sensor_host sq_hive_upper_wizard01
c_squad_sensor_host sq_hive_upper_rush01
c_squad_sensor_host sq_hive_upper_rush02

startup thread sc_dome_a:
    for sq in [sq_hive_scare02a, sq_hive_scare02b, sq_hive_scare02c, sq_hive_scare02d, sq_hive_basement_thrall01, sq_hive_basement_troopers01, sq_hive_basement_troopers02, sq_hive_upper_front01, sq_hive_upper_front02, sq_hive_upper_front03, sq_hive_upper_back01, sq_hive_upper_back02, sq_hive_upper_wizard01, sq_hive_upper_rush01, sq_hive_upper_rush02]:
        sq.set_objective(obj_hive_dome_a01)
    sc_scan.wake()
    sc_intro01.wake()
    sc_intro02.wake()
    sc_intro02_force.wake()
    sc_upper.wake()

# the door scan: the device runs while the Ghost works, then the basement
# is loosed (frozen until the player goes down)
thread sc_scan:
    console = obj_placement_m1_o1b._object
    sleep_until(console.is_active())
    console.set_device_position(0.4)
    sleep(5.2)
    console.set_device_position(1)
    sleep(1.1)
    place_on_task(sq_hive_basement_thrall01, "0x0A52BC0C")
    place_on_task(sq_hive_basement_troopers01, "0x8F0587D7")
    sleep_until(sq_hive_basement_thrall01.alive_count() == 0)
    o_door01.set_device_position(1)
    sleep(2.5)
    sq_hive_scare02b.place()
    sleep(0.5)
    sq_hive_scare02a.place()
    sq_hive_scare02c.place()
    sleep(0.5)
    sq_hive_scare02d.place()

thread sc_intro01:
    sleep_until(pt_spawn_hive_intro01.is_triggered())
    sq_hive_basement_thrall01.set_task("0xC0A49850")
    seq_hive_wave_announce.start()

thread sc_intro02:
    sleep_until(pt_spawn_hive_intro02.is_triggered())
    sq_hive_basement_troopers01.set_task("task_3")

thread sc_intro02_force:
    sleep_until(pt_spawn_hive_intro02_force.is_triggered())
    sq_hive_basement_troopers02.set_task("0x8F0587DE")
    sleep(3.4)
    sq_hive_basement_troopers01.set_task("0x2B7C8512")

# the upper floor wakes when a player reaches the top; the wizard's death
# releases the rush
thread sc_upper:
    sleep_until(pt_thrall_unfreeze.is_triggered())
    sq_hive_upper_front03.set_task("0x355B0386")
    sq_hive_upper_back01.set_task("0x8E05866A")
    sq_hive_upper_wizard01.set_task("0x8F0587D6")
    sq_hive_upper_wizard01.place()
    sleep(0.4)
    sq_hive_upper_front02.set_task("task")
    sleep(0.8)
    sq_hive_upper_wizard01.set_task("0x8F0587D9")
    sleep_until_dead(sq_hive_upper_front01)
    sleep(1.8)
    sq_hive_upper_front02.set_task("0x8E058669")
    sq_hive_upper_front03.set_task("0x8E058669")
    sleep(3.5)
    sq_hive_upper_front02.set_task("0x8F0587DD")
    sq_hive_upper_front03.set_task("0x8F0587DD")
    sq_hive_upper_rush01.set_task("0x185D6C4D")
    sleep_until_dead(sq_hive_upper_wizard01)
    sleep(0.1)
    sq_hive_upper_wizard01.set_task("0x8F0587D6")
    sleep(0.7)
    sq_hive_upper_rush02.set_task("0x8F0587DA")
    sq_hive_upper_back02.set_task("0x537FECCB")

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def sleep_until_dead(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)
