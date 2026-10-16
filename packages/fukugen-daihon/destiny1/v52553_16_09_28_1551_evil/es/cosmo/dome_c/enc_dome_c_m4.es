# es\cosmo\dome_c\enc_dome_c_m4.es
#
# The Last Array's dome_c. On the way to the console the Fallen hold the
# corridors, the landing and the control room entrance, each group coming on
# as the player reaches it. Once the console is working the Hive land in
# three waves outside. From one retail capture: where a step has no trigger
# on the wire, the wait is that run's. The console is usable only by players
# carrying its activity flag, which mission 2's objective sets. The Fallen
# skiff at the landing flies in on its entry path, drops its squad when the
# player comes outside and leaves on the landing's path five seconds later.
# Once the console works two Hive ships pass over the dome while a third
# brings each wave in, drops it and leaves. The ships' command scripts are
# retail's atom for atom.

@activity_bundle("enc_dome_c_m4")
c_objective_sensor_host obj_dome_c_m4_fallen
c_objective_sensor_host obj_dome_c_m4_hive
c_player_monitor_sensor_host pm_refresh_corridor01
c_player_monitor_sensor_host pm_corridor01c_spawn
c_player_monitor_sensor_host pm_refresh_outdoor_enc01
c_player_monitor_sensor_host pm_refresh_guards01
c_player_monitor_sensor_host pm_outdoor_enc_wave02
c_object_sensor_host o_terminal_invis_device
c_object_sensor_host o_auto_door02
c_object_sensor_host o_hei_satellite_event_a01
c_object_sensor_host o_hei_satellite_event_a02
interactable_placement obj_placement_m4_o2
interactable_placement obj_placement_m4_finish
c_squad_member_sensor_host sq_ds_fallen_landing01__dropship
c_control_point_set_sensor_host cps_ds_fallen_landing01_enter
c_control_point_set_sensor_host cps_ds_fallen_landing01
c_squad_sensor_host sq_fallen_corridor01a
c_squad_sensor_host sq_fallen_corridor01b
c_squad_sensor_host sq_fallen_corridor01c1
c_squad_sensor_host sq_fallen_corridor01d
c_squad_sensor_host sq_fallen_corridor02a
c_squad_sensor_host sq_fallen_corridor02b
c_squad_sensor_host sq_fallen_flank01
c_squad_sensor_host sq_fallen_raised01
c_squad_sensor_host sq_fallen_landing01
c_squad_sensor_host sq_fallen_controlentrance01
c_squad_sensor_host sq_fallen_controlentrance_shanks
c_squad_sensor_host sq_fallen_controlentrance_guards
c_squad_sensor_host sq_fallen_ctrlambush01
c_squad_sensor_host sq_fallen_ctrlambush02
c_squad_sensor_host sq_fallen_ctrlambush03
c_sequence_host seq_hive_wave_announce
c_squad_member_sensor_host sq_ds_hive_assault01__dropship
c_squad_member_sensor_host sq_ds_hive_assault02__dropship
c_squad_member_sensor_host sq_ds_hive_assault03__dropship
c_control_point_set_sensor_host cps_ds_hive_assault01_enter
c_control_point_set_sensor_host cps_ds_hive_assault01_exit
c_control_point_set_sensor_host cps_ds_hive_assault02
c_control_point_set_sensor_host cps_ds_hive_assault03
c_control_point_set_sensor_host cps_ds_hive_assault03_enter
c_control_point_set_sensor_host cps_ds_hive_assault03_exit
c_squad_sensor_host sq_hive_assault_thrall_first1
c_squad_sensor_host sq_hive_assault_thrall_first2
static_array<c_squad_sensor_host, 5> sq_hive_assault_thrall
c_squad_sensor_host sq_hive_assault_heavy01a
c_squad_sensor_host sq_hive_assault_trooper02a
c_squad_sensor_host sq_hive_assault_trooper02b
c_squad_sensor_host sq_hive_assault_heavy02a
c_squad_sensor_host sq_hive_assault_trooper03a
c_squad_sensor_host sq_hive_assault_trooper03b
c_squad_sensor_host sq_hive_assault_trooper03c
c_squad_sensor_host sq_hive_assault_heavy03a

startup thread sc_dome_c:
    o_auto_door02.create()
    o_auto_door02.set_device_position(1)
    for satellite in [o_hei_satellite_event_a01, o_hei_satellite_event_a02]:
        satellite.create()
        satellite.set_device_position(0)
    for placement in [obj_placement_m4_o2, obj_placement_m4_finish]:
        placement._object_filter.add_players_with_activity_flag(placement._object.import_identifier())
        placement._object.set_enabled_player_filter(placement._object_filter)
        placement._object.create()
    for sq in [sq_fallen_corridor01a, sq_fallen_corridor01b, sq_fallen_corridor01c1, sq_fallen_corridor01d, sq_fallen_corridor02a, sq_fallen_corridor02b, sq_fallen_flank01, sq_fallen_raised01, sq_fallen_landing01, sq_fallen_controlentrance01, sq_fallen_controlentrance_shanks, sq_fallen_controlentrance_guards, sq_fallen_ctrlambush01, sq_fallen_ctrlambush02, sq_fallen_ctrlambush03]:
        sq.set_objective(obj_dome_c_m4_fallen)
    for sq in [sq_hive_assault_thrall_first1, sq_hive_assault_thrall_first2, sq_hive_assault_thrall[0], sq_hive_assault_thrall[1], sq_hive_assault_heavy01a, sq_hive_assault_trooper02a, sq_hive_assault_trooper02b, sq_hive_assault_heavy02a, sq_hive_assault_trooper03a, sq_hive_assault_trooper03b, sq_hive_assault_trooper03c, sq_hive_assault_heavy03a]:
        sq.set_objective(obj_dome_c_m4_hive)
    place_on_task(sq_fallen_corridor01a, "t_corridor01")
    place_on_task(sq_fallen_corridor01b, "task_1")
    place_on_task(sq_fallen_corridor02a, "task_2")
    place_on_task(sq_fallen_corridor02b, "0x3C7C73C1")
    sc_corridors.wake()
    sc_console.wake()
    sc_assault.wake()

# the console shows it is working once used, and so does the terminal once
# mission 3 makes it
thread sc_console:
    console = obj_placement_m4_o2._object
    sleep_until(console.is_active())
    console.set_device_position(0.28)
    sc_terminal.wake()
    sleep(7)
    device_working(console)

thread sc_terminal:
    sleep_until(o_terminal_invis_device.is_alive())
    device_working(o_terminal_invis_device)

# the Fallen, corridor by corridor to the control room
thread sc_corridors:
    sleep(3)
    sq_ds_fallen_landing01__dropship.place()
    sq_ds_fallen_landing01__dropship.execute(cs_skiff_enter(cps_ds_fallen_landing01_enter))
    sleep(3)
    sq_fallen_corridor01a.set_task("task_4")
    sleep_until(pm_refresh_corridor01.test_any_inside())
    sq_fallen_corridor01a.set_task("t_corridor01")
    sleep_until(pm_corridor01c_spawn.test_any_inside())
    place_on_task(sq_fallen_corridor01c1, "t_corridor01_1")
    place_on_task(sq_fallen_corridor01d, "t_corridor01b")
    sleep_until(sq_fallen_corridor02a.alive_count() == 0)
    sq_fallen_corridor02a.set_task("t_corridor02a")
    sq_fallen_corridor02b.set_task("t_corridor02a")
    sleep_until(pm_refresh_outdoor_enc01.test_any_inside())
    for sq in [sq_fallen_corridor01a, sq_fallen_corridor01b, sq_fallen_corridor01c1, sq_fallen_corridor01d, sq_fallen_corridor02a, sq_fallen_corridor02b]:
        sq.set_task("task_5")
    place_on_task(sq_fallen_flank01, "t_raised01")
    place_on_task(sq_fallen_raised01, "0x3FB06BC8")
    sq_fallen_landing01.set_task("task")
    sq_ds_fallen_landing01__dropship.drop_squad(sq_fallen_landing01)
    sleep(5)
    sq_ds_fallen_landing01__dropship.execute(cs_skiff_exit(cps_ds_fallen_landing01))
    sleep_until(sq_fallen_flank01.alive_count() <= 1)
    sq_fallen_landing01.set_task("t_flank01")
    sq_fallen_flank01.set_task("t_flank01")
    sleep_until(sq_fallen_flank01.alive_count() == 0)
    sleep(6)
    sq_fallen_landing01.set_task("t_landing01")
    sq_fallen_flank01.set_task("t_landing01")
    sq_fallen_raised01.set_task("t_landing01")
    place_on_task(sq_fallen_controlentrance01, "t_controlentrance01_1")
    place_on_task(sq_fallen_controlentrance_shanks, "t_controlentrance01b")
    place_on_task(sq_fallen_controlentrance_guards, "t_controlentrance01")
    sleep_until(pm_refresh_guards01.test_any_inside())
    sq_fallen_controlentrance01.set_task("task_3")
    place_on_task(sq_fallen_ctrlambush01, "t_ctrlambush")
    place_on_task(sq_fallen_ctrlambush03, "t_ctrlambush")
    place_on_task(sq_fallen_ctrlambush02, "t_ctrlambush")
    sleep(5)
    sq_fallen_controlentrance01.set_task("t_controlentrance01")

# the Hive, once the console is working: two ships pass over the dome, the
# third brings in three waves
thread sc_assault:
    sleep_until(o_terminal_invis_device.is_alive())
    o_hei_satellite_event_a01.set_device_position(1)
    sleep(3)
    o_hei_satellite_event_a02.set_device_position(1)
    sleep_until(pm_outdoor_enc_wave02.test_any_inside())
    hive_ship_pass(sq_ds_hive_assault02__dropship, cps_ds_hive_assault02)
    sleep(1)
    hive_ship_pass(sq_ds_hive_assault03__dropship, cps_ds_hive_assault03)
    sleep(1)
    ship = sq_ds_hive_assault01__dropship
    hive_ship_enter(ship, cps_ds_hive_assault01_enter)
    sleep(12)
    drop_on_task(ship, sq_hive_assault_thrall_first1, "t_thrall_1")
    drop_on_task(ship, sq_hive_assault_thrall_first2, "t_thrall_1")
    seq_hive_wave_announce.start()
    sleep(5)
    drop_on_task(ship, sq_hive_assault_heavy01a, "0x56D7ABC2")
    sleep(3)
    hive_ship_leave(ship, cps_ds_hive_assault01_exit)

    # the second wave
    sleep_until(sq_hive_assault_thrall_first2.alive_count() == 0)
    sleep(13)
    hive_ship_enter(ship, cps_ds_hive_assault01_enter)
    sleep(8)
    place_on_task(sq_hive_assault_thrall[0], "t_thrall_1")
    sleep(5)
    drop_on_task(ship, sq_hive_assault_trooper02a, "t_anchors")
    sleep(3)
    drop_on_task(ship, sq_hive_assault_trooper02b, "t_anchors")
    sleep(4)
    drop_on_task(ship, sq_hive_assault_heavy02a, "task_7")
    sleep(3)
    hive_ship_leave(ship, cps_ds_hive_assault01_exit)

    # the third
    sleep_until(sq_hive_assault_trooper02a.alive_count() == 0)
    sleep_until(sq_hive_assault_trooper02b.alive_count() == 0)
    hive_ship_enter(ship, cps_ds_hive_assault03_enter)
    sleep(1)
    place_on_task(sq_hive_assault_thrall[1], "t_thrall_1")
    sq_hive_assault_trooper02a.set_task("task_4")
    sq_hive_assault_trooper02b.set_task("task_4")
    sq_hive_assault_heavy01a.set_task("task_4")
    sleep(12)
    drop_on_task(ship, sq_hive_assault_trooper03a, "task")
    sleep(3)
    drop_on_task(ship, sq_hive_assault_trooper03b, "task")
    sleep(3)
    drop_on_task(ship, sq_hive_assault_trooper03c, "task")
    sleep(5)
    drop_on_task(ship, sq_hive_assault_heavy03a, "task_6")
    sleep(3)
    hive_ship_leave(ship, cps_ds_hive_assault03_exit)
    sleep(11)
    sq_hive_assault_trooper03a.set_task("task_4")
    sq_hive_assault_trooper03b.set_task("task_4")
    sq_hive_assault_trooper03c.set_task("task_4")

def hive_ship_enter(pilot, path):
    pilot.place()
    pilot.execute(cs_hive_ship_enter(path))

def hive_ship_pass(pilot, path):
    pilot.place()
    pilot.execute(cs_hive_ship_pass(path))

def hive_ship_leave(pilot, path):
    pilot.execute(cs_hive_ship_exit(path))

# a working device: nudged between 0.29 and 0.28 at random, quick pairs with
# longer rests between, for as long as the activity runs
def device_working(device):
    while true:
        device.set_device_position(0.29)
        sleep(0.3 + mathlib.random_real(0.4))
        device.set_device_position(0.28)
        if mathlib.random_real(1) <= 0.5:
            sleep(1.7 + mathlib.random_real(1.3))
        else:
            sleep(0.3 + mathlib.random_real(0.4))

def drop_on_task(pilot, sq, task):
    sq.set_task(task)
    pilot.drop_squad(sq)

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

# the skiff comes in on its path, opens up and turns to face the landing
command_script cs_skiff_enter(path):
    snap_to(path, 0)
    ability("dropship", "enter_90")
    set_channel_scalar("doors", 1)
    set_flag(3, 3)
    terminate_immediate()
    face(path, 0)

command_script cs_skiff_exit(path):
    set_flag(3, 3)
    terminate_immediate()
    move_to(path, 0, false)
    face(path, 0)
    move_to(path, 1, false)
    ability("dropship", "exit_25")

# the wave ship flies its entrance and holds until told to leave
command_script cs_hive_ship_enter(path):
    snap_to(path, 0)
    ability("dropship", "0xE06C034F")
    set_flag(3, 3)

command_script cs_hive_ship_exit(path):
    set_flag(3, 3)
    terminate_immediate()
    move_to(path, 0, false)
    face(path, 0)
    ability("dropship", "exit_1")

# the other two cross the dome and leave
command_script cs_hive_ship_pass(path):
    snap_to(path, 0)
    set_flag(3, 3)
    ability("dropship", "0xE06C034F")
    move_to(path, 1, false)
    ability("dropship", "exit_1")
