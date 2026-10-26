# es\cosmo\graveyard\graveyard_loot.es
#
# Loot chests around the graveyard (public bubble 12), loaded with the
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
# Here: one fresh start (the patrol, 1347 s in the bubble), every chest
# out at 60-70 s. chest_middle was opened 300 s in, gone 0.6 s later and
# back 141 s after that, the one return seen.

@activity_bundle("graveyard_loot")

object chest_monster_closets
object chest_delta_s
object chest_middle
object chest_breach
object chest_pipe

@startup()
script sc_chest_monster_closets():
    spawn_chest(chest_monster_closets)

@startup()
script sc_chest_delta_s():
    spawn_chest(chest_delta_s)

@startup()
script sc_chest_middle():
    spawn_chest(chest_middle)

@startup()
script sc_chest_breach():
    spawn_chest(chest_breach)

@startup()
script sc_chest_pipe():
    spawn_chest(chest_pipe)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
