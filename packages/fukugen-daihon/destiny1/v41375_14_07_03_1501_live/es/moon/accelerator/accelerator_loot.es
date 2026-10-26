# es\moon\accelerator\accelerator_loot.es
#
# Loot chests around the Moon's accelerator and the dome (public bubble 1),
# loaded with the Moon's ambient layer by the patrol, the strikes and the
# story missions.
#
# Each chest shows up on its own 57-88 s after the bubble starts, and is
# cleaned up within a second of being opened. Pooled over every 2.3.1 chest
# bundle on the wire (the Cosmodrome's, the Moon's moonbase, hellmouth and
# accelerator, Venus' shattered coast, headlands and vex complex): 100
# chests in seventeen fresh starts, all in that window. One opened chest
# came back 141 s after it was cleaned up (the Cosmodrome's graveyard),
# another was not back 191 s on (the south delta), so the wait before a
# chest comes back is a guess around the one return seen.
#
# Here: two fresh starts (act_moon_m3_lowercitadel's and
# act_moon_m4_uppercitadel's public hosts), chests out at 59-83 s; the
# second left the bubble at 62 s with one out.

@activity_bundle("accelerator_loot")

object chest_mc_moonbase
object chest_mc_accelerator
object chest_mc_dome
object chest_rail
object chest_dome
object chest_moonbase
object chest_base
object chest_middle

@startup()
script sc_chest_mc_moonbase():
    spawn_chest(chest_mc_moonbase)

@startup()
script sc_chest_mc_accelerator():
    spawn_chest(chest_mc_accelerator)

@startup()
script sc_chest_mc_dome():
    spawn_chest(chest_mc_dome)

@startup()
script sc_chest_rail():
    spawn_chest(chest_rail)

@startup()
script sc_chest_dome():
    spawn_chest(chest_dome)

@startup()
script sc_chest_moonbase():
    spawn_chest(chest_moonbase)

@startup()
script sc_chest_base():
    spawn_chest(chest_base)

@startup()
script sc_chest_middle():
    spawn_chest(chest_middle)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
