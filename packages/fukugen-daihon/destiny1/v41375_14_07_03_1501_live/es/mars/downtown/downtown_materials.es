# es\mars\downtown\downtown_materials.es
#
# Relic iron, the resource nodes around downtown, its dome and refinery (Mars'
# public bubble 6), loaded with Mars' ambient layer by the patrol, the strikes
# and the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
#
# Here: one fresh start (Patrol Mars#3), the six 2.3.1 nodes out at 122-166 s.
# TU0 has four nodes where 2.3.1 has six, and only iron_road is named in both.

@activity_bundle("downtown_materials")

object iron_refinery7
object iron_refinery5
object iron_dome
object iron_road

@startup()
script sc_iron_refinery7():
    spawn_node(iron_refinery7)

@startup()
script sc_iron_refinery5():
    spawn_node(iron_refinery5)

@startup()
script sc_iron_dome():
    spawn_node(iron_dome)

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
