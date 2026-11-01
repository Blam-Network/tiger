# es\mars\downtown\enc_downtown_amb1.es
#
# Downtown's ambient layer (Mars' public bubble 6): the patrol beacons, the
# candy, mission 3's button, and the Cabal in and around the dome: the
# bunker, the dome's decks, the roof, the tower, the skybridge, the pit,
# the path, the crossroad, the overlook and the perch.
#
# From two fresh starts: the patrol's downtown host (Patrol Mars#3, chests
# out 62-87 s, the player in the bubble for 201 s) and
# act_mars_m03_penthouse's (2026-11-01 00-52-56#3, chests out 71-85 s, in
# the bubble for 218 s). Two runs, so nothing here is confirmed:
# - Up at load in both: deck_b, the path, the pit, the roof, the skybridge
#   and the tower's anchor and support, with the bunker's troops (on the
#   ground, no ship) in the patrol's and deck_a in m03's, never both: one
#   of the two goes in at random and the other is kept apart. 21 and 20
#   bodies; 21 is the budget. In m03's the bunker's ship came in 27 s after
#   deck_a was wiped. TU0's dropship_encounter always flies in, so the
#   bunker comes by ship from the start.
# - Every later placement fits the budget: the overlook (106 and 146 s), the
#   perch (149 and 46 s) and the crossroad (110 s, m03's only), each when
#   the bodies up dropped far enough for it. The host caps a first wait at
#   30 s. The costs are the bodies the server placed.
# - A wiped encounter came back 20.5-21.6 s after its wipe when nothing held
#   it (the tower support three times, the pit), the cooldown; the roof,
#   the tower anchor and the skybridge took 39-68 s, out of sight of the
#   player.
# Left out: the music, the second story wave (its timer ran, but which
# squads are its waves is not on the wire), the bunker's troops leaving
# their objective at 143 s (the patrol's), the m03 button's use in m03's
# host (the mission's), and the task changes the task tree made itself.

@activity_bundle("enc_downtown_amb1")

static_array<object, 2> patrol_beacons
static_array<object, 10> candy_dynamic_objects
countdown_placement pf_placement_m03_button
encounter_manager encounters
@member_counts({_squad: [{0x072E6533: 2, centurion: 1}]})
dropship_encounter pf_encounter_dropship_bunker
simple_encounter pf_encounter_simple_deck_a
@member_counts({_squad: [{psions: 2, centurion_1: 1}]})
simple_encounter pf_encounter_simple_deck_b
@member_counts({_squad: [{0xAEFC66E7: 2}]})
simple_encounter pf_encounter_simple_path
@member_counts({_squad: [{0xAEFC66E4: 2}]})
simple_encounter pf_encounter_simple_pit
@member_counts({_squad: [{legionary: 2}, {0xAEFC66E7: 1}]})
simple_encounter pf_encounter_simple_roof
@member_counts({_squad: [{phalanx: 2}, {0x769468BB: 1, 0x7174A339: 1}]})
simple_encounter pf_encounter_simple_skybridge
@member_counts({_squad: [{legionary: 2}]})
simple_encounter pf_encounter_simple_tower_anchor
@member_counts({_squad: [{phalanx: 2}]})
simple_encounter pf_encounter_simple_tower_support
@member_counts({_squad: [{centurion: 1, legionary: 1}]})
simple_encounter pf_encounter_simple_overlook
@member_counts({_squad: [{legionary: 2}, {centurion: 1}]})
simple_encounter pf_encounter_simple_crossroad
@member_counts({_squad: [{legionary: 2, phalanx: 1}]})
simple_encounter pf_encounter_simple_perch

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()
    for candy in candy_dynamic_objects:
        candy.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 21
    # the bunker or deck_a, never both: one of the two at random goes in with
    # the load
    encounters.add_exclusion(pf_encounter_dropship_bunker, pf_encounter_simple_deck_a)
    if mathlib.random_int_never_highest_value(0, 2) == 0:
        encounters.add_ambient_encounter(pf_encounter_dropship_bunker, 3, 100, 20, 20, 0)
        encounters.add_ambient_encounter(pf_encounter_simple_deck_a, 2, 100, 20, 20, 0)
    else:
        encounters.add_ambient_encounter(pf_encounter_simple_deck_a, 2, 100, 20, 20, 0)
        encounters.add_ambient_encounter(pf_encounter_dropship_bunker, 3, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_encounter_simple_deck_b, 3, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_encounter_simple_path, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_encounter_simple_pit, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_encounter_simple_roof, 3, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_encounter_simple_skybridge, 4, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_encounter_simple_tower_anchor, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_encounter_simple_tower_support, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_encounter_simple_overlook, 2, 100, 20, 20, 30)
    encounters.add_ambient_encounter(pf_encounter_simple_perch, 3, 100, 20, 20, 30)
    encounters.add_ambient_encounter(pf_encounter_simple_crossroad, 3, 100, 20, 20, 30)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them (by influencer).
script sc_bunker_tasks():
    assign_tasks(pf_encounter_dropship_bunker, ["0x3643E51B"])

@startup()
script sc_deck_a_tasks():
    assign_tasks(pf_encounter_simple_deck_a, ["task"])

@startup()
script sc_deck_b_tasks():
    assign_tasks(pf_encounter_simple_deck_b, ["0xBE170165"])

@startup()
script sc_path_tasks():
    assign_tasks(pf_encounter_simple_path, ["0x90DC8CBE"])

@startup()
script sc_pit_tasks():
    assign_tasks(pf_encounter_simple_pit, ["0x98107346"])

@startup()
script sc_roof_tasks():
    assign_tasks(pf_encounter_simple_roof, ["roof", "roof"])

@startup()
script sc_skybridge_tasks():
    assign_tasks(pf_encounter_simple_skybridge, ["0xECC08133", "0x92F2F49E"])

@startup()
script sc_tower_anchor_tasks():
    assign_tasks(pf_encounter_simple_tower_anchor, ["tower_anchor"])

@startup()
script sc_tower_support_tasks():
    assign_tasks(pf_encounter_simple_tower_support, ["0x55C14C94"])

@startup()
script sc_overlook_tasks():
    assign_tasks(pf_encounter_simple_overlook, ["0x63C285F2"])

@startup()
script sc_perch_tasks():
    assign_tasks(pf_encounter_simple_perch, ["0x42E960E9"])

@startup()
script sc_crossroad_tasks():
    assign_tasks(pf_encounter_simple_crossroad, ["0x5FBD3431", "0x5FBD3431"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
