# es\venus\vex_complex\enc_complex_events.es
#
# The public events of the vex complex (Venus' public bubble 4), loaded with
# Venus' ambient layer by the patrol, the strikes and the story missions:
# three Vex blocks and two target patrols. One runs at a time with a quiet
# spell before each: a kind picked at random, then one of its variations.
#
# Seen once: pf_event_vex_block[1], 85.6s after the complex's fresh public
# host came up (Patrol Venus of 2026-10-28, #5), the first thing it ran,
# gold; nothing else started in the 155s the host stayed up after it. Three
# other hosts of the bubble (act_venus_m07_northern_tides 2026-10-01 for
# 76s and 2026-10-26 for 166s, mission_traitor 2026-10-27 for 95s) saw
# none, nor did mission_traitor's of 2026-10-29 (89s). Venus' other events
# bundles started nothing on the wire: the fallen caldera's hosts went up to
# 741s, the headlands' up to 355s. The quiet spell is the Cosmodrome's wide
# one (enc_delta_n_events.es), 60-900s, which holds both the 85.6s start
# here and the caldera's 741s without one.
# The squads' bodies are the run's: what each brought on its first drop.
# The target patrols never ran on Venus and run their archetype as the
# Moon's do (their routes start on "task").

@activity_bundle("enc_complex_events")

@member_counts([{sq_initial_vex: {goblins: 4}, sq_goblin_double: {cell_1: 2}, sq_goblin_triple: {cell_1: 3}, sq_hobgoblin_goblin_double: {goblin: 2}, sq_minotaur_goblin_double: {goblin: 2}, sq_big_wave_1st: {goblins: 4}, sq_big_wave_2nd: {goblins: 2, hobgoblins: 2}, sq_big_wave_3rd: {goblins: 2, minotaur: 2, hobgoblins: 2}, sq_harpies: {cell_1: 3}}, {sq_initial_vex: {goblins: 4}, sq_goblin_double: {cell_1: 2}, sq_goblin_triple: {cell_1: 3}, sq_hobgoblin_goblin_double: {goblin: 2}, sq_minotaur_goblin_double: {goblin: 2}, sq_big_wave_1st: {goblins: 4}, sq_big_wave_2nd: {goblins: 2, hobgoblins: 2}, sq_big_wave_3rd: {goblins: 2, minotaur: 2, hobgoblins: 2}, sq_harpies: {cell_1: 3}}, {sq_initial_vex: {goblins: 4}, sq_goblin_double: {cell_1: 2}, sq_goblin_triple: {cell_1: 3}, sq_hobgoblin_goblin_double: {goblin: 2}, sq_minotaur_goblin_double: {goblin: 2}, sq_big_wave_1st: {goblins: 4}, sq_big_wave_2nd: {goblins: 2, hobgoblins: 2}, sq_big_wave_3rd: {goblins: 2, minotaur: 2, hobgoblins: 2}, sq_harpies: {cell_1: 3}}])
static_array<u_event_vex_block, 3> pf_event_vex_block
static_array<u_event_patrol, 2> pf_event_patrol

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        if mathlib.random_int_never_highest_value(0, 2) == 0:
            run_event(pf_event_vex_block)
        else:
            run_event(pf_event_patrol)

def run_event(events):
    i_selected_variation = mathlib.random_int_never_highest_value(0, len(events))
    events[i_selected_variation].main.restart()
    sleep_until(events[i_selected_variation].main.is_finished())
