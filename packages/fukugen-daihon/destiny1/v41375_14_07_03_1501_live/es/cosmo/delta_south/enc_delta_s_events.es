# es\cosmo\delta_south\enc_delta_s_events.es
#
# The public events of the south delta (public bubble 7), loaded with the
# Cosmodrome's ambient layer by the patrol, the strikes and the story
# missions: three glimmer drops (the last with two points where the others
# have three), one at a time, picked at random, with a quiet spell before
# each.
#
# One seen to start: pf_event_dropship_multipoint_fallen[2], the two-point
# one, 158 s after act_cosmo_m0_5_hangar's fresh public host of the bubble
# came up (2026-10-21_00-51-49#2); the player left 30 s later, during its
# intro (four skiffs). The bundle was on the wire in 22 more sessions of six
# activities, the patrol's fresh hosts of 2026-10-29 (214 s, 255 s, 66 s)
# among them, with nothing moving. The glimmer drop itself is the dry sea's,
# seen through twice (enc_dry_sea_events); its rows here are the same. The
# wait is the Cosmodrome's pooled one: events started 73-696 s after their
# bubble came up (158 s here) and fresh hosts went 464 s with none.

@activity_bundle("enc_delta_s_events")

static_array<u_event_dropship_multipoint, 3> pf_event_dropship_multipoint_fallen

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_dropship_multipoint_fallen))
        pf_event_dropship_multipoint_fallen[i_selected_variation].main.restart()
        sleep_until(pf_event_dropship_multipoint_fallen[i_selected_variation].main.is_finished())
