# es\moon\strength\enc_strength_m5.es
#
# Chamber of Night, the approach. When a player enters the bubble the ledge,
# hall and annex Hive take their posts and a tomb ship comes in to drop the
# cave squad, then leaves. Once the ship is gone and the ledge is clear the
# tower and bridge squads come up with the wave call (the chamber opens its
# rush gate in the same frame). Two thrall rushes fire off their own
# triggers.
#
# Two runs: the drop 8.3 / 8.1 s after the ship enters, its exit 3.3 / 2.9
# s after the drop, the wave call 1.4 / 0.7 s after the later of the ship
# going and the ledge's last death, the rushes 1.0 / 1.4 and 0.6 / 0.9 s
# after their triggers.

@activity_bundle("enc_strength_m5")

objective obj_strength_m5
squad sq_cave_thrall
squad sq_cave_floor
squad sq_cave_ledge
squad sq_hall
squad sq_annex_ogre
squad sq_annex_troopers
squad sq_tower
squad sq_bridge
squad sq_m5_thrall_a
squad sq_m5_thrall_b
squad sq_cutter
squad_member sq_cutter__pilot
c_command_script __cs
control_point_set cps_cutter_1_entry
control_point_set cps_cutter_1_exit
sequence seq_wave_announce1
player_trigger pt_bubble
player_trigger pt_thrall_rush
player_trigger pt_thrall_rush_b
bool cave_cleared = false

@startup()
script sc_strength_main():
    for sq in [sq_cave_thrall, sq_cave_floor, sq_cave_ledge, sq_hall, sq_annex_ogre, sq_annex_troopers, sq_tower, sq_bridge, sq_m5_thrall_a, sq_m5_thrall_b]:
        sq.set_objective(obj_strength_m5)
    sleep_until(pt_bubble.is_triggered())
    place_on_task(sq_cave_ledge, "entry_ledge")
    place_on_task(sq_hall, "hall_rear")
    place_on_task(sq_annex_troopers, "annex")
    cutter_enter()
    sleep(8)
    sq_cave_floor.set_task("entry")
    sq_cutter__pilot.drop_squad(sq_cave_floor)
    sleep(3)
    cutter_leave()
    sleep_until(sq_cutter.alive_count() == 0 and sq_cave_ledge.alive_count() == 0)
    sleep(1)
    cave_cleared = true
    place_on_task(sq_tower, "entry_thrall")
    place_on_task(sq_bridge, "0x5DDC569C")
    seq_wave_announce1.start()

@startup()
script sc_thrall_rush():
    sleep_until(pt_thrall_rush.is_triggered())
    sleep(1)
    place_on_task(sq_m5_thrall_a, "thrall_rush")

@startup()
script sc_thrall_rush_b():
    sleep_until(pt_thrall_rush_b.is_triggered())
    sleep(1)
    place_on_task(sq_m5_thrall_b, "thrall_rush")

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
