# es\moon\selection\enc_selection_m7.es
#
# Selection in Now Come Salvation: the way down through the twist, the cave,
# the hall and the deck to the arena. Every squad but the witches is
# against Selection's objective as the bubble comes in (the witches take it
# as they come up), and the Ghost's first kill line plays two seconds later. Each stretch comes on as a player reaches its trigger,
# its squads on their tasks in the frame after it; the cave brings the
# second kill line and the deck the ogre's announce. At the arena the four
# witches come up casting (the oversoul's hop-on on their filter) and the
# Ghost names them eight seconds later; a witch drops out of the cast as she
# dies, and when all four are dead mission 5's objective clears.
#
# From one retail 2.3.1 capture (2026-10-27 18-32-12, unconfirmed). 2.3.1's
# twist knight (a) is TU0's one sq_twist_knight. The witches line is TU0's
# and has no 2.3.1 row: it takes the place of 2.3.1's boss line (8.2 s
# after the witches). 2.3.1 adds a second twist wave, the vestiges, Crota's
# thrall spawns, per-witch cast filters, the arena knights and the
# Oversoul; TU0's arena b and c squads, the crystal shell and the troopers
# did nothing a TU0 row shows, so they are left out. Most task names are
# uncracked.

@activity_bundle("enc_selection_m7")

objective obj_selection_m7
squad sq_twist_trooper_a
squad sq_twist_trooper_b
squad sq_twist_trooper_c
squad sq_twist_trooper_d
squad sq_twist_knight
squad sq_cave_trooper_a
squad sq_cave_trooper_b
squad sq_cave_trooper_c
squad sq_cave_thrall_a
squad sq_cave_thrall_b
squad sq_cave_thrall_c
squad sq_hall_trooper_a
squad sq_hall_trooper_b
squad sq_hall_knight
squad sq_hall_knight_cleaver
squad sq_deck_ogre
squad sq_deck_thrall_a
squad sq_deck_thrall_b
squad sq_arena_a_wizard_a
squad_member sq_arena_a_wizard_a__major_wizard
squad sq_arena_a_wizard_b
squad_member sq_arena_a_wizard_b__major_wizard
squad sq_arena_a_wizard_c
squad_member sq_arena_a_wizard_c__major_wizard
squad sq_arena_a_wizard_d
squad_member sq_arena_a_wizard_d__major_wizard
encounter_handle sp_specops_oversoul
sequence seq_ogre_announce
sequence seq_dialog_selection_kill_progress_a
sequence seq_dialog_selection_kill_progress_b
sequence seq_dialog_selection_witches
player_trigger pt_twist
player_trigger pt_cave
player_trigger pt_hall
player_trigger pt_deck
player_trigger pt_arena
bool witches_dead = false

@startup()
script sc_selection_main():
    for sq in [sq_twist_trooper_a, sq_twist_trooper_b, sq_twist_trooper_c, sq_twist_trooper_d, sq_twist_knight, sq_cave_trooper_a, sq_cave_trooper_b, sq_cave_trooper_c, sq_cave_thrall_a, sq_cave_thrall_b, sq_cave_thrall_c]:
        sq.set_objective(obj_selection_m7)
    for sq in [sq_hall_trooper_a, sq_hall_trooper_b, sq_hall_knight, sq_hall_knight_cleaver, sq_deck_ogre, sq_deck_thrall_a, sq_deck_thrall_b]:
        sq.set_objective(obj_selection_m7)
    sleep(2)
    seq_dialog_selection_kill_progress_a.start()

@startup()
script sc_twist():
    sleep_until(pt_twist.is_triggered())
    for sq in [sq_twist_trooper_a, sq_twist_trooper_b, sq_twist_trooper_c, sq_twist_trooper_d]:
        place_on_task(sq, "0xC9AA5A51")
    place_on_task(sq_twist_knight, "0x1412A556")

@startup()
script sc_cave():
    sleep_until(pt_cave.is_triggered())
    for sq in [sq_cave_trooper_a, sq_cave_trooper_b, sq_cave_trooper_c]:
        place_on_task(sq, "0x1E5AE7C5")
    for sq in [sq_cave_thrall_a, sq_cave_thrall_b, sq_cave_thrall_c]:
        place_on_task(sq, "0x7DE86FBA")
    seq_dialog_selection_kill_progress_b.start()

@startup()
script sc_hall():
    sleep_until(pt_hall.is_triggered())
    place_on_task(sq_hall_trooper_a, "0xA3B5C3D7")
    place_on_task(sq_hall_trooper_b, "0xA3B5C3D7")
    place_on_task(sq_hall_knight, "0xAA91B2B0")
    place_on_task(sq_hall_knight_cleaver, "0x503C94C3")

@startup()
script sc_deck():
    sleep_until(pt_deck.is_triggered())
    place_on_task(sq_deck_ogre, "0x768A7A88")
    place_on_task(sq_deck_thrall_a, "0xCE73ECC2")
    place_on_task(sq_deck_thrall_b, "0xCE73ECC2")
    seq_ogre_announce.start()

@startup()
# the witches: up casting at the arena, out of the cast as each one dies
script sc_witches():
    sleep_until(pt_arena.is_triggered())
    cast = sp_specops_oversoul.ofi_selection_wizard_cast
    for sq in [sq_arena_a_wizard_a, sq_arena_a_wizard_b, sq_arena_a_wizard_c, sq_arena_a_wizard_d]:
        sq.set_objective(obj_selection_m7)
        sq.place()
        cast.add(sq)
    sp_specops_oversoul.ho_selection_wizard_cast.set_filter(cast)
    sc_witch_deaths.wake()
    sleep(8)
    seq_dialog_selection_witches.start()

script sc_witch_deaths():
    witches = [sq_arena_a_wizard_a__major_wizard, sq_arena_a_wizard_b__major_wizard, sq_arena_a_wizard_c__major_wizard, sq_arena_a_wizard_d__major_wizard]
    sleep_until(witches_alive(witches) == 4)
    casting = [true, true, true, true]
    while witches_alive(witches) > 0:
        for i, witch in witches:
            if casting[i] and not witch.is_bound():
                casting[i] = false
                sp_specops_oversoul.ofi_selection_wizard_cast.remove(witch)
        sleep(1)
    witches_dead = true

def witches_alive(witches):
    alive = 0
    for witch in witches:
        if witch.is_bound():
            alive = alive + 1
    return alive

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
