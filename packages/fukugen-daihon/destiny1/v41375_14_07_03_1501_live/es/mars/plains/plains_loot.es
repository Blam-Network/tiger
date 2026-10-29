# es\mars\plains\plains_loot.es
#
# Loot chests around the plains around the Cabal base, where the patrol lands
# (Mars' public bubble 18), loaded with Mars' ambient layer by the patrol, the
# strikes and the story missions.
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
# Here: two fresh starts: the patrol's plains host (Patrol Mars#2), the six
# chests out at 68-86 s, and act_mars_m05_warbase's (2026-10-26_23-39-22#2),
# two out at 62 and 65 s before the player left at 90 s.

@activity_bundle("plains_loot")

object chest_mc_base
object chest_mc_ne
object chest_mc_base_s
object chest_base_s
object chest_base
object chest_central

@startup()
script sc_chest_mc_base():
    spawn_chest(chest_mc_base)

@startup()
script sc_chest_mc_ne():
    spawn_chest(chest_mc_ne)

@startup()
script sc_chest_mc_base_s():
    spawn_chest(chest_mc_base_s)

@startup()
script sc_chest_base_s():
    spawn_chest(chest_base_s)

@startup()
script sc_chest_base():
    spawn_chest(chest_base)

@startup()
script sc_chest_central():
    spawn_chest(chest_central)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
