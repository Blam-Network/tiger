# es\moon\hellmouth\hellmouth_loot.es
#
# Loot chests around the Moon's hellmouth, the outpost, the bridge and the
# henge (public bubble 2), loaded with the Moon's ambient layer by the
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
# Here: four fresh starts (act_moon_m5_strength's public host, 2026-10-25
# 19-30-30#2, and three of the Moon patrol's, Patrol Luna of 2026-10-28),
# chests out at 58-89 s (one run's player left at 78 s with five out);
# act_moon_m5_strength's other public host joined it running with all eight
# out. TU0 has ten chests where 2.3.1 has eight.

@activity_bundle("hellmouth_loot")

object chest_mc_middle
object chest_mc_outpost
object chest_mc_bridge
object chest_mc_hive
object chest_outpost
object chest_bridge
object chest_maw
object chest_gatehouse
object chest_crevice
object chest_henge

@startup()
script sc_chest_mc_middle():
    spawn_chest(chest_mc_middle)

@startup()
script sc_chest_mc_outpost():
    spawn_chest(chest_mc_outpost)

@startup()
script sc_chest_mc_bridge():
    spawn_chest(chest_mc_bridge)

@startup()
script sc_chest_mc_hive():
    spawn_chest(chest_mc_hive)

@startup()
script sc_chest_outpost():
    spawn_chest(chest_outpost)

@startup()
script sc_chest_bridge():
    spawn_chest(chest_bridge)

@startup()
script sc_chest_maw():
    spawn_chest(chest_maw)

@startup()
script sc_chest_gatehouse():
    spawn_chest(chest_gatehouse)

@startup()
script sc_chest_crevice():
    spawn_chest(chest_crevice)

@startup()
script sc_chest_henge():
    spawn_chest(chest_henge)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
