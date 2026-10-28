# es\mars\hypogeum\enc_hypogeum_portal3.es
#
# The Hypogeum in its strike: the Vex blocks (and their sound) stand half
# lit and the warp gate is up from the start, and the entry's probe, anchor
# and upper squad hold the way in. The boss phase (mission 5) wakes the fight: once a player
# is down at the arena (pt_start_boss) the two intro squads come, then the
# hydra's cue, the blocks lighting, the titan's spawn-in effect, the
# containment wall and the hydra on its first post, the warped Vex after it,
# the blocks dropping. The gate goes down a second after the hydra dies.
#
# From one 2.3.1 run. Task names are uncracked and written as hashes. The
# waits after the first intro squad, the hydra cycling its posts, the
# blocks coming back and the late Vex clouds followed the fight, so only the
# first wave is written.

@activity_bundle("enc_hypogeum_portal3")

object o_vex_block
object o_vex_block_1
object o_vex_block_audio_1
object o_vex_block_audio_2
object o_ultra_titan_spawn_in
object o_containment_wall
player_trigger pt_start_boss
objective obj_hypogeum_portal3
squad sq_entry_probe
squad sq_entry_anchor
squad sq_entry_upper
squad sq_boss_intro01
squad sq_boss_intro02
squad sq_boss
squad_member sq_boss__ultra_hydra
squad sq_vex_warped
squad sq_vex_warped_1
vex_warp_gate vex_warp_gate
encounter_handle mars_portal3_audio
bool b_boss_placed = false

@startup()
script sc_hypogeum():
    for block in [o_vex_block, o_vex_block_1]:
        block.create()
        block.set_device_position(0.3)
    for sound in [o_vex_block_audio_1, o_vex_block_audio_2]:
        sound.create()
        sound.set_device_position(0)
    vex_warp_gate._squad.place()
    for sq in [sq_entry_probe, sq_entry_anchor, sq_entry_upper, sq_boss_intro01, sq_boss_intro02, sq_boss, sq_vex_warped, sq_vex_warped_1]:
        sq.set_objective(obj_hypogeum_portal3)
    place_on_task(sq_entry_probe, "0x7FFECF23")
    place_on_task(sq_entry_anchor, "0x7FFECF23")
    place_on_task(sq_entry_upper, "0x8231A2B3")

# the fight, from the boss phase's start
script sc_boss():
    sleep_until(pt_start_boss.is_triggered())
    sleep(3)
    place_on_task(sq_boss_intro01, "0x1A1E058F")
    sleep(31)
    place_on_task(sq_boss_intro02, "0x1A1E058F")
    sleep(17.5)
    mars_portal3_audio.seq_mars_portal3_cue2.start()
    sleep(0.5)
    for block in [o_vex_block, o_vex_block_1]:
        block.set_device_position(0.6)
    for sound in [o_vex_block_audio_1, o_vex_block_audio_2]:
        sound.set_device_position(0.1)
    sleep(8)
    o_ultra_titan_spawn_in.create()
    o_ultra_titan_spawn_in.set_device_position(1)
    sleep(4)
    o_containment_wall.create()
    place_on_task(sq_boss, "0x4BD9F0A8")
    b_boss_placed = true
    sleep(1)
    o_containment_wall.set_device_position(1)
    sleep(1)
    place_on_task(sq_vex_warped, "0x2831B49C")
    sleep(10.5)
    for block in [o_vex_block, o_vex_block_1]:
        block.delete_object()
    sleep(3.5)
    place_on_task(sq_vex_warped_1, "0x2831B49C")
    sleep_until(sq_boss.alive_count() == 0)
    sleep(1)
    vex_warp_gate._squad.remove()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
