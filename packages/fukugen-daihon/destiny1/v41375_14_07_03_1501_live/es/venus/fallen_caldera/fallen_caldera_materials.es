# es\venus\fallen_caldera\fallen_caldera_materials.es
#
# Spirit blooms, the resource nodes around Venus' fallen caldera (public
# bubble 9), loaded with Venus' ambient layer by the patrol, the strikes and
# the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
#
# Here: on the wire for 29 s once, none out yet; the patrol's fresh start
# (Patrol Venus#4, 744 s): 2.3.1's five blooms out at 98-157 s, three
# harvested and back 158-296 s later, one not back 195 s on. TU0 has two
# where 2.3.1 has five.

@activity_bundle("fallen_caldera_materials")

object bloom_pools
object bloom_outliers

@startup()
script sc_bloom_pools():
    spawn_node(bloom_pools)

@startup()
script sc_bloom_outliers():
    spawn_node(bloom_outliers)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(80, 400))
