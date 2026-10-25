# es\cosmo\delta_s\enc_delta_s_events.es
#
# The public events of the Steppes, the patrol's landing (public bubble 5,
# delta_s), loaded with the destination's ambient layer by cosmo_portal_1 and
# cosmo_patrols_1: three glimmer drops and a Warsat Down countdown. One runs
# at a time with a quiet spell before each: a kind picked at random, then one
# of its variations.
#
# None has been seen to start. The bundle was on the wire in three retail
# sessions (two of the 2.3.1 patrol's public hosts, 82s and 385s, and
# act_cosmo_m4_dome_c's) and no row of it moved; the drop points' objective
# counts that changed in the 2026-10-03 hangar, dome A and dome C captures are
# the clients' sense of ambient squads walking through, not an event. The
# quiet spell is the 600-900s the Warsat and the Walker drop started inside.

@activity_bundle("enc_delta_s_events")

static_array<u_event_dropship_multipoint, 3> pf_event_dropship_multipoint_fallen
static_array<u_event_countdown, 1> pf_event_countdown_dropship

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(600, 900))
        if mathlib.random_int_never_highest_value(0, 2) == 0:
            run_event(pf_event_dropship_multipoint_fallen)
        else:
            run_event(pf_event_countdown_dropship)

def run_event(events):
    i_selected_variation = mathlib.random_int_never_highest_value(0, len(events))
    events[i_selected_variation].main.restart()
    sleep_until(events[i_selected_variation].main.is_finished())
