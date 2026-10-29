# es\moon\accelerator\accelerator_materials.es
#
# Helium coils, the resource nodes around the Moon's accelerator (public
# bubble 1), loaded with the Moon's ambient layer by the patrol, the strikes
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
# Here: four fresh starts, all seven 2.3.1 coils out at 83-178 s in the
# three that stayed past 115 s, none in the one that left at 62 s. In the
# patrol's long stay four coils were harvested at 544-622 s and none was
# back by the end, 70-148 s on. TU0 has three coils where 2.3.1 has seven.

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
        sleep(mathlib.random_int_inclusive(80, 400))
