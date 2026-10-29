# es\venus\shattered_coast\shattered_coast_loot.es
#
# Loot chests around Venus' shattered coast, the academy road and the way to
# the headlands (public bubble 20), loaded with Venus' ambient layer by the
# patrol, the strikes and the story missions.
#
# Each chest shows up on its own 57-90 s after the bubble starts, and is
# cleaned up within a second of being opened. Pooled over every 2.3.1 chest
# bundle on the wire (the Cosmodrome, the Moon, Venus and Mars, captures to
# 2026-10-29): chests out at 57-90 s in every fresh start but one (Mars'
# mesa). Opened chests came back 105 s (Venus' shattered coast), 131 s (the
# north delta), 141 s (the graveyard), 168 s (Mars' transit), 174 s (the
# fallen caldera) and 285 s (the accelerator) after they were cleaned up;
# others were not back 104, 159 and 191 s on. So a chest comes back
# 100-300 s after it was opened.
#
# Here: act_venus_m01_engineering's public host, which the player reached
# 160 s after it started (every chest out, one opened and cleaned up),
# patrol_shat_com01's 2026-10-25 host, joined running (two chests, opened
# before, came back 101-102 s after the player arrived), and two fresh
# starts on the patrol (Patrol Venus#2 and #8: all five out at 61-88 and
# 72-87 s; one opened in #2 and back 105 s after it was cleaned up).

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
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
