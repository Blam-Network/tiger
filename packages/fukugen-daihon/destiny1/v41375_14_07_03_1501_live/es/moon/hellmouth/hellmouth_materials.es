# es\moon\hellmouth\hellmouth_materials.es
#
# Helium coils, the resource nodes around the Moon's hellmouth (public
# bubble 2), loaded with the Moon's ambient layer by the patrol, the strikes
# and the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
#
# Here: four fresh starts (act_moon_m5_strength's public host and three of
# the Moon patrol's), the six 2.3.1 coils out at 69-177 s (one run's player
# left at 78 s with two out), and the joined-running host with the coil
# that came back. TU0 has three coils where 2.3.1 has six.

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
        sleep(mathlib.random_int_inclusive(80, 400))
