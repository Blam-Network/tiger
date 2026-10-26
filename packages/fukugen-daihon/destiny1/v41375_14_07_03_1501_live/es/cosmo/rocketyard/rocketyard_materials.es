# es\cosmo\rocketyard\rocketyard_materials.es
#
# Thorium, the rocketyard's resource nodes (public bubble 20), loaded with
# the Cosmodrome's ambient layer by the patrol, the strikes and the story
# missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the deltas, the Array, the dry sea and the
# graveyard): 48 nodes in ten fresh starts, all in that window. No
# harvested node came back (three in the south delta, the longest 193 s
# on), so none does here.
# Here: only cosmo_portal_1's public host, joined while it was running:
# every node was already out, none harvested in the 75 s seen. The timing
# is the other Cosmodrome nodes'. TU0 has three nodes where 2.3.1 has
# five.

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
    node.create()
    sleep_until(node.is_alive())
    # harvested
    sleep_until(not node.is_alive())
    node.delete_object()
