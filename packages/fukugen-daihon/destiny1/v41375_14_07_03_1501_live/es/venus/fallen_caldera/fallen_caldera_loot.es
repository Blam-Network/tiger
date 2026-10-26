# es\venus\fallen_caldera\fallen_caldera_loot.es
#
# Loot chests around Venus' fallen caldera, the thieves' den and the sulfur
# fields (public bubble 9), loaded with Venus' ambient layer by the patrol,
# the strikes and the story missions.
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
# Here: on the wire for 29 s once (act_venus_m07_northern_tides' public
# host), none out yet, as the window has it; the timing is the other
# chests'.

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
    sleep(mathlib.random_int_inclusive(57, 88))
    while true:
        chest.create()
        sleep_until(chest.is_alive())
        # opened
        sleep_until(not chest.is_alive())
        chest.delete_object()
        sleep(mathlib.random_int_inclusive(140, 300))
