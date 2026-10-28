# es\venus\warp_ruins\warp_ruins_loot.es
#
# Loot chests around Venus' warp ruins, the caves and the pond (public
# bubble 28), loaded with Venus' ambient layer by the patrol, the strikes
# and the story missions.
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
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
