# es\venus\warp_ruins\warp_ruins_loot.es
#
# Loot chests around Venus' warp ruins, the caves and the pond (public
# bubble 28), loaded with Venus' ambient layer by the patrol, the strikes
# and the story missions.
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
# Here: on the wire for 26 and 31 s (act_venus_m07_northern_tides' and
# act_venus_m02_southern_tides' public hosts), none out yet, as the window
# has it; the timing is the other chests'. Carried from TU0 for 1.33 (same
# rows). quest_safari's run, the bubble its own, had all six out 39-61 s
# after the player arrived, earlier than the window; one run, so the window
# stays.

@activity_bundle("warp_ruins_loot")

object chest_caves
object chest_headlands
object chest_ruins_low
object chest_ruins_high
object chest_pond
object chest_tides

@startup()
script sc_chest_caves():
    spawn_chest(chest_caves)

@startup()
script sc_chest_headlands():
    spawn_chest(chest_headlands)

@startup()
script sc_chest_ruins_low():
    spawn_chest(chest_ruins_low)

@startup()
script sc_chest_ruins_high():
    spawn_chest(chest_ruins_high)

@startup()
script sc_chest_pond():
    spawn_chest(chest_pond)

@startup()
script sc_chest_tides():
    spawn_chest(chest_tides)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
