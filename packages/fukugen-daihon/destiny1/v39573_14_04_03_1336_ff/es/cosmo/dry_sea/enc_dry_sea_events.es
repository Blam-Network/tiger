# es\cosmo\dry_sea\enc_dry_sea_events.es
#
# The public events of the dry sea (public bubble 9), loaded with the
# Cosmodrome's ambient layer by cosmo_portal_1 and cosmo_patrols_1: two
# glimmer drops, a Warsat Down countdown and two target patrols, one at a
# time with a quiet spell before each (a kind picked at random, then one of
# its variations). This build has no pike gang here.
#
# None has been seen: the bundle was on the wire once (act_cosmo_m2_dome_c's
# public host) and no row of it moved. The quiet spell is the 600-900s the
# Warsat and the Walker drop started inside.

@activity_bundle("enc_dry_sea_events")

static_array<u_event_dropship_multipoint, 2> pf_event_dropship_multipoint_fallen
static_array<u_event_countdown, 1> pf_event_countdown_dropship
static_array<u_event_patrol, 2> pf_event_patrol

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(600, 900))
        i_selected_event = mathlib.random_int_never_highest_value(0, 3)
        if i_selected_event == 0:
            run_event(pf_event_dropship_multipoint_fallen)
        elif i_selected_event == 1:
            run_event(pf_event_countdown_dropship)
        else:
            run_event(pf_event_patrol)

def run_event(events):
    i_selected_variation = mathlib.random_int_never_highest_value(0, len(events))
    events[i_selected_variation].main.restart()
    sleep_until(events[i_selected_variation].main.is_finished())
