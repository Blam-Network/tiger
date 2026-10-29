# es\mars\battleground\enc_battleground_amb1.es
#
# The battleground's ambient layer (Mars' public bubble 1, between the
# Cabal trenches and the Vex gate): the patrol beacons, the dynamic cans,
# the Vex network block, and the Cabal and Vex around the trenches, the
# command posts, the gate and the dunes, the Vex pressure clouds brought in
# by gate cloud and the dunes and command post Cabal by dropship. Loaded by
# the patrol, the strikes and the story missions.
#
# Pooled over two fresh starts on the patrol's public hosts (Patrol Mars#8,
# 375 s, and #14, 450 s; the chests came out 58-89 s in both) and the short
# public host sessions of act_mars_m01_valley, act_mars_m05_warbase and
# act_mars_m07_lowergarden (2026-10-26, 47-72 s each):
# - Up as the bubble loaded: both trenches or one, two of the three command
#   posts, the gate bridge, and exactly one of the three pressure clouds
#   (its cloud in 7-9 s after the load, in all five sessions). The fresh
#   starts came to 20 and 21 bodies; the troops the server put down with no
#   cloud or ship in sight come by ship here, as TU0's dropship_encounter
#   always flies in.
# - The dunes Cabal ship came in 29 and 33 s after the load in both fresh
#   starts; the dunes Vex cloud in one at load, in the other at 59 s once a
#   command post had been wiped. Both fresh starts peaked at 27 bodies up at
#   once: the budget. The rest wait out the first placement.
# - Wiped encounters came back 20-30 s later (the command post and the gate
#   bridge; a trench after 43 s, the ships after 37-73 s, when there was
#   room): the cooldown is the shortest return.
# - The low gate squad went in each time a player came to the gate (#8 at
#   56 s, #14 at 71 s, m05's host at 42 s), as the bridge squad fell back to
#   its second task: an ambush on its volume.
# - The costs are the bodies the server placed (the squads' cell counts);
#   the trench middle and cloud D never went in and keep TU0's bodies.
# - The tasks are the ones retail gave each squad at its placement, by
#   influencer; the squads' later moves are the task tree's own.
# Left out: the gate wave (pf_wave_gate, whose respawn timer ran from the
# load and stopped 29-42 s later with nothing placed), the music, which
# never played, and act_mars_m06_subway's pocket monitors. m06's console
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
    encounters.add_ambient_encounter(pf_simple_trenchright1, 5, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_simple_trenchleft1, 5, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_simple_cmd_b, 3, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_dropship_cmd_a, 3, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_simple_gate_bridge, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(pf_simple_gate_low, 2, 100, 20, 20, 0)

    # one pressure cloud comes in with the load, the other two wait
    clouds = [pf_cloud_pressure_a, pf_cloud_pressure_b, pf_cloud_pressure_c]
    i_first = mathlib.random_int_never_highest_value(0, len(clouds))
    encounters.add_ambient_encounter(clouds[i_first], 3, 100, 20, 20, 0)
    for i in range(len(clouds)):
        if i != i_first:
            encounters.add_ambient_encounter(clouds[i], 3, 100, 20, 20, 30)

    # the dunes ships came in about 30 s after the load
    encounters.add_ambient_encounter(pf_dropship_dunes_cabal, 3, 100, 20, 20, 30)
    encounters.add_ambient_encounter(pf_cloud_dunes_vex, 4, 100, 20, 20, 30)
    encounters.add_ambient_encounter(pf_dropship_cmd_c, 3, 100, 20, 20, 30)
    # never placed on the wire: TU0's default bodies
    encounters.add_ambient_encounter(pf_dropship_trenchmid, 4, 100, 20, 20, 30)
    encounters.add_ambient_encounter(cloud_d_dropship_encounter, 2, 100, 20, 20, 30)

@startup()
# TU0's squads carry no objective of their own, so each takes its
# encounter's objective and the task retail gave it (by influencer) once the
# encounter has placed it; the first task for the two never seen up.
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
