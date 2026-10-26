# es\cosmo\graveyard\graveyard_materials.es
#
# Thorium, the resource nodes on the wall, hangar and rocketyard sides of
# the graveyard (public bubble 12), loaded with the Cosmodrome's ambient
# layer by the patrol, the strikes and the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the deltas, the Array, the dry sea and the
# graveyard): 48 nodes in ten fresh starts, all in that window. No
# harvested node came back (three in the south delta, the longest 193 s
# on), so none does here.
# Here: one fresh start (the patrol), its five nodes out at 71-163 s,
# none harvested. TU0 has three nodes where 2.3.1 has five named by
# place.

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
    node.create()
    sleep_until(node.is_alive())
    # harvested
    sleep_until(not node.is_alive())
    node.delete_object()
