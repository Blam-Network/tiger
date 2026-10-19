# es\moon\uppercitadel\enc_uppercitadel_portal2.es
#
# The Summoning Pits, the upper citadel and the hall. The overlook Hive hold
# the way in; the door panel is the Ghost's hack. While the scan runs, the
# Hive come in three waves, left, right and rear, and a gate lock opens as
# each wave falls. The rear wave ends with its captain; when that wave is
# down the scan completes and the last lock opens. Past the hall, the lower
# hall Hive wake as the players come through room B.
#
# Mission 2 wakes sc_hack once the panel is used. A wave squad that has
# been wiped regroups on the hall task. One capture run: every wait and beat
# in here is that run's and unconfirmed.

@activity_bundle("enc_uppercitadel_portal2")

c_objective_sensor_host obj_uppercitadel_trash
c_objective_sensor_host obj_uppercitadel_objective
c_squad_sensor_host sq_overlook_hive01a
c_squad_sensor_host sq_overlook_hive01b
c_squad_sensor_host sq_overlook_hive02
interactable_placement pf_i_door_placement bind("0x80296306")
c_object_sensor_host o_scan_sphere_1
c_squad_sensor_host sq_wave_left01
c_squad_sensor_host sq_wave_left02
c_squad_sensor_host sq_wave_left03
c_squad_sensor_host sq_wave_left_sustain01
c_squad_sensor_host sq_wave_left_sustain02
c_object_sensor_host o_gate_lock01
c_squad_sensor_host sq_wave_right01
c_squad_sensor_host sq_wave_right02
c_squad_sensor_host sq_wave_right03
c_squad_sensor_host sq_wave_right_sustain01
c_squad_sensor_host sq_wave_right_sustain02
c_object_sensor_host o_gate_lock02
c_squad_sensor_host sq_wave_rear01
c_squad_sensor_host sq_wave_rear02
c_squad_sensor_host sq_wave_rear03
c_squad_sensor_host sq_wave_rear04
c_squad_sensor_host sq_wave_boss
c_object_sensor_host o_gate_lock03
c_object_sensor_host o_door_dummy
c_object_sensor_host o_strike2_norender_scan
c_player_trigger_sensor_host pt_room_b_spawn
c_squad_sensor_host sq_lowerhall_bouncer01
c_squad_sensor_host sq_lowerhall_hive01
c_squad_sensor_host sq_lowerhall_hive03
c_player_trigger_sensor_host pt_ogreroar01
c_player_trigger_sensor_host pt_ogreroar02

startup thread sc_uppercitadel_main:
    for gate in [o_gate_lock01, o_gate_lock02, o_gate_lock03, o_door_dummy]:
        gate.create()
        gate.set_device_position(0)
    o_strike2_norender_scan.create()
    for sq in [sq_overlook_hive01a, sq_overlook_hive01b, sq_overlook_hive02, sq_lowerhall_bouncer01, sq_lowerhall_hive01, sq_lowerhall_hive03]:
        sq.set_objective(obj_uppercitadel_trash)
    for sq in [sq_wave_left01, sq_wave_left02, sq_wave_left03, sq_wave_left_sustain01, sq_wave_left_sustain02, sq_wave_right01, sq_wave_right02, sq_wave_right03, sq_wave_right_sustain01, sq_wave_right_sustain02, sq_wave_rear01, sq_wave_rear02, sq_wave_rear03, sq_wave_rear04, sq_wave_boss]:
        sq.set_objective(obj_uppercitadel_objective)
    place_on_task(sq_overlook_hive01a, "0x631D1ECB")
    place_on_task(sq_overlook_hive01b, "0x32429F75")
    place_on_task(sq_overlook_hive02, "0x32429F76")
    sc_overlook.wake()
    sc_lowerhall.wake()

# the overlook's rear squad falls back once it has been wiped
thread sc_overlook:
    sleep_until_wiped(sq_overlook_hive02)
    sq_overlook_hive02.set_task("0xF1F81839")

thread sc_lowerhall:
    sleep_until(pt_room_b_spawn.is_triggered())
    place_on_task(sq_lowerhall_bouncer01, "0x34C7A11F")
    place_on_task(sq_lowerhall_hive01, "0xE63235BD")
    place_on_task(sq_lowerhall_hive03, "0x24C4E903")

# the Ghost's scan of the door, and the waves that come at it
thread sc_hack:
    o_scan_sphere_1.create()
    sc_regroup.wake()
    sleep(5)

    # left; the sustain squads follow once the first squad is down
    for sq in [sq_wave_left01, sq_wave_left02, sq_wave_left03]:
        place_on_task(sq, "0x98EF3AF4")
    sleep_until_first_down(sq_wave_left01, sq_wave_left02, sq_wave_left03)
    sleep(6)
    for sq in [sq_wave_left_sustain01, sq_wave_left_sustain02]:
        place_on_task(sq, "0x3223A0F6")
    sleep_until_cleared(1)
    gate_open(o_gate_lock01)
    sleep(9)

    # right
    for sq in [sq_wave_right01, sq_wave_right02, sq_wave_right03]:
        place_on_task(sq, "0x938DF279")
    sleep_until_first_down(sq_wave_right01, sq_wave_right02, sq_wave_right03)
    sleep(6)
    for sq in [sq_wave_right_sustain01, sq_wave_right_sustain02]:
        place_on_task(sq, "0x7D1550BB")
    sleep_until_cleared(2)
    gate_open(o_gate_lock02)
    sleep(9)

    # rear, then its captain once the main squad is down
    place_on_task(sq_wave_rear01, "0x7213C5B5")
    place_on_task(sq_wave_rear02, "rear01")
    place_on_task(sq_wave_rear03, "rear02")
    place_on_task(sq_wave_rear04, "rear03")
    sleep_until_wiped(sq_wave_rear01)
    sleep(1)
    place_on_task(sq_wave_boss, "rear04")
    sleep_until_cleared(3)
    sleep(2)

    # the scan completes and the last lock opens
    o_scan_sphere_1.set_device_position(1)
    pf_i_door_placement._object.set_device_position(1)
    sleep(1)
    o_scan_sphere_1.delete_object()
    gate_open(o_gate_lock03)

# a wave squad that has been in the fight and is wiped regroups on the hall
# task, once
thread sc_regroup:
    squads = [sq_wave_left01, sq_wave_left02, sq_wave_left03, sq_wave_left_sustain01, sq_wave_left_sustain02, sq_wave_right01, sq_wave_right02, sq_wave_right03, sq_wave_right_sustain01, sq_wave_right_sustain02, sq_wave_rear01, sq_wave_rear02, sq_wave_rear03, sq_wave_rear04, sq_wave_boss]
    # 0 not in yet, 1 in the fight, 2 regrouped
    state = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    while true:
        for i, sq in squads:
            if state[i] == 0 and sq.alive_count() > 0:
                state[i] = 1
            elif state[i] == 1 and sq.alive_count() == 0:
                sq.set_task("0xE419C3BA")
                state[i] = 2
        sleep(1)

def gate_open(lock):
    lock.set_device_position(1)
    sleep(1)
    lock.delete_object()

# the wave is in, and one of its squads is down
def sleep_until_first_down(a, b, c):
    sleep_until(a.alive_count() + b.alive_count() + c.alive_count() > 0)
    sleep_until(a.alive_count() == 0 or b.alive_count() == 0 or c.alive_count() == 0)

def sleep_until_wiped(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)

# a wave is cleared when none of its squads has anyone left standing, and
# that holds for a moment (the next member of a squad can take a beat to
# come in)
def sleep_until_cleared(wave):
    while true:
        sleep_until(wave_alive_count(wave) == 0)
        sleep(2)
        if wave_alive_count(wave) == 0:
            return

def wave_alive_count(wave):
    if wave == 1:
        return left_alive_count()
    elif wave == 2:
        return right_alive_count()
    return rear_alive_count()

def left_alive_count():
    return sq_wave_left01.alive_count() + sq_wave_left02.alive_count() + sq_wave_left03.alive_count() + sq_wave_left_sustain01.alive_count() + sq_wave_left_sustain02.alive_count()

def right_alive_count():
    return sq_wave_right01.alive_count() + sq_wave_right02.alive_count() + sq_wave_right03.alive_count() + sq_wave_right_sustain01.alive_count() + sq_wave_right_sustain02.alive_count()

def rear_alive_count():
    return sq_wave_rear01.alive_count() + sq_wave_rear02.alive_count() + sq_wave_rear03.alive_count() + sq_wave_rear04.alive_count() + sq_wave_boss.alive_count()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
