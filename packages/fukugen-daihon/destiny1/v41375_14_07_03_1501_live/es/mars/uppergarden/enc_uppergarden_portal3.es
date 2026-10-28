# es\mars\uppergarden\enc_uppergarden_portal3.es
#
# The upper garden in the Hypogeum strike: the doors to the lower garden and
# the Hypogeum stand open, the Vex hold the stairs and the bottom from the
# bubble's start, and the Cyclops comes in when mission 3 wakes it.
#
# From one 2.3.1 run, whose task indices match TU0's list by influencer for
# every squad here (task names are uncracked and written as hashes). 2.3.1
# added its own Vex clouds, doors and triggers TU0 does not have; TU0's
# turret minions, harpy, upper stair, pit, ledge, annex and Hypogeum squads
# never moved there, so nothing places them.

@activity_bundle("enc_uppergarden_portal3")

object o_door_lowergarden
object o_door_hypogeum
objective obj_uppergarden_portal3
squad sq_turret
squad sq_turret_minions
squad sq_stair_a
squad sq_stair_b
squad sq_stair_c
squad sq_stair_d
squad sq_bottom
squad sq_bottom_1
squad sq_harpy1
squad sq_stair_upper

@startup()
script sc_uppergarden():
    for door in [o_door_lowergarden, o_door_hypogeum]:
        door.create()
        door.set_device_position(1)
    for sq in [sq_turret, sq_turret_minions, sq_stair_a, sq_stair_b, sq_stair_c, sq_stair_d, sq_bottom, sq_bottom_1, sq_harpy1, sq_stair_upper]:
        sq.set_objective(obj_uppergarden_portal3)
    place_on_task(sq_stair_a, "0x2BF1ADA6")
    place_on_task(sq_stair_b, "0x4566D60C")
    place_on_task(sq_stair_c, "0x2BF1ADA5")
    place_on_task(sq_stair_d, "0xC4474253")
    place_on_task(sq_bottom, "0xE864BA60")
    place_on_task(sq_bottom_1, "0x65E2C6DC")

# the door down to the Hypogeum, made again open as the descent starts
# (mission 4)
script sc_hypogeum_door():
    o_door_hypogeum.delete_object()
    o_door_hypogeum.create()
    o_door_hypogeum.set_device_position(1)

# the Cyclops, at the start of the phase past the gate (mission 3)
script sc_cyclops():
    place_on_task(sq_turret, "0x9F6DB313")

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
