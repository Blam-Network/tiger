# es\cosmo\delta_north\enc_delta_n_events.es
#
# The public events of the north delta, where the Last Array lands (public
# bubble 6), loaded with the Cosmodrome's ambient layer by the patrol, the
# strikes and the story missions. It carries a target patrol, two Warsat
# Down countdowns and two Fallen dropship drops; one runs at a time, picked
# at random, with a quiet spell before each.
#
# Pooled over the six 2.3.1 public hosts that had the bubble on the wire
# (the patrol, act_cosmo_m0_5_hangar, act_cosmo_m1_dome_a,
# act_cosmo_m2_dome_c, act_cosmo_m4_dome_c twice). Only one event started:
# pf_event_countdown_dropship_only[0], 696 s after act_cosmo_m4_dome_c's
# public host came up, with nothing before it; the other five sessions
# ended within 150 s with nothing. When an event starts is a random timer
# and that is the one point of its window seen; the 600-900 s wait below is
# a guess around it. Three of enc_delta_north_amb1's encounters went as the
# Warsat came in, as if the event took their share of the actor budget;
# nothing here models that. The patrol and the dropship drops never ran
# and have no archetype yet, so they stay out of the rotation.

@activity_bundle("enc_delta_n_events")

static_array<u_event_countdown, 2> pf_event_countdown_dropship_only

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(600, 900))
        i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_countdown_dropship_only))
        pf_event_countdown_dropship_only[i_selected_variation].main.restart()
        sleep_until(pf_event_countdown_dropship_only[i_selected_variation].main.is_finished())
