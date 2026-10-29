# es\moon\accelerator\enc_accelerator_amb1.es
#
# The accelerator's ambient layer (the Moon's public bubble 1, where the
# Moon's story missions and patrol land): the patrol beacons, the dynamic
# props and the Hive around the accelerator, its interior, the north dome,
# the crater ridge and the way to the Hall of Wisdom. Six encounters are up
# as soon as the bubble loads; the rest wait for room under the actor budget.
#
# Pooled over four 2.3.1 fresh starts of the bubble: act_moon_m3_lowercitadel's
# public host (the player in it for 115 s), act_moon_m4_uppercitadel's
# (62 s) and two of the Moon patrol's (Patrol Luna of 2026-10-28, 225 s and
# 690 s):
# - Six encounters up at load in every run, 22 bodies each time: int_back_a
#   and north_ridge in all four, one of the loiters (stealth three times,
#   right once), and three of accel_hco, crater_ridge, north_dome_a, west
#   and int_front. The costs here are the bodies the server placed.
# - wisdom_bouncers went in 37-142 s after the load, at 37 s with all six
#   still up, so the budget has room for it (24); it waits out the first
#   placement, as int_back_b (in at 50 s and 146 s) does.
# - A wiped encounter came back on its own or another took its place:
#   north_ridge 7.5 s, 18 s and 27 s after its wipes, loiter_right 15 s,
#   accel_hco 43 s.
# - loiter_left never went in. Its cost is TU0's default bodies.
# Left out: the two wave encounters (pf_waves_int, pf_waves_dome), whose
# respawn timers ran from the load and stopped 14-43 s later with nothing
# placed (and ran again later in the long run, still with nothing), the
# music, which never played, and the public events, which are
# enc_accelerator_events'.

@activity_bundle("enc_accelerator_amb1")

static_array<object, 3> patrol_beacons
static_array<object, 10> dynamics
encounter_manager encounters
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 2, 0x4B2A2736: 2}]})
simple_encounter pf_simple_accel_hco
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 2, 0x4B2A2736: 1}]})
simple_encounter pf_simple_int_back_a
simple_encounter pf_simple_loiter_stealth
simple_encounter pf_simple_north_ridge
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 2, 0x4B2A2736: 2}]})
simple_encounter pf_simple_north_dome_a
@member_counts({_squad: [{vandal: 1, 0xA2D60243: 3}]})
simple_encounter pf_simple_west
simple_encounter pf_simple_wisdom_bouncers
@member_counts({_squad: [{anchor: 1, dregs: 3, 0x4B2A2736: 1}]})
simple_encounter pf_simple_crater_ridge
simple_encounter pf_simple_int_front
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 2, 0x4B2A2736: 1}]})
simple_encounter pf_simple_int_back_b
simple_encounter pf_simple_loiter_left
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 1}]})
simple_encounter pf_simple_loiter_right

@startup()
script sc_accelerator_props():
    for beacon in patrol_beacons:
        beacon.create()
    for prop in dynamics:
        prop.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 24
    encounters.add_ambient_encounter(pf_simple_accel_hco, 5, 100, 20, 18, 0)
    encounters.add_ambient_encounter(pf_simple_int_back_a, 4, 100, 20, 18, 0)
    encounters.add_ambient_encounter(pf_simple_loiter_stealth, 2, 100, 20, 18, 0)
    encounters.add_ambient_encounter(pf_simple_north_ridge, 2, 100, 20, 18, 0)
    encounters.add_ambient_encounter(pf_simple_north_dome_a, 5, 100, 20, 18, 0)
    encounters.add_ambient_encounter(pf_simple_west, 4, 100, 20, 18, 0)
    # the one that came in later waits out the first placement
    encounters.add_ambient_encounter(pf_simple_wisdom_bouncers, 2, 100, 20, 18, 30)
    encounters.add_ambient_encounter(pf_simple_crater_ridge, 5, 100, 20, 18, 0)
    encounters.add_ambient_encounter(pf_simple_int_front, 4, 100, 20, 18, 0)
    encounters.add_ambient_encounter(pf_simple_int_back_b, 4, 100, 20, 18, 30)
    encounters.add_ambient_encounter(pf_simple_loiter_right, 2, 100, 20, 18, 0)
    # never placed on the wire: TU0's default bodies
    encounters.add_ambient_encounter(pf_simple_loiter_left, 2, 100, 20, 18, 30)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them (crater_ridge's by its influencer, 2.3.1 added a task ahead of it), and
# the first task for the one never seen up.
script sc_accel_hco_tasks():
    assign_tasks(pf_simple_accel_hco, ["0xDBDAB8FE"])

@startup()
script sc_int_back_a_tasks():
    assign_tasks(pf_simple_int_back_a, ["0x51396A96"])

@startup()
script sc_loiter_stealth_tasks():
    assign_tasks(pf_simple_loiter_stealth, ["task"])

@startup()
script sc_north_ridge_tasks():
    assign_tasks(pf_simple_north_ridge, ["0x717605F5"])

@startup()
script sc_north_dome_a_tasks():
    assign_tasks(pf_simple_north_dome_a, ["0xA5194401"])

@startup()
script sc_west_tasks():
    assign_tasks(pf_simple_west, ["0x9FC6097A"])

@startup()
script sc_wisdom_bouncers_tasks():
    assign_tasks(pf_simple_wisdom_bouncers, ["0x904EC313"])

@startup()
script sc_crater_ridge_tasks():
    assign_tasks(pf_simple_crater_ridge, ["0xF294B65B"])

@startup()
script sc_int_front_tasks():
    assign_tasks(pf_simple_int_front, ["0xB82C7EB0", "0xB82C7EB0"])

@startup()
script sc_int_back_b_tasks():
    assign_tasks(pf_simple_int_back_b, ["0xB67BD312"])

@startup()
script sc_loiter_left_tasks():
    assign_tasks(pf_simple_loiter_left, ["task"])

@startup()
script sc_loiter_right_tasks():
    assign_tasks(pf_simple_loiter_right, ["task"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
