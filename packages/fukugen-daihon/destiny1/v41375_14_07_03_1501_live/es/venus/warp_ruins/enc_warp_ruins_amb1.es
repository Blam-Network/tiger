# es\venus\warp_ruins\enc_warp_ruins_amb1.es
#
# The warp ruins' ambient layer (Venus' public bubble 28): the patrol
# beacons, the loose and explosive candy, the infinity portal gate, and six
# small Vex encounters around the ruins.
#
# From three fresh starts, act_venus_m07_northern_tides',
# act_venus_m02_southern_tides' and the patrol's public hosts (2026-10-01
# 21-06-51#6, 2026-10-25 20-15-34#4 and Patrol Venus#10, the player in the
# bubble for 26, 31 and 116 s): in all three, all six encounters were placed
# when the player arrived, 15 bodies. The costs are the bodies the server
# placed and the budget that set. One wipe, not back in the 66 s the player
# stayed; the cooldown is the shattered coast's 40 s.
# The ambient music was playing and the three switch pillars' altars stood
# (device 0) from the start in all five runs of the bubble on the wire
# (those three, and mission_traitor's and quest_safari's on 1.33), so both
# are made here.
# Left out: the rest of the raid's rows (the phase 0 minotaurs and their
# clouds, the pillars' charging and the warp ruins tower), which
# venus_raid_1 drives.

@activity_bundle("enc_warp_ruins_amb1")

static_array<object, 2> patrol_beacons
static_array<object, 7> candy_dynamic_objects
static_array<object, 3> candy_explosive_objects
object vex_infinity_portal_gate
sequence seq_ambient_music
venus_raid_pillar_switch left_switch_pillar
venus_raid_pillar_switch right_switch_pillar
venus_raid_pillar_switch center_switch_pillar
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
    left_switch_pillar.create()
    right_switch_pillar.create()
    center_switch_pillar.create()
    seq_ambient_music.start()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 15
    encounters.add_ambient_encounter(simple_encounter_1, 1, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_encounter_2, 1, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_encounter_3, 1, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_encounter_4, 4, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_encounter_5, 4, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_encounter_6, 4, 100, 20, 40, 0)

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
