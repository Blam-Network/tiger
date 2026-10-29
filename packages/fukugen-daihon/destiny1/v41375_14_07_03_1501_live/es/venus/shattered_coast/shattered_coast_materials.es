# es\venus\shattered_coast\shattered_coast_materials.es
#
# Spirit blooms, the resource nodes around Venus' shattered coast (public
# bubble 20), loaded with Venus' ambient layer by the patrol, the strikes
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
# Here: act_venus_m01_engineering's public host, reached 160 s in: two
# blooms already out, four more at 162-175 s; patrol_shat_com01's 2026-10-25
# host, joined running, one bloom harvested and not back 118 s on; the
# patrol's two fresh starts (Patrol Venus#2 and #8): six at 59-150 s, and
# four by 125 s.

@activity_bundle("shattered_coast_materials")

object bloom_babyshat
object bloom_academy
object bloom_headlands
object bloom_road

@startup()
script sc_bloom_babyshat():
    spawn_node(bloom_babyshat)

@startup()
script sc_bloom_academy():
    spawn_node(bloom_academy)

@startup()
script sc_bloom_headlands():
    spawn_node(bloom_headlands)

@startup()
script sc_bloom_road():
    spawn_node(bloom_road)

def spawn_node(node):
    sleep(mathlib.random_int_inclusive(55, 178))
    while true:
        node.create()
        sleep_until(node.is_alive())
        # harvested
        sleep_until(not node.is_alive())
        node.delete_object()
        sleep(mathlib.random_int_inclusive(80, 400))
