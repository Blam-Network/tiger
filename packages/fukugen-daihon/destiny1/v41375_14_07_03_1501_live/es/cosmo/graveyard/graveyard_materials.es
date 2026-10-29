# es\cosmo\graveyard\graveyard_materials.es
#
# Thorium, the resource nodes on the wall, hangar and rocketyard sides of
# the graveyard (public bubble 12), loaded with the Cosmodrome's ambient
# layer by the patrol, the strikes and the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
# Here: one fresh start (the patrol), its five nodes out at 71-163 s,
# none harvested. TU0 has three nodes where 2.3.1 has five named by
# place.
# Two more fresh starts (2026-10-29 Patrol Earth#10 and #17), nodes out at
# 62-174 s. In the first, two were harvested 183 s and 251 s in: the second
# was back 86 s later, the first not back 281 s on.

@activity_bundle("graveyard_materials")

object thorium_wall_side
object thorium_hangar_side
object thorium_rocketyard_side

@startup()
script sc_thorium_wall_side():
    spawn_node(thorium_wall_side)

@startup()
script sc_thorium_hangar_side():
    spawn_node(thorium_hangar_side)

@startup()
script sc_thorium_rocketyard_side():
    spawn_node(thorium_rocketyard_side)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(80, 400))
