# es\cosmo\array\array_materials.es
#
# Thorium, the Array's resource nodes (public bubble 0), loaded with the
# Cosmodrome's ambient layer by the patrol, the strikes and the story
# missions.
#
# Each node shows up on its own 55-178 s after the bubble starts, and is
# cleaned up within a second of being harvested. Pooled over every 2.3.1
# materials bundle on the wire (the Cosmodrome, the Moon, Venus and Mars,
# captures to 2026-10-29): nodes out at 55-178 s in every fresh start.
# Harvested nodes came back 86 s (the graveyard), 158, 187 and 296 s (the
# fallen caldera) after their harvest; others were not back 118-281 s on.
# So a node comes back after a wide random wait around those, 80-400 s.
# Here: two fresh starts (act_cosmo_m4_dome_c's public host), nodes out
# at 64-139 s, the rest not yet out when the player left (90 s and 153 s);
# none harvested. TU0 has one node per traffic level where 2.3.1 has six
# named by place.
# The patrol's fresh start (2026-10-29 Patrol Earth#5) had one out at
# 71 s when the player left at 77 s.

@activity_bundle("array_materials")

object thorium_low_traffic
object thorium_med_traffic
object thorium_hi_traffic

@startup()
script sc_thorium_low_traffic():
    spawn_node(thorium_low_traffic)

@startup()
script sc_thorium_med_traffic():
    spawn_node(thorium_med_traffic)

@startup()
script sc_thorium_hi_traffic():
    spawn_node(thorium_hi_traffic)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(80, 400))
