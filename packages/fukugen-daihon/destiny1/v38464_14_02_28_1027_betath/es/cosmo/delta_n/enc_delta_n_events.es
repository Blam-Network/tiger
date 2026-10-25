# es\cosmo\delta_n\enc_delta_n_events.es
#
# The public events of the Cosmodrome bubble around the dry sea's edge and
# dome A (public bubble 4, delta_n), loaded with the destination's ambient
# layer by cosmo_portal_1 and cosmo_patrols_1: a target patrol, two glimmer
# drops and two Warsat Down countdowns. One runs at a time with a quiet spell
# before each: a kind picked at random, then one of its variations.
#
# Only a Warsat has been seen here, pooled over six captures of which one had
# the bubble on the wire (act_cosmo_m4_dome_c's public host):
# pf_event_countdown_dropship_only[0], starting 696s after the player joined
# the host, with nothing before it. With the graveyard's Walker drop (632s
# after the patrol's public host came up, 2.3.1) that makes two starts inside
# the 600-900s quiet spell below. The patrol and the glimmer drops never ran.

@activity_bundle("enc_delta_n_events")

static_array<u_event_patrol, 1> pf_event_patrol
static_array<u_event_dropship_multipoint, 2> pf_event_dropship_multipoint_fallen
static_array<u_event_countdown, 2> pf_event_countdown_dropship_only

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(600, 900))
        i_selected_event = mathlib.random_int_never_highest_value(0, 3)
        if i_selected_event == 0:
            run_event(pf_event_patrol)
        elif i_selected_event == 1:
            run_event(pf_event_dropship_multipoint_fallen)
        else:
            run_event(pf_event_countdown_dropship_only)

def run_event(events):
    i_selected_variation = mathlib.random_int_never_highest_value(0, len(events))
    events[i_selected_variation].main.restart()
    sleep_until(events[i_selected_variation].main.is_finished())
