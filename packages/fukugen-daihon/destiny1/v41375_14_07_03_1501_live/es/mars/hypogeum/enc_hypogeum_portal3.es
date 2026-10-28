# es\mars\hypogeum\enc_hypogeum_portal3.es
#
# The Hypogeum in its strike: the Vex blocks stand half lit and the warp
# gate is up from the start, the entry's probe and anchor hold the way in,
# and the boss phase (mission 5) wakes the ultra hydra's entrance: the blocks
# light, the titan's spawn-in effect, the hydra on its post, the warped Vex
# after it, the blocks dropping. The gate goes down a second after the hydra
# dies.
#
# From one 2.3.1 run. Task names are uncracked and written as hashes, picked
# from TU0's list by influencer; the hydra goes to TU0's boss task, as
# 2.3.1's six posts (influencers 11-16) are not TU0's five. 2.3.1 brought
# the hydra in behind two intro squads TU0 does not have (55 s into the
# phase); the waits after that, and the hydra cycling its posts and the
# blocks coming back, followed the fight, so only the first wave is written.

@activity_bundle("enc_hypogeum_portal3")

object o_vex_block
object o_vex_block_1
object o_ultra_titan_spawn_in
objective obj_hypogeum_portal3
squad sq_entry_probe
squad sq_entry_anchor
squad sq_boss
squad_member sq_boss__ultra_hydra
squad sq_vex_warped
squad sq_vex_warped_1
vex_warp_gate vex_warp_gate
bool b_boss_placed = false

@startup()
script sc_hypogeum():
    for block in [o_vex_block, o_vex_block_1]:
        block.create()
        block.set_device_position(0.3)
    vex_warp_gate._squad.place()
    for sq in [sq_entry_probe, sq_entry_anchor, sq_boss, sq_vex_warped, sq_vex_warped_1]:
        sq.set_objective(obj_hypogeum_portal3)
    place_on_task(sq_entry_probe, "0x1A1E058F")
    place_on_task(sq_entry_anchor, "0x1A1E058F")

# the hydra's entrance, from the boss phase's start
script sc_boss():
    sleep(55.5)
    for block in [o_vex_block, o_vex_block_1]:
        block.set_device_position(0.6)
    sleep(8)
    o_ultra_titan_spawn_in.create()
    o_ultra_titan_spawn_in.set_device_position(1)
    sleep(4)
    place_on_task(sq_boss, "boss")
    b_boss_placed = true
    sleep(2)
    place_on_task(sq_vex_warped, "0x3A99A898")
    sleep(10.5)
    for block in [o_vex_block, o_vex_block_1]:
        block.delete_object()
    sleep(3.5)
    place_on_task(sq_vex_warped_1, "0x3A99A898")
    sleep_until(sq_boss.alive_count() == 0)
    sleep(1)
    vex_warp_gate._squad.remove()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
