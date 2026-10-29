# es\venus\vex_complex\enc_vex_complex_amb1.es
#
# The vex complex's ambient layer (Venus' public bubble 4): the patrol
# beacons, the loose and explosive candy, mission 7's network block, its
# node and the node's cage, and the Vex on the bridge and around the north
# and south of the complex, two of them brought in by Vex cloud.
#
# From two fresh starts: act_venus_m07_northern_tides' public host
# (2026-10-01 21-06-51#5, the player in the bubble from 8 s to 65 s) and the
# patrol's (Patrol Venus#5, 6 s to 477 s):
# - On the ground when the player arrived: the bridge front, the north back
#   squad, the north hobgoblins and goblins and the bridge's two cloud
#   squads (with no cloud in sight) in both, with the south goblins in the
#   first run (24 bodies) and the north snipers and south minotaurs in the
#   second (25). There the south goblins went in at 28 s, as soon as the
#   bridge front and the guardians had been wiped and there was room. TU0's
#   dropship_encounter brings its squads in by cloud, so the two cloud
#   squads come by cloud from the start. The costs are the bodies the server
#   placed; 25 is the budget both starts fit.
# - A wiped encounter comes back after its cooldown, once no player is in
#   its area. The guardians' cloud was back 41.5 s after their wipe and
#   dropped them 4 s later; the rest came back 112-337 s on, read as the
#   player in their areas. The cooldown is the shattered coast's 40 s.
# - The network block was out from the load with its device over, in both.
#   The scan marker went in with the bubble in the mission's run only, so
#   it is the mission's to show and is left out here. The node's cage went
#   up 40 s in, the node's device went over 11 s later and the cage was gone
#   2 s after, as the shattered coast's sensor cages do.
#   act_venus_m07_northern_tides' mission has the player use the node.
# Left out: the hydra's cloud, never placed in a capture; the music.

@activity_bundle("enc_vex_complex_amb1")

static_array<object, 3> patrol_beacons
static_array<object, 7> candy_dynamic_objects
static_array<object, 3> candy_explosive_objects
object o_vex_network_block_a
object o_vex_network_block_a_cage
# mission 7's node, under the identifier its objective listens on
interactable_placement pf_vex_node01 bind("0xAF82B1E0")
encounter_manager encounters
@member_counts({_squad: [{goblin: 2, harpies: 2}]})
simple_encounter simple_bridge_front
@member_counts({_squad: [{goblins: 2, hobgoblin: 1}]})
simple_encounter simple_north_back_squad
@member_counts({_squad: [{goblin: 1, 0x59E44059: 2, goblins: 2}]})
simple_encounter simple_north_hobs_and_gobs
@member_counts({_squad: [{0x05A22B7F: 2, 0x7E11989B: 1, 0x1F275073: 2}]})
simple_encounter simple_south_goblins
@member_counts({_squad: [{hobgoblin_sniper: 2, 0x1A8A5D2A: 1}]})
simple_encounter simple_north_snipers
@member_counts({_squad: [{minotaurs: 2, minotaur_major: 1}]})
simple_encounter simple_south_minotaurs
@member_counts({_squad: [{harpy: 2, goblins: 2, 0x45E0631B: 1}]})
dropship_encounter vexcloud_bridge_ambient
@member_counts({_squad: [{0x35E0BD59: 2}]})
dropship_encounter vexcloud_bridge_guardians

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()
    for candy in candy_dynamic_objects:
        candy.create()
    for candy in candy_explosive_objects:
        candy.create()
    o_vex_network_block_a.create()
    o_vex_network_block_a.set_device_position(1)

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 25
    encounters.add_ambient_encounter(simple_bridge_front, 4, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_north_back_squad, 3, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_north_hobs_and_gobs, 5, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_south_goblins, 5, 100, 20, 40, 0)
    encounters.add_ambient_encounter(vexcloud_bridge_ambient, 5, 100, 20, 40, 0)
    encounters.add_ambient_encounter(vexcloud_bridge_guardians, 2, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_north_snipers, 3, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_south_minotaurs, 3, 100, 20, 40, 0)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them.
script sc_bridge_front_tasks():
    assign_tasks(simple_bridge_front, ["back"])

@startup()
script sc_north_back_squad_tasks():
    assign_tasks(simple_north_back_squad, ["task"])

@startup()
script sc_north_hobs_and_gobs_tasks():
    assign_tasks(simple_north_hobs_and_gobs, ["back"])

@startup()
script sc_south_goblins_tasks():
    assign_tasks(simple_south_goblins, ["back"])

@startup()
script sc_north_snipers_tasks():
    assign_tasks(simple_north_snipers, ["back"])

@startup()
script sc_south_minotaurs_tasks():
    assign_tasks(simple_south_minotaurs, ["task"])

@startup()
script sc_bridge_ambient_tasks():
    assign_tasks(vexcloud_bridge_ambient, ["back"])

@startup()
script sc_bridge_guardians_tasks():
    assign_tasks(vexcloud_bridge_guardians, ["task"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])

@startup()
# The cage goes up over the node while it is in use and is gone once the
# node is done; should the node's device not get there, it goes about when
# the one use seen did.
script sc_node_cage():
    while true:
        sleep_until(pf_vex_node01._interactable.is_active())
        sleep(2)
        o_vex_network_block_a_cage.create()
        sleep_until_timeout(pf_vex_node01._device.get_device_position() >= 1, 11)
        sleep(2)
        o_vex_network_block_a_cage.delete_object()
        sleep_until(not pf_vex_node01._interactable.is_active())
