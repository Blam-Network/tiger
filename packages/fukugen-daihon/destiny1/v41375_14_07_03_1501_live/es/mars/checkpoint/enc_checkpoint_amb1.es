# es\mars\checkpoint\enc_checkpoint_amb1.es
#
# The Cabal checkpoint on the road out of the plains (Mars' bubble 3),
# loaded by the Mars story missions and the patrol: the props, the road's
# legionaries and phalanx, the bunker's legionaries, and its psions once a
# player reaches the bunker.
#
# Pooled over three sessions that had the bundle on the wire from their
# start: act_mars_m05_warbase's (2026-10-26 23-39-22#1, never in the
# bubble), act_mars_m07_lowergarden's (23-57-02#1, in it 101-132 s) and
# the Mars patrol's (2026-10-29 Patrol Mars#1, in it 2151-2186 s):
# - The road and bunker squads are placed as the activity loads, the same
#   cells in all three, whether or not a player comes.
# - The ten props come out with the bubble: m07 created them 1.6 s before
#   its client reached it, m05 (never there) did not, and the patrol had
#   them out from its first snapshot. Here they go out as the bundle
#   starts, which a host that brings the bubble up for a player does as
#   the player arrives.
# - Every squad is on the checkpoint objective from the first snapshot,
#   placed or not (all three).
# - pt_bunker puts the bunker's two psion squads in 0.7 s later (m07 and
#   the patrol).
# - Bodies are the cells the server placed; tasks are the checkpoint
#   objective's, by index (TU0's list matches 2.3.1's influencers).
# act_mars_m01_valley's checkpoint is its own bundle (enc_checkpoint_m01).

@activity_bundle("enc_checkpoint_amb1")

static_array<object, 10> can_objects_dynamic
objective obj_checkpoint_amb1
trigger_volume tv_bunker
player_trigger pt_bunker bind(tv_bunker)
squad sq_road_legionary
squad sq_road_phalanx
squad sq_bunker_legionary_a
@member_counts({legionary: 2})
squad sq_bunker_legionary_b
@member_counts({psion: 2})
squad sq_bunker_psion_a
@member_counts({psion: 2})
squad sq_bunker_psion_b

@startup()
script sc_main_thread():
    for can in can_objects_dynamic:
        can.create()
    for sq in [sq_road_legionary, sq_road_phalanx, sq_bunker_legionary_a, sq_bunker_legionary_b, sq_bunker_psion_a, sq_bunker_psion_b]:
        sq.set_objective(obj_checkpoint_amb1)
    place_on_task(sq_road_legionary, "0x76069F96")
    place_on_task(sq_road_phalanx, "0xE1412610")
    place_on_task(sq_bunker_legionary_a, "0x3D1AC4AF")
    place_on_task(sq_bunker_legionary_b, "0x3D1AC4AF")

@startup()
script sc_bunker():
    sleep_until(pt_bunker.is_triggered())
    place_on_task(sq_bunker_psion_a, "0x0998E602")
    place_on_task(sq_bunker_psion_b, "0x0998E602")

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
