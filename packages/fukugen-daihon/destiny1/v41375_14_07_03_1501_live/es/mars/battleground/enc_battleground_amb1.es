# es\mars\battleground\enc_battleground_amb1.es
#
# The battleground's ambient layer (Mars' public bubble 1, between the
# Cabal trenches and the Vex gate): the patrol beacons, the dynamic cans,
# the Vex network block, and the Cabal and Vex around the trenches, the
# command posts, the gate and the dunes, the Vex pressure clouds brought in
# by gate cloud and the dunes and command post Cabal by dropship. Loaded by
# the patrol, the strikes and the story missions.
#
# Pooled over six fresh starts, the patrol's public hosts (Patrol Mars#8,
# 375 s, and #14, 450 s; chests out 58-89 s) and the story missions' of
# 2026-11-01 (act_mars_m01_valley's 00-12-41#2, 103 s;
# act_mars_m05_warbase's 00-28-50#3, 165 s, chests out 62-81 s;
# act_mars_m06_subway's 01-07-32#3, 112 s, chests 60-88 s;
# act_mars_m07_lowergarden's 01-41-19#3, 46 s), and the 2026-10-26
# missions' short hosts (47-72 s):
# - Exactly one of the three pressure clouds came in with the load, its
#   cloud in 7-9 s (all ten sessions).
# - The rest of what was up at load differed every time: one trench or
#   both, the trench middle once, one to three command posts, the gate
#   bridge or not, the dunes Cabal and the dunes Vex on the ground or not.
#   It came to 14-18 bodies besides the cloud and stopped short of the next
#   encounter that would have taken it past 18; m07's host stopped at 14
#   with three-body encounters left out, so the draw stops at the first
#   that does not fit rather than skipping it. So the encounters go in in
#   a random order up to 18 bodies and the others wait out the first
#   placement: they came in 24-33 s after the load (the dunes ships by
#   air), or later when there was room. Both patrol hosts peaked at 27
#   bodies up at once: the budget.
# - Wiped encounters came back 11.7-30 s later when there was room (command
#   post B 11.7 s after its wipe on m05's host, the command post and the
#   gate bridge 20-30 s on the patrol's; a trench after 43 s, the ships
#   after 37-73 s): the cooldown is the shortest return.
# - The low gate squad went in each time a player came to the gate (#8 at
#   56 s, #14 at 71 s, m05's 2026-10-26 host at 42 s, its 2026-11-01 host
#   at 28 s), 0.6 s after the bridge squad fell back to its second task:
#   an ambush on its volume.
# - The costs are the bodies the server placed (the squads' cell counts):
#   the trench middle (m07's host, two and two at load) and cloud D (m06's,
#   its cloud in at 29 s with three Goblins and a Minotaur) went in once
#   each.
# - The tasks are the ones retail gave each squad at its placement, by
#   influencer; the squads' later moves are the task tree's own.
# Left out: the gate wave (pf_wave_gate, whose respawn timer ran from the
# load, or from 25 s in, and stopped 14-54 s later with nothing placed), the
# music, which never played, act_mars_m06_subway's pocket monitors, and the
# bridge squad back 3.2 s after it was wiped at the gate on m06's host
# (single run, the low gate squad did not go in there). m06's console
# placement is out in every session, mission or not, so it is here.

@activity_bundle("enc_battleground_amb1")

static_array<object, 3> patrol_beacons
static_array<object, 10> can_dynamics
object o_vex_block_network_a
object o_m06_norender_scan
countdown_placement pf_placement_m06_interact bind("0x1A58A3CD")
encounter_manager encounters
simple_encounter pf_simple_trenchleft1
simple_encounter pf_simple_trenchright1
dropship_encounter pf_dropship_trenchmid
@member_counts({_squad: [{legionary: 2}]})
simple_encounter pf_simple_gate_bridge
ambush_encounter pf_simple_gate_low
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 2}]})
simple_encounter pf_simple_cmd_b
@member_counts({_squad: [{cell: 2, anchor: 1}]})
dropship_encounter pf_dropship_cmd_a
@member_counts({_squad: [{cell: 2, anchor: 1}]})
dropship_encounter pf_dropship_cmd_c
@member_counts({_squad: [{goblin: 3}]})
dropship_encounter pf_cloud_pressure_a
@member_counts({_squad: [{goblin: 3}]})
dropship_encounter pf_cloud_pressure_b
@member_counts({_squad: [{goblins: 3}]})
dropship_encounter pf_cloud_pressure_c
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 2, 0xACEB567F: 1}]})
dropship_encounter pf_cloud_dunes_vex
dropship_encounter pf_dropship_dunes_cabal
@member_counts({_squad: [{goblin: 3, minotaur: 1}]})
dropship_encounter cloud_d_dropship_encounter

@startup()
script sc_battleground_props():
    for beacon in patrol_beacons:
        beacon.create()
    for can in can_dynamics:
        can.create()
    o_vex_block_network_a.create()
    o_vex_block_network_a.set_device_position(1)
    o_m06_norender_scan.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 27
    encounters.add_ambient_encounter(pf_simple_gate_low, 2, 100, 20, 11, 0)

    # one pressure cloud comes in with the load, the other two wait
    clouds = [pf_cloud_pressure_a, pf_cloud_pressure_b, pf_cloud_pressure_c]
    i_first = mathlib.random_int_never_highest_value(0, len(clouds))
    encounters.add_ambient_encounter(clouds[i_first], 3, 100, 20, 11, 0)
    for i in range(len(clouds)):
        if i != i_first:
            encounters.add_ambient_encounter(clouds[i], 3, 100, 20, 11, 30)

    # the others go in in a random order with the load until the next one
    # would take them past 18 bodies; from there on each waits
    ground = [pf_simple_trenchleft1, pf_simple_trenchright1, pf_dropship_trenchmid, pf_dropship_cmd_a, pf_simple_cmd_b, pf_dropship_cmd_c, pf_simple_gate_bridge, pf_dropship_dunes_cabal, pf_cloud_dunes_vex, cloud_d_dropship_encounter]
    costs = [5, 5, 4, 3, 3, 3, 2, 3, 4, 4]
    added = [false, false, false, false, false, false, false, false, false, false]
    bodies = 0
    first_wait = 0
    for n in range(len(ground)):
        i = nth_left(added, mathlib.random_int_never_highest_value(0, len(ground) - n))
        added[i] = true
        if bodies + costs[i] > 18:
            first_wait = 30
        bodies = bodies + costs[i]
        encounters.add_ambient_encounter(ground[i], costs[i], 100, 20, 11, first_wait)

@startup()
# TU0's squads carry no objective of their own, so each takes its
# encounter's objective and the task retail gave it (by influencer) once the
# encounter has placed it.
script sc_trenchleft1_tasks():
    assign_tasks(pf_simple_trenchleft1, ["0xEABDD512", "0x2B2BC2D8"])

@startup()
script sc_trenchright1_tasks():
    assign_tasks(pf_simple_trenchright1, ["0x756512DB", "0x5CB5A830"])

@startup()
script sc_trenchmid_tasks():
    assign_tasks(pf_dropship_trenchmid, ["0x81D2AF3E", "0xF35A0474"])

@startup()
script sc_gate_bridge_tasks():
    assign_tasks(pf_simple_gate_bridge, ["0xE35515A1"])

@startup()
script sc_gate_low_tasks():
    assign_tasks(pf_simple_gate_low, ["gate"])

@startup()
script sc_cmd_a_tasks():
    assign_tasks(pf_dropship_cmd_a, ["0x2A51ADFD"])

@startup()
script sc_cmd_b_tasks():
    assign_tasks(pf_simple_cmd_b, ["0x2A51ADFE"])

@startup()
script sc_cmd_c_tasks():
    assign_tasks(pf_dropship_cmd_c, ["0x2A51ADFF"])

@startup()
script sc_pressure_a_tasks():
    assign_tasks(pf_cloud_pressure_a, ["0x82078856"])

@startup()
script sc_pressure_b_tasks():
    assign_tasks(pf_cloud_pressure_b, ["0x67BF1CDB"])

@startup()
script sc_pressure_c_tasks():
    assign_tasks(pf_cloud_pressure_c, ["0x9BB3DF28"])

@startup()
script sc_dunes_vex_tasks():
    assign_tasks(pf_cloud_dunes_vex, ["0x82078856"])

@startup()
script sc_dunes_cabal_tasks():
    assign_tasks(pf_dropship_dunes_cabal, ["0x82078856"])

@startup()
script sc_cloud_d_tasks():
    assign_tasks(cloud_d_dropship_encounter, ["0xC0DE2E4F"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])

def nth_left(added, n):
    i = 0
    while added[i] or n > 0:
        if not added[i]:
            n = n - 1
        i = i + 1
    return i
