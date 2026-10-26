# es\venus\shattered_coast\shattered_coast_materials.es
#
# Spirit blooms, the resource nodes around Venus' shattered coast (public
# bubble 20), loaded with Venus' ambient layer by the patrol, the strikes
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
# Here: act_venus_m01_engineering's public host, reached 160 s in: two
# blooms already out, four more at 162-175 s; patrol_shat_com01's, joined
# running, one bloom harvested and not back 118 s on.

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
        sleep(mathlib.random_int_inclusive(200, 400))
