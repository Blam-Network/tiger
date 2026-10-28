# es\mars\uppergarden\enc_uppergarden_portal3.es
#
# The upper garden in the Hypogeum strike: the doors to the lower garden and
# the Hypogeum stand open, the Vex hold the stairs and the bottom from the
# bubble's start, two doors come up on the way along as players pass their
# volumes, and the Cyclops comes in when mission 3 wakes it.
#
# From one 2.3.1 run. Task names are uncracked and written as hashes. The
# upper garden's Vex clouds and the doors going down again followed the
# fight, so they are not written; the turret minions, harpy and upper stair
# squads never moved.

@activity_bundle("enc_uppergarden_portal3")

object o_door_lowergarden
object o_door_hypogeum
object o_door_x1
object o_door_y1
player_trigger pt_trigger_c
player_trigger pt_trigger_e
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
kill_incident_listener kil_cyclops
bool b_cyclops_dead = false

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

@startup()
script sc_door_x1():
    sleep_until(pt_trigger_c.is_triggered())
    sleep(1)
    open_door(o_door_x1)

@startup()
script sc_door_y1():
    sleep_until(pt_trigger_e.is_triggered())
    sleep(1)
    open_door(o_door_y1)

# the door down to the Hypogeum, made again open as the descent starts
# (mission 4)
script sc_hypogeum_door():
    o_door_hypogeum.delete_object()
    o_door_hypogeum.create()
    o_door_hypogeum.set_device_position(1)

# the Cyclops, at the start of the phase past the gate (mission 3)
script sc_cyclops():
    place_on_task(sq_turret, "0x9F6DB313")
    kil_cyclops.reset()
    kil_cyclops.bind_squad(sq_turret)
    kil_cyclops.bind_incident_name_hash("any_kill")
    sleep_until(kil_cyclops.get_count() > 0)
    b_cyclops_dead = true

def open_door(door):
    door.create()
    door.set_device_position(1)

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
