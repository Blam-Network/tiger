# es\cosmo\unknown_bdf9e3c6.es
#
# Thorium, the resource nodes around dome A, the road and the planes,
# loaded with the Cosmodrome's ambient layer (cosmo_portal_1,
# patrol_deltas_com01, act_cosmo_m4_dome_c and the rest). TU0 has four nodes
# where 2.3.1 has seven named by place.
# From one capture (act_cosmo_m4_dome_c's public host): nodes appeared one by
# one 46 s to 143 s after the first player spawned. None was harvested on the
# wire; a harvested node is cleaned up as the chests are.

@activity_bundle(0xBDF9E3C6)
c_object_sensor_host thorium_south_planes
c_object_sensor_host thorium_north_planes
c_object_sensor_host thorium_dome
c_object_sensor_host thorium_road

startup thread sc_thorium_south_planes:
    spawn_node(thorium_south_planes)

startup thread sc_thorium_north_planes:
    spawn_node(thorium_north_planes)

startup thread sc_thorium_dome:
    spawn_node(thorium_dome)

startup thread sc_thorium_road:
    spawn_node(thorium_road)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(45, 145))
    node.create()
    sleep_until(node.is_alive())
    sleep_until(not node.is_alive())
    node.delete_object()
