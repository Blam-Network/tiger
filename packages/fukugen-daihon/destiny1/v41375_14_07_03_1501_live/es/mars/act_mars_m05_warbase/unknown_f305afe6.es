# es\mars\act_mars_m05_warbase\unknown_f305afe6.es
#
# The Garden's Spire's warbase. The bridge: as the player
# closes on it the first Cabal come out on the bridge and the last line, a
# dropship flies in on the colossus path, drops a squad on the top line and
# leaves, and each bridge squad is followed by the next once it is dead. The
# preboss squads come out at their trigger. The key: mission 8 wakes
# sc_key when button B opens the Minotaur eye's cage: the eye is taken, the
# laser comes up, the Vex pillar rises with the Garden key and the cable is
# cut; the boss comes out when the pillar has gone, roaring, with its intro
# squad, and two dropships fly in on the boss paths, each dropping a squad
# and leaving. Mission 8 wakes sc_key_taken once button C is used: the laser
# goes off, the key and the laser go, and the eye last. From one retail
# capture (2.3.1): every wait is that run's. The ships' command scripts are
# retail's atom for atom; each ship leaves the world 7 s after its exit
# script starts.

@activity_bundle(0xF305AFE6)

objective obj_warbase_ch3
squad sq_bridge_a_a
squad sq_bridge_a_b
squad sq_bridge_b_a
squad sq_bridge_b_b
squad sq_bridge_b_c
squad sq_lastline
squad sq_lastline_top_a
squad sq_preboss1
squad sq_preboss2
squad sq_boss
squad sq_boss_intro
squad sq_boss_reinforce
squad sq_boss_wave_a
squad sq_boss_wave_b
squad sq_dropship
squad_member sq_dropship__pilot
squad sq_dropship_c1
squad_member sq_dropship_c1__pilot
squad sq_dropship_c2
squad_member sq_dropship_c2__pilot
control_point_set cps_colossus_enter
control_point_set cps_colossus_exit
control_point_set cps_boss_a_enter
control_point_set cps_boss_a_exit
control_point_set cps_boss_b_enter
control_point_set cps_boss_b_exit
player_trigger pt_bridge_spawn_close
player_trigger pt_preboss
sequence seq_wave_announce1
sequence seq_wave_announce_drop1
sequence seq_wave_announce_drop2
sequence seq_ogreroar_close
object_filter of_ultra
hop_on ho_ultra_invuln
encounter_handle specops_warbase_key

@startup()
script sc_warbase():
    specops_warbase_key.o_cable.create()
    specops_warbase_key.o_cable.set_device_position(1)
    for sq in [sq_bridge_a_a, sq_bridge_a_b, sq_bridge_b_a, sq_bridge_b_b, sq_bridge_b_c, sq_lastline, sq_lastline_top_a, sq_preboss1, sq_preboss2, sq_boss, sq_boss_intro, sq_boss_reinforce, sq_boss_wave_a, sq_boss_wave_b, sq_dropship, sq_dropship_c1, sq_dropship_c2]:
        sq.set_objective(obj_warbase_ch3)
    sc_bridge.wake()
    sc_preboss.wake()

# the bridge
script sc_bridge():
    sleep_until(pt_bridge_spawn_close.is_triggered())
    sleep(1)
    place_on_task(sq_bridge_a_a, "0xAA177D62")
    place_on_task(sq_bridge_b_a, "0xAA177D61")
    place_on_task(sq_lastline, "0x14D4C3BE")
    sc_colossus_ship.wake()
    seq_wave_announce1.start()
    sc_bridge_b.wake()
    sleep(2)
    sleep_until(sq_bridge_a_a.alive_count() == 0)
    place_on_task(sq_bridge_a_b, "0xAA177D62")

script sc_bridge_b():
    sleep(2)
    sleep_until(sq_bridge_b_a.alive_count() == 0)
    place_on_task(sq_bridge_b_b, "0xAA177D61")
    sleep(2)
    sleep_until(sq_bridge_b_b.alive_count() == 0)
    sleep(1)
    place_on_task(sq_bridge_b_c, "0xAA177D61")

# the colossus ship: in, the top line's squad out, and away
script sc_colossus_ship():
    ship = sq_dropship__pilot
    sq_dropship.set_task("0xD9DE3EBC")
    ship.place()
    ship.execute(cs_dropship_enter(cps_colossus_enter))
    sleep(7.6)
    sq_lastline_top_a.set_task("0x4970B3CA")
    ship.drop_squad(sq_lastline_top_a)
    sleep(3)
    dropship_leave(ship, cps_colossus_exit)

script sc_preboss():
    sleep_until(pt_preboss.is_triggered())
    sleep(1.4)
    place_on_task(sq_preboss1, "0x9AFB7BE3")
    place_on_task(sq_preboss2, "0x9AFB7BE3")

# the key: woken by mission 8 as button B opens the Minotaur eye's cage
script sc_key():
    key = specops_warbase_key
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
    place_on_task(sq_boss_intro, "boss")
    of_ultra.add(sq_boss)
    ho_ultra_invuln.set_filter(of_ultra)
    sleep(5)
    place_on_task(sq_boss, "0xBD61B2C5")
    seq_ogreroar_close.start()
    sleep(15)
    sc_boss_ship_a.wake()
    sleep(23)
    sc_boss_ship_b.wake()
    sleep(2)
    sq_boss.set_task("0x927FEBE4")
    sleep(1.5)
    place_on_task(sq_boss_reinforce, "boss")

# the first boss ship drops its squad on the boss's task and leaves
script sc_boss_ship_a():
    ship = sq_dropship_c2__pilot
    sq_dropship_c2.set_task("0xD9DE3EBC")
    ship.place()
    ship.execute(cs_boss_ship_enter(cps_boss_a_enter, "0x052C5FA0"))
    sleep(7)
    drop_on_task(ship, sq_boss_wave_a, seq_wave_announce_drop1)
    sleep(3)
    dropship_leave(ship, cps_boss_a_exit)

script sc_boss_ship_b():
    ship = sq_dropship_c1__pilot
    sq_dropship_c1.set_task("0xD9DE3EBC")
    ship.place()
    ship.execute(cs_boss_ship_enter(cps_boss_b_enter, "0x5782E89A"))
    sleep(5.7)
    drop_on_task(ship, sq_boss_wave_b, seq_wave_announce_drop2)
    sleep(3)
    dropship_leave(ship, cps_boss_b_exit)

# the Garden key: woken by mission 8 once button C has been used
script sc_key_taken():
    key = specops_warbase_key
    sleep(1)
    key.o_laser.set_device_position(0)
    sleep(4)
    key.o_minotaur_eye.set_device_position(1)
    key.o_laser.delete_object()
    key.garden_key.delete_object()
    sleep(2)
    key.o_minotaur_eye.delete_object()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def drop_on_task(ship, sq, announce):
    sq.set_task("boss")
    ship.drop_squad(sq)
    announce.start()

def dropship_leave(ship, path):
    ship.execute(cs_dropship_exit(path))
    sleep(7)
    ship.remove()

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
