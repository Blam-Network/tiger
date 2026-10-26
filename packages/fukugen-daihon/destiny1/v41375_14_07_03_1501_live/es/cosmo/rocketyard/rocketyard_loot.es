# es\cosmo\rocketyard\rocketyard_loot.es
#
# Loot chests around the rocketyard (public bubble 20), loaded with the
# Cosmodrome's ambient layer by the patrol, the strikes and the story
# missions.
#
# Each chest shows up on its own 57-88 s after the bubble starts, and is
# cleaned up within a second of being opened. Pooled over every 2.3.1
# chest bundle on the wire (the deltas, the Array, the dry sea, the
# graveyard and the Moon's moonbase): 76 chests in twelve fresh starts,
# all in that window. One opened chest came back 141 s after it was cleaned
# up (the graveyard), another was not back 191 s on (the south delta), so
# the wait before a chest comes back is a guess around the one return seen.
# Here: only cosmo_portal_1's public host, joined while it was running:
# every chest was already out, none opened in the 75 s seen. The timing is
# the other Cosmodrome chests'.

@activity_bundle("rocketyard_loot")

object chest_mc_graveyard
object chest_mc_back
object chest_mc_banner
object chest_strike
object chest_middle
object chest_banner

@startup()
script sc_chest_mc_graveyard():
    spawn_chest(chest_mc_graveyard)

@startup()
script sc_chest_mc_back():
    spawn_chest(chest_mc_back)

@startup()
script sc_chest_mc_banner():
    spawn_chest(chest_mc_banner)

@startup()
script sc_chest_strike():
    spawn_chest(chest_strike)

@startup()
script sc_chest_middle():
    spawn_chest(chest_middle)

@startup()
script sc_chest_banner():
    spawn_chest(chest_banner)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
