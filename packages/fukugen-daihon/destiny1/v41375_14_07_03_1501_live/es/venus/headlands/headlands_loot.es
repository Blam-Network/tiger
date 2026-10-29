# es\venus\headlands\headlands_loot.es
#
# Loot chests around Venus' headlands, the overhang and the tides road
# (public bubble 10), loaded with Venus' ambient layer by the patrol, the
# strikes and the story missions.
#
# Each chest shows up on its own 57-90 s after the bubble starts, and is
# cleaned up within a second of being opened. Pooled over every 2.3.1 chest
# bundle on the wire (the Cosmodrome, the Moon, Venus and Mars, captures to
# 2026-10-29): chests out at 57-90 s in every fresh start but one (Mars'
# mesa). Opened chests came back 105 s (Venus' shattered coast), 131 s (the
# north delta), 141 s (the graveyard), 168 s (Mars' transit), 174 s (the
# fallen caldera) and 285 s (the accelerator) after they were cleaned up;
# others were not back 104, 159 and 191 s on. So a chest comes back
# 100-300 s after it was opened.
#
# Here: two fresh starts, act_venus_m02_southern_tides' third host (the five
# chests out at 63-87 s) and the patrol's (Patrol Venus#9, at 60-69 s).

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
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
