# es\mars\rubicon\enc_rubicon_amb1.es
#
# The Rubicon's Cabal (Mars' private bubble 20, the wall and the bunkers
# below the Spire's approach), loaded by the Mars story missions and the
# patrol: the props, the no man's land and bunker squads, the wall and the
# building's floors, the psions brought up to the second floor, the
# assault ship's countdown squads and the ship that flies over the base.
#
# Pooled over two runs through the bubble: act_mars_m05_warbase's
# (2026-10-26 23-39-22#1, in the bubble 132-248 s) and the Mars patrol's
# (2026-10-29 Patrol Mars#1, 1648-1714 s):
# - Up as the bubble loads (both runs, the same cells): no man's land, both
#   bunkers, the wall's three squads, the courtyard, the first floor and
#   the second floor's front, 27 bodies. None came back once wiped (m05:
#   both bunkers and the wall down by 228 s, nothing back by 248 s).
# - pt_psions puts the second floor's rear psion and its four cover psions
#   in 0.8-1.3 s later (both runs).
# - pt_countdown brought the assault ship in once the second floor was clear
#   (the patrol: the last cover psion died 0.5 s before the ship, 24 s
#   after the trigger; m05 left 16 s after its trigger with the cover psions
#   still up). The ship dropped the three countdown squads 5.5 s after it
#   came in and was gone 15.7 s after. Single run.
# - The flyover ship passes over and leaves 13.3-13.6 s later, nothing on
#   board, 40.0 and 42.7 s between passes (m05's three; the patrol's one
#   pass, 15 s into its visit, fits the same spacing). The pass's path is
#   one of its five; which one was not decoded, so it is picked at random.
# - Every squad, the ships too, is on the Rubicon objective from the
#   bubble's first snapshot, placed or not (both runs).
# - Bodies are the cells the server placed; tasks are the Rubicon
#   objective's, by index (TU0's list matches 2.3.1's influencers).
# Not here: the second countdown wave and sq_nomansland_b (never placed),
# mission 1's major (sq_m01_major, not on the wire). The ships fly their
# paths as the paths stand; their atoms were not copied.

@activity_bundle("enc_rubicon_amb1")

encounter_handle sp_shared_rubicon
objective obj_rubicon_amb1
trigger_volume tv_psions
player_trigger pt_psions bind(tv_psions)
trigger_volume tv_countdown
player_trigger pt_countdown bind(tv_countdown)
@member_counts({psion: 2, psion_1: 1})
squad sq_nomansland
@member_counts({legionary: 1, psion: 2, 0x43775E2E: 1})
squad sq_bunker_a
@member_counts({legionary: 1, centurion: 1, psion: 2})
squad sq_bunker_b
@member_counts({psion: 2, centurion: 1, 0x2681BE63: 1})
squad sq_defensive_wall_mid
squad sq_defensive_wall_flank
squad sq_defensive_wall_under
@member_counts({0x2681BE63: 2})
squad sq_courtyard_front
squad sq_courtyard_rear
@member_counts({0xA350F561: 2})
squad sq_first_floor
@member_counts({0x43775E2E: 1, legionary: 2})
squad sq_second_floor_front
squad sq_second_floor_rear
@member_counts({psion: 4})
squad sq_second_floor_cover
squad sq_drop_assault
squad_member sq_drop_assault__pilot
control_point_set cps_drop_assault_enter
control_point_set cps_drop_assault_exit
@member_counts({0x2681BE63: 2})
squad sq_countdown_1_a
@member_counts({0x805DD443: 1, 0x3C775323: 3})
squad sq_countdown_1_b
@member_counts({0x3C775323: 2})
squad sq_countdown_1_c
squad sq_drop_flyover
squad_member sq_drop_flyover__pilot
control_point_set cps_flyover1
control_point_set cps_flyover2
control_point_set cps_flyover3
control_point_set cps_flyover4
control_point_set cps_flyover5

@startup()
script sc_main_thread():
    for sq in [sq_nomansland, sq_bunker_a, sq_bunker_b, sq_defensive_wall_mid, sq_defensive_wall_flank, sq_defensive_wall_under, sq_courtyard_front, sq_courtyard_rear, sq_first_floor, sq_second_floor_front, sq_second_floor_rear, sq_second_floor_cover, sq_drop_assault, sq_countdown_1_a, sq_countdown_1_b, sq_countdown_1_c, sq_drop_flyover]:
        sq.set_objective(obj_rubicon_amb1)
    for i in range(20):
        sp_shared_rubicon.dynamics[i].create()
    place_on_task(sq_nomansland, "0x5BC87D68")
    place_on_task(sq_bunker_a, "0x47EADBB6")
    place_on_task(sq_bunker_b, "0x47EADBB5")
    place_on_task(sq_defensive_wall_mid, "0x457EFFEA")
    place_on_task(sq_defensive_wall_flank, "0xD3AECC0A")
    place_on_task(sq_defensive_wall_under, "0x0319A7AE")
    place_on_task(sq_courtyard_front, "0xE42A41F6")
    place_on_task(sq_courtyard_rear, "0xA812ED0B")
    place_on_task(sq_first_floor, "0x64F1E54E")
    place_on_task(sq_second_floor_front, "0xB0F408F6")

@startup()
script sc_psions():
    sleep_until(pt_psions.is_triggered())
    sleep(1)
    place_on_task(sq_second_floor_rear, "0x831A6A0B")
    place_on_task(sq_second_floor_cover, "0xFDE7CC9E")

@startup()
script sc_countdown():
    sleep_until(pt_countdown.is_triggered())
    sleep_until(second_floor_alive_count() == 0)
    sq_drop_assault.place()
    sq_drop_assault__pilot.execute(cps_drop_assault_enter)
    sleep(5.5)
    for sq in [sq_countdown_1_a, sq_countdown_1_b, sq_countdown_1_c]:
        sq.set_task("0x59C2097A")
        sq_drop_assault__pilot.drop_squad(sq)
    sleep_until(not sq_drop_assault__pilot.is_dropping())
    sq_drop_assault__pilot.execute(cps_drop_assault_exit)
    sleep(10)
    sq_drop_assault.remove()

@startup()
script sc_flyover():
    paths = [cps_flyover1, cps_flyover2, cps_flyover3, cps_flyover4, cps_flyover5]
    while true:
        sq_drop_flyover.place()
        sq_drop_flyover__pilot.execute(paths[mathlib.random_int_inclusive(0, 4)])
        sleep(13.5)
        sq_drop_flyover.remove()
        sleep(mathlib.random_int_inclusive(40, 43))

def second_floor_alive_count():
    return sq_second_floor_front.alive_count() + sq_second_floor_rear.alive_count() + sq_second_floor_cover.alive_count()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
