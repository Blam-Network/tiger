# es\moon\act_moon_m1_launchtubes\unknown_2495f541.es
#
# The accelerator in The Dark Beyond: the false start, the Fallen who come
# up from inside, three dropships' worth of troops, and the patrols that
# take over once the wave is dead.
# From two 2.3.1 runs (2026-10-03 and 2026-10-24): every delay below held in
# both, to within a second. Not reproduced: the buttons' first device write
# (position 0, a second after the invisible devices come in), the pike
# squads' task churn while they fight (they cycle tasks every half second or
# so; only their first tasks are set here) and the dropships' third command
# script, 25 s after each leaves.

@activity_bundle(0x2495F541)

player_trigger pt_bubble
player_trigger pt_drop_exit
object o_device_invis_a
object o_device_invis_b
interactable_placement pf_placement_button_a bind("0x0F93E94C")
interactable_placement pf_placement_button_b
interactable_incident_listener il_button_a bind("0x0F93E94C")
kill_incident_listener il_drop_initial
objective obj_accelerator_ch1
objective obj_patrol
objective obj_patrol_exit
squad sq_interior_back
squad_member sq_interior_back__dreg_pistol
squad_member sq_interior_back__dreg_pistol_1
squad_member sq_interior_back__dreg_pistol_2
squad sq_interior_melee
squad_member sq_interior_melee__dreg_knife
squad sq_interior_front
squad_member sq_interior_front__dreg_pistol
squad_member sq_interior_front__dreg_pistol_1
squad_member sq_interior_front__dreg_pistol_2
squad_member sq_interior_front__vandal
@member_counts({dreg_pistol: 3, captain: 1})
squad sq_drop_initial
@member_counts({dreg_pistol: 3, 0xD1F11E74: 1})
squad sq_drop_a
@member_counts({dreg_pistol: 2})
squad sq_drop_c
@member_counts({dreg_pistol: 2, 0xD1F11E74: 1, captain: 1, servitor: 1})
squad sq_drop_d
squad sq_north_dome
squad sq_north_ridge
squad sq_east_left
squad sq_east_right
squad sq_pike
squad sq_pike_a
squad sq_pike_b
squad sq_dropship_west
squad_member sq_dropship_west__pilot
control_point_set cps_dropship_west_enter
control_point_set cps_dropship_west_exit
squad sq_dropship_east
squad_member sq_dropship_east__pilot
control_point_set cps_dropship_east_1_enter
control_point_set cps_dropship_east_1_exit
control_point_set cps_dropship_east_2_enter
control_point_set cps_dropship_east_2_exit
sequence seq_accel_audio_room_rear
sequence seq_accel_audio_room_front
sequence seq_accel_audio_false_start
sequence seq_accel_audio_true_start
sequence seq_wave_announce_drop1
sequence seq_wave_announce_drop2
sequence seq_music_accelerator
sequence seq_d_o1_s11
sequence seq_d_o1_s12
c_command_script __cs

@startup()
script sc_accelerator_main():
    sq_interior_back.set_objective(obj_accelerator_ch1)
    sq_interior_melee.set_objective(obj_accelerator_ch1)
    sq_interior_front.set_objective(obj_accelerator_ch1)
    sq_drop_initial.set_objective(obj_accelerator_ch1)
    sq_drop_a.set_objective(obj_accelerator_ch1)
    sq_drop_c.set_objective(obj_accelerator_ch1)
    sq_drop_d.set_objective(obj_accelerator_ch1)
    sq_north_dome.set_objective(obj_accelerator_ch1)
    sq_north_ridge.set_objective(obj_accelerator_ch1)
    sq_east_left.set_objective(obj_accelerator_ch1)
    sq_east_right.set_objective(obj_accelerator_ch1)
    sq_pike.set_objective(obj_patrol)
    sq_pike_a.set_objective(obj_patrol_exit)
    sq_pike_b.set_objective(obj_patrol_exit)
    sc_accelerator_objects.wake()
    sc_false_start.wake()
    sc_true_start.wake()
    sc_wave_fallback.wake()
    sc_after_wave.wake()

# The invisible devices drive the accelerator's charge; they come in with
# the player.
script sc_accelerator_objects():
    sleep_until(pt_bubble.is_triggered())
    sleep(1)
    o_device_invis_a.create()
    o_device_invis_b.create()

# The first press of the button is a false start: the accelerator charges
# and dies, the Fallen inside the room come for the player and the west
# dropship arrives.
script sc_false_start():
    sleep_until(il_button_a.get_count() > 0)
    sleep(1)
    o_device_invis_a.set_device_position(0.1)
    pf_placement_button_a._object.set_device_position(0.1)
    sleep(4)
    o_device_invis_a.set_device_position(1)
    pf_placement_button_a._object.set_device_position(1)
    o_device_invis_b.set_device_position(1)
    seq_accel_audio_room_rear.start()
    seq_accel_audio_room_front.start()
    seq_accel_audio_false_start.start()
    sleep(1)
    pf_placement_button_b._object.set_device_position(1)
    sleep(3)
    o_device_invis_a.set_device_position(0)
    sleep(1)
    pf_placement_button_a._object.set_device_position(0)
    sleep(2)
    sq_interior_back.set_task("0x437C398D")
    sq_interior_back.place()
    sq_interior_melee.set_task("0x89055BCC")
    sq_interior_melee.place()
    sc_west_ship.wake()

# The west ship hovers until the player heads back out through the drop
# exit, then drops the first troops and leaves.
script sc_west_ship():
    ship_enter_west()
    sleep(2)
    seq_music_accelerator.set_switch_mask(3)
    seq_d_o1_s11.start()
    sleep(4)
    pt_drop_exit.reset()
    sleep_until(pt_drop_exit.is_triggered())
    sq_interior_front.set_task("0x437C398D")
    sq_interior_front.place()
    sleep(2)
    sq_drop_initial.set_task("0x81B1F773")
    sq_dropship_west__pilot.drop_squad(sq_drop_initial)
    sleep(5)
    ship_leave_west()

# The true start comes as the first drop is down to its last: the
# accelerator powers up and the east ship brings two more waves, the second
# once five of the first six are dead. The first drop is counted by its
# kills, three of its four: it lands a body at a time, so its standing count
# reads one before it reads four.
script sc_true_start():
    il_drop_initial.bind_squad(sq_drop_initial)
    sleep_until(il_drop_initial.get_count() >= 3)
    sleep(1)
    seq_music_accelerator.set_switch_mask(7)
    sleep(2)
    seq_accel_audio_true_start.start()
    o_device_invis_a.set_device_position(1)
    o_device_invis_b.set_device_position(0)
    sleep(1)
    pf_placement_button_a._object.set_device_position(1)
    pf_placement_button_b._object.set_device_position(0)
    sleep(4)
    ship_enter_east_1()
    sleep(9)
    sq_drop_a.set_task("0x6D32C3A5")
    sq_drop_c.set_task("0x6D32C3A5")
    sq_dropship_east__pilot.drop_squad(sq_drop_a)
    sq_dropship_east__pilot.drop_squad(sq_drop_c)
    seq_wave_announce_drop1.start()
    seq_music_accelerator.set_switch_mask(15)
    sleep(5)
    ship_leave_east_1()
    sleep_until(sq_drop_a.alive_count() + sq_drop_c.alive_count() <= 1)
    ship_enter_east_2()
    sleep(5)
    sq_drop_d.set_task("0x6D32C3A5")
    sq_dropship_east__pilot.drop_squad(sq_drop_c)
    sq_dropship_east__pilot.drop_squad(sq_drop_d)
    seq_wave_announce_drop2.start()
    sleep(5)
    ship_leave_east_2()

# With three of the dropped troops left they fall back.
script sc_wave_fallback():
    sleep_until(sq_drop_d.alive_count() > 0)
    sleep_until(drop_alive_count() <= 3)
    sq_drop_a.set_task("0xA66A1E64")
    sq_drop_c.set_task("0xA66A1E64")
    sq_drop_d.set_task("0xA66A1E64")

# Once the last of them is dead the music winds down and the patrols (the
# pike squads and the lookouts) take the accelerator.
script sc_after_wave():
    sleep_until(sq_drop_d.alive_count() > 0)
    sleep_until(drop_alive_count() == 0)
    sleep(2)
    seq_music_accelerator.set_switch_mask(31)
    seq_music_accelerator.stop()
    sleep(5)
    seq_d_o1_s12.start()
    sleep(4)
    sq_north_dome.set_task("0xAA129FDF")
    sq_north_ridge.set_task("0xF27BDC30")
    sq_east_left.set_task("0x095E0E9E")
    sq_east_right.set_task("0x095E0E9E")
    sq_pike.set_task("0x407B9797")
    sq_pike_b.set_task("0xCFC8F72A")
    sleep(2)
    sq_pike_a.set_task("0xCFC8F72A")

def drop_alive_count():
    return sq_drop_a.alive_count() + sq_drop_c.alive_count() + sq_drop_d.alive_count()

def ship_enter_west():
    __cs.clear()
    __cs.snap_to(cps_dropship_west_enter, 0)
    __cs.ability("dropship", "enter_45")
    __cs.move_to(cps_dropship_west_enter, 1, true)
    __cs.set_channel_scalar("doors", 1)
    sq_dropship_west__pilot.place()
    sq_dropship_west__pilot.execute(__cs)

def ship_leave_west():
    __cs.clear()
    __cs.set_channel_scalar("doors", 0)
    __cs.move_to(cps_dropship_west_exit, 0, false)
    __cs.ability("dropship", "0x63C56F3B")
    sq_dropship_west__pilot.execute(__cs)

def ship_enter_east_1():
    __cs.clear()
    __cs.snap_to(cps_dropship_east_1_enter, 0)
    __cs.ability("dropship", "enter_25")
    __cs.move_to(cps_dropship_east_1_enter, 1, false)
    __cs.move_to(cps_dropship_east_1_enter, 2, true)
    __cs.set_channel_scalar("doors", 1)
    sq_dropship_east__pilot.place()
    sq_dropship_east__pilot.execute(__cs)

def ship_leave_east_1():
    __cs.clear()
    __cs.set_channel_scalar("doors", 0)
    __cs.move_to(cps_dropship_east_1_exit, 0, false)
    __cs.ability("dropship", "exit_90")
    sq_dropship_east__pilot.execute(__cs)

def ship_enter_east_2():
    __cs.clear()
    __cs.snap_to(cps_dropship_east_2_enter, 0)
    __cs.ability("dropship", "enter_45_stop")
    __cs.set_channel_scalar("doors", 1)
    sq_dropship_east__pilot.place()
    sq_dropship_east__pilot.execute(__cs)

def ship_leave_east_2():
    __cs.clear()
    __cs.set_channel_scalar("doors", 0)
    __cs.move_to(cps_dropship_east_2_exit, 0, false)
    __cs.ability("dropship", "0x63C56F3B")
    sq_dropship_east__pilot.execute(__cs)
