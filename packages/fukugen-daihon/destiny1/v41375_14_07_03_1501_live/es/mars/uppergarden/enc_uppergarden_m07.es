# es\mars\uppergarden\enc_uppergarden_m07.es
#
# The Black Garden's upper garden: the overlook and the landing are held
# from the start; in the gulch a cyclops and then two waves of goblins warp
# in on their clouds; the pit goblins come on at the pit, the hydra warps
# in two seconds later and opens the door to the lower garden when it
# dies; the stair and the bottom come on at their triggers. From one
# retail capture: where a step has no trigger on the wire, the wait is
# that run's. Task names are uncracked and written as hashes, except boss.

@activity_bundle("enc_uppergarden_m07")

object o_door_lowergarden
objective obj_uppergarden_m07
@member_counts({0xB84FD02D: 1, 0xB84FD02E: 1})
squad sq_overlook_hobgoblin
@member_counts({goblin: 3})
squad sq_overlook_goblin
@member_counts({harpy: 1})
squad sq_landing_harpy_a
@member_counts({harpy: 1})
squad sq_landing_harpy_b
@member_counts({harpy: 1})
squad sq_landing_harpy_c
squad sq_gulch_cyclops
squad sq_gulch_minotaur
@member_counts({goblin: 3})
squad sq_gulch_goblin_a_a
@member_counts({goblin: 3})
squad sq_gulch_goblin_a_b
@member_counts({goblin: 3})
squad sq_gulch_goblin_b_a
squad sq_pit_hobgoblin_a
squad sq_pit_hobgoblin_b
squad sq_boss
@member_counts({goblin: 3})
squad sq_pit_goblin_a
@member_counts({goblin: 3})
squad sq_pit_goblin_b
@member_counts({goblin: 3})
squad sq_pit_goblin_c
@member_counts({goblin: 3})
squad sq_stair_goblin
@member_counts({hobgoblin: 1})
squad sq_stair_hobgoblin_a
@member_counts({hobgoblin: 1})
squad sq_stair_hobgoblin_b
@member_counts({minotaur: 1})
squad sq_bottom_minotaur
@member_counts({harpy: 2})
squad sq_bottom_harpy_a
@member_counts({harpy: 2})
squad sq_bottom_harpy_b
squad sq_cloud_boss
squad_member sq_cloud_boss__pilot
squad sq_cloud_gulch
squad_member sq_cloud_gulch__pilot
squad sq_cloud_gulch_cyclops
squad_member sq_cloud_gulch_cyclops__pilot
sequence seq_vex_announce
player_trigger pt_gulch
player_trigger pt_pit
player_trigger pt_stair
player_trigger pt_bottom

@startup()
script sc_uppergarden():
    o_door_lowergarden.create()
    for sq in [sq_overlook_hobgoblin, sq_overlook_goblin, sq_landing_harpy_a, sq_landing_harpy_b, sq_landing_harpy_c, sq_gulch_cyclops, sq_gulch_minotaur, sq_gulch_goblin_a_a, sq_gulch_goblin_a_b, sq_gulch_goblin_b_a, sq_pit_hobgoblin_a, sq_pit_hobgoblin_b, sq_boss, sq_pit_goblin_a, sq_pit_goblin_b, sq_pit_goblin_c, sq_stair_goblin, sq_stair_hobgoblin_a, sq_stair_hobgoblin_b, sq_bottom_minotaur, sq_bottom_harpy_a, sq_bottom_harpy_b]:
        sq.set_objective(obj_uppergarden_m07)
    place_on_task(sq_overlook_hobgoblin, "0x63C285F2")
    place_on_task(sq_overlook_goblin, "0x2F9FD614")
    for sq in [sq_landing_harpy_a, sq_landing_harpy_b, sq_landing_harpy_c]:
        place_on_task(sq, "0x79D3D3CE")
    sc_overlook.wake()
    sc_gulch.wake()
    sc_pit.wake()
    sc_stair.wake()
    sc_bottom.wake()

# the overlook hobgoblins fall back once one of them is down
script sc_overlook():
    sleep_until(sq_overlook_hobgoblin.alive_count() > 0)
    sleep_until(sq_overlook_hobgoblin.alive_count() <= 1)
    sleep(1)
    sq_overlook_hobgoblin.set_task("0x2F9FD614")

# the gulch: the cyclops first, then two waves of goblins on the second
# cloud, the second wave about as the cyclops falls (four seconds after in
# one run, two before in the 2026-10-26 one). The cloud comes back as a new
# one for the second wave.
script sc_gulch():
    sleep_until(pt_gulch.is_triggered())
    sleep(1)
    cloud_drop(sq_cloud_gulch_cyclops, sq_cloud_gulch_cyclops__pilot, [sq_gulch_cyclops])
    sq_gulch_goblin_a_a.set_task("0x5BE4444B")
    sq_gulch_goblin_a_b.set_task("0x4FE0C811")
    cloud_drop(sq_cloud_gulch, sq_cloud_gulch__pilot, [sq_gulch_goblin_a_a, sq_gulch_goblin_a_b])
    sleep_until(sq_gulch_cyclops.alive_count() == 0)
    sleep(1)
    sq_gulch_goblin_b_a.set_task("0x5BE4444B")
    sq_cloud_gulch.place()
    sq_cloud_gulch__pilot.drop_squad(sq_gulch_goblin_b_a)
    sleep(7)
    sq_cloud_gulch.remove()

# the pit: its goblins, then the hydra, which holds the door
script sc_pit():
    sleep_until(pt_pit.is_triggered())
    sleep(1)
    place_on_task(sq_pit_goblin_a, "boss")
    place_on_task(sq_pit_goblin_b, "boss")
    sleep(2)
    sq_boss.set_task("0xA86C1F90")
    cloud_drop(sq_cloud_boss, sq_cloud_boss__pilot, [sq_boss])
    sleep(3)
    place_on_task(sq_pit_goblin_c, "boss")
    seq_vex_announce.start()
    sleep_until(sq_boss.alive_count() == 0)
    sleep(1)
    o_door_lowergarden.set_device_position(1)

script sc_stair():
    sleep_until(pt_stair.is_triggered())
    sleep(1)
    place_on_task(sq_stair_goblin, "0x42775CC8")
    place_on_task(sq_stair_hobgoblin_a, "0x3576FE3E")
    place_on_task(sq_stair_hobgoblin_b, "0x3576FE3E")

script sc_bottom():
    sleep_until(pt_bottom.is_triggered())
    sleep(1)
    place_on_task(sq_bottom_minotaur, "0x4566D60C")
    place_on_task(sq_bottom_harpy_a, "0x24A8D618")
    place_on_task(sq_bottom_harpy_b, "0x24A8D618")

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

# a Vex cloud warps its squads in and fades; every cloud on the wire stays
# about seven seconds
def cloud_drop(cloud, pilot, squads):
    cloud.place()
    for sq in squads:
        pilot.drop_squad(sq)
    sleep(7)
    cloud.remove()
