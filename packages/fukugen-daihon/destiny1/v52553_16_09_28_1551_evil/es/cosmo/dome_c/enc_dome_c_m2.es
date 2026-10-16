# es\cosmo\dome_c\enc_dome_c_m2.es
#
# Dome C in the second dome mission: the Fallen hold the pipe room, the
# guards' hall and then the dome itself, each group coming on as the one
# before it dies or as the player reaches its trigger. The console (a
# placement the player uses) is mission 3's; the beacon (a placement the
# player destroys) is mission 5's. Once the console is used the guards fall
# back and three waves come in. From one retail capture: where a step has no
# trigger on the wire, the wait is that run's.

@activity_bundle("enc_dome_c_m2")
c_objective_sensor_host obj_fallen_dome_c_m2_piperoom
c_objective_sensor_host obj_fallen_dome_c_m2_guards
c_object_sensor_host o_basement_door01
c_player_trigger_sensor_host pt_fallen_guards_spawn01
c_player_trigger_sensor_host pt_fallen_guards_spawn02
c_sequence_host seq_fallen_wave_announce
interactable_placement obj_placement_m2_o3a
destructible_placement obj_placement_m2_o4b
c_squad_sensor_host sq_fallen_piperoom01a
c_squad_sensor_host sq_fallen_piperoom01b
c_squad_sensor_host sq_fallen_piperoom02a
c_squad_sensor_host sq_fallen_piperoom02b
c_squad_sensor_host sq_fallen_piperoom_reinf01
c_squad_sensor_host sq_fallen_guards01
c_squad_sensor_host sq_fallen_guards02a
c_squad_sensor_host sq_fallen_guards02b
c_squad_sensor_host sq_fallen_guards02c
c_squad_sensor_host sq_fallen_guards02d
c_squad_sensor_host sq_fallen_wave01a
c_squad_sensor_host sq_fallen_wave01b
c_squad_sensor_host sq_fallen_wave01c
c_squad_sensor_host sq_fallen_wave02a
c_squad_sensor_host sq_fallen_wave02b
c_squad_sensor_host sq_fallen_wave02c
c_squad_sensor_host sq_fallen_wave02d
c_squad_sensor_host sq_fallen_wave02e
c_squad_sensor_host sq_fallen_wave03a
c_squad_sensor_host sq_fallen_wave03b

startup thread sc_dome_c_m2:
    obj_placement_m2_o3a._object_filter.add_players_with_activity_flag(obj_placement_m2_o3a._object.import_identifier())
    obj_placement_m2_o3a._object.set_enabled_player_filter(obj_placement_m2_o3a._object_filter)
    obj_placement_m2_o3a._object.create()
    for sq in [sq_fallen_piperoom01a, sq_fallen_piperoom01b, sq_fallen_piperoom02a, sq_fallen_piperoom02b, sq_fallen_piperoom_reinf01]:
        sq.set_objective(obj_fallen_dome_c_m2_piperoom)
    for sq in [sq_fallen_guards01, sq_fallen_guards02a, sq_fallen_guards02b, sq_fallen_guards02c, sq_fallen_guards02d, sq_fallen_wave01a, sq_fallen_wave01b, sq_fallen_wave01c, sq_fallen_wave02a, sq_fallen_wave02b, sq_fallen_wave02c, sq_fallen_wave02d, sq_fallen_wave02e, sq_fallen_wave03a, sq_fallen_wave03b]:
        sq.set_objective(obj_fallen_dome_c_m2_guards)
    sc_piperoom.wake()
    sc_guards_trigger01.wake()
    sc_guards_trigger02.wake()
    sc_guards.wake()
    sc_waves.wake()

# the pipe room: the first two squads are already in it; once they are dead
# they are tasked again, the door below opens, then the second pair and the
# reinforcements come
thread sc_piperoom:
    sleep_until_dead(sq_fallen_piperoom01b)
    sq_fallen_piperoom01a.set_task("0x2B7C851E")
    sq_fallen_piperoom01b.set_task("0x2B7C851E")
    sleep(1.3)
    o_basement_door01.set_device_position(1)
    sleep(3)
    sq_fallen_piperoom02a.set_task("0x8F0587D9")
    sq_fallen_piperoom02b.set_task("0x2B7C851E")
    sleep_until_dead(sq_fallen_piperoom02a)
    sq_fallen_piperoom_reinf01.set_task("0xA422EB12")
    sleep(5.3)
    sq_fallen_piperoom_reinf01.set_task("0x2B7C851D")

# the guards' hall wakes as the player reaches each trigger
thread sc_guards_trigger01:
    sleep_until(pt_fallen_guards_spawn01.is_triggered())
    sq_fallen_guards01.set_task("0x2B7C8518")

thread sc_guards_trigger02:
    sleep_until(pt_fallen_guards_spawn02.is_triggered())
    place_on_task(sq_fallen_guards02a, "0x8F0587DD")
    place_on_task(sq_fallen_guards02b, "0x8F0587DD")
    sleep(0.5)
    place_on_task(sq_fallen_guards02c, "0x8F0587DD")
    sleep(0.8)
    place_on_task(sq_fallen_guards02d, "0x8F0587DD")

# the first group charges once the last of the hall is in; the hall's second
# squad respawns once, and its end brings the first wave
thread sc_guards:
    sleep_until(sq_fallen_guards02d.alive_count() > 0)
    sleep(1)
    sq_fallen_guards01.set_task("0x92058C9E")
    sleep_until_dead(sq_fallen_guards02b)
    sleep_until_dead(sq_fallen_guards02b)
    sleep(8.9)
    seq_fallen_wave_announce.start()

# the three waves, each tasked as the one before thins out; the third is
# servitors and drops in as the second dies. When the third's first squad is
# dead everything is sent at the player, and the console's device settles
# a while after the last one falls.
thread sc_waves:
    sleep_until_dead(sq_fallen_wave01a)
    sleep(0.7)
    for sq in [sq_fallen_wave01a, sq_fallen_wave01b, sq_fallen_wave01c]:
        sq.set_task("0x043EEF51")
    sleep(4.5)
    for sq in [sq_fallen_wave01a, sq_fallen_wave01b, sq_fallen_wave01c]:
        sq.set_task("0x043EEF52")
    sleep(1.8)
    sq_fallen_wave02a.set_task("0x043EEF53")
    sleep(6.1)
    sq_fallen_wave02c.set_task("0xB4CD5448")
    sleep(2.7)
    sq_fallen_wave02a.set_task("0x52670312")
    sleep(0.2)
    sq_fallen_wave02d.set_task("0xB4CD5448")
    sleep(0.3)
    sq_fallen_wave02a.set_task("0x92058C93")
    sleep(2.8)
    sq_fallen_wave02e.set_task("0xB4CD5448")
    sleep_until_dead(sq_fallen_wave02b)
    sleep(0.9)
    place_on_task(sq_fallen_wave03a, "0x91058B21")
    sleep(2.7)
    place_on_task(sq_fallen_wave03b, "0x2C9B98FD")
    sleep_until_dead(sq_fallen_wave03a)
    sq_fallen_wave03a.set_task("0x91058B27")
    sq_fallen_wave03b.set_task("0x91058B27")
    sleep_until_dead(sq_fallen_wave03b)
    sleep(13.3)
    obj_placement_m2_o3a._object.set_device_position(1)

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def sleep_until_dead(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)
