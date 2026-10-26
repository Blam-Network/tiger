# es\cosmo\array\enc_array_events.es
#
# The public events of the Array's bubble (public bubble 0), loaded with the
# Cosmodrome's ambient layer by the patrol, the strikes and the story
# missions. TU0 carries a skirmish, two Warsat Down countdowns and a
# two-faction countdown; one runs at a time, picked at random, with a quiet
# spell before each.
#
# None of them has been seen to start. The bundle was on the wire in two
# 2.3.1 sessions (act_cosmo_m4_dome_c's public host, 2026-10-01 for 150 s
# and 2026-10-24 for 88 s) and nothing in it moved, and retail dropped the
# Warsats from it (its rows are the skirmish and the two-faction
# countdown), so retail captures can't show them. The Warsats run
# u_event_countdown as the north delta's do (enc_delta_n_events), with its
# wait; the skirmish and the two-faction countdown have no archetype yet
# and stay out of the rotation.

@activity_bundle("enc_array_events")

static_array<u_event_countdown, 2> pf_event_countdown_dropship

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(600, 900))
        i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_countdown_dropship))
        pf_event_countdown_dropship[i_selected_variation].main.restart()
        sleep_until(pf_event_countdown_dropship[i_selected_variation].main.is_finished())
