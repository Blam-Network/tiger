# es\venus\vex_complex\complex_loot.es
#
# Loot chests around Venus' vex complex, toward the caldera and the warp
# ruins (public bubble 4), loaded with Venus' ambient layer by the patrol,
# the strikes and the story missions.
#
# Each chest shows up on its own 57-88 s after the bubble starts, and is
# cleaned up within a second of being opened. Pooled over every 2.3.1 chest
# bundle on the wire (the Cosmodrome's, the Moon's moonbase, hellmouth and
# accelerator, Venus' shattered coast, headlands and vex complex): 100
# chests in seventeen fresh starts, all in that window. One opened chest
# came back 141 s after it was cleaned up (the Cosmodrome's graveyard),
# another was not back 191 s on (the south delta), so the wait before a
# chest comes back is a guess around the one return seen.
#
# Here: act_venus_m07_northern_tides' public hosts: one fresh start with two
# chests out at 61 and 66 s before the player left at 65 s, and three
# shorter visits with none out yet.

@activity_bundle("complex_loot")

object chest_mc_caldera
object chest_mc_warp_ruins
object chest_mc_back
object chest_warp_ruins
object chest_caldera
object chest_bridge

@startup()
script sc_chest_mc_caldera():
    spawn_chest(chest_mc_caldera)

@startup()
script sc_chest_mc_warp_ruins():
    spawn_chest(chest_mc_warp_ruins)

@startup()
script sc_chest_mc_back():
    spawn_chest(chest_mc_back)

@startup()
script sc_chest_warp_ruins():
    spawn_chest(chest_warp_ruins)

@startup()
script sc_chest_caldera():
    spawn_chest(chest_caldera)

@startup()
script sc_chest_bridge():
    spawn_chest(chest_bridge)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
