# es\cosmo\array\enc_array_events.es
#
# The public events of the Array's bubble (public bubble 0), loaded with the
# Cosmodrome's ambient layer by the patrol, the strikes and the story
# missions. TU0 carries a skirmish, two Warsat Down countdowns and a
# two-faction countdown; one runs at a time, picked at random, with a quiet
# spell before each.
#
# One seen: the two-faction countdown, pf_event_countdown_2factions[0], on
# the Cosmodrome patrol's host of the bubble (2026-10-27_16-44-49#5, joined
# running), 231 s after the player joined: a Warsat whose waves come by two
# dropships, one per side, and which ended silver 280 s later. It has no
# archetype yet, so it stays out of the rotation. The bundle was on the
# wire in eight other sessions (the 2026-10-29 patrol's fresh 77 s among
# them) and nothing else moved. Retail dropped the Warsats from the bundle
# (its rows are the skirmish and the two-faction countdown), so retail
# captures can't show them; they run u_event_countdown as the north
# delta's do (enc_delta_n_events), with the Cosmodrome's pooled wait. The
# skirmish has no archetype yet either.

@activity_bundle("enc_array_events")

static_array<u_event_countdown, 2> pf_event_countdown_dropship

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_countdown_dropship))
        pf_event_countdown_dropship[i_selected_variation].main.restart()
        sleep_until(pf_event_countdown_dropship[i_selected_variation].main.is_finished())
