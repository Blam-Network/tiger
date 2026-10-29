# es\mars\downtown\downtown_loot.es
#
# Loot chests around downtown, its dome and refinery (Mars' public bubble 6),
# loaded with Mars' ambient layer by the patrol, the strikes and the story
# missions.
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
# Here: one fresh start, the patrol's downtown host (Patrol Mars#3), the six
# chests out at 62-87 s.

@activity_bundle("downtown_loot")

object chest_mc_dome
object chest_mc_refinery
object chest_mc_exterior
object chest_dome
object chest_main
object chest_refinery

@startup()
script sc_chest_mc_dome():
    spawn_chest(chest_mc_dome)

@startup()
script sc_chest_mc_refinery():
    spawn_chest(chest_mc_refinery)

@startup()
script sc_chest_mc_exterior():
    spawn_chest(chest_mc_exterior)

@startup()
script sc_chest_dome():
    spawn_chest(chest_dome)

@startup()
script sc_chest_main():
    spawn_chest(chest_main)

@startup()
script sc_chest_refinery():
    spawn_chest(chest_refinery)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
