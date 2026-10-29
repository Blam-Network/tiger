# es\cosmo\dry_sea\dry_sea_materials.es
#
# Thorium, the resource nodes around Rasputin's island, the wrecks and the
# road of the dry sea (public bubble 11), loaded with the Cosmodrome's
# ambient layer by the patrol, the strikes and the story missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
# Here: one fresh start (act_cosmo_m2_dome_c's public host), its seven
# nodes out at 60-163 s, none harvested. TU0 has three nodes where 2.3.1
# has seven named by place.
# act_cosmo_m2_dome_c's host, joined running by the patrol (2026-10-29
# Patrol Earth#22): two nodes first came out 29 s and 68 s after the join,
# two were harvested, and the one seen for long was not back 184 s on.

@activity_bundle("dry_sea_materials")

object thorium_rasputin
object thorium_wrecks
object thorium_road

@startup()
script sc_thorium_rasputin():
    spawn_node(thorium_rasputin)

@startup()
script sc_thorium_wrecks():
    spawn_node(thorium_wrecks)

@startup()
script sc_thorium_road():
    spawn_node(thorium_road)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(80, 400))
