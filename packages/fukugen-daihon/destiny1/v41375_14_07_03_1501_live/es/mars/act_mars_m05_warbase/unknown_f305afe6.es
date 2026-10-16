# es\mars\act_mars_m05_warbase\unknown_f305afe6.es
#
# The Garden's Spire's warbase. True name unknown. The bridge: as the player
# closes on it the first Cabal come out on the bridge and the last line, a
# dropship flies in on the colossus path, drops a squad on the top line and
# leaves, and each squad is followed by the next once it is dead. The
# preboss squads come out at their trigger. The key: once mission 8 opens
# the Minotaur eye's cage the eye is taken, the laser comes up, the Vex
# pillar rises with the Garden key and the cable is cut; the boss comes out
# when the pillar has gone, roaring, with its intro squad, and two more
# dropships fly in on the boss paths. The cage coming up again (button C)
# finishes the key: the laser goes off, the key and the laser go, and the
# eye last. From one retail capture (2.3.1): every wait is that run's. The
# ships' command scripts are retail's atom for atom. Retail's boss, intro
# and dropship tasks are not in TU0's list, so those squads keep the
# objective's default; the dropships dropped nothing before the boss died.

@activity_bundle(0xF305AFE6)
c_objective_sensor_host obj_warbase_ch3
c_squad_sensor_host sq_bridge_a_a
c_squad_sensor_host sq_bridge_a_b
c_squad_sensor_host sq_bridge_b_a
c_squad_sensor_host sq_bridge_b_b
c_squad_sensor_host sq_bridge_b_c
c_squad_sensor_host sq_lastline
c_squad_sensor_host sq_lastline_top_a
c_squad_sensor_host sq_preboss1
c_squad_sensor_host sq_preboss2
c_squad_sensor_host sq_boss
c_squad_sensor_host sq_boss_intro
c_squad_sensor_host sq_dropship
c_squad_member_sensor_host sq_dropship__pilot
c_squad_sensor_host sq_dropship_c1
c_squad_member_sensor_host sq_dropship_c1__pilot
c_squad_sensor_host sq_dropship_c2
c_squad_member_sensor_host sq_dropship_c2__pilot
c_control_point_set_sensor_host cps_colossus_enter
c_control_point_set_sensor_host cps_colossus_exit
c_control_point_set_sensor_host cps_boss_a_enter
c_control_point_set_sensor_host cps_boss_b_enter
c_player_trigger_sensor_host pt_bridge_spawn_close
c_player_trigger_sensor_host pt_preboss
c_sequence_host seq_wave_announce1
c_sequence_host seq_ogreroar_close
c_object_filter_sensor_host of_ultra
c_hop_on_sensor_host ho_ultra_invuln
c_encounter_handle specops_warbase_key
c_object_sensor_host o_minoeye_cage

startup thread sc_warbase:
    specops_warbase_key.o_cable.create()
    specops_warbase_key.o_cable.set_device_position(1)
    for sq in [sq_bridge_a_a, sq_bridge_a_b, sq_bridge_b_a, sq_bridge_b_b, sq_bridge_b_c, sq_lastline, sq_lastline_top_a, sq_preboss1, sq_preboss2, sq_boss, sq_boss_intro, sq_dropship, sq_dropship_c1, sq_dropship_c2]:
        sq.set_objective(obj_warbase_ch3)
    sc_bridge.wake()
    sc_preboss.wake()
    sc_key.wake()

# the bridge
thread sc_bridge:
    sleep_until(pt_bridge_spawn_close.is_triggered())
    sleep(1)
    place_on_task(sq_bridge_a_a, "0xAA177D62")
    place_on_task(sq_bridge_b_a, "0xAA177D61")
    place_on_task(sq_lastline, "0x14D4C3BE")
    ship = sq_dropship__pilot
    ship.place()
    ship.execute(cs_dropship_enter(cps_colossus_enter))
    seq_wave_announce1.start()
    sc_bridge_b.wake()
    sleep(2)
    sleep_until(sq_bridge_a_a.alive_count() == 0)
    sleep(2)
    place_on_task(sq_bridge_a_b, "0xAA177D62")
    sleep(1)
    sq_lastline_top_a.set_task("0x4970B3CA")
    ship.drop_squad(sq_lastline_top_a)
    sleep(3)
    ship.execute(cs_dropship_exit(cps_colossus_exit))

thread sc_bridge_b:
    sleep(2)
    sleep_until(sq_bridge_b_a.alive_count() == 0)
    place_on_task(sq_bridge_b_b, "0xAA177D61")
    sleep(2)
    sleep_until(sq_bridge_b_b.alive_count() == 0)
    sleep(1)
    place_on_task(sq_bridge_b_c, "0xAA177D61")

thread sc_preboss:
    sleep_until(pt_preboss.is_triggered())
    sleep(1.4)
    place_on_task(sq_preboss1, "0x9AFB7BE3")
    place_on_task(sq_preboss2, "0x9AFB7BE3")

# the key: the Minotaur eye, the laser, the Vex pillar and the Garden key
thread sc_key:
    key = specops_warbase_key
    sleep_until(o_minoeye_cage.is_alive())
    sleep(4.5)
    key.o_minotaur_eye.create()
    key.o_minotaur_eye.set_device_position(0)
    sleep(5)
    key.o_laser.create()
    key.o_laser.set_device_position(1)
    sleep(1.2)
    key.o_minotaur_eye.set_device_position(0.9)
    sleep(7)
    key.vex_pillar.create()
    key.garden_key.create()
    sleep(1)
    key.o_cable.delete_object()
    sleep(17)
    key.o_cable.create()
    key.o_cable.set_device_position(0)
    sleep(1)
    key.vex_pillar.delete_object()

    # the boss
    sleep(3)
    sq_boss_intro.place()
    of_ultra.add(sq_boss)
    ho_ultra_invuln.set_filter(of_ultra)
    sleep(5)
    sq_boss.place()
    seq_ogreroar_close.start()
    sleep(10)
    boss_ship_enter(sq_dropship_c2__pilot, cps_boss_a_enter, "0x052C5FA0")
    sleep(3)
    boss_ship_enter(sq_dropship_c1__pilot, cps_boss_b_enter, "0x5782E89A")

    # the Garden key, once the cage comes up again
    sleep_until(not o_minoeye_cage.is_alive())
    sleep_until(o_minoeye_cage.is_alive())
    sleep(1.4)
    key.o_laser.set_device_position(0)
    sleep(4.2)
    key.o_minotaur_eye.set_device_position(1)
    key.o_laser.delete_object()
    key.garden_key.delete_object()
    sleep(2)
    key.o_minotaur_eye.delete_object()

def boss_ship_enter(pilot, path, angle):
    pilot.place()
    pilot.execute(cs_boss_ship_enter(path, angle))

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

# the colossus ship comes in on its path, turns to face it and opens up
command_script cs_dropship_enter(path):
    snap_to(path, 0)
    ability("dropship", "0x052C5FA0")
    face(path, 0)
    set_channel_scalar("doors", 1)

command_script cs_dropship_exit(path):
    set_flag(3, 3)
    set_channel_scalar("doors", 0)
    move_to(path, 0, false)
    set_flag(3, 3)
    ability("dropship", "exit_25")

# the boss ships fly their entrances and hold
command_script cs_boss_ship_enter(path, angle):
    snap_to(path, 0)
    set_flag(3, 3)
    ability("dropship", angle)
    face(path, 0)
    set_flag(3, 3)
    set_channel_scalar("doors", 1)
