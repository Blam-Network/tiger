# es\mars\mesa\mesa_loot.es
#
# Loot chests around the mesa, its listening tower, garage and gate (Mars'
# public bubble 14), loaded with Mars' ambient layer by the patrol, the strikes
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
# Here: two fresh starts: act_mars_m05_warbase's mesa host
# (2026-10-26_23-39-22#5), the six chests out at 59-83 s, and the patrol's
# (Patrol Mars#10), where only two came out (64 and 72 s) and the other four
# were still not out when the player left at 117 s, the one fresh start that
# broke the window.

@activity_bundle("mesa_loot")

object chest_mc_tower
object chest_mc_gate
object chest_tower
object chest_garage
object chest_gate
object chest_cliffs

@startup()
script sc_chest_mc_tower():
    spawn_chest(chest_mc_tower)

@startup()
script sc_chest_mc_gate():
    spawn_chest(chest_mc_gate)

@startup()
script sc_chest_tower():
    spawn_chest(chest_tower)

@startup()
script sc_chest_garage():
    spawn_chest(chest_garage)

@startup()
script sc_chest_gate():
    spawn_chest(chest_gate)

@startup()
script sc_chest_cliffs():
    spawn_chest(chest_cliffs)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
