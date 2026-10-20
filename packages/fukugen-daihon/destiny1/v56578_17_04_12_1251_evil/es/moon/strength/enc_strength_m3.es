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

@activity_bundle("enc_strength_m3")

trigger_volume tv_bubble
player_trigger pt_bubble bind(tv_bubble)
trigger_volume tv_intro_thrall
player_trigger pt_intro_thrall bind(tv_intro_thrall)
trigger_volume tv_guard_entry
player_trigger pt_guard_entry bind(tv_guard_entry)
trigger_volume tv_obj
player_trigger pt_obj bind(tv_obj)
objective obj_strength_m3
object o_m3_doors
object o_m3_console_scan
object o_m3_console_cage
object o_m3_spec_ops
interactable_placement pf_obj_strength_interact_place  # the mission's console
squad sq_m3_guard_front
squad sq_m3_guard_rear
@member_counts({0x271E0082: 1, 0x271E0081: 1, 0x271E0080: 1, 0x271E0087: 1, 0x271E0086: 1, 0x271E0085: 1, 0x271E0084: 1, 0x271E008B: 1})
squad sq_m3_thrall_intro
@member_counts({trooper: 1, 0x0D746C5A: 1, 0x0D746C59: 1})
squad sq_m3_guard_entry
@member_counts({thrall: 1, thrall_1: 1, thrall_2: 1})
squad sq_m3_thrall_stairs
@member_counts({0x0D746C5A: 1, 0x0D746C59: 1})
squad sq_m3_trooper_stairs
@member_counts({trooper: 3, knight: 1})
squad sq_m3_rear
squad sq_m3_thrall_a
@member_counts({trooper: 2})
squad sq_m3_push_a_a
squad sq_m3_push_a_b
@member_counts({trooper: 1, wizard: 1})
squad sq_m3_push_a_c
squad sq_m3_exploder1
squad sq_m3_exploder2
@member_counts({knight_boomer: 1})
squad sq_m3_push_b_a
squad sq_m3_push_b_b

@startup()
script sc_strength_main():
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

script sc_intro_thrall():
    sleep_until(pt_intro_thrall.is_triggered())
    sleep(1)
    place_on_task(sq_m3_thrall_intro, "0x384EF6E2")
    place_on_task(sq_m3_guard_entry, "0x90642075")

script sc_stairs():
    sleep_until(pt_guard_entry.is_triggered())
    sleep(3)
    place_on_task(sq_m3_thrall_stairs, "0xC951DCDD")
    sleep(3)
    place_on_task(sq_m3_trooper_stairs, "0x36135323")

# the guards are dead: the console comes alive and the doors reset
script sc_scan():
    pt_bubble.reset()
    o_m3_console_scan.create()
    sleep(1)
    o_m3_doors.create()

# the console was used: the Ghost reads the Grave behind its cage while the
# Hive come in waves, then the scan is in and the cage goes
script sc_defend():
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
