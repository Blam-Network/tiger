# es\cosmo\graveyard\enc_graveyard_events.es
#
# The public events of the graveyard (public bubble 12), loaded with the
# Cosmodrome's ambient layer by cosmo_patrols_1, cosmo_portal_1 and the
# Cosmodrome story missions: three Walker drops, one at a time, picked at
# random, with a quiet spell before each.
#
# Seen once in 25 runs of the six 2.3.1 activities that load the bundle: on
# the Cosmodrome patrol's graveyard host, whose 1347s in the bubble had
# pf_event_tank_drop[1] start 644s after the host came up, with nothing
# before it, run 126s and nothing after it. When an event starts is a random
# timer and that is the one point of its window seen; the 600-900s wait is a
# guess around it, the Last Array's Warsat wait (enc_delta_n_events.es). The
# drops' bodies are that run's: the fodder squad dropped six on its one
# member, the hard fodder six and its anchor.

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
