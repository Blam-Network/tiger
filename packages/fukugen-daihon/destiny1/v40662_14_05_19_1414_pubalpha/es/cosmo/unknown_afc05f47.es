# es\cosmo\unknown_afc05f47.es
#
# Thorium, the Array's resource nodes, loaded with the Cosmodrome's ambient
# layer (cosmo_portal_1, cosmo_patrols_1 and act_cosmo_m1_dome_a). The alpha
# names its four nodes by place, where TU0 has one per traffic level.
# Timing from one 2.3.1 capture (act_cosmo_m4_dome_c's public host): nodes
# appeared one by one between 65s and 139s. None was harvested on the wire; a
# harvested node is cleaned up as the chests are.

@activity_bundle(0xAFC05F47)

object thorium_cliff
object thorium_helipad
object thorium_dome_c
object thorium_middle

@startup()
script sc_thorium_cliff():
    spawn_node(thorium_cliff)

@startup()
script sc_thorium_helipad():
    spawn_node(thorium_helipad)

@startup()
script sc_thorium_dome_c():
    spawn_node(thorium_dome_c)

@startup()
script sc_thorium_middle():
    spawn_node(thorium_middle)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(60, 140))
    node.create()
    sleep_until(node.is_alive())
    sleep_until(not node.is_alive())
    node.delete_object()
