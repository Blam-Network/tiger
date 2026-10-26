# es\moon\accelerator\accelerator_materials.es
#
# Helium coils, the resource nodes around the Moon's accelerator (public
# bubble 1), loaded with the Moon's ambient layer by the patrol, the strikes
# and the story missions.
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
# Here: two fresh starts, six of the seven 2.3.1 coils out at 83-109 s in
# the one that stayed 115 s, none in the one that left at 62 s. TU0 has
# three coils where 2.3.1 has seven.

@activity_bundle("accelerator_materials")

object coils_driver
object coils_moonbase
object coils_accel

@startup()
script sc_coils_driver():
    spawn_node(coils_driver)

@startup()
script sc_coils_moonbase():
    spawn_node(coils_moonbase)

@startup()
script sc_coils_accel():
    spawn_node(coils_accel)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(200, 400))
