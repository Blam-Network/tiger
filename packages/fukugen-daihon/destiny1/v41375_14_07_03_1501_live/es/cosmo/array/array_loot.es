# es\cosmo\array\array_loot.es
#
# Loot chests around the Array (public bubble 0), loaded with the
# Cosmodrome's ambient layer by the patrol, the strikes and the story
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
# Here: two fresh starts (act_cosmo_m4_dome_c's public host, 2026-10-01
# and 2026-10-24), every chest out at 63-85 s. The one opened was gone a
# second later. TU0 has two dome C chests where 2.3.1 has one.
# The patrol's fresh start (2026-10-29 Patrol Earth#5) had three out at
# 61-69 s when the player left at 77 s.

@activity_bundle("array_loot")

object chest_mc_helipad
object chest_mc_hivedome
object chest_dome_c_high
object chest_dome_c_low
object chest_underpad
object chest_edges_a
object chest_edges_c

@startup()
script sc_chest_mc_helipad():
    spawn_chest(chest_mc_helipad)

@startup()
script sc_chest_mc_hivedome():
    spawn_chest(chest_mc_hivedome)

@startup()
script sc_chest_dome_c_high():
    spawn_chest(chest_dome_c_high)

@startup()
script sc_chest_dome_c_low():
    spawn_chest(chest_dome_c_low)

@startup()
script sc_chest_underpad():
    spawn_chest(chest_underpad)

@startup()
script sc_chest_edges_a():
    spawn_chest(chest_edges_a)

@startup()
script sc_chest_edges_c():
    spawn_chest(chest_edges_c)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
