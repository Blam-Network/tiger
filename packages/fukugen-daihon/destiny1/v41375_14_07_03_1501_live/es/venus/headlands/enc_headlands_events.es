# es\venus\headlands\enc_headlands_events.es
#
# The public events of the headlands (Venus' public bubble 10), loaded with
# Venus' ambient layer by the patrol, the strikes and the story missions:
# three Vex blocks, one at a time, picked at random, with a quiet spell
# before each.
#
# None has been seen to start here: the bubble's hosts went 122s
# (act_venus_m02_southern_tides, 2026-10-25), 355s and 227s (the Venus
# patrols of 2026-10-27 and 2026-10-28) and 50-52s (quest_safari's) with
# nothing. The Vex block runs as the vex complex's did
# (enc_complex_events.es), with its quiet spell and its squads' bodies.

@activity_bundle("enc_headlands_events")

@member_counts([{sq_initial_vex: {goblins: 4}, sq_goblin_double: {cell_1: 2}, sq_goblin_triple: {cell_1: 3}, sq_hobgoblin_goblin_double: {goblin: 2}, sq_minotaur_goblin_double: {goblin: 2}, sq_big_wave_1st: {goblins: 4}, sq_big_wave_2nd: {goblins: 2, hobgoblins: 2}, sq_big_wave_3rd: {goblins: 2, minotaur: 2, hobgoblins: 2}, sq_harpies: {cell_1: 3}}, {sq_initial_vex: {goblins: 4}, sq_goblin_double: {cell_1: 2}, sq_goblin_triple: {cell_1: 3}, sq_hobgoblin_goblin_double: {goblin: 2}, sq_minotaur_goblin_double: {goblin: 2}, sq_big_wave_1st: {goblins: 4}, sq_big_wave_2nd: {goblins: 2, hobgoblins: 2}, sq_big_wave_3rd: {goblins: 2, minotaur: 2, hobgoblins: 2}, sq_harpies: {cell_1: 3}}, {sq_initial_vex: {goblins: 4}, sq_goblin_double: {cell_1: 2}, sq_goblin_triple: {cell_1: 3}, sq_hobgoblin_goblin_double: {goblin: 2}, sq_minotaur_goblin_double: {goblin: 2}, sq_big_wave_1st: {goblins: 4}, sq_big_wave_2nd: {goblins: 2, hobgoblins: 2}, sq_big_wave_3rd: {goblins: 2, minotaur: 2, hobgoblins: 2}, sq_harpies: {cell_1: 3}}])
static_array<u_event_vex_block, 3> pf_event_vex_block

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_vex_block))
        pf_event_vex_block[i_selected_variation].main.restart()
        sleep_until(pf_event_vex_block[i_selected_variation].main.is_finished())
