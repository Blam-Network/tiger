# es\mars\mesa\enc_mesa_events.es
#
# The public events of the mesa (Mars' public bubble 14), loaded with Mars'
# ambient layer by the patrol, the strikes and the story missions. TU0
# carries two target patrols and a Cabal drill; one runs at a time with a
# quiet spell before each.
#
# None of them has been seen to start: the bundle was on the wire on two
# fresh mesa hosts (act_mars_m05_warbase's, 2026-10-26_23-39-22#5 for
# 176 s, and the patrol's, Patrol Mars#10 for 115 s), and nothing in it
# moved. The quiet spell is Mars' (pooled in enc_battleground_events.es).
# The patrols run the target patrol archetype as the Moon's do (their routes
# start on "task"); the drill has no archetype yet and stays out of the
# rotation.

@activity_bundle("enc_mesa_events")

static_array<u_event_patrol, 2> pf_event_patrol

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_patrol))
        pf_event_patrol[i_selected_variation].main.restart()
        sleep_until(pf_event_patrol[i_selected_variation].main.is_finished())
