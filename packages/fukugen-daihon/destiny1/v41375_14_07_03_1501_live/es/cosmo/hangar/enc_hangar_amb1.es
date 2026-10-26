# es\cosmo\hangar\enc_hangar_amb1.es
#
# The hangar's ambient layer (bubble 13): two Fallen squads hold the
# hangar floor and fall back to its far end as a player comes in. Loaded by
# the Cosmodrome patrol, the strikes and the story missions from
# act_cosmo_m0_5_hangar on (A Guardian Rises has its own hangar,
# enc_hangar_m0). act_cosmo_m0_5_hangar's ultra waits for these two squads
# to die.
#
# Pooled over four entries into the hangar in three captures (the
# Cosmodrome patrol, 2026-10-23, twice 340 s apart; act_cosmo_m0_5_hangar's
# last minute, 2026-10-24 and 2026-10-03), the same steps each time:
# - With the bubble's load every squad of the bundle is put against
#   obj_hangar_amb_fallen, and north_2 and south_1 go in on their own
#   tasks (five and four bodies).
# - A second after a player crosses pt_final_fallback (0.6-1 s; its volume
#   is at the door, so it fires on every entry, in the hangar mission on the
#   frame the bubble loads) both move to task_4, and north_2 goes on to
#   final_fallback 6 s later (4.8-6.6 s). south_1 went on to it too in three
#   entries of the four (10-18 s on) and stayed in the other, so that move
#   is the AI's.
# - The bubble is private: when the player came back 340 s later both
#   squads were full again and back on their first tasks, the world built
#   afresh, so this runs once per load.
# Tasks are retail's by influencer. No other squad of the bundle was
# placed.

@activity_bundle("enc_hangar_amb1")

objective obj_hangar_amb_fallen
squad sq_amb_fallen_1
squad sq_amb_shank
squad sq_amb_fallen_ship_2
squad sq_amb_fallen_north_1
@member_counts({dregs: 3, shanks: 2})
squad sq_amb_fallen_north_2
@member_counts({vandal: 2, shanks: 2})
squad sq_amb_fallen_south_1
squad sq_amb_fallen_south_2
trigger_volume tv_final_fallback
player_trigger pt_final_fallback bind(tv_final_fallback)

@startup()
script sc_hangar_floor():
    for sq in [sq_amb_fallen_1, sq_amb_shank, sq_amb_fallen_ship_2, sq_amb_fallen_north_1, sq_amb_fallen_south_2]:
        sq.set_objective(obj_hangar_amb_fallen)
    hold(sq_amb_fallen_north_2, "north_2")
    hold(sq_amb_fallen_south_1, "south_1")

    sleep_until(pt_final_fallback.is_triggered())
    sleep(1)
    sq_amb_fallen_north_2.set_task("task_4")
    sq_amb_fallen_south_1.set_task("task_4")
    sleep(6)
    sq_amb_fallen_north_2.set_task("final_fallback")

def hold(sq, task):
    sq.set_objective(obj_hangar_amb_fallen)
    sq.set_task(task)
    sq.place()
