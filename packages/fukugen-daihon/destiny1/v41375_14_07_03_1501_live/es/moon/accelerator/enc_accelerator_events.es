# es\moon\accelerator\enc_accelerator_events.es
#
# The public events of the accelerator (the Moon's public bubble 1, where
# the Moon's story missions and patrol land), loaded with the Moon's ambient
# layer by the patrol, the strikes and the story missions: three Warsat Down
# countdowns and a glimmer drop. One runs at a time with a quiet spell
# before each: a kind picked at random, then one of its variations.
#
# Seen once in two fresh public hosts of the Moon patrol (Patrol Luna of
# 2026-10-28): pf_event_countdown_dropship[0], 187s after its host came up,
# the first thing it ran, taken to gold (u_event_countdown has the run);
# the other host went 227s with none. The quiet spell is the Moon's, pooled
# over its three events bundles (enc_moonbase_events.es). The glimmer drop
# never ran here and runs its archetype as the Cosmodrome's does.

@activity_bundle("enc_accelerator_events")

static_array<u_event_countdown, 3> pf_event_countdown_dropship
static_array<u_event_dropship_multipoint, 1> pf_event_dropship_multipoint_fallen

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        i_selected_event = mathlib.random_int_never_highest_value(0, 2)
        if i_selected_event == 0:
            run_event(pf_event_countdown_dropship)
        else:
            run_event(pf_event_dropship_multipoint_fallen)

def run_event(events):
    i_selected_variation = mathlib.random_int_never_highest_value(0, len(events))
    events[i_selected_variation].main.restart()
    sleep_until(events[i_selected_variation].main.is_finished())
