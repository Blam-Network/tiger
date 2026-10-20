# es\cosmo\unknown_afc05f47.es
#
# Thorium, the Array's resource nodes, loaded with the
# Cosmodrome's ambient layer (cosmo_portal_1, patrol_deltas_com01,
# act_cosmo_m4_dome_c and the rest). TU0 has one node per traffic level
# where 2.3.1 has six named by place.
# From one capture (act_cosmo_m4_dome_c's public host): nodes appeared one by
# one between 65s and 139s, two never in the three minutes recorded. None was
# harvested on the wire; a harvested node is cleaned up as the chests are.

@activity_bundle(0xAFC05F47)

object thorium_low_traffic
object thorium_med_traffic
object thorium_hi_traffic

@startup()
script sc_thorium_low_traffic():
    spawn_node(thorium_low_traffic)

@startup()
script sc_thorium_med_traffic():
    spawn_node(thorium_med_traffic)

@startup()
script sc_thorium_hi_traffic():
    spawn_node(thorium_hi_traffic)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(60, 140))
    node.create()
    sleep_until(node.is_alive())
    sleep_until(not node.is_alive())
    node.delete_object()
