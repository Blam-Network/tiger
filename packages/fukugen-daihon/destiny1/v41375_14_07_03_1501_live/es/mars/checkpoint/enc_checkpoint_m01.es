# es\mars\checkpoint\enc_checkpoint_m01.es
#
# The Cabal checkpoint in Exclusion Zone. Its scenery cans are up from the
# start. The road squads come up when a player reaches the road, the
# bunker's when they reach it; each pulls back to the overlook once it is
# down to half strength (the road's also as a player comes up the front).
# Using the console calls the boss's dropship, which drops its phalanxes,
# then its psions, then the boss himself, and leaves. The dropship flies its
# own command scripts.
#
# Two runs (2026-10-26, 2026-11-01). Both agree on the road's placements,
# the console's device steps and the drop waits: the psions came 13.3 s
# after the phalanxes and the boss 15.7 / 16.0 s after the psions with the
# earlier waves still up, and the ship left 13 s after the boss's drop with
# him alive, putting his two legionaries down as it went (the first,
# unindexed run sent each wave once the last was down). The half-strength
# pull-backs are the second run's: three road squads and all four bunker
# squads moved 0.4-0.8 s after the death that halved them; in the first run
# the front trigger came before any loss. The first bunker squad moving up
# when the overlook's squad goes down is the first run's (366.8 s); in that
# run the third moved when the overlook's squad died a second time, which
# no rule here reproduces. The second run placed the last legionary squad
# and the phalanx on the bunker trigger as the first unindexed run did; the
# 2026-10-26 run placed only the first.

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
    sc_road_front_legionary.wake()
    sc_road_front_phalanx.wake()
    sc_road_overlook_phalanx.wake()
    sc_road_overlook_legionary.wake()
    sc_bunker_legionary_a.wake()

# each road squad pulls back to the overlook once it is down to half
# strength, or as a player comes up the front
script sc_road_front_legionary():
    sleep_until(pt_front.is_triggered() or at_half_strength(sq_road_front_legionary))
    sq_road_front_legionary.set_task("0xC2BCBF22")

script sc_road_front_phalanx():
    sleep_until(pt_front.is_triggered() or at_half_strength(sq_road_front_phalanx))
    sq_road_front_phalanx.set_task("road_overlook_phalanx")

script sc_road_overlook_phalanx():
    sleep_until(pt_front.is_triggered() or at_half_strength(sq_road_overlook_phalanx))
    sq_road_overlook_phalanx.set_task("road_overlook_phalanx")

script sc_road_overlook_legionary():
    sleep_until(pt_front.is_triggered() or at_half_strength(sq_road_overlook_legionary))
    sq_road_overlook_legionary.set_task("0xC2BCBF22")

# the bunker's squads move up to the overlook once they are down to half
# strength; the first also when the overlook's own squad goes down
script sc_bunker_legionary_a():
    sleep_until(at_half_strength(sq_bunker_legionary_a) or sq_bunker_legionary_b.alive_count() == 0)
    sq_bunker_legionary_a.set_task("road_overlook_legionary")

script sc_bunker():
    sleep_until(pt_bunker.is_triggered())
    place_on_task(sq_bunker_legionary_c, "road_main")
    place_on_task(sq_bunker_legionary_d, "road_main")
    seq_cabal_announce.start()
    sc_bunker_legionary_c.wake()
    sc_bunker_legionary_d.wake()
    sleep(2)
    place_on_task(sq_bunker_phalanx, "road_main")
    sleep_until(at_half_strength(sq_bunker_phalanx))
    sq_bunker_phalanx.set_task("road_overlook_legionary")

script sc_bunker_legionary_c():
    sleep_until(at_half_strength(sq_bunker_legionary_c))
    sq_bunker_legionary_c.set_task("road_overlook_legionary")

script sc_bunker_legionary_d():
    sleep_until(at_half_strength(sq_bunker_legionary_d))
    sq_bunker_legionary_d.set_task("road_overlook_legionary")

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

def at_half_strength(sq):
    return sq.alive_count() * 2 <= sq.max_count()

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
