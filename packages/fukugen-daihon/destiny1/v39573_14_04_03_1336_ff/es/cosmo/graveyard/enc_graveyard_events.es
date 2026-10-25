# es\cosmo\graveyard\enc_graveyard_events.es
#
# The public events of the graveyard (public bubble 10), loaded with the
# Cosmodrome's ambient layer by cosmo_portal_1 and cosmo_patrols_1: three
# Walker drops, one at a time, one picked at random after a quiet spell.
#
# Seen once (the 2.3.1 Cosmodrome patrol): pf_event_tank_drop[1] started 632s
# after the graveyard's public host came up, with nothing before it, ran 127s
# and was followed by nothing in the 574s the player stayed. That start sits
# in the 600-900s quiet spell the Last Array's Warsat (696s, TU0) also
# started in. Body counts are that run's, on the same rows: the fodder squad
# fielded six, the hard fodder seven (its split between cell_1 and the anchor
# is not on the wire; six and one assumed).

@activity_bundle("enc_graveyard_events")

@member_counts([{sq_tank_fodder: {cell_2: 6}, sq_tank_fodder_hard: {cell_1: 6, anchor: 1}}, {sq_tank_fodder: {cell_2: 6}, sq_tank_fodder_hard: {cell_1: 6, anchor: 1}}, {sq_tank_fodder: {cell_2: 6}, sq_tank_fodder_hard: {cell_1: 6, anchor: 1}}])
static_array<u_event_tank_drop, 3> pf_event_tank_drop

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(600, 900))
        i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_tank_drop))
        pf_event_tank_drop[i_selected_variation].main.restart()
        sleep_until(pf_event_tank_drop[i_selected_variation].main.is_finished())
