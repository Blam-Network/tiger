# es\moon\accelerator\accelerator_loot.es
#
# Loot chests around the Moon's accelerator and the dome (public bubble 1),
# loaded with the Moon's ambient layer by the patrol, the strikes and the
# story missions.
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
# Here: four fresh starts (act_moon_m3_lowercitadel's and
# act_moon_m4_uppercitadel's public hosts, and two of the Moon patrol's,
# Patrol Luna of 2026-10-28), chests out at 59-88 s; the second left the
# bubble at 62 s with one out. In the patrol's long stay (690 s) the middle
# chest was opened at 145 s and back at 430 s, the base chest opened at
# 588 s and not back by the end.

@activity_bundle("accelerator_loot")

object chest_mc_moonbase
object chest_mc_accelerator
object chest_mc_dome
object chest_rail
object chest_dome
object chest_moonbase
object chest_base
object chest_middle

@startup()
script sc_chest_mc_moonbase():
    spawn_chest(chest_mc_moonbase)

@startup()
script sc_chest_mc_accelerator():
    spawn_chest(chest_mc_accelerator)

@startup()
script sc_chest_mc_dome():
    spawn_chest(chest_mc_dome)

@startup()
script sc_chest_rail():
    spawn_chest(chest_rail)

@startup()
script sc_chest_dome():
    spawn_chest(chest_dome)

@startup()
script sc_chest_moonbase():
    spawn_chest(chest_moonbase)

@startup()
script sc_chest_base():
    spawn_chest(chest_base)

@startup()
script sc_chest_middle():
    spawn_chest(chest_middle)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
