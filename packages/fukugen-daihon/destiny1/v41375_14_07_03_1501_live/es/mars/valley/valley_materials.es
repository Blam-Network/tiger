# es\mars\valley\valley_materials.es
#
# Relic iron, the resource nodes around the Valley of Kings, its Cabal base and
# tank, Vex ruin and plateau (Mars' public bubble 26), loaded with Mars'
# ambient layer by the patrol, the strikes and the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
#
# Here: two fresh starts, four of the six 2.3.1 nodes out at 70-119 s on
# act_mars_m01_valley's host before the player left at 131 s, all six at 79-150
# s on the patrol's (Patrol Mars#12). TU0 has three nodes where 2.3.1 has six,
# and only iron_road is named in both.

@activity_bundle("valley_materials")

object iron_tank_side
object iron_base_side
object iron_road

@startup()
script sc_iron_tank_side():
    spawn_node(iron_tank_side)

@startup()
script sc_iron_base_side():
    spawn_node(iron_base_side)

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
