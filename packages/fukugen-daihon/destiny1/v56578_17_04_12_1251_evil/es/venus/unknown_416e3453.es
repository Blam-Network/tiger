# es\venus\unknown_416e3453.es
#
# The Taken invasion of the shattered coast (Venus' public bubble 20; bundle
# 416E3453, file name unknown), loaded with Venus' ambient layer by the
# patrol and the story missions: four parties around the coast and the
# rift's core (mini_taken_invasion_core.esu, taken_invasion_party.esu).
#
# Pooled over the seven segments that had it on the wire: an arrival on
# Patrol Venus#2 (whole invasion, the lieutenant killed), #8, 2026-10-25
# 19-45-22#2 and 20-15-34#2 and two on 2026-10-27 20-49-27#2, whose timers
# started 719.5 and 720.4 s apart; the first came 70-450 s after its
# host's start.

@activity_bundle(0x416E3453)

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
