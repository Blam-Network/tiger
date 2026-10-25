# es\cosmo\unknown_bdf9e3c6.es
#
# Thorium, the resource nodes around dome A and the planes, loaded with the
# Cosmodrome's ambient layer (cosmo_portal_1, cosmo_patrols_1 and
# act_cosmo_m1_dome_a). The alpha has a node at each corner of the planes
# where TU0 has a south and a north one and the road's.
# Timing from one 2.3.1 capture (act_cosmo_m4_dome_c's public host): nodes
# appeared one by one 46 s to 143 s after the first player spawned. None was
# harvested on the wire; a harvested node is cleaned up as the chests are.

@activity_bundle(0xBDF9E3C6)

object thorium_plane_sw
object thorium_plane_nw
object thorium_plane_se
object thorium_plane_ne
object thorium_dome

@startup()
script sc_thorium_plane_sw():
    spawn_node(thorium_plane_sw)

@startup()
script sc_thorium_plane_nw():
    spawn_node(thorium_plane_nw)

@startup()
script sc_thorium_plane_se():
    spawn_node(thorium_plane_se)

@startup()
script sc_thorium_plane_ne():
    spawn_node(thorium_plane_ne)

@startup()
script sc_thorium_dome():
    spawn_node(thorium_dome)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(45, 145))
    node.create()
    sleep_until(node.is_alive())
    sleep_until(not node.is_alive())
    node.delete_object()
