# es\mars\battleground\battleground_loot.es
#
# Loot chests around Mars' battleground, between the Cabal trenches and the Vex
# dunes (Mars' public bubble 1), loaded with Mars' ambient layer by the patrol,
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
# Here: four fresh starts: the patrol's battleground host (Patrol Mars#8 and
# #14), the six chests out at 58-89 s in both, and act_mars_m05_warbase's and
# act_mars_m06_subway's (2026-11-01 00-28-50#3 and 01-07-32#3), all six out at
# 62-81 s and 60-88 s. Two more fresh hosts (2026-11-01 00-12-41#2 and
# 01-41-19#3) had none out when the player left the bubble at 37-59 s.

@activity_bundle("battleground_loot")

object chest_mc_rubicon
object chest_mc_vex
object chest_mc_base_west
object chest_mc_base_east
object chest_mc_center
object chest_battleground

@startup()
script sc_chest_mc_rubicon():
    spawn_chest(chest_mc_rubicon)

@startup()
script sc_chest_mc_vex():
    spawn_chest(chest_mc_vex)

@startup()
script sc_chest_mc_base_west():
    spawn_chest(chest_mc_base_west)

@startup()
script sc_chest_mc_base_east():
    spawn_chest(chest_mc_base_east)

@startup()
script sc_chest_mc_center():
    spawn_chest(chest_mc_center)

@startup()
script sc_chest_battleground():
    spawn_chest(chest_battleground)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
