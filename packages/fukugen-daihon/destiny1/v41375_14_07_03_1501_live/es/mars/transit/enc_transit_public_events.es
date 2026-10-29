# es\mars\transit\enc_transit_public_events.es
#
# The public events of the transit district (Mars' public bubble 24), loaded
# with Mars' ambient layer by the patrol, the strikes and the story
# missions: two target patrols and a Warsat Down countdown. One runs at a
# time with a quiet spell before each: a kind picked at random, then one of
# its variations.
#
# None of them has been seen to start: the bundle was on the wire on two
# fresh transit hosts of the patrol (Patrol Mars#4 for 335 s and #6 for
# 407 s), and nothing in it moved. The quiet spell is Mars' (pooled in
# enc_battleground_events.es). The Warsat runs u_event_countdown as the
# Cosmodrome's and the Moon's do, and the first patrol the target patrol
# archetype as the Moon's do (its route starts on "task"). The second
# patrol's route names hills the archetype never walks to (task_7 and
# task_9 with no task_5), so it stays out of the rotation.

@activity_bundle("enc_transit_public_events")

static_array<u_event_patrol, 2> pf_event_patrol
static_array<u_event_countdown, 1> pf_event_countdown_dropship_only

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        if mathlib.random_int_never_highest_value(0, 2) == 0:
            run_event(pf_event_patrol[0])
        else:
            i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_countdown_dropship_only))
            run_event(pf_event_countdown_dropship_only[i_selected_variation])

def run_event(event):
    event.main.restart()
    sleep_until(event.main.is_finished())
