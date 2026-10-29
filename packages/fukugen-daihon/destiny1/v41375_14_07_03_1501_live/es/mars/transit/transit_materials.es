# es\mars\transit\transit_materials.es
#
# Relic iron, the resource nodes around the transit district, its terminal,
# pass and plaza (Mars' public bubble 24), loaded with Mars' ambient layer by
# the patrol, the strikes and the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
#
# Here: the same two fresh starts, the six 2.3.1 nodes out at 70-169 s in both.
# Two harvested on #6 were not back 144 and 158 s later. TU0 has four nodes
# where 2.3.1 has six, and only iron_road is named in both.

@activity_bundle("transit_materials")

object iron_back
object iron_pass
object iron_transit
object iron_road

@startup()
script sc_iron_back():
    spawn_node(iron_back)

@startup()
script sc_iron_pass():
    spawn_node(iron_pass)

@startup()
script sc_iron_transit():
    spawn_node(iron_transit)

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
