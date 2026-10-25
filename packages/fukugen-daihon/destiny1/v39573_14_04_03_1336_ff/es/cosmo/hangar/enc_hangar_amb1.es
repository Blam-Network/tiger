# es\cosmo\hangar\enc_hangar_amb1.es
#
# The hangar's ambient layer: two Fallen squads hold the hangar floor
# and fall back to its far end as a player comes in.
#
# From the cosmo patrol capture (the hangar twice, 385 s apart; same
# steps both times): north_2 and south_1 go in with the bubble's load on
# the north_1 and north_2 tasks, 1 s after the player crosses
# pt_final_fallback both move to task_3, and 6-7 s later north_2 moves
# to south_1. south_1 followed it 18 s on in one run of the two. No
# other squad of the bundle was placed. Tasks are retail's by
# influencer, which this build's list keeps by name.
#
# A private bubble's world is built again each time a player comes in
# (retail's hangar: both squads back on their first tasks when the
# player came back 340 s after leaving), so these squads are placed
# once, at the load, with no respawn of their own.

@activity_bundle("enc_hangar_amb1")

objective obj_hangar_amb_fallen
squad sq_amb_fallen_1  # WARNING: unused - never placed in retail's hangar
squad sq_amb_shank  # WARNING: unused - never placed in retail's hangar
squad sq_amb_fallen_ship_2  # WARNING: unused - never placed in retail's hangar
squad sq_amb_fallen_north_1  # WARNING: unused - never placed in retail's hangar
@member_counts({dregs: 3, shanks: 2})
squad sq_amb_fallen_north_2
@member_counts({vandal: 2, shanks: 2})
squad sq_amb_fallen_south_1
squad sq_amb_fallen_south_2  # WARNING: unused - never placed in retail's hangar
squad_group sg_amb_ship_gang  # WARNING: unused - never placed in retail's hangar
trigger_volume tv_final_fallback
player_trigger pt_final_fallback bind(tv_final_fallback)

@startup()
script sc_hangar_floor():
    hold(sq_amb_fallen_north_2, "north_1")
    hold(sq_amb_fallen_south_1, "north_2")
    sleep_until(pt_final_fallback.is_triggered())
    sleep(1)
    sq_amb_fallen_north_2.set_task("task_3")
    sq_amb_fallen_south_1.set_task("task_3")
    sleep(6)
    sq_amb_fallen_north_2.set_task("south_1")
    sleep(12)
    sq_amb_fallen_south_1.set_task("south_1")

def hold(sq, task):
    sq.set_objective(obj_hangar_amb_fallen)
    sq.set_task(task)
    sq.place()
