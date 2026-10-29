# es\mars\battleground\enc_battleground_events.es
#
# The public events of the battleground (Mars' public bubble 1), loaded with
# Mars' ambient layer by the patrol, the strikes and the story missions: two
# target patrols and a two-faction Warsat. One runs at a time with a quiet
# spell before each: a kind picked at random, then one of its variations.
#
# Seen once: pf_event_countdown_2factions[0], 191 s after the patrol's fresh
# battleground host came up (Patrol Mars#14 of 2026-10-29), the first thing
# it ran, captured gold 238 s later. The other fresh host (#8) went 375 s
# with none, and act_mars_m01_valley's, act_mars_m05_warbase's and
# act_mars_m07_lowergarden's hosts (2026-10-26) 47-72 s. Mars' other events
# bundles started nothing on their fresh hosts in 117-407 s. The quiet
# spell is the Cosmodrome's wide one (enc_delta_n_events.es), 60-900 s,
# which holds the 191 s start and the 407 s without one.
# The Warsat's bodies are that run's first drop of each wave; the second
# side's third wave never came. The target patrols never ran on Mars and run
# their archetype as the Moon's do (these two routes start on task_0).

@activity_bundle("enc_battleground_events")

static_array<u_event_patrol, 2> pf_event_patrol
@member_counts([{sq_side_a_wave: [{cell_1: 3, cell_2: 3}, {cell_1: 3, cell_2: 2, cell_3: 1}, {cell_1: 3, cell_2: 2, cell_3: 1}, {cell_1: 2, cell_2: 3, cell_3: 1}], sq_side_b_wave: [{cell_1: 4, cell_2: 2}, {cell_1: 3, cell_2: 2, cell_3: 1}, {cell_1: 1, cell_2: 1, cell_3: 1}, {cell_1: 2, cell_2: 3, cell_3: 1}]}])
static_array<u_event_countdown_2factions, 1> pf_event_countdown_2factions

@startup()
script sc_public_events():
    for patrol in pf_event_patrol:
        patrol.sh_first_task = "task_0"
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        if mathlib.random_int_never_highest_value(0, 2) == 0:
            run_event(pf_event_patrol)
        else:
            run_event(pf_event_countdown_2factions)

def run_event(events):
    i_selected_variation = mathlib.random_int_never_highest_value(0, len(events))
    events[i_selected_variation].main.restart()
    sleep_until(events[i_selected_variation].main.is_finished())
