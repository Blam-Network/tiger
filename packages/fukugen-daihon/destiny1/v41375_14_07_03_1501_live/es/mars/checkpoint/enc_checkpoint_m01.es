# es\mars\checkpoint\enc_checkpoint_m01.es
#
# The Cabal checkpoint in Exclusion Zone. The road squads come up when a
# player reaches the road, the bunker's when they reach it; using the
# console calls the boss's dropship, which drops its phalanxes, then its
# psions, then the boss himself, and leaves when he dies. The dropship flies
# its own command script.
#
# One run: the drop waits and the squads' first tasks are as captured; their
# later tasks (the road and bunker squads falling back as they lose men)
# are the task tree's, not this script's.

@activity_bundle("enc_checkpoint_m01")
c_trigger_volume_slot_host tv_road
c_player_trigger_sensor_host pt_road bind(tv_road)
c_trigger_volume_slot_host tv_front
c_player_trigger_sensor_host pt_front bind(tv_front)
c_trigger_volume_slot_host tv_bunker
c_player_trigger_sensor_host pt_bunker bind(tv_bunker)
c_objective_sensor_host obj_checkpoint_m01
c_nav_point_host np_bunker
c_object_sensor_host o_checkpoint_ghost_cage
countdown_placement sp_placement_console bind("0x47DCE9B0")
c_sequence_host seq_cabal_announce
c_squad_sensor_host sq_road_front_legionary
c_squad_member_sensor_host sq_road_front_legionary__legionary_a
c_squad_member_sensor_host sq_road_front_legionary__legionary_b
c_squad_member_sensor_host sq_road_front_legionary__legionary_c
c_squad_sensor_host sq_road_front_phalanx
c_squad_sensor_host sq_road_overlook_legionary
c_squad_sensor_host sq_road_overlook_phalanx
c_squad_sensor_host sq_bunker_legionary_a
c_squad_sensor_host sq_bunker_legionary_b
c_squad_sensor_host sq_bunker_legionary_c
c_squad_sensor_host sq_bunker_legionary_d
c_squad_sensor_host sq_bunker_phalanx
c_squad_sensor_host sq_dropship_boss
c_squad_member_sensor_host sq_dropship_boss__pilot
c_control_point_set_sensor_host cps_dropship_boss_entry
c_control_point_set_sensor_host cps_dropship_boss_exit
c_squad_sensor_host sq_boss_phalanx_a
c_squad_sensor_host sq_boss_phalanx_b
c_squad_sensor_host sq_boss_phalanx_c
c_squad_sensor_host sq_boss_psion_a
c_squad_sensor_host sq_boss_psion_b
c_squad_sensor_host sq_boss_psion_c
c_squad_sensor_host sq_boss_legionary_a
c_squad_sensor_host sq_boss_legionary_b
c_squad_sensor_host sq_boss
c_squad_member_sensor_host sq_boss__boss

startup thread sc_checkpoint_main:
    for sq in [sq_road_front_legionary, sq_road_front_phalanx, sq_road_overlook_legionary, sq_road_overlook_phalanx, sq_bunker_legionary_a, sq_bunker_legionary_b, sq_bunker_legionary_c, sq_bunker_legionary_d, sq_bunker_phalanx, sq_boss_phalanx_a, sq_boss_phalanx_b, sq_boss_phalanx_c, sq_boss_psion_a, sq_boss_psion_b, sq_boss_psion_c, sq_boss_legionary_a, sq_boss_legionary_b, sq_boss]:
        sq.set_objective(obj_checkpoint_m01)
    sc_road.wake()
    sc_front.wake()
    sc_bunker.wake()
    sc_console.wake()

thread sc_road:
    sleep_until(pt_road.is_triggered())
    place_on_task(sq_road_front_legionary, "road_phalanx_retreat")
    place_on_task(sq_road_front_phalanx, "road_phalanx")
    place_on_task(sq_road_overlook_phalanx, "road_front_phalanx")
    place_on_task(sq_road_overlook_legionary, "road_legionaries")
    place_on_task(sq_bunker_legionary_a, "road_main")
    place_on_task(sq_bunker_legionary_b, "road_overlook_legionary")

thread sc_front:
    sleep_until(pt_front.is_triggered())
    sq_road_overlook_phalanx.set_task("road_overlook_phalanx")

thread sc_bunker:
    sleep_until(pt_bunker.is_triggered())
    place_on_task(sq_bunker_legionary_c, "road_main")
    place_on_task(sq_bunker_legionary_d, "road_main")
    seq_cabal_announce.start()
    sleep(2)
    place_on_task(sq_bunker_phalanx, "road_main")

# using the console raises the Ghost's cage and calls the boss's ship
thread sc_console:
    sleep(10)
    sleep(1)
    o_checkpoint_ghost_cage.create()
    sleep(3)
    sc_dropship_boss.wake()
    sleep(1)
    o_checkpoint_ghost_cage.set_device_position(1)
    sleep_until(not o_checkpoint_ghost_cage.is_alive())
    o_checkpoint_ghost_cage.delete_object()

thread sc_dropship_boss:
    sq_dropship_boss__pilot.place()
    sq_dropship_boss__pilot.execute(cs_dropship_boss_enter(cps_dropship_boss_entry))
    sleep(13)
    for sq in [sq_boss_phalanx_a, sq_boss_phalanx_b, sq_boss_phalanx_c]:
        drop_on_task(sq, "boss_legionaries")
    sleep_until(sq_boss_phalanx_a.alive_count() + sq_boss_phalanx_b.alive_count() + sq_boss_phalanx_c.alive_count() == 0)
    sleep(2)
    for sq in [sq_boss_psion_a, sq_boss_psion_b, sq_boss_psion_c]:
        drop_on_task(sq, "bunker_main")
    sleep_until(sq_boss_psion_a.alive_count() + sq_boss_psion_b.alive_count() + sq_boss_psion_c.alive_count() <= 2)
    sleep(3)
    drop_on_task(sq_boss, "0x05F280F0")
    sleep_until(not sq_boss__boss.is_bound())
    sq_dropship_boss__pilot.execute(cs_dropship_boss_exit(cps_dropship_boss_exit)); sleep_until(sq_dropship_boss__pilot.get_command_script_state() != e_command_script_state.executing)
    sq_dropship_boss.remove()

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
