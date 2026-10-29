# es\cosmo\dry_sea\dry_sea_loot.es
#
# Loot chests around the dry sea, the main ship and Rasputin's island
# (public bubble 11), loaded with the Cosmodrome's ambient layer by the
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
# Here: one fresh start (act_cosmo_m2_dome_c's public host), its six
# chests out at 63-88 s, none opened. TU0 has nine chests where 2.3.1 has
# six; the three it dropped run as the others do.
# act_cosmo_m2_dome_c's host, joined running by the patrol (2026-10-29
# Patrol Earth#22), had all six out; none was opened in 237 s.

@activity_bundle("dry_sea_loot")

object chest_mc_rasputin
object chest_mc_ship
object chest_mc_cliff
object chest_rasputin_high
object chest_rasputin_low
object chest_main_ship
object chest_cave
object chest_ridge
object chest_sea

@startup()
script sc_chest_mc_rasputin():
    spawn_chest(chest_mc_rasputin)

@startup()
script sc_chest_mc_ship():
    spawn_chest(chest_mc_ship)

@startup()
script sc_chest_mc_cliff():
    spawn_chest(chest_mc_cliff)

@startup()
script sc_chest_rasputin_high():
    spawn_chest(chest_rasputin_high)

@startup()
script sc_chest_rasputin_low():
    spawn_chest(chest_rasputin_low)

@startup()
script sc_chest_main_ship():
    spawn_chest(chest_main_ship)

@startup()
script sc_chest_cave():
    spawn_chest(chest_cave)

@startup()
script sc_chest_ridge():
    spawn_chest(chest_ridge)

@startup()
script sc_chest_sea():
    spawn_chest(chest_sea)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
