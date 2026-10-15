# es\mars\gatehouse\enc_gatehouse_m05.es
#
# The Garden's Spire's gatehouse. The gatehouse's dynamics and doors are made
# as the bubble loads. Mission 5 wakes the ambush when the player reaches
# the wall: the alarm sounds, the side doors close the player in and three
# waves of Cabal come through, each announced, the next one a few seconds
# after the last of the one before is dead. A wave that has taken losses
# falls back to its second task. Once the door button is used mission 5
# wakes the miniboss, which comes out of the ambush door with its backup.
# From one retail capture (2.3.1): every wait is that run's. Retail's
# miniboss task (2.3.1's eighth) is not in TU0's list, so it takes the task
# retail fell back to.

c_objective_sensor_host obj_gatehouse_m05
static_array<c_object_sensor_host, 20> dynamics
c_object_sensor_host mc_door_left
c_object_sensor_host mc_door_right
c_object_sensor_host mc_door_a
c_object_sensor_host mc_door_b
c_object_sensor_host ambush_door
c_object_sensor_host o_device_invis_ambush
c_squad_sensor_host sq_wave_1_a
c_squad_sensor_host sq_wave_1_b
c_squad_sensor_host sq_wave_2_a
c_squad_sensor_host sq_wave_2_b
c_squad_sensor_host sq_wave_3_a
c_squad_sensor_host sq_wave_3_b
c_squad_sensor_host sq_miniboss
c_squad_sensor_host sq_miniboss_backup
c_sequence_host seq_alarm
c_sequence_host seq_wave_announce1
c_sequence_host seq_wave_announce2
c_sequence_host seq_wave_announce3
bool ambush_complete = false

startup thread sc_gatehouse:
    for dynamic in dynamics:
        dynamic.create()
    sleep(1)
    for door in [mc_door_left, mc_door_right, ambush_door, o_device_invis_ambush]:
        door.create()
        door.set_device_position(0)
    for sq in [sq_wave_1_a, sq_wave_1_b, sq_wave_2_a, sq_wave_2_b, sq_wave_3_a, sq_wave_3_b, sq_miniboss, sq_miniboss_backup]:
        sq.set_objective(obj_gatehouse_m05)

# the ambush: woken by mission 5 at the wall
thread sc_waves:
    place_on_task(sq_wave_1_a, "0xD15FEA85")
    place_on_task(sq_wave_1_b, "0xD15FEA85")
    mc_door_left.set_device_position(1)
    mc_door_right.set_device_position(1)
    mc_door_a.create()
    mc_door_b.create()
    o_device_invis_ambush.set_device_position(1)
    seq_alarm.start()
    seq_wave_announce1.start()
    sleep(2)
    sleep_until(sq_wave_1_a.alive_count() <= 1)
    sq_wave_1_a.set_task("0xFD3EEAFD")
    sleep_until(sq_wave_1_a.alive_count() + sq_wave_1_b.alive_count() == 0)
    sleep(5)

    # the second wave: the side doors open again
    place_on_task(sq_wave_2_a, "0xFD3EEAFE")
    place_on_task(sq_wave_2_b, "0xFD3EEAFE")
    mc_door_left.set_device_position(0)
    mc_door_right.set_device_position(0)
    seq_wave_announce2.start()
    sleep(2)
    sleep_until(sq_wave_2_a.alive_count() <= 1)
    sq_wave_2_a.set_task("0x73A5C503")
    sleep_until(sq_wave_2_a.alive_count() + sq_wave_2_b.alive_count() == 0)
    sleep(4)

    # the third
    place_on_task(sq_wave_3_a, "0x73A5C500")
    place_on_task(sq_wave_3_b, "0x73A5C500")
    seq_wave_announce3.start()
    sleep(18)
    sq_wave_3_a.set_task("0xB9BB1408")
    sq_wave_3_b.set_task("0xB9BB1408")
    sleep_until(sq_wave_3_a.alive_count() + sq_wave_3_b.alive_count() == 0)
    sleep(1.5)
    seq_alarm.stop()
    sleep(2.5)
    ambush_complete = true

# the miniboss: woken by mission 5 once the door button has been used
thread sc_miniboss:
    sleep(0.7)
    place_on_task(sq_miniboss, "0xFD3EEAFF")
    place_on_task(sq_miniboss_backup, "0xFD3EEAFF")
    ambush_door.set_device_position(1)
    mc_door_a.delete_object()
    mc_door_b.delete_object()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
