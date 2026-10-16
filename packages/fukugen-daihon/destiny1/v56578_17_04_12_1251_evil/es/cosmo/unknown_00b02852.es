# es\cosmo\unknown_00b02852.es
#
# Loot chests around dome A, the Mothyards and the planes, loaded with the
# Cosmodrome's ambient layer (cosmo_portal_1, patrol_deltas_com01,
# act_cosmo_m4_dome_c and the rest). Each chest shows up about a minute after
# the bubble starts and is cleaned up once it has been opened, as the
# Array's chests are.
# From one capture (act_cosmo_m4_dome_c's public host): every chest appeared
# 48 s to 73 s after the first player spawned. None was opened on the wire
# and none came back.

@activity_bundle(0x00B02852)
c_object_sensor_host chest_mc_north
c_object_sensor_host chest_mc_south
c_object_sensor_host chest_dome
c_object_sensor_host chest_plane_sw
c_object_sensor_host chest_plane_nw
c_object_sensor_host chest_plane_se
c_object_sensor_host chest_plane_ne
c_object_sensor_host chest_edges

startup thread sc_chest_mc_north:
    spawn_chest(chest_mc_north)

startup thread sc_chest_mc_south:
    spawn_chest(chest_mc_south)

startup thread sc_chest_dome:
    spawn_chest(chest_dome)

startup thread sc_chest_plane_sw:
    spawn_chest(chest_plane_sw)

startup thread sc_chest_plane_nw:
    spawn_chest(chest_plane_nw)

startup thread sc_chest_plane_se:
    spawn_chest(chest_plane_se)

startup thread sc_chest_plane_ne:
    spawn_chest(chest_plane_ne)

startup thread sc_chest_edges:
    spawn_chest(chest_edges)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(45, 75))
    chest.create()
    sleep_until(chest.is_alive())
    # opened
    sleep_until(not chest.is_alive())
    chest.delete_object()
