# es\moon\moonbase\moonbase_materials.es
#
# Helium coils, the resource nodes around the Moon's moonbase (public bubble
# 6), loaded with the Moon's ambient layer by the patrol, the strikes and
# the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
#
# Here: four starts on the wire. act_moon_m1_launchtubes' public host (107 s
# in the bubble) and act_moon_m5_strength's (34 s) had no coil out; the
# Moon patrol's two (Patrol Luna of 2026-10-28) had all seven out at
# 65-145 s, two and five of them by 107 s. TU0 has four coils where 2.3.1
# has seven.

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
        sleep(mathlib.random_int_inclusive(80, 400))
