# es\moon\hellmouth\enc_hellmouth_amb1.es
#
# The hellmouth's ambient layer (the Moon's public bubble 2): the patrol
# beacons, the dynamic props, the fissure Ghosts, mission 5's placements, and
# the Hive on the bridge, the ridge, the maw, the gate and around the
# village. Six encounters are up as soon as the bubble loads; when one is
# wiped out another takes its place under the actor budget.
#
# From one fresh start, act_moon_m5_strength's public host (2026-10-25
# 19-30-30#2, the player in the bubble for 202 s), so every rule here is a
# single run's:
# - Up at load: bridge, gate, maw, ridge, village_deck_a and
#   village_sniper_rear, 25 bodies. The costs are the bodies the server
#   placed and the budget that set.
# - village_deck_a was wiped at 150 s and the henge dropship flew in under a
#   second later, its four troops dropped 19 s after; the ship left 26 s
#   after it came in.
# - village_sniper_rear was placed again 48 s after it was wiped;
#   village_deck_a was not back 52 s after its wipe.
# - The squads that dropped out of sense and came back with no new bodies
#   placed (bridge, gate, deck_a) were the player walking out of range, not
#   the script.
# - hall_bouncers, village_anchor_a and the village and ledge dropships
#   never went in (hall_bouncers was up in act_moon_m5_strength's other host,
#   joined running). Their costs are TU0's default bodies.
# - The fissure Ghosts and both of mission 5's objects were out from the
#   load. act_moon_m5_strength's mission has the player use the objects.
# - The henge wave: in act_moon_m4_uppercitadel's run (its public host,
#   19-16-38#3, joined running) the first wave was tasked 3 s after the
#   player walked into the mission's henge trigger, its respawn timer ran
#   25 s, and the second wave was tasked 31 s after the first. Here the wave
#   starts once a player is at the far side of the henge (pm_hive_henge_far),
#   the henge's own monitor, as an ambient wave the mission's henge kill
#   waits on; the second wave comes on as the first is down to one. The
#   monitor's count was not on that host's wire, so both are our reading.
# Left out: the music.

@activity_bundle("enc_hellmouth_amb1")

static_array<object, 3> patrol_beacons
static_array<object, 10> dynamics
object o_fissure_ghost_a
object o_fissure_ghost_b
# mission 5's objects, under the identifiers its objective listens on
interactable_placement_set obj_m5_multi_placement bind("0xE3541DC3", "0xEF6113DE")
encounter_manager encounters
@member_counts({_squad: [{0x3715BE01: 3, 0xACEB567F: 1}, {anchor: 1}]})
simple_encounter pf_simple_bridge
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 3}, {anchor: 1}]})
simple_encounter pf_simple_gate
@member_counts({_squad: [{0x3715BE01: 2, 0xACEB567F: 1}, {anchor: 1}]})
simple_encounter pf_simple_maw
@member_counts({_squad: [{0x3715BE01: 2, 0xB57929DF: 1}, {anchor: 1}]})
simple_encounter pf_simple_ridge
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 3, 0xACEB567F: 2}]})
simple_encounter pf_simple_village_deck_a
simple_encounter pf_simple_village_sniper_rear
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 2, 0xACEB567F: 1}]})
dropship_encounter pf_dropship_henge
simple_encounter pf_simple_hall_bouncers
simple_encounter pf_simple_village_anchor_a
dropship_encounter pf_dropship_village
dropship_encounter pf_dropship_ledge
trigger_volume tv_hive_henge_far
player_monitor pm_hive_henge_far bind(tv_hive_henge_far)
wave_encounter pf_encounter_wave_henge1
simple_encounter pf_encounter_simple_henge_wave1_a
simple_encounter pf_encounter_simple_henge_wave1_b

@startup()
script sc_hellmouth_props():
    for beacon in patrol_beacons:
        beacon.create()
    for prop in dynamics:
        prop.create()
    o_fissure_ghost_a.create()
    o_fissure_ghost_b.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 25
    encounters.add_ambient_encounter(pf_simple_bridge, 5, 100, 20, 48, 0)
    encounters.add_ambient_encounter(pf_simple_gate, 5, 100, 20, 48, 0)
    encounters.add_ambient_encounter(pf_simple_maw, 4, 100, 20, 48, 0)
    encounters.add_ambient_encounter(pf_simple_ridge, 4, 100, 20, 48, 0)
    encounters.add_ambient_encounter(pf_simple_village_deck_a, 6, 100, 20, 48, 0)
    encounters.add_ambient_encounter(pf_simple_village_sniper_rear, 1, 100, 20, 48, 0)
    encounters.add_ambient_encounter(pf_dropship_henge, 4, 100, 20, 48, 0)
    # never placed on the wire: TU0's default bodies, costs that kept them out
    encounters.add_ambient_encounter(pf_simple_hall_bouncers, 3, 100, 20, 48, 30)
    encounters.add_ambient_encounter(pf_simple_village_anchor_a, 3, 100, 20, 48, 30)
    encounters.add_ambient_encounter(pf_dropship_village, 3, 100, 20, 48, 30)
    encounters.add_ambient_encounter(pf_dropship_ledge, 2, 100, 20, 48, 30)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them (maw's by its influencer, 2.3.1 added a task ahead of it), the ones
# the joined-running host showed for hall_bouncers and village_anchor_a, and
# the first task for the two dropships never seen.
script sc_bridge_tasks():
    assign_tasks(pf_simple_bridge, ["0x8EF8D9E0", "0x8EF8D9E0"])

@startup()
script sc_gate_tasks():
    assign_tasks(pf_simple_gate, ["0x60B96A34", "0x6CC667E3"])

@startup()
script sc_maw_tasks():
    assign_tasks(pf_simple_maw, ["task", "task"])

@startup()
script sc_ridge_tasks():
    assign_tasks(pf_simple_ridge, ["0xAC2CEA4D", "0xAC2CEA4D"])

@startup()
script sc_village_deck_a_tasks():
    assign_tasks(pf_simple_village_deck_a, ["0xF335497F"])

@startup()
script sc_village_sniper_rear_tasks():
    assign_tasks(pf_simple_village_sniper_rear, ["task"])

@startup()
script sc_dropship_henge_tasks():
    assign_tasks(pf_dropship_henge, ["task"])

@startup()
script sc_hall_bouncers_tasks():
    assign_tasks(pf_simple_hall_bouncers, ["0x904EC313", "0x904EC313"])

@startup()
script sc_village_anchor_a_tasks():
    assign_tasks(pf_simple_village_anchor_a, ["0xACA8BB15"])

@startup()
script sc_dropship_village_tasks():
    assign_tasks(pf_dropship_village, ["0x1CD7D52A"])

@startup()
script sc_dropship_ledge_tasks():
    assign_tasks(pf_dropship_ledge, ["task"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])

@startup()
script sc_henge_wave():
    pf_encounter_wave_henge1.add_wave(pf_encounter_simple_henge_wave1_a, 1)
    pf_encounter_wave_henge1.add_wave(pf_encounter_simple_henge_wave1_b, 0)
    sleep_until(pm_hive_henge_far.test_any_inside())
    sleep(3)
    pf_encounter_wave_henge1.activate()

@startup()
script sc_henge_wave1_a_tasks():
    assign_tasks(pf_encounter_simple_henge_wave1_a, ["0x4AD88C04", "0xD7B7CF31"])

@startup()
script sc_henge_wave1_b_tasks():
    assign_tasks(pf_encounter_simple_henge_wave1_b, ["0x9295A6E5", "0x9295A6E4"])
