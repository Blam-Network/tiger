# es\venus\shattered_coast\shattered_coast_loot.es
#
# Loot chests around Venus' shattered coast, the academy road and the way to
# the headlands (public bubble 20), loaded with Venus' ambient layer by the
# patrol, the strikes and the story missions.
#
# Each chest shows up on its own 57-88 s after the bubble starts, and is
# cleaned up within a second of being opened. Pooled over every 2.3.1 chest
# bundle on the wire (the Cosmodrome's, the Moon's moonbase, hellmouth and
# accelerator, Venus' shattered coast, headlands and vex complex): 100
# chests in seventeen fresh starts, all in that window. One opened chest
# came back 141 s after it was cleaned up (the Cosmodrome's graveyard),
# another was not back 191 s on (the south delta), so the wait before a
# chest comes back is a guess around the one return seen.
#
# Here: act_venus_m01_engineering's public host, which the player reached
# 160 s after it started (every chest out, one opened and cleaned up), and
# patrol_shat_com01's, joined running (two chests, opened before, came back
# 101-102 s after the player arrived).

@activity_bundle("shattered_coast_loot")

object chest_mc_babyshat
object chest_mc_headlands
object chest_academy_babyshat
object chest_academy_middle
object chest_academy_headlands

@startup()
script sc_chest_mc_babyshat():
    spawn_chest(chest_mc_babyshat)

@startup()
script sc_chest_mc_headlands():
    spawn_chest(chest_mc_headlands)

@startup()
script sc_chest_academy_babyshat():
    spawn_chest(chest_academy_babyshat)

@startup()
script sc_chest_academy_middle():
    spawn_chest(chest_academy_middle)

@startup()
script sc_chest_academy_headlands():
    spawn_chest(chest_academy_headlands)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
