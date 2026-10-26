# es\moon\moonbase\moonbase_loot.es
#
# Loot chests around the Moon's moonbase, the tower and the launch tubes
# (public bubble 6), loaded with the Moon's ambient layer by the patrol, the
# strikes and the story missions.
#
# Each chest shows up on its own 57-88 s after the bubble starts, and is
# cleaned up within a second of being opened. Pooled over every 2.3.1
# chest bundle on the wire (the deltas, the Array, the dry sea, the
# graveyard and the Moon's moonbase): 76 chests in twelve fresh starts,
# all in that window. One opened chest came back 141 s after it was cleaned
# up (the graveyard), another was not back 191 s on (the south delta), so
# the wait before a chest comes back is a guess around the one return seen.
# Here: one fresh start (act_moon_m1_launchtubes' public host), every
# chest out at 59-86 s, none opened: the Cosmodrome's rule holds.

@activity_bundle("moonbase_loot")

object chest_mc_tower
object chest_mc_accelerator
object chest_mc_launchtubes
object chest_accelerator
object chest_loop
object chest_lz
object chest_tower
object chest_center
object chest_launchtubes

@startup()
script sc_chest_mc_tower():
    spawn_chest(chest_mc_tower)

@startup()
script sc_chest_mc_accelerator():
    spawn_chest(chest_mc_accelerator)

@startup()
script sc_chest_mc_launchtubes():
    spawn_chest(chest_mc_launchtubes)

@startup()
script sc_chest_accelerator():
    spawn_chest(chest_accelerator)

@startup()
script sc_chest_loop():
    spawn_chest(chest_loop)

@startup()
script sc_chest_lz():
    spawn_chest(chest_lz)

@startup()
script sc_chest_tower():
    spawn_chest(chest_tower)

@startup()
script sc_chest_center():
    spawn_chest(chest_center)

@startup()
script sc_chest_launchtubes():
    spawn_chest(chest_launchtubes)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
