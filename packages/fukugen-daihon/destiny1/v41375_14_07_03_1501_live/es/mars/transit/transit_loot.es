# es\mars\transit\transit_loot.es
#
# Loot chests around the transit district, its terminal, pass and plaza (Mars'
# public bubble 24), loaded with Mars' ambient layer by the patrol, the strikes
# and the story missions.
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
# Here: two fresh starts of the patrol's transit host (Patrol Mars#4 and #6),
# the five chests out at 64-88 s. On #6 the terminal chest was opened at 186 s
# and back at 354 s (168 s later); the south chest, opened at 248 s, was not
# back 159 s later.

@activity_bundle("transit_loot")

object chest_mc_north
object chest_mc_south
object chest_mc_west
object chest_terminal
object chest_overlook

@startup()
script sc_chest_mc_north():
    spawn_chest(chest_mc_north)

@startup()
script sc_chest_mc_south():
    spawn_chest(chest_mc_south)

@startup()
script sc_chest_mc_west():
    spawn_chest(chest_mc_west)

@startup()
script sc_chest_terminal():
    spawn_chest(chest_terminal)

@startup()
script sc_chest_overlook():
    spawn_chest(chest_overlook)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
