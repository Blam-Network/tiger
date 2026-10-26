# es\venus\fallen_caldera\enc_fallen_caldera_amb1.es
#
# The fallen caldera's ambient layer (Venus' public bubble 9): the patrol
# beacons, the loose and explosive candy, and the Fallen at the thieves'
# den, its hold, the bottom ramp, the pocket, the tank and the entrance.
#
# From one capture, act_venus_m07_northern_tides' public host (2026-10-01
# 21-06-51#4, the player in the bubble from 4 s to 32 s), so every rule here
# is a single run's: all six encounters were on the ground when the player
# arrived, 24 bodies. The costs are the bodies the server placed and the
# budget that set. Nothing was wiped; the cooldown is the shattered coast's
# 41 s.

@activity_bundle("enc_fallen_caldera_amb1")

static_array<object, 2> patrol_beacons
static_array<object, 7> candy_dynamic_objects
static_array<object, 3> candy_explosive_objects
encounter_manager encounters
@member_counts({_squad: [{0xD29DFF48: 3, shanks: 1}, {captains: 1}]})
simple_encounter simple_thieves
@member_counts({_squad: [{0xFD2174CD: 1, 0xD29DFF48: 1}, {0x95A36DC8: 1, 0x99E58F0A: 2}]})
simple_encounter simple_thieves_hold
@member_counts({_squad: [{shanks: 2, vandals: 2}]})
simple_encounter simple_btm_ramp
@member_counts({_squad: [{vandals: 3}]})
simple_encounter simple_pocket
@member_counts({_squad: [{dreg: 3, vandal: 1}]})
simple_encounter simple_tank_inf
@member_counts({_squad: [{vandals: 2, dreg: 1}]})
simple_encounter simple_entrance

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()
    for candy in candy_dynamic_objects:
        candy.create()
    for candy in candy_explosive_objects:
        candy.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 24
    encounters.add_ambient_encounter(simple_thieves, 5, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_thieves_hold, 5, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_btm_ramp, 4, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_pocket, 3, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_tank_inf, 4, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_entrance, 3, 100, 20, 41, 0)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them.
script sc_thieves_tasks():
    assign_tasks(simple_thieves, ["outer", "0xF4A42E4F"])

@startup()
script sc_thieves_hold_tasks():
    assign_tasks(simple_thieves_hold, ["outer", "0xC7BE4A3A"])

@startup()
script sc_btm_ramp_tasks():
    assign_tasks(simple_btm_ramp, ["inner"])

@startup()
script sc_pocket_tasks():
    assign_tasks(simple_pocket, ["0xB8BE4FE2"])

@startup()
script sc_tank_inf_tasks():
    assign_tasks(simple_tank_inf, ["inner"])

@startup()
script sc_entrance_tasks():
    assign_tasks(simple_entrance, ["inner"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
