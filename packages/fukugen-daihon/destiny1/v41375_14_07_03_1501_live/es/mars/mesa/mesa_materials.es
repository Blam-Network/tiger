# es\mars\mesa\mesa_materials.es
#
# Relic iron, the resource nodes around the mesa, its listening tower, garage
# and gate (Mars' public bubble 14), loaded with Mars' ambient layer by the
# patrol, the strikes and the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
#
# Here: the same two fresh starts: four of the five 2.3.1 nodes out at 72-147 s
# on act_mars_m05_warbase's host, two at 62 and 64 s on the patrol's before the
# player left at 117 s. TU0 has three nodes where 2.3.1 has five, and only
# iron_road is named in both.

@activity_bundle("mesa_materials")

object iron_east
object iron_west
object iron_road

@startup()
script sc_iron_east():
    spawn_node(iron_east)

@startup()
script sc_iron_west():
    spawn_node(iron_west)

@startup()
script sc_iron_road():
    spawn_node(iron_road)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(80, 400))
