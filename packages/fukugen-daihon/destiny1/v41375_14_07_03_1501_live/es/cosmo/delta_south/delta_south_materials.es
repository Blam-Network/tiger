# es\cosmo\delta_south\delta_south_materials.es
#
# Thorium, the resource nodes around the hangar, the wall and the road of
# the south delta (public bubble 7), loaded with the Cosmodrome's ambient
# layer by the patrol, the strikes and the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the deltas, the Array, the dry sea and the
# graveyard): 48 nodes in ten fresh starts, all in that window. No
# harvested node came back (three in the south delta, the longest 193 s
# on), so none does here.
# Here: two fresh starts with the player staying (the patrol,
# act_cosmo_m0_5_hangar's public host), every node out at 76-177 s. Three
# were harvested in the patrol's run, each gone a second later. TU0 has
# three nodes where 2.3.1 has six named by place.

@activity_bundle("delta_south_materials")

object thorium_hangar
object thorium_wall
object thorium_road

@startup()
script sc_thorium_hangar():
    spawn_node(thorium_hangar)

@startup()
script sc_thorium_wall():
    spawn_node(thorium_wall)

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
