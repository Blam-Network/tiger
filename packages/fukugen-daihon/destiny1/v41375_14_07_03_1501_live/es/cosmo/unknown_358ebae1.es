# es\cosmo\unknown_358ebae1.es
#
# The public events of the Cosmodrome bubble around the Last Array's landing
# (public bubble 6), loaded with the destination's ambient layer by
# cosmo_portal_1, patrol_deltas_com01, act_cosmo_m4_dome_c and the other
# Cosmodrome activities. It carries a target patrol, two Warsat Down
# countdowns and two Fallen glimmer drops; one runs at a time, picked at
# random, with a quiet spell before each.
#
# Only a Warsat has been seen, pooled over six captures of which one had the
# bubble on the wire (act_cosmo_m4_dome_c's public host):
# pf_event_countdown_dropship_only[0], starting 696s after the player joined
# the host, with nothing before it. When an event starts is a random timer and
# that is the one point of its window seen; the 600-900s wait below is a
# guess around it. The patrol and the glimmer drops never ran and have no
# archetype yet, so they stay out of the rotation.

static_array<u_event_countdown, 2> pf_event_countdown_dropship_only

startup thread sc_public_events:
    while true:
        sleep(mathlib.random_int_inclusive(600, 900))
        i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_countdown_dropship_only))
        pf_event_countdown_dropship_only[i_selected_variation].main.restart()
        sleep_until(pf_event_countdown_dropship_only[i_selected_variation].main.is_finished())
