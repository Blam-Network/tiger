# es\cosmo\delta_north\delta_north_loot.es
#
# Loot chests around dome A, the Mothyards and the planes of the north
# delta (public bubble 6), loaded with the Cosmodrome's ambient layer by the
# patrol, the strikes and the story missions.
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
# Here: four fresh starts (act_cosmo_m4_dome_c twice, act_cosmo_m1_dome_a
# and act_cosmo_m2_dome_c's public hosts), every chest out at 57-86 s but
# two in the run the player left at 81 s. None was opened.
# The patrol's 2026-10-29 visit (Patrol Earth#3) joined
# act_cosmo_m1_dome_a's host running: chest_mc_north was opened 69 s after
# the join and back 131 s later; chest_dome, missing at the join, was back
# 64 s in. A fresh start the player left at 56 s (Patrol Earth#7) had none
# out yet.

@activity_bundle("delta_north_loot")

object chest_mc_north
object chest_mc_south
object chest_dome
object chest_plane_sw
object chest_plane_nw
object chest_plane_se
object chest_plane_ne
object chest_edges

@startup()
script sc_chest_mc_north():
    spawn_chest(chest_mc_north)

@startup()
script sc_chest_mc_south():
    spawn_chest(chest_mc_south)

@startup()
script sc_chest_dome():
    spawn_chest(chest_dome)

@startup()
script sc_chest_plane_sw():
    spawn_chest(chest_plane_sw)

@startup()
script sc_chest_plane_nw():
    spawn_chest(chest_plane_nw)

@startup()
script sc_chest_plane_se():
    spawn_chest(chest_plane_se)

@startup()
script sc_chest_plane_ne():
    spawn_chest(chest_plane_ne)

@startup()
script sc_chest_edges():
    spawn_chest(chest_edges)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
