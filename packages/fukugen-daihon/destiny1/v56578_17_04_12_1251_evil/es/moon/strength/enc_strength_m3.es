# es\moon\strength\enc_strength_m3.es
#
# The World's Grave's strength chamber: the Hive guarding the library, then
# the waves that come for the Ghost while it reads the Grave. The chamber
# wakes on the player coming in. The mission (act_moon_m3_lowercitadel)
# wakes sc_scan once the guards are dead and sc_defend once the console is
# used, and reads the scan's end off the console's device. From one retail
# capture: the waves are timed from the scan, as that run had them (its
# alive counts are too patchy to gate the waves on deaths instead).
# Task names were never cracked and are written as "0x" literals.

c_trigger_volume_slot_host tv_bubble
c_player_trigger_sensor_host pt_bubble bind(tv_bubble)
c_trigger_volume_slot_host tv_intro_thrall
c_player_trigger_sensor_host pt_intro_thrall bind(tv_intro_thrall)
c_trigger_volume_slot_host tv_guard_entry
c_player_trigger_sensor_host pt_guard_entry bind(tv_guard_entry)
c_trigger_volume_slot_host tv_obj
c_player_trigger_sensor_host pt_obj bind(tv_obj)
c_objective_sensor_host obj_strength_m3
c_object_sensor_host o_m3_doors
c_object_sensor_host o_m3_console_scan
c_object_sensor_host o_m3_console_cage
c_object_sensor_host o_m3_spec_ops
interactable_placement pf_obj_strength_interact_place  # the mission's console
c_squad_sensor_host sq_m3_guard_front
c_squad_sensor_host sq_m3_guard_rear
c_squad_sensor_host sq_m3_thrall_intro
c_squad_sensor_host sq_m3_guard_entry
c_squad_sensor_host sq_m3_thrall_stairs
c_squad_sensor_host sq_m3_trooper_stairs
c_squad_sensor_host sq_m3_rear
c_squad_sensor_host sq_m3_thrall_a
c_squad_sensor_host sq_m3_push_a_a
c_squad_sensor_host sq_m3_push_a_b
c_squad_sensor_host sq_m3_push_a_c
c_squad_sensor_host sq_m3_exploder1
c_squad_sensor_host sq_m3_exploder2
c_squad_sensor_host sq_m3_push_b_a
c_squad_sensor_host sq_m3_push_b_b

startup thread sc_strength_main:
    for sq in [sq_m3_guard_front, sq_m3_guard_rear, sq_m3_thrall_intro, sq_m3_guard_entry, sq_m3_thrall_stairs, sq_m3_trooper_stairs, sq_m3_rear, sq_m3_thrall_a, sq_m3_push_a_a, sq_m3_push_a_b, sq_m3_push_a_c, sq_m3_exploder1, sq_m3_exploder2, sq_m3_push_b_a, sq_m3_push_b_b]:
        sq.set_objective(obj_strength_m3)
    sleep_until(pt_bubble.is_triggered())
    sleep(1)
    pt_bubble.reset()
    sleep(1)
    o_m3_console_scan.create()
    place_on_task(sq_m3_guard_front, "0xE44052CC")
    place_on_task(sq_m3_guard_rear, "0xE44052CC")
    pt_obj.reset()
    o_m3_doors.create()
    o_m3_doors.set_device_position(1)
    pf_obj_strength_interact_place._object.set_device_position(0)
    sc_intro_thrall.wake()
    sc_stairs.wake()

thread sc_intro_thrall:
    sleep_until(pt_intro_thrall.is_triggered())
    sleep(1)
    place_on_task(sq_m3_thrall_intro, "0x384EF6E2")
    place_on_task(sq_m3_guard_entry, "0x90642075")

thread sc_stairs:
    sleep_until(pt_guard_entry.is_triggered())
    sleep(3)
    place_on_task(sq_m3_thrall_stairs, "0xC951DCDD")
    sleep(3)
    place_on_task(sq_m3_trooper_stairs, "0x36135323")

# the guards are dead: the console comes alive and the doors reset
thread sc_scan:
    pt_bubble.reset()
    o_m3_console_scan.create()
    sleep(1)
    o_m3_doors.create()

# the console was used: the Ghost reads the Grave behind its cage while the
# Hive come in waves, then the scan is in and the cage goes
thread sc_defend:
    o_m3_console_cage.create()
    sleep(1)
    o_m3_console_scan.set_device_position(0.3)
    sleep(5)
    o_m3_spec_ops.create()
    o_m3_spec_ops.set_device_position(1)
    sleep(1)
    pt_bubble.reset()
    sleep(2)
    o_m3_doors.create()
    sleep(2)
    place_on_task(sq_m3_rear, "0x4EA73E1E")
    place_on_task(sq_m3_thrall_a, "0xF705539D")
    sleep(9)
    place_on_task(sq_m3_push_a_a, "0x07FDAD6B")
    place_on_task(sq_m3_push_a_b, "0x07FDAD6B")
    place_on_task(sq_m3_push_a_c, "0x07FDAD6B")
    sleep(22)
    place_on_task(sq_m3_exploder1, "0xF705539D")
    sleep(3)
    place_on_task(sq_m3_exploder2, "0xF705539D")
    sleep(13)
    place_on_task(sq_m3_push_b_a, "0x07FDAD6B")
    place_on_task(sq_m3_push_b_b, "0x07FDAD6B")
    sleep(19)
    o_m3_console_scan.create()
    o_m3_console_scan.set_device_position(1)
    o_m3_console_cage.set_device_position(1)
    sleep(1)
    o_m3_console_cage.delete_object()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
