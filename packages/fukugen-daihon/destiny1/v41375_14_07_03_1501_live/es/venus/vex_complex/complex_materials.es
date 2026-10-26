# es\venus\vex_complex\complex_materials.es
#
# Spirit blooms, the resource nodes around Venus' vex complex (public bubble
# 4), loaded with Venus' ambient layer by the patrol, the strikes and the
# story missions.
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
# Here: on the wire for under 60 s at a time (act_venus_m07_northern_tides'
# public hosts), none out yet, as the window has it; the timing is the other
# blooms'.

@activity_bundle("complex_materials")

object bloom_road
object bloom_dead_side
object bloom_green_side
object bloom_top

@startup()
script sc_bloom_road():
    spawn_node(bloom_road)

@startup()
script sc_bloom_dead_side():
    spawn_node(bloom_dead_side)

@startup()
script sc_bloom_green_side():
    spawn_node(bloom_green_side)

@startup()
script sc_bloom_top():
    spawn_node(bloom_top)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(200, 400))
