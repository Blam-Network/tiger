# es\venus\fallen_caldera\fallen_caldera_loot.es
#
# Loot chests around Venus' fallen caldera, the thieves' den and the sulfur
# fields (public bubble 9), loaded with Venus' ambient layer by the patrol,
# the strikes and the story missions.
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
# Here: on the wire for 29 s once (act_venus_m07_northern_tides' public
# host), none out yet; then a fresh start on the patrol (Patrol Venus#4,
# 744 s): all six out at 61-85 s, the thieves' chest opened and back 174 s
# after it was cleaned up.

@activity_bundle("fallen_caldera_loot")

object chest_mc_complex
object chest_mc_thieves_left
object chest_mc_thieves_right
object chest_mc_sulfur
object chest_theives
object chest_caldera

@startup()
script sc_chest_mc_complex():
    spawn_chest(chest_mc_complex)

@startup()
script sc_chest_mc_thieves_left():
    spawn_chest(chest_mc_thieves_left)

@startup()
script sc_chest_mc_thieves_right():
    spawn_chest(chest_mc_thieves_right)

@startup()
script sc_chest_mc_sulfur():
    spawn_chest(chest_mc_sulfur)

@startup()
script sc_chest_theives():
    spawn_chest(chest_theives)

@startup()
script sc_chest_caldera():
    spawn_chest(chest_caldera)

def spawn_chest(chest):
    sleep(mathlib.random_int_inclusive(57, 90))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(100, 300))
