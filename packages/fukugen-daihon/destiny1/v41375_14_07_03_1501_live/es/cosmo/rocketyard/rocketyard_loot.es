# es\cosmo\rocketyard\rocketyard_loot.es
#
# Loot chests around the rocketyard (public bubble 20), loaded with the
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
# Here: the patrol's fresh start (2026-10-29 Patrol Earth#11), four chests
# out at 66-76 s and two not yet out when the player left at 76 s; two more
# fresh starts left by 37 s and 52 s saw none. Before that, cosmo_portal_1's
# public host, joined running, had every chest out and none opened in the
# 75 s seen.

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
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
