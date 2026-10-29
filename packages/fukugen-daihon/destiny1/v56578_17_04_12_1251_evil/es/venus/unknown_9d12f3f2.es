# es\venus\unknown_9d12f3f2.es
#
# The Taken invasion of the vex complex (Venus' public bubble 4; bundle
# 9D12F3F2, file name unknown), loaded with Venus' ambient layer by the
# patrol, the story missions and mission_traitor: four parties and the
# rift's core (mini_taken_invasion_core.esu, taken_invasion_party.esu).
#
# On the wire in five segments; two arrivals: Patrol Venus#5 (the parties
# phase ran out its 180 s with seven squads lost) and mission_traitor's
# 2026-10-27 22-53-09#3.

@activity_bundle(0x9D12F3F2)

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
