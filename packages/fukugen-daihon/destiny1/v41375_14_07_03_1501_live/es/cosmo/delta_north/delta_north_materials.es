# es\cosmo\delta_north\delta_north_materials.es
#
# Thorium, the resource nodes around dome A, the road and the planes of the
# north delta (public bubble 6), loaded with the Cosmodrome's ambient layer
# by the patrol, the strikes and the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the deltas, the Array, the dry sea and the
# graveyard): 48 nodes in ten fresh starts, all in that window. No
# harvested node came back (three in the south delta, the longest 193 s
# on), so none does here.
# Here: four fresh starts, nodes out at 56-152 s, the ones not yet out
# when the player left still due; none harvested. TU0 has four nodes where
# 2.3.1 has seven named by place.

@activity_bundle("delta_north_materials")

object thorium_south_planes
object thorium_north_planes
object thorium_dome
object thorium_road

@startup()
script sc_thorium_south_planes():
    spawn_node(thorium_south_planes)

@startup()
script sc_thorium_north_planes():
    spawn_node(thorium_north_planes)

@startup()
script sc_thorium_dome():
    spawn_node(thorium_dome)

@startup()
script sc_thorium_road():
    spawn_node(thorium_road)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    node.create()
    sleep_until(node.is_alive())
    # harvested
    sleep_until(not node.is_alive())
    node.delete_object()
