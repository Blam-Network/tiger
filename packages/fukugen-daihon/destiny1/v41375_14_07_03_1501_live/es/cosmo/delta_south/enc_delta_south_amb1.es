# es\cosmo\delta_south\enc_delta_south_amb1.es
#
# The Cosmodrome's ambient layer around the south deltas, the shacks and the
# crashed ship (public bubble 7), loaded by every Cosmodrome activity and
# patrol. Two ambushes wait under their objectives for a player to walk in,
# and a few Fallen encounters share an actor budget with them: one or two
# are up at a time, and when one is wiped out another takes its place, two
# of them by dropship. Also puts out the patrol beacons, the scenery and the
# placements of the cable and mission 0.5, with mission 0.5's crashed ship
# cage and map marker.
#
# Pooled over seven 2.3.1 public hosts of the bubble (the patrol three
# times, act_cosmo_m0_5_hangar, act_cosmo_m1_dome_a, act_cosmo_m2_dome_c,
# act_cosmo_m4_dome_c); four had it on the wire from a fresh start, one
# joined it running and two never had the player in it.
# - Both ambushes were armed from the start in every run, and went in as a
#   player entered their volumes (comms once, the cable hive twice).
# - On the ground at the start: the crashed ship's Fallen (twice), the shack
#   (once), the cliff shack with the south patrol (once). Each wipe let
#   another encounter in within 1.5-3 s. The costs are the bodies the server
#   placed and the budget the largest set seen; the list order is the two
#   runs that started with the crashed ship, the hangar mission's (337 s)
#   and the patrol's (385 s).
# - Back after a wipe: the cliff shack 12 s later (twice), the shack and the
#   south patrol 30 s later (the patrol's run), the crashed ship's Fallen by
#   dropship 92 s later (the hangar mission's run, once the shack had gone).
#   The hangar's dropship flew in once, as the shack's Fallen went.
# - The crashed ship's Fallen stood at the start with no ship in sight; TU0's
#   dropship_encounter flies its squads in, so here they come by ship.
# - The cage and the map marker are the hangar mission's run: the cage went
#   up 56 s in and came down 3 s after its placement was used; the marker
#   came up a second after the second placement became usable and went when
#   it was done (it blinked twice first, which is left out).
# The comms, crashed ship, overpass and transit encounters, the road patrol,
# the shack's dropship and the south patrol route never ran in a capture and
# are left out.

@activity_bundle("enc_delta_south_amb1")

static_array<object, 3> patrol_beacons
static_array<object, 10> candy_dynamic_objects
object o_m1_crash_ship_cage_1
object o_m0_5_map_marker
encounter_manager encounters
@member_counts({_squad: [{vandal: 1, shank: 2}]})
ambush_encounter amb_ambush_comms01
@member_counts({_squad: [{knight: 1, trooper: 2}]})
ambush_encounter amb_ambush_cablehive01
@member_counts({_squad: [{shanks: 1, vandal: 2, 0xA292226F: 1}]})
dropship_encounter amb_dropship_crashedship_1
@member_counts({_squad: [{dreg: 2, dreg_vandal: 2, vandal: 2, captain: 0}]})
simple_encounter amb_smpl_shack01
@member_counts({_squad: [{dreg_shank: 2, vandal: 1}]})
simple_encounter amb_smpl_cliffshack01
@member_counts({_squad: [{dreg: 2, 0x21D48352: 1}]})
simple_encounter amb_ptrl_smpl_south01
dropship_encounter amb_dropship_hangar_1
interactable_placement obj_placement_cable bind("0xD1F03005")
interactable_placement obj_placement_m0_5_o1 bind("0x6607D3FA")
interactable_placement obj_placement_m0_5_o2 bind("0xDE0933DB")

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()
    for candy in candy_dynamic_objects:
        candy.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 12
    encounters.add_ambient_encounter(amb_ambush_comms01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_ambush_cablehive01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_dropship_crashedship_1, 4, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_shack01, 6, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_ptrl_smpl_south01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cliffshack01, 3, 100, 20, 12, 0)
    encounters.add_ambient_encounter(amb_dropship_hangar_1, 4, 100, 20, 30, 0)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them.
script sc_ambush_comms01_tasks():
    assign_tasks(amb_ambush_comms01, ["task"])

@startup()
script sc_ambush_cablehive01_tasks():
    assign_tasks(amb_ambush_cablehive01, ["outer"])

@startup()
script sc_dropship_crashedship_1_tasks():
    assign_tasks(amb_dropship_crashedship_1, ["inner"])

@startup()
script sc_shack01_tasks():
    assign_tasks(amb_smpl_shack01, ["inner"])

@startup()
script sc_ptrl_smpl_south01_tasks():
    assign_tasks(amb_ptrl_smpl_south01, ["task"])

@startup()
script sc_cliffshack01_tasks():
    assign_tasks(amb_smpl_cliffshack01, ["inner"])

@startup()
script sc_dropship_hangar_1_tasks():
    assign_tasks(amb_dropship_hangar_1, ["inner"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])

@startup()
# Mission 0.5's crashed ship: the cage stands while a player has the first
# placement's objective and comes down once the placement has been used.
script sc_crash_ship_cage():
    sleep_until(obj_placement_m0_5_o1._activity_flag.is_active())
    o_m1_crash_ship_cage_1.create()
    sleep_until(obj_placement_m0_5_o1._interactable.is_active())
    sleep(2)
    o_m1_crash_ship_cage_1.delete_object()

@startup()
# The map marker shows the second placement while a player can use it.
script sc_map_marker():
    sleep_until(obj_placement_m0_5_o2._activity_flag.is_active())
    sleep(1)
    o_m0_5_map_marker.create()
    sleep_until(not obj_placement_m0_5_o2._activity_flag.is_active())
    o_m0_5_map_marker.delete_object()
