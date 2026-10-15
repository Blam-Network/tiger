# es\mars\plains\enc_plains_m01.es
#
# The plains in Exclusion Zone: the tunnel into the Cabal base and the base
# itself. Lets the player spawn once they are in the bubble, runs the
# ambience, and works the base: the vent and the garage control are
# placements the player holds on; using the control raises the terminal
# cage, and once it is gone the garage opens, the alarm sounds and the
# first dropship comes in. The second ship comes when a player reaches the
# middle of the base. The dropships fly their own command scripts.
#
# One run: the drop timings, the first ship leaving on the base's deaths,
# the second on a timer, and the sand squads' change of task on the
# centurion's death are single-run facts.

c_location_sensor_host plains
c_player_trigger_sensor_host pt_plains bind(plains)
c_trigger_volume_slot_host tv_base_mid
c_player_trigger_sensor_host pt_base_mid bind(tv_base_mid)
c_trigger_volume_slot_host tv_door
c_player_trigger_sensor_host pt_door bind(tv_door)
c_objective_sensor_host obj_plains_m01
c_object_sensor_host o_door
c_object_sensor_host o_lights
c_object_sensor_host o_sparrow_terminal_cage
c_object_sensor_host o_garage_holo_control
countdown_placement sp_placement_vent bind("0x5F62CC37")
countdown_placement sp_placement_control bind("0x8ED9F019")
c_sequence_host seq_alarm
c_sequence_host seq_ambience_a
c_sequence_host seq_ambience_b
c_sequence_host seq_ambience_c
c_squad_sensor_host sq_dropship_base
c_squad_member_sensor_host sq_dropship_base__pilot
c_control_point_set_sensor_host cps_dropship_base_entry
c_control_point_set_sensor_host cps_dropship_base_exit
c_squad_sensor_host sq_dropship_sand
c_squad_member_sensor_host sq_dropship_sand__pilot
c_control_point_set_sensor_host cps_dropship_sand_entry
c_control_point_set_sensor_host cps_dropship_sand_exit
c_squad_sensor_host sq_base_phalanx
c_squad_sensor_host sq_base_legionary_a
c_squad_sensor_host sq_base_legionary_b
c_squad_sensor_host sq_base_legionary_c
c_squad_sensor_host sq_backup_legionary_a
c_squad_sensor_host sq_backup_legionary_b
c_squad_sensor_host sq_sand_legionary_a
c_squad_sensor_host sq_sand_legionary_b
c_squad_sensor_host sq_sand_legionary_c
c_squad_sensor_host sq_anchor_phalanx
c_squad_sensor_host sq_anchor_centurion

startup thread sc_plains_main:
    o_door.create()
    o_lights.create()
    sp_placement_vent._object.create()
    sp_placement_control._object.create()
    seq_ambience_a.start()
    for sq in [sq_base_phalanx, sq_base_legionary_a, sq_base_legionary_b, sq_base_legionary_c, sq_backup_legionary_a, sq_backup_legionary_b, sq_sand_legionary_a, sq_sand_legionary_b, sq_sand_legionary_c, sq_anchor_phalanx, sq_anchor_centurion]:
        sq.set_objective(obj_plains_m01)
    sc_ambience.wake()
    sc_garage.wake()
    sleep_until(pt_plains.is_triggered())
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.active)

thread sc_ambience:
    sleep(5)
    seq_ambience_b.start()
    sleep(8)
    seq_ambience_c.start()

# the vent, then the garage control; the base wakes when the control is used
thread sc_garage:
    sleep(33)
    sleep(6)
    o_garage_holo_control.create()
    sleep(14)
    o_sparrow_terminal_cage.create()
    o_garage_holo_control.set_device_position(1)
    sleep(3)
    o_sparrow_terminal_cage.set_device_position(1)
    sleep_until(not o_sparrow_terminal_cage.is_alive())
    o_sparrow_terminal_cage.delete_object()
    o_door.set_device_position(1)
    o_lights.set_device_position(1)
    seq_ambience_a.stop()
    seq_ambience_b.stop()
    seq_ambience_c.stop()
    seq_alarm.start()
    pt_base_mid.reset()
    sc_dropship_base.wake()
    sleep_until(pt_base_mid.is_triggered())
    sc_dropship_sand.wake()
    sleep_until(sq_sand_legionary_a.alive_count() + sq_sand_legionary_b.alive_count() + sq_sand_legionary_c.alive_count() > 0)
    sleep_until(base_alive_count() == 0)
    seq_alarm.stop()

# the first ship lands in the garage and leaves once its troops are dead
thread sc_dropship_base:
    dropship_enter(sq_dropship_base__pilot, cs_dropship_land(cps_dropship_base_entry))
    sleep(5)
    for sq in [sq_base_legionary_a, sq_base_legionary_b, sq_base_legionary_c]:
        drop_on_task(sq_dropship_base__pilot, sq, "base_phalanx_fight")
    sleep(3)
    drop_on_task(sq_dropship_base__pilot, sq_base_phalanx, "base_phalanx")
    sleep(3)
    drop_on_task(sq_dropship_base__pilot, sq_backup_legionary_a, "backup")
    drop_on_task(sq_dropship_base__pilot, sq_backup_legionary_b, "backup")
    sleep_until(sq_base_phalanx.alive_count() + sq_base_legionary_a.alive_count() + sq_base_legionary_b.alive_count() + sq_base_legionary_c.alive_count() + sq_backup_legionary_a.alive_count() + sq_backup_legionary_b.alive_count() == 0)
    dropship_leave(sq_dropship_base, sq_dropship_base__pilot, cps_dropship_base_exit)

# the second ship hovers over the sand: the centurion first, then his
# legionaries, who go on the attack when he falls
thread sc_dropship_sand:
    dropship_enter(sq_dropship_sand__pilot, cs_dropship_hover(cps_dropship_sand_entry))
    sleep(7)
    drop_on_task(sq_dropship_sand__pilot, sq_anchor_centurion, "anchor")
    sleep(3)
    for sq in [sq_sand_legionary_a, sq_sand_legionary_b, sq_sand_legionary_c]:
        drop_on_task(sq_dropship_sand__pilot, sq, "backup_advance")
    sc_sand_attack.wake()
    sleep(14)
    dropship_leave(sq_dropship_sand, sq_dropship_sand__pilot, cps_dropship_sand_exit)

thread sc_sand_attack:
    sleep_until(sq_anchor_centurion.alive_count() == 0)
    for sq in [sq_sand_legionary_a, sq_sand_legionary_b, sq_sand_legionary_c]:
        sq.set_task("0x034BA9A5")

def base_alive_count():
    return sq_base_phalanx.alive_count() + sq_base_legionary_a.alive_count() + sq_base_legionary_b.alive_count() + sq_base_legionary_c.alive_count() + sq_backup_legionary_a.alive_count() + sq_backup_legionary_b.alive_count() + sq_anchor_centurion.alive_count() + sq_sand_legionary_a.alive_count() + sq_sand_legionary_b.alive_count() + sq_sand_legionary_c.alive_count()

def dropship_enter(pilot, cs):
    pilot.place()
    pilot.execute(cs)

def dropship_leave(ship, pilot, path):
    pilot.execute(cs_dropship_exit(path)); sleep_until(pilot.get_command_script_state() != e_command_script_state.executing)
    ship.remove()

def drop_on_task(pilot, sq, task):
    sq.set_task(task)
    pilot.drop_squad(sq)

# the garage ship comes straight down and opens up
command_script cs_dropship_land(path):
    snap_to(path, 0)
    ability("dropship", "enter_90_stop")
    set_channel_scalar("doors", 1)

# the sand ship comes in on the slant and holds; retail queued its entrance twice
command_script cs_dropship_hover(path):
    snap_to(path, 0)
    ability("dropship", "enter_45_stop")
    ability("dropship", "enter_45_stop")
    set_channel_scalar("doors", 1)

command_script cs_dropship_exit(path):
    move_to(path, 0, false)
    set_channel_scalar("doors", 0)
    move_to(path, 1, false)
    ability("dropship", "exit_45")
