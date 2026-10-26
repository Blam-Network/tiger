# es\cosmo\delta_south\delta_south_loot.es
#
# Loot chests around the south delta, the crashed ship and the graveyard
# road (public bubble 7), loaded with the Cosmodrome's ambient layer by the
# patrol, the strikes and the story missions.
#
# Each chest shows up on its own 57-88 s after the bubble starts, and is
# cleaned up within a second of being opened. Pooled over every 2.3.1
# chest bundle on the wire (the deltas, the Array, the dry sea, the
# graveyard and the Moon's moonbase): 76 chests in twelve fresh starts,
# all in that window. One opened chest came back 141 s after it was cleaned
# up (the graveyard), another was not back 191 s on (the south delta), so
# the wait before a chest comes back is a guess around the one return seen.
# Here: two fresh starts with the player staying (the patrol,
# act_cosmo_m0_5_hangar's public host), every chest out at 63-85 s; two
# more that left within a minute and a half saw none or two. One chest was
# opened and gone 1.1 s later. 2.3.1 dropped chest_mc_aboveground, which
# TU0 still has; it runs as the others do.

@activity_bundle("delta_south_loot")

object chest_mc_aboveground
object chest_mc_underground
object chest_underground
object chest_graveyard
object chest_edges
object chest_ship
object chest_extra

@startup()
script sc_chest_mc_aboveground():
    spawn_chest(chest_mc_aboveground)

@startup()
script sc_chest_mc_underground():
    spawn_chest(chest_mc_underground)

@startup()
script sc_chest_underground():
    spawn_chest(chest_underground)

@startup()
script sc_chest_graveyard():
    spawn_chest(chest_graveyard)

@startup()
script sc_chest_edges():
    spawn_chest(chest_edges)

@startup()
script sc_chest_ship():
    spawn_chest(chest_ship)

@startup()
script sc_chest_extra():
    spawn_chest(chest_extra)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
