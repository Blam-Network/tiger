# es\moon\act_moon_m1_launchtubes\unknown_2495f541.es
#
# The accelerator in The Dark Beyond: the false start, the Fallen who come
# up from inside, then two dropships' worth of troops, and the patrols that
# take over once the wave is dead. True name unknown.
# One capture: every delay below is a single-run fact, nothing is confirmed.
# Not reproduced: the invisible devices' position writes (o_device_invis_*),
# the pike squad's task churn while it fights (it cycles its tasks every
# half second or so; only its first tasks are set here) and the music
# sequence restart at the end of the wave.

@activity_bundle(0x2495F541)

player_trigger pt_bubble
player_trigger pt_drop_exit
player_trigger pt_accel_exit
object o_device_invis_a
object o_device_invis_b
objective obj_accelerator_ch1
objective obj_patrol
objective obj_patrol_exit
squad sq_interior_back
squad sq_interior_melee
squad sq_interior_front
@member_counts({dreg_pistol: 3, captain: 1})
squad sq_drop_initial
@member_counts({dreg_pistol: 3, 0xD1F11E74: 1})
squad sq_drop_a
@member_counts({dreg_pistol: 2})
squad sq_drop_c
@member_counts({dreg_pistol: 2, 0xD1F11E74: 1, captain: 1, servitor: 1})
squad sq_drop_d
@member_counts({captain: 1, dreg_pistol: 2, 0xD1F11E74: 1})
squad sq_north_dome
@member_counts({vandal_shock: 1, shank: 3})
squad sq_north_ridge
@member_counts({captain: 1, shank: 2})
squad sq_east_left
@member_counts({vandal_rifle: 2, shank: 2})
squad sq_east_right
@member_counts({pilot: 1})
squad sq_pike
@member_counts({pilot: 1})
squad sq_pike_a
@member_counts({pilot: 1})
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
interactable_placement pf_placement_button_a bind("0x0F93E94C")
c_command_script __cs  # true name unknown

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
    sc_east_ship_first.wake()
    sc_after_wave.wake()

script sc_accelerator_objects():
    sleep_until(pt_bubble.is_triggered())
    o_device_invis_a.create()
    o_device_invis_b.create()

# The first button press is a false start: the Fallen inside the room come
# for the player and the west dropship arrives.
script sc_false_start():
    sleep_until(pf_placement_button_a._interactable.is_active())
    sleep(6)
    seq_accel_audio_room_rear.start()
    seq_accel_audio_room_front.start()
    seq_accel_audio_false_start.start()
    sleep(7)
    sq_interior_back.set_task("0x437C398D")
    sq_interior_back.place()
    sq_interior_melee.set_task("0x89055BCC")
    sq_interior_melee.place()
    sc_west_ship.wake()

script sc_west_ship():
    ship_enter_west()
    seq_music_accelerator.set_switch_mask(3)
    sleep(2)
    seq_d_o1_s11.start()
    sleep(2)
    pt_drop_exit.reset()
    sleep_until(pt_drop_exit.is_triggered())
    sq_interior_front.set_task("0x437C398D")
    sq_interior_front.place()
    sleep(2)
    sq_drop_initial.set_task("0x81B1F773")
    sq_dropship_west__pilot.drop_squad(sq_drop_initial)
    sleep(5)
    ship_leave_west()

# The true start follows the last of the Fallen from the first drop.
script sc_east_ship_first():
    sleep_until(sq_drop_initial.alive_count() > 0)
    sleep_until(sq_drop_initial.alive_count() == 0)
    sleep(1)
    seq_accel_audio_true_start.start()
    seq_music_accelerator.set_switch_mask(7)
    sleep(5)
    ship_enter_east_1()
    sleep(8)
    sq_drop_a.set_task("0x6D32C3A5")
    sq_drop_c.set_task("0x6D32C3A5")
    sq_dropship_east__pilot.drop_squad(sq_drop_a)
    sq_dropship_east__pilot.drop_squad(sq_drop_c)
    seq_wave_announce_drop1.start()
    seq_music_accelerator.set_switch_mask(15)
    sleep(5)
    ship_leave_east_1()
    sleep(15)
    ship_enter_east_2()
    sleep_until(pt_accel_exit.is_triggered())
    sq_drop_d.set_task("0x6D32C3A5")
    sq_dropship_east__pilot.drop_squad(sq_drop_c)
    sq_dropship_east__pilot.drop_squad(sq_drop_d)
    seq_wave_announce_drop2.start()
    sleep(5)
    ship_leave_east_2()

# Once the dropped troops are dead the music winds down and the patrols
# (the pike squad and the lookouts) take the accelerator.
script sc_after_wave():
    sleep_until(sq_drop_d.alive_count() > 0)
    sleep_until(sq_drop_d.alive_count() == 0)
    sq_drop_a.set_task("0xA66A1E64")
    sq_drop_c.set_task("0xA66A1E64")
    sq_drop_d.set_task("0xA66A1E64")
    sleep(9)
    seq_music_accelerator.set_switch_mask(31)
    seq_music_accelerator.stop()
    sleep_until(sq_drop_c.alive_count() == 0)
    sleep(2)
    seq_d_o1_s12.start()
    sleep(5)
    sq_north_dome.set_task("0xAA129FDF")
    sq_north_ridge.set_task("0xF27BDC30")
    sq_east_left.set_task("0x095E0E9E")
    sq_east_right.set_task("0x095E0E9E")
    sq_pike.set_task("0x407B9797")
    sq_pike_b.set_task("0xCFC8F72A")
    sq_pike_a.set_task("0xCFC8F72A")
    sleep(2)
    sq_pike_a.set_task("0x02BB4AA3")

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
