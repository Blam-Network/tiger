# es\mars\checkpoint\enc_checkpoint_m01.es
#
# The Cabal checkpoint in Exclusion Zone. Its scenery cans are up from the
# start. The road squads come up when a player reaches the road, the
# bunker's when they reach it; using the console calls the boss's dropship,
# which drops its phalanxes, then its psions, then the boss himself, and
# leaves. The dropship flies its own command scripts.
#
# One run (2026-10-26): the console's device steps, the drop waits and the
# squads' tasks are as captured (the road squads pulling back on the front
# trigger, the first bunker squad when the second is down); the rest of
# their moves are the task tree's, not this script's. The first run sent each wave once the last was down; this
# one sent the psions and the boss on time with the earlier waves still up
# (13 s, then 16 s), and the ship left 13 s after the boss's drop with him
# alive, putting his two legionaries down as it went.

@activity_bundle("enc_checkpoint_m01")

trigger_volume tv_road
player_trigger pt_road bind(tv_road)
trigger_volume tv_front
player_trigger pt_front bind(tv_front)
trigger_volume tv_bunker
player_trigger pt_bunker bind(tv_bunker)
objective obj_checkpoint_m01
nav_point np_bunker
object o_checkpoint_ghost_cage
static_array<object, 10> can_objects_dynamic
countdown_placement sp_placement_console bind("0x47DCE9B0")
sequence seq_cabal_announce
squad sq_road_front_legionary
squad_member sq_road_front_legionary__legionary_a
squad_member sq_road_front_legionary__legionary_b
squad_member sq_road_front_legionary__legionary_c
squad sq_road_front_phalanx
squad sq_road_overlook_legionary
squad sq_road_overlook_phalanx
squad sq_bunker_legionary_a
squad sq_bunker_legionary_b
squad sq_bunker_legionary_c
squad sq_bunker_legionary_d
squad sq_bunker_phalanx
squad sq_dropship_boss
squad_member sq_dropship_boss__pilot
control_point_set cps_dropship_boss_entry
control_point_set cps_dropship_boss_exit
squad sq_boss_phalanx_a
squad sq_boss_phalanx_b
squad sq_boss_phalanx_c
squad sq_boss_psion_a
squad sq_boss_psion_b
squad sq_boss_psion_c
squad sq_boss_legionary_a
squad sq_boss_legionary_b
squad sq_boss
squad_member sq_boss__boss

@startup()
script sc_checkpoint_main():
    for can in can_objects_dynamic:
        can.create()
    for sq in [sq_road_front_legionary, sq_road_front_phalanx, sq_road_overlook_legionary, sq_road_overlook_phalanx, sq_bunker_legionary_a, sq_bunker_legionary_b, sq_bunker_legionary_c, sq_bunker_legionary_d, sq_bunker_phalanx, sq_boss_phalanx_a, sq_boss_phalanx_b, sq_boss_phalanx_c, sq_boss_psion_a, sq_boss_psion_b, sq_boss_psion_c, sq_boss_legionary_a, sq_boss_legionary_b, sq_boss]:
        sq.set_objective(obj_checkpoint_m01)
    sc_road.wake()
    sc_front.wake()
    sc_bunker.wake()
    sc_console.wake()

script sc_road():
    sleep_until(pt_road.is_triggered())
    place_on_task(sq_road_front_legionary, "road_phalanx_retreat")
    place_on_task(sq_road_front_phalanx, "road_phalanx")
    place_on_task(sq_road_overlook_phalanx, "road_front_phalanx")
    place_on_task(sq_road_overlook_legionary, "road_legionaries")
    place_on_task(sq_bunker_legionary_a, "road_main")
    place_on_task(sq_bunker_legionary_b, "road_overlook_legionary")
    sleep_until(sq_bunker_legionary_b.alive_count() == 0)
    sq_bunker_legionary_a.set_task("road_overlook_legionary")

# the road squads pull back to the overlook as a player comes up the front
script sc_front():
    sleep_until(pt_front.is_triggered())
    sq_road_front_legionary.set_task("0xC2BCBF22")
    sq_road_front_phalanx.set_task("road_overlook_phalanx")
    sq_road_overlook_phalanx.set_task("road_overlook_phalanx")
    sq_road_overlook_legionary.set_task("0xC2BCBF22")

script sc_bunker():
    sleep_until(pt_bunker.is_triggered())
    place_on_task(sq_bunker_legionary_c, "road_main")
    place_on_task(sq_bunker_legionary_d, "road_main")
    seq_cabal_announce.start()
    sleep(2)
    place_on_task(sq_bunker_phalanx, "road_main")

# using the console raises the Ghost's cage and calls the boss's ship
script sc_console():
    sleep_until(sp_placement_console._object.is_active())
    sp_placement_console._object.set_device_position(0.45)
    o_checkpoint_ghost_cage.create()
    sleep(3)
    sc_dropship_boss.wake()
    sleep(1)
    sp_placement_console._object.set_device_position(1)
    o_checkpoint_ghost_cage.set_device_position(1)
    sleep_until(not o_checkpoint_ghost_cage.is_alive())
    o_checkpoint_ghost_cage.delete_object()
    sleep(2)
    sp_placement_console._object.set_device_position(0)

script sc_dropship_boss():
    sq_dropship_boss__pilot.place()
    sq_dropship_boss__pilot.execute(cs_dropship_boss_enter(cps_dropship_boss_entry))
    sleep(13)
    for sq in [sq_boss_phalanx_a, sq_boss_phalanx_b, sq_boss_phalanx_c]:
        drop_on_task(sq, "boss_legionaries")
    sleep_until_timeout(sq_boss_phalanx_a.alive_count() + sq_boss_phalanx_b.alive_count() + sq_boss_phalanx_c.alive_count() == 0, 11)
    sleep(2)
    for sq in [sq_boss_psion_a, sq_boss_psion_b, sq_boss_psion_c]:
        drop_on_task(sq, "bunker_main")
    sleep_until_timeout(sq_boss_psion_a.alive_count() + sq_boss_psion_b.alive_count() + sq_boss_psion_c.alive_count() <= 2, 13)
    sleep(3)
    drop_on_task(sq_boss, "0x05F280F0")
    sleep_until_timeout(not sq_boss__boss.is_bound(), 13)
    sq_dropship_boss__pilot.execute(cs_dropship_boss_exit(cps_dropship_boss_exit))
    sleep(12)
    sq_dropship_boss__pilot.remove()
    place_on_task(sq_boss_legionary_a, "0x9DC7DA06")
    place_on_task(sq_boss_legionary_b, "0x9DC7DA06")

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def drop_on_task(sq, task):
    sq.set_task(task)
    sq_dropship_boss__pilot.drop_squad(sq)

# the ship comes in on the slant, crosses the checkpoint and holds over the bunker
command_script cs_dropship_boss_enter(path):
    snap_to(path, 0)
    ability("dropship", "enter_45")
    move_to(path, 1, false)
    move_to(path, 2, true)
    set_channel_scalar("doors", 1)

command_script cs_dropship_boss_exit(path):
    move_to(path, 0, false)
    set_channel_scalar("doors", 0)
    move_to(path, 1, false)
    ability("dropship", "exit_45")
