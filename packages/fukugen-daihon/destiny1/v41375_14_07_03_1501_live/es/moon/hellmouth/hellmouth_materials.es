# es\moon\hellmouth\hellmouth_materials.es
#
# Helium coils, the resource nodes around the Moon's hellmouth (public
# bubble 2), loaded with the Moon's ambient layer by the patrol, the strikes
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
# Here: one fresh start (act_moon_m5_strength's public host), the six 2.3.1
# coils out at 73-177 s, and the joined-running host with the coil that came
# back. TU0 has three coils where 2.3.1 has six.

@activity_bundle("hellmouth_materials")

object coils_passage
object coils_middle
object coils_outpost

@startup()
script sc_coils_passage():
    spawn_node(coils_passage)

@startup()
script sc_coils_middle():
    spawn_node(coils_middle)

@startup()
script sc_coils_outpost():
    spawn_node(coils_outpost)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(200, 400))
