# es\venus\vex_complex\complex_materials.es
#
# Spirit blooms, the resource nodes around Venus' vex complex (public bubble
# 4), loaded with Venus' ambient layer by the patrol, the strikes and the
# story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
#
# Here: on the wire for under 60 s at a time (act_venus_m07_northern_tides'
# public hosts), none out yet; the patrol's fresh start (Patrol Venus#5):
# five blooms at 64-152 s, one harvested and not back 257 s on.

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
        sleep(mathlib.random_int_inclusive(80, 400))
