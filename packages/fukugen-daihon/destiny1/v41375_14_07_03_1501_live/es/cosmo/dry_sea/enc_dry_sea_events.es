# es\cosmo\dry_sea\enc_dry_sea_events.es
#
# The public events of the dry sea (public bubble 11), loaded with the
# Cosmodrome's ambient layer by the patrol, the strikes and the story
# missions. TU0 carries two glimmer drops, a Warsat Down countdown, two
# target patrols and a pike gang; one event runs at a time, a kind picked
# at random and then one of its variations, with a quiet spell before each.
#
# Two glimmer drops seen, both gold, no other event:
# - pf_event_dropship_multipoint_fallen[0] 205 s after the Cosmodrome
#   patrol's fresh host of the bubble came up (2026-10-27_16-44-49#7, 616 s
#   in the bubble), nothing before or after it;
# - pf_event_dropship_multipoint_fallen[1] on act_cosmo_m2_dome_c's public
#   host (2026-10-29 Patrol Earth#22, joined running), 12 s after the
#   player joined; the host had been up 57-110 s (every chest out, two
#   nodes still to come), so 70-123 s after it came up.
# Eight other sessions of the bubble, the longest 170 s, saw none. The wait
# is the Cosmodrome's pooled one (enc_delta_n_events): events started
# 73-696 s after their bubble came up and fresh hosts went 464 s with none,
# so 60-900 s. The target patrols and the pike gang have no archetype yet
# and stay out of the rotation.

@activity_bundle("enc_dry_sea_events")

static_array<u_event_dropship_multipoint, 2> pf_event_dropship_multipoint_fallen
static_array<u_event_countdown, 1> pf_event_countdown_dropship

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        if mathlib.random_int_never_highest_value(0, 2) == 0:
            i_selected_variation = mathlib.random_int_never_highest_value(0, len(pf_event_dropship_multipoint_fallen))
            pf_event_dropship_multipoint_fallen[i_selected_variation].main.restart()
            sleep_until(pf_event_dropship_multipoint_fallen[i_selected_variation].main.is_finished())
        else:
            pf_event_countdown_dropship[0].main.restart()
            sleep_until(pf_event_countdown_dropship[0].main.is_finished())
