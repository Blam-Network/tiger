# es\mars\downtown\enc_downtown_amb1.es
#
# Downtown's ambient layer (Mars' public bubble 6): the patrol beacons, the
# candy, mission 3's button, and the Cabal in and around the dome: the
# bunker, the dome's decks, the roof, the tower, the skybridge, the pit,
# the path, the overlook and the perch.
#
# From one fresh start, the patrol's downtown host (Patrol Mars#3, chests
# out 62-87 s, the player in the bubble for 201 s), so every rule here is a
# single run's:
# - Up at load: the bunker's troops (on the ground, no ship), deck_b, the
#   path, the pit, the roof, the skybridge and the tower's anchor and
#   support, 21 bodies, the budget. Every later placement fits it: the
#   overlook went in at 106 s and the perch at 149 s, each when the bodies
#   up dropped far enough for it. The costs are the bodies the server
#   placed. TU0's dropship_encounter always flies in, so the bunker comes by
#   ship from the start.
# - A wiped encounter came back 20.5-21.6 s after its wipe when nothing held
#   it (the tower support twice, the pit), the cooldown; the roof, the tower
#   anchor and the skybridge took 39-68 s, out of sight of the player.
# - deck_a and the crossroad never went in. The overlook and the perch did,
#   but only after 100 s; the host caps a first wait at 30 s.
# Left out: the music, the second story wave (its timer ran, but which
# squads are its waves is not on the wire), the bunker's troops leaving
# their objective at 143 s, and the task changes the task tree made itself.

@activity_bundle("enc_downtown_amb1")

static_array<object, 2> patrol_beacons
static_array<object, 10> candy_dynamic_objects
countdown_placement pf_placement_m03_button
encounter_manager encounters
@member_counts({_squad: [{0x072E6533: 2, centurion: 1}]})
dropship_encounter pf_encounter_dropship_bunker
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

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them (by influencer).
script sc_bunker_tasks():
    assign_tasks(pf_encounter_dropship_bunker, ["0x3643E51B"])

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

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
