# es\cosmo\array\enc_array_events.es
#
# The public events of the Array (public bubble 0), loaded with the
# Cosmodrome's ambient layer by cosmo_portal_1 and cosmo_patrols_1: a skirmish
# and four Warsat Down countdowns, two of each countdown prefab. One runs at a
# time with a quiet spell before each: a kind picked at random, then one of
# its variations.
#
# The quiet spell is 600-900s. Two event starts have been seen, both inside
# it: the Last Array's Warsat 696s after its public host came up (TU0) and the
# graveyard's Walker drop 632s after the patrol's (2.3.1), and after that
# Walker no event followed in the 574s the player stayed. This bubble's own
# events were on the wire once (act_cosmo_m4_dome_c's public host, 782s) and
# none started. The Alpha Trial's rotation picked over the four Warsats alone.

@activity_bundle("enc_array_events")

static_array<u_event_skirmish, 1> pf_event_skirmish
static_array<u_event_countdown, 2> pf_event_countdown_dropship
static_array<u_event_countdown, 2> pf_event_countdown_dropship_only

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(600, 900))
        if mathlib.random_int_never_highest_value(0, 2) == 0:
            run_event(pf_event_skirmish)
        else:
            warsats = [pf_event_countdown_dropship[0], pf_event_countdown_dropship[1], pf_event_countdown_dropship_only[0], pf_event_countdown_dropship_only[1]]
            run_event(warsats)

def run_event(events):
    i_selected_variation = mathlib.random_int_never_highest_value(0, len(events))
    events[i_selected_variation].main.restart()
    sleep_until(events[i_selected_variation].main.is_finished())
