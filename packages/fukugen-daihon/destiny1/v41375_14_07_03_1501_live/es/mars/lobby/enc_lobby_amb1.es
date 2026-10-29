# es\mars\lobby\enc_lobby_amb1.es
#
# The Vex in the lobby (Mars' bubble 12): the Goblins and Hobgoblins at the
# south shelter and the back, the Harpies over the north platforms, and the
# north pit's Hydra with its Harpies and Goblins.
#
# Pooled over two sessions that had the bundle on the wire:
# act_mars_m01_valley's (2026-10-26 23-24-32#1, from its start, never in
# the bubble) and the Mars patrol's (2026-10-29 Patrol Mars#1, the player
# in the bubble 732-872 s):
# - All thirteen squads are placed as the activity loads, the same cells
#   in both, 29 bodies and the Hydra. None came back once wiped (the
#   patrol's shelter Hobgoblins at 739 s, the pit by 808 s, nothing back
#   by 872 s).
# - Tasks are the two lobby objectives', by index (TU0's lists match
#   2.3.1's influencers): the south's for the shelter and the back, the
#   north's for the platforms and the pit.
# Not here: the squads' later task moves in the patrol (the platforms'
#   Harpies through four tasks in 7 s as they flew out of sight, the pit
#   and the back as they thinned). They follow the fight, not a trigger or
#   a count the wire shows, so they are left to the objectives.

@activity_bundle("enc_lobby_amb1")

objective obj_lobby_amb1_s
objective obj_lobby_amb1_n
@member_counts({goblin: 3})
squad sq_s_shelter_support1
@member_counts({goblin: 3})
squad sq_s_shelter_support2
@member_counts({hobgoblin: 2})
squad sq_s_shelter_support3
@member_counts({goblin: 3})
squad sq_s_back_support1
@member_counts({hobgoblin: 2})
squad sq_s_back_support2
@member_counts({harpy: 2})
squad sq_n_plat_support1
@member_counts({harpy: 2})
squad sq_n_plat_support2
@member_counts({harpy: 2})
squad sq_n_plat_support3
squad sq_n_pit_anchor1
squad_member sq_n_pit_anchor1__hydra
@member_counts({harpy: 2})
squad sq_n_pit_support1
@member_counts({harpy: 2})
squad sq_n_pit_support2
@member_counts({goblin: 3})
squad sq_n_pit_support3
@member_counts({goblin: 3})
squad sq_n_pit_support4

@startup()
script sc_main_thread():
    place_on_task(sq_s_shelter_support1, obj_lobby_amb1_s, "0xE882D46D")
    place_on_task(sq_s_shelter_support2, obj_lobby_amb1_s, "0xBF5A6431")
    place_on_task(sq_s_shelter_support3, obj_lobby_amb1_s, "0xEBD0DBCD")
    place_on_task(sq_s_back_support1, obj_lobby_amb1_s, "0x4C304CF0")
    place_on_task(sq_s_back_support2, obj_lobby_amb1_s, "0x4C304CF0")
    for sq in [sq_n_plat_support1, sq_n_plat_support2, sq_n_plat_support3]:
        place_on_task(sq, obj_lobby_amb1_n, "0x9BF8DE53")
    place_on_task(sq_n_pit_anchor1, obj_lobby_amb1_n, "0x419EBD97")
    place_on_task(sq_n_pit_support1, obj_lobby_amb1_n, "0x2A9B8AE0")
    place_on_task(sq_n_pit_support2, obj_lobby_amb1_n, "0x639ADCFA")
    place_on_task(sq_n_pit_support3, obj_lobby_amb1_n, "0xC084B8FD")
    place_on_task(sq_n_pit_support4, obj_lobby_amb1_n, "0xB24C2D57")

def place_on_task(sq, obj, task):
    sq.set_objective(obj)
    sq.set_task(task)
    sq.place()
