# es\mars\plains\enc_plains_public_events.es
#
# The public events of the plains (Mars' public bubble 18), loaded with
# Mars' ambient layer by the patrol, the strikes and the story missions. TU0
# carries two target patrols, a Warsat Down countdown, two Cabal drills and
# a skirmish; one runs at a time with a quiet spell before each.
#
# None of them has been seen to start: the bundle was on the wire on the
# patrol's fresh plains host (Patrol Mars#2, 216 s) and on
# act_mars_m05_warbase's and act_mars_m07_lowergarden's (2026-10-26, 90 s
# and 56 s), and nothing in it moved. The quiet spell is Mars' (pooled in
# enc_battleground_events.es). The Warsat runs u_event_countdown as the
# Cosmodrome's and the Moon's do. The drills and the skirmish have no
# archetype yet, and the two patrols' routes name hills the target patrol
# archetype never walks to (task_7 with no task_5, task_4 with no task_1),
# so they stay out of the rotation.

@activity_bundle("enc_plains_public_events")

static_array<u_event_countdown, 1> pf_event_countdown_dropship

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_countdown_dropship))
        pf_event_countdown_dropship[i_selected_variation].main.restart()
        sleep_until(pf_event_countdown_dropship[i_selected_variation].main.is_finished())
