# es\venus\warp_ruins\enc_warp_ruins_amb1.es
#
# The warp ruins' ambient layer (Venus' public bubble 28): the patrol
# beacons, the loose and explosive candy, the infinity portal gate, and six
# small Vex encounters around the ruins.
#
# From two captures, act_venus_m07_northern_tides' and
# act_venus_m02_southern_tides' public hosts (2026-10-01 21-06-51#6 and
# 2026-10-25 20-15-34#4, the player in the bubble for 26 and 31 s): in both,
# all six encounters were placed when the player arrived, 15 bodies. The
# costs are the bodies the server placed and the budget that set. Nothing
# was wiped; the cooldown is the shattered coast's 41 s.
# Left out: the raid's rows (the phase 0 minotaurs and their clouds, the
# switch pillars and the warp ruins tower), which venus_raid_1 drives; the
# music.

@activity_bundle("enc_warp_ruins_amb1")

static_array<object, 2> patrol_beacons
static_array<object, 7> candy_dynamic_objects
static_array<object, 3> candy_explosive_objects
object vex_infinity_portal_gate
encounter_manager encounters
simple_encounter simple_encounter_1
simple_encounter simple_encounter_2
simple_encounter simple_encounter_3
simple_encounter simple_encounter_4
simple_encounter simple_encounter_5
simple_encounter simple_encounter_6

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()
    for candy in candy_dynamic_objects:
        candy.create()
    for candy in candy_explosive_objects:
        candy.create()
    vex_infinity_portal_gate.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 15
    encounters.add_ambient_encounter(simple_encounter_1, 1, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_encounter_2, 1, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_encounter_3, 1, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_encounter_4, 4, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_encounter_5, 4, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_encounter_6, 4, 100, 20, 41, 0)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them.
script sc_encounter_1_tasks():
    assign_tasks(simple_encounter_1, ["task"])

@startup()
script sc_encounter_2_tasks():
    assign_tasks(simple_encounter_2, ["task"])

@startup()
script sc_encounter_3_tasks():
    assign_tasks(simple_encounter_3, ["task"])

@startup()
script sc_encounter_4_tasks():
    assign_tasks(simple_encounter_4, ["init"])

@startup()
script sc_encounter_5_tasks():
    assign_tasks(simple_encounter_5, ["init"])

@startup()
script sc_encounter_6_tasks():
    assign_tasks(simple_encounter_6, ["init"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
