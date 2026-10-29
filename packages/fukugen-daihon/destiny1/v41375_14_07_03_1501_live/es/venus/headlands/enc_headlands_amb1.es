# es\venus\headlands\enc_headlands_amb1.es
#
# The headlands' ambient layer (Venus' public bubble 10): the patrol beacons,
# the loose and explosive candy, and the Fallen and Vex around the center
# hill, the cliff ruins, the overhang, the gate steps and the pillars cave,
# most of them brought in by dropship or Vex cloud.
#
# From two fresh starts: act_venus_m02_southern_tides' third host
# (2026-10-25 20-15-34#3, the player in the bubble from 8 s to 108 s) and
# the patrol's (Patrol Venus#9, 8 s to 228 s):
# - On the ground when the player arrived, in both: the center hill and
#   cliff ruins Fallen and the cliff support, gate steps and middle support
#   Vex (with no ship in sight), and the overhang hill Fallen, 25 bodies.
#   TU0's dropship_encounter flies its squads in, so those come by ship from
#   the start.
# - The overhang island went in 15 and 31 s after those (at 23 and 39 s),
#   once the overhang hill Fallen had gone to the front and been lost
#   (16-17 s, both runs). The pillars cave went in 84 s after them in both
#   (at 92 and 93 s), so it is held back that long. 27 bodies were up then:
#   the budget.
# - A wiped encounter comes back after its cooldown, once no player is in
#   its area. The ships were back 20-42 s after their squads were wiped
#   (Patrol Venus#9, four times; 44-48 s in the first run, once the middle
#   support had been wiped and there was room again): 20 s. A Vex cloud
#   dropped its squad 4 s after it came in, a Fallen skiff 20-23 s. The
#   overhang hill Fallen were placed again 29-56 s after they were lost
#   (three times): 29 s, for the simple encounters.
# - The costs are the bodies the server placed.
# - Mission 2's Cyclops (act_venus_m02_southern_tides, whose loot one of
#   its squad carries) came in by dropship 0.8 s after a player holding the
#   mission's loot flag walked into tv_m2_trigger, and the second wave's ship
#   4 s after that. The second wave was wiped 23 s later and no third wave
#   came in the 34 s the player stayed, so the third and fourth waves are
#   left out. On the patrol, with no one holding the flag, no Cyclops came.

@activity_bundle("enc_headlands_amb1")

static_array<object, 3> patrol_beacons
static_array<object, 7> candy_dynamic_objects
static_array<object, 3> candy_explosive_objects
encounter_manager encounters
@member_counts({_squad: [{0xFB66147C: 1, 0xBB63D0E0: 2, 0xAE5F5A8B: 1}]})
dropship_encounter dropship_fallen_center_hill
@member_counts({_squad: [{0xEE61489D: 1, 0xD986F828: 2, 0x0A7806DC: 2}]})
dropship_encounter dropship_fallen_cliff_ruins
simple_encounter simple_fallen_overhang_hill
@member_counts({_squad: [{0xC4602C9D: 2, 0x429513D6: 1, 0x055784B0: 1}]})
dropship_encounter vex_dropship_cliff_support
@member_counts({_squad: [{0x1303400F: 1, 0x5EA949D3: 2}]})
dropship_encounter vex_dropship_gate_steps
@member_counts({_squad: [{goblins: 3, 0x1583D385: 1, 0xA1276664: 2}]})
dropship_encounter vex_dropship_middle_support
@member_counts({_squad: [{0xF6110F0A: 1, 0x864BB115: 2, 0xAF441AB3: 1}]})
simple_encounter simple_fallen_overhang_island
@member_counts({_squad: [{0x1303400F: 1, 0x625409DC: 2, 0x055784B0: 1}]})
simple_encounter simple_vex_pillars_cave
# mission 2's Cyclops, for the players holding its loot objective's flag
activity_flag af_m2_loot bind("0x8C52C41D")
object_filter m2_trigger_object_filter
trigger_volume tv_m2_trigger
player_monitor pm_m2_trigger bind(tv_m2_trigger)
dropship_encounter vex_dropship_m2_cyclops
@member_counts({_squad: [{0x39A65D2C: 3}]})
dropship_encounter vex_dropship_m2_second_wave

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
    encounters.actor_budget = 27
    encounters.add_ambient_encounter(dropship_fallen_center_hill, 4, 100, 20, 20, 0)
    encounters.add_ambient_encounter(dropship_fallen_cliff_ruins, 5, 100, 20, 20, 0)
    encounters.add_ambient_encounter(simple_fallen_overhang_hill, 3, 100, 20, 29, 0)
    encounters.add_ambient_encounter(vex_dropship_cliff_support, 4, 100, 20, 20, 0)
    encounters.add_ambient_encounter(vex_dropship_gate_steps, 3, 100, 20, 20, 0)
    encounters.add_ambient_encounter(vex_dropship_middle_support, 6, 100, 20, 20, 0)
    encounters.add_ambient_encounter(simple_fallen_overhang_island, 4, 100, 20, 29, 0)
    encounters.add_ambient_encounter(simple_vex_pillars_cave, 4, 100, 20, 29, 0)
    encounters.suppress_encounter(simple_vex_pillars_cave, true)
    sleep(84)
    encounters.suppress_encounter(simple_vex_pillars_cave, false)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them.
script sc_center_hill_tasks():
    assign_tasks(dropship_fallen_center_hill, ["back"])

@startup()
script sc_cliff_ruins_tasks():
    assign_tasks(dropship_fallen_cliff_ruins, ["back"])

@startup()
script sc_overhang_hill_tasks():
    assign_tasks(simple_fallen_overhang_hill, ["back"])

@startup()
script sc_cliff_support_tasks():
    assign_tasks(vex_dropship_cliff_support, ["back"])

@startup()
script sc_gate_steps_tasks():
    assign_tasks(vex_dropship_gate_steps, ["back"])

@startup()
script sc_middle_support_tasks():
    assign_tasks(vex_dropship_middle_support, ["back"])

@startup()
script sc_overhang_island_tasks():
    assign_tasks(simple_fallen_overhang_island, ["back"])

@startup()
script sc_pillars_cave_tasks():
    assign_tasks(simple_vex_pillars_cave, ["back"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])

@startup()
script sc_m2_cyclops():
    m2_trigger_object_filter.add_players_with_activity_flag(af_m2_loot)
    pm_m2_trigger.set_filter(m2_trigger_object_filter)
    sleep_until(pm_m2_trigger.test_any_inside())
    vex_dropship_m2_cyclops.activate()
    sleep(4)
    vex_dropship_m2_second_wave.activate()

@startup()
script sc_m2_cyclops_tasks():
    assign_tasks(vex_dropship_m2_cyclops, ["all"])

@startup()
script sc_m2_second_wave_tasks():
    assign_tasks(vex_dropship_m2_second_wave, ["front"])
