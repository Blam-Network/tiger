# es\moon\hellmouth\enc_hellmouth_events.es
#
# The public events of the hellmouth (the Moon's public bubble 2), loaded
# with the Moon's ambient layer by the patrol, the strikes and the story
# missions: three target patrols, a two-faction countdown and a glimmer
# drop. One runs at a time with a quiet spell before each: a kind picked at
# random, then one of its variations.
#
# Seen once in four fresh public hosts of the Moon patrol (Patrol Luna of
# 2026-10-28): pf_event_patrol[1], 95s after its host came up, the first
# thing it ran; the other hosts went 106s and 267s with none. The quiet
# spell is the Moon's, pooled over its three events bundles
# (enc_moonbase_events.es). The three routes start on task_0, not task.
# The glimmer drop never ran here and runs its archetype as the
# Cosmodrome's does; the two-faction countdown has no archetype yet and
# stays out of the rotation.

@activity_bundle("enc_hellmouth_events")

static_array<u_event_patrol, 3> pf_event_patrol
static_array<u_event_dropship_multipoint, 1> pf_event_dropship_multipoint_fallen

@startup()
script sc_public_events():
    for patrol in pf_event_patrol:
        patrol.sh_first_task = "task_0"
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        i_selected_event = mathlib.random_int_never_highest_value(0, 2)
        if i_selected_event == 0:
            run_event(pf_event_patrol)
        else:
            run_event(pf_event_dropship_multipoint_fallen)

def run_event(events):
    i_selected_variation = mathlib.random_int_never_highest_value(0, len(events))
    events[i_selected_variation].main.restart()
    sleep_until(events[i_selected_variation].main.is_finished())
