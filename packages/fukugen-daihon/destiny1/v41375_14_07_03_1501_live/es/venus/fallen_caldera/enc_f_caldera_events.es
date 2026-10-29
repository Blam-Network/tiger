# es\venus\fallen_caldera\enc_f_caldera_events.es
#
# The public events of the fallen caldera (Venus' public bubble 9), loaded
# with Venus' ambient layer by the patrol, the strikes and the story
# missions: a Walker drop, a glimmer drop and a pike gang. One runs at a time
# with a quiet spell before each, a kind picked at random.
#
# None has been seen to start here: the bubble's hosts went 741s and 243s
# (Patrol Venus of 2026-10-28, #4 and #6), and 41-97s on three story
# mission hosts (act_venus_m07_northern_tides, act_venus_m06_ketch), with
# nothing; only the event squads' objectives moved,
# with ambient Fallen walking through. The quiet spell is the vex complex's
# (enc_complex_events.es); the Walker and glimmer drops run their archetypes
# as the Cosmodrome's do, with their rows' bodies. The pike gang has no
# archetype yet and stays out of the rotation.

@activity_bundle("enc_f_caldera_events")

static_array<u_event_tank_drop, 1> pf_event_tank_drop
static_array<u_event_dropship_multipoint, 1> pf_event_dropship_multipoint_fallen

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        if mathlib.random_int_never_highest_value(0, 2) == 0:
            pf_event_tank_drop[0].main.restart()
            sleep_until(pf_event_tank_drop[0].main.is_finished())
        else:
            pf_event_dropship_multipoint_fallen[0].main.restart()
            sleep_until(pf_event_dropship_multipoint_fallen[0].main.is_finished())
