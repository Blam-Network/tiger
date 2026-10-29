# es\mars\valley\valley_loot.es
#
# Loot chests around the Valley of Kings, its Cabal base and tank, Vex ruin and
# plateau (Mars' public bubble 26), loaded with Mars' ambient layer by the
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
#
# Here: two fresh starts, act_mars_m01_valley's valley host
# (2026-10-26_23-24-32#4) with the eight chests out at 60-85 s and the patrol's
# (Patrol Mars#12) at 62-87 s. act_mars_m07_lowergarden's valley host was
# joined running (2026-10-26_23-57-02#5): seven chests out from its first
# snapshot and the vex ruin chest, on its fourth incarnation, back 91 s in.

@activity_bundle("valley_loot")

object chest_mc_tank
object chest_mc_base
object chest_tank
object chest_base
object chest_vex_ruin
object chest_plateau
object chest_cliffs_ne
object chest_mid_rocks

@startup()
script sc_chest_mc_tank():
    spawn_chest(chest_mc_tank)

@startup()
script sc_chest_mc_base():
    spawn_chest(chest_mc_base)

@startup()
script sc_chest_tank():
    spawn_chest(chest_tank)

@startup()
script sc_chest_base():
    spawn_chest(chest_base)

@startup()
script sc_chest_vex_ruin():
    spawn_chest(chest_vex_ruin)

@startup()
script sc_chest_plateau():
    spawn_chest(chest_plateau)

@startup()
script sc_chest_cliffs_ne():
    spawn_chest(chest_cliffs_ne)

@startup()
script sc_chest_mid_rocks():
    spawn_chest(chest_mid_rocks)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
