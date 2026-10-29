# es\venus\warp_ruins\warp_ruins_materials.es
#
# Spirit blooms, the resource nodes around Venus' warp ruins (public bubble
# 28), loaded with Venus' ambient layer by the patrol, the strikes and the
# story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
# Here: on the wire for 26 and 31 s, none out yet; the timing is the other
# blooms'. Carried from TU0 for 1.33, which adds bloom_crossroad_cliffs.
# quest_safari's run (the bubble its own) had two out, 44 and 63 s after the
# player arrived.

@activity_bundle("warp_ruins_materials")

object bloom_road
object bloom_lower_ruins
object bloom_upper_ruins
object bloom_crossroads
object bloom_crossroad_cliffs

@startup()
script sc_bloom_road():
    spawn_node(bloom_road)

@startup()
script sc_bloom_lower_ruins():
    spawn_node(bloom_lower_ruins)

@startup()
script sc_bloom_upper_ruins():
    spawn_node(bloom_upper_ruins)

@startup()
script sc_bloom_crossroads():
    spawn_node(bloom_crossroads)

@startup()
script sc_bloom_crossroad_cliffs():
    spawn_node(bloom_crossroad_cliffs)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(80, 400))
