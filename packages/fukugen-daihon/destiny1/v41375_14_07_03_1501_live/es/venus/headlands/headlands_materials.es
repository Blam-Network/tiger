# es\venus\headlands\headlands_materials.es
#
# Spirit blooms, the resource nodes around Venus' headlands (public bubble
# 10), loaded with Venus' ambient layer by the patrol, the strikes and the
# story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
#
# Here: two fresh starts: two of the six 2.3.1 blooms out at 80 and 97 s
# before the player left at 108 s (act_venus_m02_southern_tides' third
# host), and all six at 86-168 s (Patrol Venus#9). TU0 has three where
# 2.3.1 has six.

@activity_bundle("headlands_materials")

object bloom_road
object bloom_shattered_side
object bloom_warp_side

@startup()
script sc_bloom_road():
    spawn_node(bloom_road)

@startup()
script sc_bloom_shattered_side():
    spawn_node(bloom_shattered_side)

@startup()
script sc_bloom_warp_side():
    spawn_node(bloom_warp_side)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(80, 400))
