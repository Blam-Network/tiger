# es\moon\strength\enc_strength_m5.es
#
# Chamber of Night, the approach. When a player enters the bubble the ledge,
# hall and annex Hive take their posts and a tomb ship comes in to drop the
# cave squad, then leaves; once it is gone the tower and bridge squads come
# up with the wave call. Two thrall rushes fire off their own triggers.
#
# One run: the ship's eight seconds before the drop and three before it
# leaves are this run's.

@activity_bundle("enc_strength_m5")

c_objective_sensor_host obj_strength_m5
@member_counts({trooper: 3, wizard: 1})
c_squad_sensor_host sq_cave_floor
@member_counts({trooper: 2, knight: 1})
c_squad_sensor_host sq_cave_ledge
@member_counts({trooper: 2})
c_squad_sensor_host sq_hall
@member_counts({trooper: 3, knight: 1})
c_squad_sensor_host sq_annex_troopers
@member_counts({0xA2DA2AC9: 1, 0xB870FFEE: 1, 0xB870FFED: 1})
c_squad_sensor_host sq_tower
@member_counts({trooper: 4})
c_squad_sensor_host sq_bridge
@member_counts({thrall: 1, thrall_1: 1, thrall_2: 1})
c_squad_sensor_host sq_m5_thrall_a
@member_counts({thrall: 1, thrall_1: 1, thrall_2: 1})
c_squad_sensor_host sq_m5_thrall_b
c_squad_sensor_host sq_cutter
c_squad_member_sensor_host sq_cutter__pilot
c_command_script __cs
c_control_point_set_sensor_host cps_cutter_1_entry
c_control_point_set_sensor_host cps_cutter_1_exit
c_sequence_host seq_wave_announce1
c_player_trigger_sensor_host pt_bubble
c_player_trigger_sensor_host pt_thrall_rush
c_player_trigger_sensor_host pt_thrall_rush_b

startup thread sc_strength_main:
    for sq in [sq_cave_floor, sq_cave_ledge, sq_hall, sq_annex_troopers, sq_tower, sq_bridge, sq_m5_thrall_a, sq_m5_thrall_b]:
        sq.set_objective(obj_strength_m5)
    sleep_until(pt_bubble.is_triggered())
    place_on_task(sq_cave_ledge, "0xD9AB9511")
    place_on_task(sq_hall, "0xD8DFEE1D")
    place_on_task(sq_annex_troopers, "0x5CD5B2D1")
    cutter_enter()
    sleep(8)
    sq_cave_floor.set_task("0x8231A2B3")
    sleep(2)
    sq_cutter__pilot.drop_squad(sq_cave_floor)
    sleep(3)
    cutter_leave()
    sleep_until(sq_cutter.alive_count() == 0)
    place_on_task(sq_tower, "0x0F2672E5")
    place_on_task(sq_bridge, "0x5DDC569C")
    seq_wave_announce1.start()

startup thread sc_thrall_rush:
    sleep_until(pt_thrall_rush.is_triggered())
    sleep(1)
    place_on_task(sq_m5_thrall_a, "0x9156048B")

startup thread sc_thrall_rush_b:
    sleep_until(pt_thrall_rush_b.is_triggered())
    sleep(1)
    place_on_task(sq_m5_thrall_b, "0x9156048B")

def cutter_enter():
    __cs.clear()
    __cs.snap_to(cps_cutter_1_entry, 0)
    __cs.ability("dropship", "enter_1")
    sq_cutter__pilot.place()
    sq_cutter__pilot.execute(__cs)

def cutter_leave():
    __cs.clear()
    __cs.move_to(cps_cutter_1_exit, 0, false)
    __cs.ability("dropship", "exit_1")
    sq_cutter__pilot.execute(__cs)

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
