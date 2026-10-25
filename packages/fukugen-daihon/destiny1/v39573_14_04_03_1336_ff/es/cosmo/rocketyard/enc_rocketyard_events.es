# es\cosmo\rocketyard\enc_rocketyard_events.es
#
# The public events of the rocketyard (public bubble 17), loaded with the
# Cosmodrome's ambient layer by cosmo_portal_1 (the strike starts here) and
# cosmo_patrols_1: two target patrols and a skirmish. One runs at a time with
# a quiet spell before each: a kind picked at random, then one of its
# variations.
#
# None has been seen to start: the bundle was on the wire on cosmo_portal_1's
# public host (75s) and only the clients' sense of its objectives moved. The
# quiet spell is the 600-900s the Warsat and the Walker drop started inside,
# long enough that the strike has left the rocketyard first.

@activity_bundle("enc_rocketyard_events")

static_array<u_event_patrol, 2> pf_event_patrol
static_array<u_event_skirmish, 1> pf_event_skirmish

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(600, 900))
        if mathlib.random_int_never_highest_value(0, 2) == 0:
            run_event(pf_event_patrol)
        else:
            run_event(pf_event_skirmish)

def run_event(events):
    i_selected_variation = mathlib.random_int_never_highest_value(0, len(events))
    events[i_selected_variation].main.restart()
    sleep_until(events[i_selected_variation].main.is_finished())
