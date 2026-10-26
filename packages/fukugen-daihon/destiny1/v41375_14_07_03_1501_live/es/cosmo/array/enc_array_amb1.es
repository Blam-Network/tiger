# es\cosmo\array\enc_array_amb1.es
#
# The Array's ambient layer (public bubble 0): Fallen and Hive around the
# helipad, dome C, the valley and the front door, and an ambush under the
# landing pad. The Last Array's dead Ghosts drop from these Fallen.
#
# Pooled over two captures of the bubble (act_cosmo_m4_dome_c's public
# host, 2026-10-01 and 2026-10-24), both with the same steps:
# - Six of the seven Fallen and Hive encounters are up at the host's first
#   update. The seventh waits for room under the actor budget and goes in
#   about a second after the first wipe (dome C's Hive in one run, the
#   helipad Fallen in the other, each right after the valley Fallen died),
#   so which one waits is picked at random. Costs are the bodies each puts
#   out.
# - A wiped encounter comes back 41 s after its last body died when no
#   player is near it (the valley Fallen twice, the helipad Hive once);
#   one with a player in its volume waits for them to leave.
# - The ambush goes in a second after a player walks under the pad (one
#   run; nobody went there in the other).
# - The basement Hive (amb_smpl_hive_basement02) was never placed in
#   either run, so it is handed to the manager switched off.
# - The patrol beacons are out from the start.
# The strike rows (obj_strike_2, the captain and his dropship) and the
# music never moved and are left alone.

@activity_bundle("enc_array_amb1")

static_array<object, 2> patrol_beacons
encounter_manager encounters
@member_counts({_squad: [{dreg: 2}, {vandal: 2}]})
simple_encounter amb_smpl_fallen_domec01
@member_counts({_squad: [{vandal: 2, 0x50A81B6F: 2}, {dreg: 2}]})
simple_encounter amb_smpl_fallen_helipad01
@member_counts({_squad: [{dreg: 2, vandal: 1}]})
simple_encounter amb_smpl_fallen_valley01
@member_counts({_squad: [{trooper: 3, trooper_boomer: 1, thrall: 2}]})
simple_encounter amb_smpl_hive_frontdoor01
simple_encounter amb_smpl_hive_basement02
@member_counts({_squad: [{trooper: 4, thrall: 2}]})
simple_encounter amb_smpl_hive_helipad01
@member_counts({_squad: [{trooper: 3}]})
simple_encounter amb_smpl_hive_domec01
@member_counts({_squad: [{whoa: 1}]})
ambush_encounter amb_ambush_underpad
wave_encounter amb_wave_hive_basement

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 26
    ambients = [amb_smpl_fallen_domec01, amb_smpl_fallen_helipad01, amb_smpl_fallen_valley01, amb_smpl_hive_frontdoor01, amb_smpl_hive_helipad01, amb_smpl_hive_domec01]
    costs = [4, 6, 3, 6, 6, 3]

    # the manager starts them in order, so the one added last is the one
    # left waiting for room
    i_last = mathlib.random_int_never_highest_value(0, len(ambients))
    for i in range(len(ambients)):
        if i != i_last:
            encounters.add_ambient_encounter(ambients[i], costs[i], 100, 20, 40, 0)
    encounters.add_ambient_encounter(ambients[i_last], costs[i_last], 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_ambush_underpad, 1, 100, 20, 40, 0)

    encounters.add_ambient_encounter(amb_smpl_hive_basement02, 3, 100, 20, 40, 0)
    encounters.suppress_encounter(amb_smpl_hive_basement02, true)

@startup()
# TU0's squads carry no objective of their own, so each takes its
# encounter's objective and the task retail gave it (by influencer) once the
# encounter has placed it.
script sc_fallen_domec01_tasks():
    assign_tasks(amb_smpl_fallen_domec01, ["0x0FE07016", "0x0FE07016"])

@startup()
script sc_fallen_helipad01_tasks():
    assign_tasks(amb_smpl_fallen_helipad01, ["inner", "inner"])

@startup()
script sc_fallen_valley01_tasks():
    assign_tasks(amb_smpl_fallen_valley01, ["inner"])

@startup()
script sc_hive_frontdoor01_tasks():
    assign_tasks(amb_smpl_hive_frontdoor01, ["inner"])

@startup()
script sc_hive_helipad01_tasks():
    assign_tasks(amb_smpl_hive_helipad01, ["0x2914685B"])

@startup()
script sc_hive_domec01_tasks():
    assign_tasks(amb_smpl_hive_domec01, ["outer"])

@startup()
# the ambush's squad is against its objective from the start and takes its
# task as it goes in
script sc_ambush_underpad_tasks():
    amb_ambush_underpad._squad[0].set_objective(amb_ambush_underpad._objective)
    sleep_until(amb_ambush_underpad._squad_group.alive_count() > 0)
    amb_ambush_underpad._squad[0].set_task("task")

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
