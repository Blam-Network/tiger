# es\cosmo\graveyard\graveyard_loot.es
#
# Loot chests around the graveyard (public bubble 12), loaded with the
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
# Here: one fresh start (the patrol, 1347 s in the bubble), every chest
# out at 60-70 s. chest_middle was opened 300 s in, gone 0.6 s later and
# back 141 s after that, the one return seen.
# Two more fresh starts (2026-10-29 Patrol Earth#10 and #17), every
# chest out at 64-85 s, none opened.

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
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
