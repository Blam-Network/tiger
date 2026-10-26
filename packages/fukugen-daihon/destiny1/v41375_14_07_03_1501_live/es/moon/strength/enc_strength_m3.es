# es\moon\strength\enc_strength_m3.es
#
# The World's Grave's strength chamber: the Hive guarding the library, then
# the waves that come for the Ghost while it reads the Grave. The chamber
# wakes on the player coming in. The mission (act_moon_m3_lowercitadel)
# wakes sc_scan once the guards are dead and sc_defend once the console is
# used, and reads the scan's end off the console's device. Two 2.3.1 runs
# (2026-10-03 and 2026-10-25, one player each): the steps up to the first
# wave are sleeps that held to a tenth of a second in both; each wave after
# it comes when the one before is dead, and the scan ends with the last.
# Both runs placed the same members of the Thrall, exploder and second push
# squads (three of four, one of two Knights), so those are placed member by
# member. Task names were never cracked and are written as "0x" literals.

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
squad sq_m3_thrall_intro
squad sq_m3_guard_entry
squad sq_m3_thrall_stairs
squad sq_m3_trooper_stairs
squad sq_m3_rear
squad sq_m3_thrall_a
squad_member sq_m3_thrall_a__thrall_a
squad_member sq_m3_thrall_a__thrall_b
squad_member sq_m3_thrall_a__thrall_c
squad sq_m3_push_a_a
squad sq_m3_push_a_b
squad sq_m3_push_a_c
squad sq_m3_exploder1
squad_member sq_m3_exploder1__thrall_exploder_1
squad_member sq_m3_exploder1__thrall_exploder_3
squad_member sq_m3_exploder1__thrall_exploder_4
squad sq_m3_exploder2
squad_member sq_m3_exploder2__thrall_exploder_1
squad_member sq_m3_exploder2__thrall_exploder_3
squad_member sq_m3_exploder2__thrall_exploder_4
squad sq_m3_push_b_a
squad sq_m3_push_b_b
squad_member sq_m3_push_b_b__knight_cleaver1
sequence seq_d_o2_s04

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

# the stairs Thrall 3.7 / 2.9 s after the trigger, the troopers 2.6 / 2.9 s
# after them
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
    sq_m3_thrall_a.set_task("0xF705539D")
    sq_m3_thrall_a__thrall_a.place()
    sq_m3_thrall_a__thrall_b.place()
    sq_m3_thrall_a__thrall_c.place()
    # the first push 3.7 / 4.2 s after the last of the Thrall (the rear
    # squad was still up in both runs)
    sleep_until(sq_m3_thrall_a.alive_count() == 0)
    sleep(3)
    place_on_task(sq_m3_push_a_a, "0x07FDAD6B")
    place_on_task(sq_m3_push_a_b, "0x07FDAD6B")
    place_on_task(sq_m3_push_a_c, "0x07FDAD6B")
    # the push dead: the Ghost's line 2.3 / 2.5 s later, the exploders 2 s
    # after the line
    sleep_until(sq_m3_push_a_a.alive_count() + sq_m3_push_a_b.alive_count() + sq_m3_push_a_c.alive_count() == 0)
    sleep(2)
    seq_d_o2_s04.start()
    sleep(2)
    sq_m3_exploder1.set_task("0xF705539D")
    sq_m3_exploder1__thrall_exploder_1.place()
    sq_m3_exploder1__thrall_exploder_3.place()
    sq_m3_exploder1__thrall_exploder_4.place()
    # the second exploders 1.0 / 1.3 s after the first one dies
    sleep_until(sq_m3_exploder1.alive_count() < 3)
    sleep(1)
    sq_m3_exploder2.set_task("0xF705539D")
    sq_m3_exploder2__thrall_exploder_1.place()
    sq_m3_exploder2__thrall_exploder_3.place()
    sq_m3_exploder2__thrall_exploder_4.place()
    # the second push 4.6 / 5.0 s after the last exploder
    sleep_until(sq_m3_exploder1.alive_count() + sq_m3_exploder2.alive_count() == 0)
    sleep(4)
    place_on_task(sq_m3_push_b_a, "0x07FDAD6B")
    sq_m3_push_b_b.set_task("0x07FDAD6B")
    sq_m3_push_b_b__knight_cleaver1.place()
    # the scan is in 4.6 / 5.0 s after the second push is dead
    sleep_until(sq_m3_push_b_a.alive_count() + sq_m3_push_b_b.alive_count() == 0)
    sleep(4)
    o_m3_console_scan.create()
    o_m3_console_scan.set_device_position(1)
    o_m3_console_cage.set_device_position(1)
    sleep(1)
    o_m3_console_cage.delete_object()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
