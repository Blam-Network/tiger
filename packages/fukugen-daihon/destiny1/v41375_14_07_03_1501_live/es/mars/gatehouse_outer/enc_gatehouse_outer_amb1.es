# es\mars\gatehouse_outer\enc_gatehouse_outer_amb1.es
#
# The Cabal outside the gatehouse (Mars' bubble 10): the arena's centurion
# and phalanxes, the outpost's legionaries and phalanxes, the garage's
# psions, and the ship that brings the outpost's centurion and gladiator
# when a player reaches the outpost.
#
# From one run through the bubble, the Mars patrol's (2026-10-29 Patrol
# Mars#1, the bundle on the wire from 1903 s, the player in the bubble to
# 1980 s), so every rule here is a single run's:
# - Up as the bubble came onto the wire: the arena, the outpost and the
#   garage, 24 bodies. None came back once wiped (the garage down by
#   1926 s, nothing back in the 54 s after).
# - pt_outpost sent the outpost ship in 0.6 s later. It dropped the
#   centurion 6.6 s after it came in and the gladiator 3.1 s after that,
#   and was gone 29.9 s after it came in.
# - Every squad but the ship is on the gatehouse objective from the first
#   snapshot, placed or not.
# - Bodies are the cells the server placed; tasks are the gatehouse
#   objective's, by index (TU0's list matches 2.3.1's influencers).
# Not here: the arena's interceptor (never placed). The ship flies its
# paths as they stand; its atoms were not copied.

@activity_bundle("enc_gatehouse_outer_amb1")

objective obj_gatehouse_outer_amb1
trigger_volume tv_outpost
player_trigger pt_outpost bind(tv_outpost)
squad sq_arena_centurion
@member_counts({phalanx: 3})
squad sq_arena_phalanx
@member_counts({legionary: 3})
squad sq_outpost_legionary_a
@member_counts({legionary: 3})
squad sq_outpost_legionary_b
@member_counts({phalanx: 2})
squad sq_outpost_phalanx_a
@member_counts({phalanx: 2})
squad sq_outpost_phalanx_b
squad sq_garage_psion_major
@member_counts({psion: 3})
squad sq_garage_psion_a
@member_counts({psion: 3})
squad sq_garage_psion_b
@member_counts({psion: 3})
squad sq_garage_psion_c
squad sq_outpost_dropship
squad_member sq_outpost_dropship__pilot
control_point_set cps_outpost_dropship_enter
control_point_set cps_outpost_dropship_exit
squad sq_outpost_centurion
squad sq_outpost_gladiator

@startup()
script sc_main_thread():
    for sq in [sq_arena_centurion, sq_arena_phalanx, sq_outpost_legionary_a, sq_outpost_legionary_b, sq_outpost_phalanx_a, sq_outpost_phalanx_b, sq_garage_psion_major, sq_garage_psion_a, sq_garage_psion_b, sq_garage_psion_c, sq_outpost_centurion, sq_outpost_gladiator]:
        sq.set_objective(obj_gatehouse_outer_amb1)
    place_on_task(sq_arena_centurion, "0x288BE48A")
    place_on_task(sq_arena_phalanx, "0x288BE48A")
    for sq in [sq_outpost_legionary_a, sq_outpost_legionary_b, sq_outpost_phalanx_a, sq_outpost_phalanx_b]:
        place_on_task(sq, "0x92D53411")
    for sq in [sq_garage_psion_major, sq_garage_psion_a, sq_garage_psion_b, sq_garage_psion_c]:
        place_on_task(sq, "0x129446AE")

@startup()
script sc_outpost_dropship():
    sleep_until(pt_outpost.is_triggered())
    sq_outpost_dropship.place()
    sq_outpost_dropship__pilot.execute(cps_outpost_dropship_enter)
    sleep(6.6)
    drop_on_task(sq_outpost_centurion, "0xB3C5E737")
    sleep(3.1)
    drop_on_task(sq_outpost_gladiator, "0x9CFB6C83")
    sleep_until(not sq_outpost_dropship__pilot.is_dropping())
    sq_outpost_dropship__pilot.execute(cps_outpost_dropship_exit)
    sleep(20)
    sq_outpost_dropship.remove()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def drop_on_task(sq, task):
    sq.set_task(task)
    sq_outpost_dropship__pilot.drop_squad(sq)
