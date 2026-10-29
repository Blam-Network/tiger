# es\moon\moonbase\enc_moonbase_events.es
#
# The public events of the moonbase (the Moon's public bubble 6, Archer's
# Line), loaded with the Moon's ambient layer by the patrol, the strikes and
# the story missions: a Walker drop, a target patrol and two Warsat Down
# countdowns. One runs at a time with a quiet spell before each: a kind
# picked at random, then one of its variations.
#
# Pooled over the Moon's three events bundles (this one, the hellmouth's and
# the accelerator's), each on fresh public hosts of the Moon patrol (Patrol
# Luna of 2026-10-28): three events started, 95s (the hellmouth's target
# patrol), 187s (the accelerator's Warsat) and 188s (this bubble's target
# patrol, pf_event_patrol[0]) after their host came up, each the first of
# its host; four other fresh hosts went 106s, 188s, 227s and 267s with
# none, and the 2026-10-24/25 hosts 60-202s. The quiet spell below is the
# other destinations' 60-900s (enc_graveyard_events.es): the Moon's starts
# fall inside it, and Mars and Venus hosts went 407s and 741s without one.
# The Walker drop and the Warsats never ran here: they run their
# archetypes as the Cosmodrome's do.

@activity_bundle("enc_moonbase_events")

static_array<u_event_tank_drop, 1> pf_event_tank_drop
static_array<u_event_patrol, 1> pf_event_patrol
static_array<u_event_countdown, 1> pf_event_countdown_dropship
static_array<u_event_countdown, 1> pf_event_countdown_dropship_only

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        i_selected_event = mathlib.random_int_never_highest_value(0, 4)
        if i_selected_event == 0:
            run_event(pf_event_tank_drop)
        elif i_selected_event == 1:
            run_event(pf_event_patrol)
        elif i_selected_event == 2:
            run_event(pf_event_countdown_dropship)
        else:
            run_event(pf_event_countdown_dropship_only)

def run_event(events):
    i_selected_variation = mathlib.random_int_never_highest_value(0, len(events))
    events[i_selected_variation].main.restart()
    sleep_until(events[i_selected_variation].main.is_finished())
