# es\cosmo\rocketyard\rocketyard_materials.es
#
# Thorium, the rocketyard's resource nodes (public bubble 20), loaded with
# the Cosmodrome's ambient layer by the patrol, the strikes and the story
# missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
# Here: the patrol's fresh start (2026-10-29 Patrol Earth#11), one node out
# at 69 s when the player left at 76 s. Before that, cosmo_portal_1's
# public host, joined running, had every node out and none harvested in
# the 75 s seen. TU0 has three nodes where 2.3.1 has five.

@activity_bundle("rocketyard_materials")

object thorium_to_graveyard
object thorium_to_refinery
object thorium_center

@startup()
script sc_thorium_to_graveyard():
    spawn_node(thorium_to_graveyard)

@startup()
script sc_thorium_to_refinery():
    spawn_node(thorium_to_refinery)

@startup()
script sc_thorium_center():
    spawn_node(thorium_center)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(80, 400))
