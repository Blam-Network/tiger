# es\moon\launchtubes\enc_launchtubes_m7.es
#
# The launch tubes in Now Come Salvation. The intro gate and the blocker
# stand open, the exit gate shut, the seeder's lights and cables dark, and
# the seeder's control is out for mission 3 to raise its flag. Each stretch
# of the tubes comes on as a player reaches its trigger: the bowl, the
# door, the tubes, the floor and the inner floor, where the thrall come out,
# the exit opens and the Hive announce themselves. Each squad comes in on
# its task in the frame after its trigger.
#
# From one retail 2.3.1 capture (2026-10-27 18-32-12, unconfirmed). 2.3.1
# brings the bowl's wizards and troopers in by a Hive cutter nine seconds
# after the trigger; TU0 has no cutter (and one bowl wizard), so they are
# placed at the trigger. 2.3.1's knights on the floor (a, b) are TU0's one
# sq_floor_knight; the tube ogre, pt_tube_troopers and the floor's cleaver
# and wizard squads did nothing TU0 has. Most task names are uncracked.

@activity_bundle("enc_launchtubes_m7")

objective obj_launchtubes_m7
object o_gate_intro
object o_gate_blocker
object o_gate_exit
interactable_placement sp_placement_control bind("0x34EAA816")
encounter_handle sp_specops_seeder
squad sq_bowl_wizard
squad sq_bowl_knight
squad sq_bowl_trooper_a
squad sq_bowl_trooper_b
squad sq_bowl_trooper_c
squad sq_tube_knight_a
squad sq_tube_knight_b
squad sq_tube_trooper_a
squad sq_tube_trooper_b
squad sq_tube_trooper_c
squad sq_floor_knight
squad sq_floor_trooper_a
squad sq_floor_trooper_b
squad sq_floor_trooper_c
squad sq_floor_trooper_d
squad sq_floor_thrall_a
squad sq_floor_thrall_b
squad sq_floor_thrall_c
sequence seq_hive_announce
player_trigger pt_bowl
player_trigger pt_door
player_trigger pt_tube
player_trigger pt_floor
player_trigger pt_floor_inner

@startup()
script sc_launchtubes_main():
    o_gate_intro.create()
    o_gate_intro.set_device_position(1)
    o_gate_blocker.create()
    o_gate_blocker.set_device_position(1)
    o_gate_exit.create()
    for seeder in [sp_specops_seeder.o_launchtube_illum, sp_specops_seeder.o_cable, sp_specops_seeder.o_cable_1]:
        seeder.create()
        seeder.set_device_position(0)
    for sq in [sq_bowl_wizard, sq_bowl_knight, sq_bowl_trooper_a, sq_bowl_trooper_b, sq_bowl_trooper_c, sq_tube_knight_a, sq_tube_knight_b, sq_tube_trooper_a, sq_tube_trooper_b, sq_tube_trooper_c]:
        sq.set_objective(obj_launchtubes_m7)
    for sq in [sq_floor_knight, sq_floor_trooper_a, sq_floor_trooper_b, sq_floor_trooper_c, sq_floor_trooper_d, sq_floor_thrall_a, sq_floor_thrall_b, sq_floor_thrall_c]:
        sq.set_objective(obj_launchtubes_m7)

@startup()
script sc_bowl():
    sleep_until(pt_bowl.is_triggered())
    place_on_task(sq_bowl_wizard, "0xD8A02F89")
    for sq in [sq_bowl_trooper_a, sq_bowl_trooper_b, sq_bowl_trooper_c]:
        place_on_task(sq, "0x2C7F3EB5")

@startup()
script sc_door():
    sleep_until(pt_door.is_triggered())
    place_on_task(sq_bowl_knight, "0x4F239C32")

@startup()
script sc_tube():
    sleep_until(pt_tube.is_triggered())
    for sq in [sq_tube_knight_a, sq_tube_knight_b]:
        place_on_task(sq, "0x510E8CE0")
    for sq in [sq_tube_trooper_a, sq_tube_trooper_b, sq_tube_trooper_c]:
        place_on_task(sq, "0x4A1B54AC")

@startup()
script sc_floor():
    sleep_until(pt_floor.is_triggered())
    place_on_task(sq_floor_knight, "0x98F9E443")
    for sq in [sq_floor_trooper_a, sq_floor_trooper_b, sq_floor_trooper_c, sq_floor_trooper_d]:
        place_on_task(sq, "0xF7E2E5F4")

@startup()
# the inner floor: the thrall rush, the way out opens
script sc_floor_inner():
    sleep_until(pt_floor_inner.is_triggered())
    for sq in [sq_floor_thrall_a, sq_floor_thrall_b, sq_floor_thrall_c]:
        place_on_task(sq, "0xE3260F30")
    o_gate_exit.set_device_position(1)
    seq_hive_announce.start()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
