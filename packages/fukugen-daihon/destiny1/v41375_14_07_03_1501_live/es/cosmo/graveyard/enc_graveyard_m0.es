# es\cosmo\graveyard\enc_graveyard_m0.es
#
# The graveyard in A Guardian Rises: the Ketch arrives, the Fallen dropships
# drop their troops, then the sniper and the exit shanks come in.

@activity_bundle("enc_graveyard_m0")
c_object_sensor_host o_ketch_gantry
@member_counts({vandal: 1})
c_squad_sensor_host sq_fallen_m0_sniper
c_objective_sensor_host obj_fallen_m0  # true name unknown
@member_counts({dregs: 3, vandal: 1})
c_squad_sensor_host sq_fallen_m0_drop_1
@member_counts({dregs: 2})
c_squad_sensor_host sq_fallen_m0_drop_2
@member_counts({dregs: 3})
c_squad_sensor_host sq_fallen_m0_drop_2_b
@member_counts({dreg1: 3})
c_squad_sensor_host sq_fallen_m0_upgrade
@member_counts({shank1: 1, shank2: 1, shank3: 1})
c_squad_sensor_host sq_fallen_m0_exit_shanks
c_player_trigger_sensor_host pt_ketch  # true name unknown
c_cinematic_sensor_host ci_ketch_arrival_cinematic
c_object_sensor_host o_signal_flare
c_squad_sensor_host sq_fallen_dropship_1
c_squad_member_sensor_host sq_fallen_dropship_1__pilot  # true name unknown
c_control_point_set_sensor_host cp_dropship_enter_1  # true name unknown
c_control_point_set_sensor_host cp_dropship_exit_1  # true name unknown
c_squad_sensor_host sq_fallen_dropship_2
c_squad_member_sensor_host sq_fallen_dropship_2__pilot  # true name unknown
c_control_point_set_sensor_host cp_dropship_enter_2  # true name unknown
c_squad_sensor_host sq_fallen_dropship_3
c_squad_member_sensor_host sq_fallen_dropship_3__pilot  # true name unknown
c_control_point_set_sensor_host cp_dropship_enter_3  # true name unknown
c_squad_sensor_host sq_fallen_dropship_4
c_squad_member_sensor_host sq_fallen_dropship_4__pilot  # true name unknown
c_control_point_set_sensor_host cp_dropship_enter_4  # true name unknown
c_control_point_set_sensor_host cp_dropship_exit_4  # true name unknown
c_command_script __cs  # true name unknown
c_player_trigger_sensor_host pt_drop_2  # true name unknown
c_player_trigger_sensor_host pt_exit_shanks  # true name unknown

startup thread sc_graveyard_main:
    o_ketch_gantry.create()
    sq_fallen_m0_sniper.set_objective(obj_fallen_m0)
    sq_fallen_m0_drop_1.set_objective(obj_fallen_m0)
    sq_fallen_m0_drop_2.set_objective(obj_fallen_m0)
    sq_fallen_m0_drop_2_b.set_objective(obj_fallen_m0)
    sq_fallen_m0_upgrade.set_objective(obj_fallen_m0)
    sq_fallen_m0_exit_shanks.set_objective(obj_fallen_m0)
    sc_ketch.wake()
    sc_exit_shanks.wake()

thread sc_ketch:
    sleep_until(pt_ketch.is_triggered())
    sleep(2)
    sc_signal_flare.wake()
    sleep(2)
    ci_ketch_arrival_cinematic.start()
    o_ketch_gantry.delete_object()
    sc_dropship_1.wake()
    sc_dropship_2.wake()
    sc_dropship_3.wake()
    sc_dropship_4.wake()
    sc_sniper.wake()

thread sc_signal_flare:
    o_signal_flare.create()
    sleep(20)
    o_signal_flare.delete_object()

thread sc_dropship_1:
    dropship_enter(sq_fallen_dropship_1__pilot, cp_dropship_enter_1, true)
    sleep(9)
    sq_fallen_m0_drop_1.set_task("drop_1")
    sq_fallen_dropship_1__pilot.drop_squad(sq_fallen_m0_drop_1)
    sleep(5)
    dropship_leave(sq_fallen_dropship_1__pilot, cp_dropship_exit_1)

thread sc_dropship_2:
    sleep(2)
    dropship_enter(sq_fallen_dropship_2__pilot, cp_dropship_enter_2, false)

thread sc_dropship_3:
    sleep(1)
    dropship_enter(sq_fallen_dropship_3__pilot, cp_dropship_enter_3, false)

thread sc_dropship_4:
    sleep(3)
    dropship_enter(sq_fallen_dropship_4__pilot, cp_dropship_enter_4, true)
    sleep(9)
    sq_fallen_m0_drop_2.set_task("drop_2")
    sq_fallen_m0_drop_2_b.set_task("drop_2_b")
    sq_fallen_dropship_4__pilot.drop_squad(sq_fallen_m0_drop_2)
    sq_fallen_dropship_4__pilot.drop_squad(sq_fallen_m0_drop_2_b)
    sleep(5)
    dropship_leave(sq_fallen_dropship_4__pilot, cp_dropship_exit_4)

def dropship_enter(pilot, path, lands):
    __cs.clear()
    __cs.snap_to(path, 0)
    __cs.ability("dropship", "enter_25_long")
    __cs.move_to(path, 1, lands)
    if lands:
        __cs.set_channel_scalar("doors", 1)
    else:
        __cs.ability("dropship", "exit_25")
    pilot.place()
    pilot.execute(__cs)

def dropship_leave(pilot, path):
    __cs.clear()
    __cs.set_channel_scalar("doors", 0)
    __cs.move_to(path, 0, false)
    __cs.ability("dropship", "0x1E35DF11")
    pilot.execute(__cs)

thread sc_sniper:
    sleep_until_timeout(pt_drop_2.is_triggered(), 20)
    sq_fallen_m0_sniper.set_task("sniper")
    sq_fallen_m0_sniper.place()

thread sc_exit_shanks:
    sleep_until(pt_exit_shanks.is_triggered())
    sq_fallen_m0_upgrade.set_task("upgrade_dregs")
    sq_fallen_m0_exit_shanks.set_task("exit_shanks")
    sq_fallen_m0_upgrade.place()
    sq_fallen_m0_exit_shanks.place()
