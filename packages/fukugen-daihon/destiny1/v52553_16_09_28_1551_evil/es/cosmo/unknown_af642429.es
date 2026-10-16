# es\cosmo\unknown_af642429.es
#
# Loot chests around the Array, loaded with the Cosmodrome's ambient layer
# (cosmo_portal_1, patrol_deltas_com01, act_cosmo_m4_dome_c and the rest).
# Each chest shows up a minute or so after the bubble starts, one at a time,
# and is cleaned up once it has been opened.
# From one capture (act_cosmo_m4_dome_c's public host): every chest appeared
# between 63s and 76s, and the one opened was deleted a second later. No chest
# came back before the session ended, so there is no respawn here.

@activity_bundle(0xAF642429)
c_object_sensor_host chest_mc_helipad
c_object_sensor_host chest_mc_hivedome
c_object_sensor_host chest_dome_c_high
c_object_sensor_host chest_dome_c_low
c_object_sensor_host chest_underpad
c_object_sensor_host chest_edges_a
c_object_sensor_host chest_edges_c

startup thread sc_chest_mc_helipad:
    spawn_chest(chest_mc_helipad)

startup thread sc_chest_mc_hivedome:
    spawn_chest(chest_mc_hivedome)

startup thread sc_chest_dome_c_high:
    spawn_chest(chest_dome_c_high)

startup thread sc_chest_dome_c_low:
    spawn_chest(chest_dome_c_low)

startup thread sc_chest_underpad:
    spawn_chest(chest_underpad)

startup thread sc_chest_edges_a:
    spawn_chest(chest_edges_a)

startup thread sc_chest_edges_c:
    spawn_chest(chest_edges_c)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(60, 80))
    chest.create()
    sleep_until(chest.is_alive())
    # opened
    sleep_until(not chest.is_alive())
    chest.delete_object()
