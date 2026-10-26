# es\moon\moonbase\moonbase_materials.es
#
# Helium coils, the resource nodes around the Moon's moonbase (public bubble
# 6), loaded with the Moon's ambient layer by the patrol, the strikes and
# the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire: 48 Cosmodrome nodes in ten fresh starts, 12
# Moon coils in two (73-177 s) and 6 Venus blooms in two (80-175 s), all in
# that window. A harvested node comes back: one hellmouth coil, harvested
# before the capture joined its bubble, was back 25 s after the player
# arrived. No node was back within 193 s of its harvest (the Cosmodrome's
# south delta) or 118 s (a shattered coast bloom), so the wait is a guess
# above those.
#
# Here: two starts on the wire (act_moon_m1_launchtubes' public host, 107 s
# in the bubble, and act_moon_m5_strength's, 34 s), no coil out in either.
# None out by 107 s is the late end of the window for all seven 2.3.1 coils,
# so the timing is the other Moon coils'.

@activity_bundle("moonbase_materials")

object coils_tower
object coils_lz
object coils_trans
object coils_center

@startup()
script sc_coils_tower():
    spawn_node(coils_tower)

@startup()
script sc_coils_lz():
    spawn_node(coils_lz)

@startup()
script sc_coils_trans():
    spawn_node(coils_trans)

@startup()
script sc_coils_center():
    spawn_node(coils_center)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(200, 400))
