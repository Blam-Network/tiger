# es\moon\hellmouth\hellmouth_loot.es
#
# Loot chests around the Moon's hellmouth, the outpost, the bridge and the
# henge (public bubble 2), loaded with the Moon's ambient layer by the
# patrol, the strikes and the story missions.
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
# Here: one fresh start (act_moon_m5_strength's public host, 2026-10-25
# 19-30-30#2), every chest out at 58-77 s; act_moon_m5_strength's other
# public host joined it running with all eight out. TU0 has ten chests where
# 2.3.1 has eight.

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
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
