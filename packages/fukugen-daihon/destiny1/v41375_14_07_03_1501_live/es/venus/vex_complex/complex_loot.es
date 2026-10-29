# es\venus\vex_complex\complex_loot.es
#
# Loot chests around Venus' vex complex, toward the caldera and the warp
# ruins (public bubble 4), loaded with Venus' ambient layer by the patrol,
# the strikes and the story missions.
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
# Here: act_venus_m07_northern_tides' public hosts: one fresh start with two
# chests out at 61 and 66 s before the player left at 65 s, and three
# shorter visits with none out yet; the patrol's fresh start (Patrol
# Venus#5): five of the six out at 62-88 s.

@activity_bundle("complex_loot")

object chest_mc_caldera
object chest_mc_warp_ruins
object chest_mc_back
object chest_warp_ruins
object chest_caldera
object chest_bridge

@startup()
script sc_chest_mc_caldera():
    spawn_chest(chest_mc_caldera)

@startup()
script sc_chest_mc_warp_ruins():
    spawn_chest(chest_mc_warp_ruins)

@startup()
script sc_chest_mc_back():
    spawn_chest(chest_mc_back)

@startup()
script sc_chest_warp_ruins():
    spawn_chest(chest_warp_ruins)

@startup()
script sc_chest_caldera():
    spawn_chest(chest_caldera)

@startup()
script sc_chest_bridge():
    spawn_chest(chest_bridge)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
