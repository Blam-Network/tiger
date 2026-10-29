# es\cosmo\delta_north\enc_delta_n_events.es
#
# The public events of the north delta, where the Last Array lands (public
# bubble 6), loaded with the Cosmodrome's ambient layer by the patrol, the
# strikes and the story missions. It carries a target patrol, two Warsat
# Down countdowns and two glimmer drops; one runs at a time, a kind picked
# at random and then one of its variations, with a quiet spell before each.
#
# Pooled over the 2.3.1 public hosts that had the bubble on the wire (the
# patrol, act_cosmo_m0_5_hangar, act_cosmo_m1_dome_a, act_cosmo_m2_dome_c,
# act_cosmo_m4_dome_c and act_cosmo_m6_rasputin, 21 sessions). Two events
# started, both pf_event_countdown_dropship_only[0]: 696 s after
# act_cosmo_m4_dome_c's host came up, and 73 s after act_cosmo_m1_dome_a's
# fresh host came up (2026-10-27 The Dark Within#3, ended gold). The other
# hosts, the 2026-10-29 patrol's 450 s on a running one among them, saw
# none. With the dry sea's glimmer drop 70-123 s and the graveyard's Walker
# 644 s after their bubbles came up, and a fresh graveyard 464 s with
# nothing, the wait before an event is a wide random one, 60-900 s, around
# those. Three of enc_delta_north_amb1's encounters went as the 696 s
# Warsat came in, as if the event took their share of the actor budget;
# nothing here models that. The target patrol has no archetype yet and
# stays out of the rotation.

@activity_bundle("enc_delta_n_events")

static_array<u_event_countdown, 2> pf_event_countdown_dropship_only
static_array<u_event_dropship_multipoint, 2> pf_event_dropship_multipoint_fallen

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        if mathlib.random_int_never_highest_value(0, 2) == 0:
            i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_countdown_dropship_only))
            pf_event_countdown_dropship_only[i_selected_variation].main.restart()
            sleep_until(pf_event_countdown_dropship_only[i_selected_variation].main.is_finished())
        else:
            i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_dropship_multipoint_fallen))
            pf_event_dropship_multipoint_fallen[i_selected_variation].main.restart()
            sleep_until(pf_event_dropship_multipoint_fallen[i_selected_variation].main.is_finished())
