# es\mars\plains\enc_plains_amb1.es
#
# The plains' ambient layer (Mars' public bubble 18, where the patrol lands):
# the patrol beacons, the base door, mission 2's two placements, and the
# Cabal at the base and on the crater outpost and the Vex in the lower
# crater.
#
# From three of the plains' public hosts: the patrol's (Patrol Mars#2, a
# fresh start, chests out 68-86 s, the player in the bubble for 216 s),
# act_mars_m05_warbase's (2026-10-26 23-39-22#2, fresh, 88 s) and
# act_mars_m07_lowergarden's (2026-10-26 23-57-02#2, 54 s):
# - Up at load in all three: the base's rear and trench, the crater outpost
#   and the lower crater's Vex, 17 bodies, the budget. The costs are the
#   bodies the server placed.
# - The central, crater flat and dune squads and the south bunker's waves
#   never went in, in 216 s with room under the budget after every wipe,
#   so they stay out of the manager.
# - Each encounter came back after it was wiped, on the patrol's host only:
#   the crater outpost 16-17 s after (twice) and the lower crater's Vex 16 s
#   after, the base's rear 41 and 57 s after and its trench 41 and 48 s
#   after. Single run; each takes the shortest wait it showed.
# - The base door was open (device 1) and both of mission 2's placements
#   were out from the load, in all three hosts and with no mission running
#   in two, so they are the ambient's.
# Left out: the music, the bubble monitor, and the squads' moves to "outer"
# as they were wiped (the task tree's own).

@activity_bundle("enc_plains_amb1")

object o_door
static_array<object, 3> patrol_beacons
countdown_placement pf_placement_m02_interact
countdown_placement pf_placement_m02_countdown
encounter_manager encounters
@member_counts({_squad: [{legionary: 1, phalanx: 1}, {phalanx: 1, legionary: 1}]})
simple_encounter sp_encounter_simple_base_rear
@member_counts({_squad: [{legionary: 2}, {legionary: 1}]})
simple_encounter sp_encounter_simple_base_trench
@member_counts({_squad: [{legionary: 2}, {legionary: 2}]})
simple_encounter sp_encounter_simple_crater_outpost
@member_counts({_squad: [{goblin: 5}, {minotaur: 1}]})
simple_encounter sp_encounter_simple_vex_lower

@startup()
script ss_main_thread():
    o_door.create()
    o_door.set_device_position(1)
    for beacon in patrol_beacons:
        beacon.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 17
    encounters.add_ambient_encounter(sp_encounter_simple_base_rear, 4, 100, 20, 41, 0)
    encounters.add_ambient_encounter(sp_encounter_simple_base_trench, 3, 100, 20, 41, 0)
    encounters.add_ambient_encounter(sp_encounter_simple_crater_outpost, 4, 100, 20, 16, 0)
    encounters.add_ambient_encounter(sp_encounter_simple_vex_lower, 6, 100, 20, 16, 0)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them.
script sc_base_rear_tasks():
    assign_tasks(sp_encounter_simple_base_rear, ["inner", "inner"])

@startup()
script sc_base_trench_tasks():
    assign_tasks(sp_encounter_simple_base_trench, ["inner", "inner"])

@startup()
script sc_crater_outpost_tasks():
    assign_tasks(sp_encounter_simple_crater_outpost, ["outer", "outer"])

@startup()
script sc_vex_lower_tasks():
    assign_tasks(sp_encounter_simple_vex_lower, ["task", "task"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
