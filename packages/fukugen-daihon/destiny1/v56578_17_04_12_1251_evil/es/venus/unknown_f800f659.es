# es\venus\unknown_f800f659.es
#
# The Taken invasion of the fallen caldera (Venus' public bubble 9; bundle
# F800F659, file name unknown), loaded with Venus' ambient layer by the
# patrol and the story missions: four parties and the rift's core
# (mini_taken_invasion_core.esu, taken_invasion_party.esu).
#
# On the wire in five segments; arrivals on Patrol Venus#4 (two, their
# timers 719.4 s apart) and act_venus_m06_ketch's 2026-10-27 20-12-26#2.

@activity_bundle(0xF800F659)

mini_taken_invasion_core mini_taken_invasion_core
static_array<taken_invasion_party, 4> taken_invasion_party

@startup()
# The invasions keep the destination's 720 s beat, which the zone cannot
# see, so the first comes at any point of it.
script sc_taken_invasions():
    sleep(mathlib.random_int_inclusive(0, 719))
    while true:
        sc_invasion.restart()
        sleep(720)

script sc_invasion():
    mini_taken_invasion_core.invade(taken_invasion_party)
