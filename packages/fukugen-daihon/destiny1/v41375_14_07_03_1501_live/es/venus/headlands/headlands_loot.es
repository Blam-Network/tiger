# es\venus\headlands\headlands_loot.es
#
# Loot chests around Venus' headlands, the overhang and the tides road
# (public bubble 10), loaded with Venus' ambient layer by the patrol, the
# strikes and the story missions.
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
# Here: one fresh start (act_venus_m02_southern_tides' third host), the five
# chests out at 63-87 s.

@activity_bundle("headlands_loot")

object chest_mc_shattered
object chest_mc_overhang
object chest_middle
object chest_shattered
object chest_tides

@startup()
script sc_chest_mc_shattered():
    spawn_chest(chest_mc_shattered)

@startup()
script sc_chest_mc_overhang():
    spawn_chest(chest_mc_overhang)

@startup()
script sc_chest_middle():
    spawn_chest(chest_middle)

@startup()
script sc_chest_shattered():
    spawn_chest(chest_shattered)

@startup()
script sc_chest_tides():
    spawn_chest(chest_tides)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
