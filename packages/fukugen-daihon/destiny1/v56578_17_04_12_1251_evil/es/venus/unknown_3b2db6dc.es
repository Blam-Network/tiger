# es\venus\unknown_3b2db6dc.es
#
# The Taken invasion of the plaza (Venus' public bubble 15; bundle
# 3B2DB6DC, file name unknown), loaded by the patrol: three parties and the
# rift's core (mini_taken_invasion_core.esu, taken_invasion_party.esu).
#
# On the wire once, 2026-10-27 20-49-27#3: a whole invasion, the lieutenant
# called after the eighth squad was lost and the timer running out on him.

@activity_bundle(0x3B2DB6DC)

mini_taken_invasion_core mini_taken_invasion_core
static_array<taken_invasion_party, 3> taken_invasion_party

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
