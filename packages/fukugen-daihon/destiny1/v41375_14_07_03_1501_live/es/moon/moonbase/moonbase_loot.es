# es\moon\moonbase\moonbase_loot.es
#
# Loot chests around the Moon's moonbase, the tower and the launch tubes
# (public bubble 6), loaded with the Moon's ambient layer by the patrol, the
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
# Here: three fresh starts (act_moon_m1_launchtubes' public host and two of
# the Moon patrol's, Patrol Luna of 2026-10-28), every chest out at
# 59-90 s, none opened; two more patrol hosts were left before 60 s with
# none out.

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
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
