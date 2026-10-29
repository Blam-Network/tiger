# es\venus\unknown_278551ae.es
#
# The Taken invasion of the headlands (Venus' public bubble 10; bundle
# 278551AE, file name unknown), loaded with Venus' ambient layer by the
# patrol, the story missions and quest_safari: four parties and the rift's
# core (mini_taken_invasion_core.esu, taken_invasion_party.esu).
#
# On the wire in five segments; arrivals on 2026-10-27 20-49-27#5 and
# quest_safari's 22-28-10#2, each followed for under a minute. Patrol
# Venus#9's host came up 15 s after the destination's beat had passed and
# saw none in its 229 s, as the beat has it.

@activity_bundle(0x278551AE)

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
