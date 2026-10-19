# es\cosmo\unknown_d2c22dcf.es
#
# The public events of the Array's bubble (public bubble 0), loaded with the
# Cosmodrome's ambient layer by cosmo_portal_1, patrol_deltas_com01,
# act_cosmo_m4_dome_c and the other Cosmodrome activities. TU0 carries a
# skirmish, two Warsat Down countdowns and a two-faction countdown; one runs
# at a time, picked at random, with a quiet spell before each.
#
# None of them has been seen to start. The bundle was on the wire in one of
# six captures (act_cosmo_m4_dome_c's public host, 782s) and nothing in it
# moved, and retail dropped the Warsats from it (its rows are the skirmish
# and the two-faction countdown), so retail captures can't show them. The
# Warsats run u_event_countdown as the Last Array's do (unknown_358ebae1),
# with its wait; the skirmish and the two-faction countdown have no archetype
# yet and stay out of the rotation.

@activity_bundle(0xD2C22DCF)

static_array<u_event_countdown, 2> pf_event_countdown_dropship

startup thread sc_public_events:
    while true:
        sleep(mathlib.random_int_inclusive(600, 900))
        i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_countdown_dropship))
        pf_event_countdown_dropship[i_selected_variation].main.restart()
        sleep_until(pf_event_countdown_dropship[i_selected_variation].main.is_finished())
