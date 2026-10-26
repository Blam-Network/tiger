# es\cosmo\delta_north\delta_north_loot.es
#
# Loot chests around dome A, the Mothyards and the planes of the north
# delta (public bubble 6), loaded with the Cosmodrome's ambient layer by the
# patrol, the strikes and the story missions.
#
# Each chest shows up on its own 57-88 s after the bubble starts, and is
# cleaned up within a second of being opened. Pooled over every 2.3.1
# chest bundle on the wire (the deltas, the Array, the dry sea, the
# graveyard and the Moon's moonbase): 76 chests in twelve fresh starts,
# all in that window. One opened chest came back 141 s after it was cleaned
# up (the graveyard), another was not back 191 s on (the south delta), so
# the wait before a chest comes back is a guess around the one return seen.
# Here: four fresh starts (act_cosmo_m4_dome_c twice, act_cosmo_m1_dome_a
# and act_cosmo_m2_dome_c's public hosts), every chest out at 57-86 s but
# two in the run the player left at 81 s. None was opened.

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
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
