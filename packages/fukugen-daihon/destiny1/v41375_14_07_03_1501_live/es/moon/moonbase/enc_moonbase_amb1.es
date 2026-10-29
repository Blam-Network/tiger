# es\moon\moonbase\enc_moonbase_amb1.es
#
# The moonbase's ambient layer (the Moon's public bubble 6, Archer's Line),
# loaded by the Moon patrol and the Moon story missions that cross it. Puts
# out the patrol beacons and the base's dynamic props, mission 1's terminal,
# and the Fallen around the crossroads, the habitat, the comm towers and the
# landing zone. Nine to eleven encounters are up as soon as the bubble
# loads; when one is wiped out another takes its place, and each brings its
# squad back on its own respawn timer (the objective reset every 31-32 s on
# the wire).
# Pooled over five fresh starts: act_moon_m1_launchtubes' public host (the
# player in the bubble for 107 s) and four of the Moon patrol's (Patrol
# Luna of 2026-10-28: 420 s, 188 s, 60 s and 33 s):
# - up at the first apply, 24-25 bodies each time: crossroads_small, dome
#   and hab_2f in all five, and a different draw of the rest each run
#   (loot_tower and tower_sniper in the four patrol runs, tower_large in
#   three, dropship_tower's troops in the first only). The costs are the
#   bodies the server placed.
# - a wiped encounter came back 8-65 s later or another took its place;
#   the 20 s cooldown is fit to the first run.
# - lz_lurkers was never up at load (in at 71-131 s), so it waits out the
#   first placement; defense_large never went in.
# - the cage went up 1.4 s after the player used the terminal, opened 11 s
#   later and was gone a second after that.
# The mission's objective on the terminal is act_moon_m1_launchtubes'
# (mission 3); this bundle only puts the terminal out.

@activity_bundle("enc_moonbase_amb1")

static_array<object, 4> patrol_beacons
static_array<object, 10> dynamics
object o_m01_guardian_cage
interactable_placement pf_placement_m1_terminal bind("0x8362596D")
encounter_manager encounters
simple_encounter sp_simple_crossroads_small
@member_counts({_squad: [{0x63C6BDC0: 3}]})
simple_encounter sp_simple_commtower_main
simple_encounter sp_simple_defense_small
@member_counts({_squad: [{cell_dreg: 2}, {}]})
simple_encounter sp_simple_hab_2f
simple_encounter sp_simple_loot_hab
# dropship_tower's ship (its dropship rows) never flew on the wire: the
# troops stood from the first apply and came back on the encounter's own
# respawn timer.
@member_counts({_squad: [{0x63C6BDC0: 3, captain: 1}]})
simple_encounter sp_dropship_tower
@member_counts({_squad: [{0xA2D60243: 2}]})
simple_encounter sp_simple_hab_outer
simple_encounter sp_simple_loot_tower
simple_encounter sp_simple_tower_sniper
@member_counts({_squad: [{0x63C6BDC0: 2}]})
simple_encounter sp_simple_edge
simple_encounter sp_simple_tower_hill
@member_counts({_squad: [{0xA2D60243: 2}]})
simple_encounter sp_simple_lz_lurkers
@member_counts({_squad: [{vandal: 1, 0xA2D60243: 2}]})
simple_encounter sp_simple_crossroads_big
simple_encounter sp_simple_dome
@member_counts({_squad: [{cell_captain: 1, 0xA2D60243: 2}]})
simple_encounter sp_simple_hab_support
@member_counts({_squad: [{captain: 1, 0xA2D60243: 3}]})
simple_encounter sp_simple_tower_large
@member_counts({_squad: [{vandal: 1, shank: 1}]})
simple_encounter sp_simple_tower_small
@member_counts({_squad: [{cell_dreg: 4}]})
simple_encounter sp_simple_hab_1f
simple_encounter sp_simple_defense_large

@startup()
script sc_moonbase_props():
    for beacon in patrol_beacons:
        beacon.create()
    for prop in dynamics:
        prop.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 25
    encounters.add_ambient_encounter(sp_simple_crossroads_small, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_commtower_main, 3, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_defense_small, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_hab_2f, 4, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_loot_hab, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_dropship_tower, 4, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_hab_outer, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_loot_tower, 1, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_tower_sniper, 1, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_edge, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_tower_hill, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_crossroads_big, 3, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_dome, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_hab_support, 3, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_tower_large, 4, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_tower_small, 2, 100, 20, 20, 0)
    encounters.add_ambient_encounter(sp_simple_hab_1f, 4, 100, 20, 20, 0)
    # never up at load: waits out the first placement
    encounters.add_ambient_encounter(sp_simple_lz_lurkers, 2, 100, 20, 20, 10)
    # never placed on the wire: TU0's default bodies
    encounters.add_ambient_encounter(sp_simple_defense_large, 2, 100, 20, 20, 10)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them, and the first task for the one never seen up.
script sc_crossroads_small_tasks():
    assign_tasks(sp_simple_crossroads_small, ["fallback"])

@startup()
script sc_commtower_main_tasks():
    assign_tasks(sp_simple_commtower_main, ["fallback"])

@startup()
script sc_defense_small_tasks():
    assign_tasks(sp_simple_defense_small, ["fallback"])

@startup()
script sc_hab_2f_tasks():
    assign_tasks(sp_simple_hab_2f, ["0x2932E671", "fallback"])

@startup()
script sc_loot_hab_tasks():
    assign_tasks(sp_simple_loot_hab, ["task"])

@startup()
script sc_dropship_tower_tasks():
    assign_tasks(sp_dropship_tower, ["0xAFAA879D"])

@startup()
script sc_hab_outer_tasks():
    assign_tasks(sp_simple_hab_outer, ["0x218DA55F"])

@startup()
script sc_loot_tower_tasks():
    assign_tasks(sp_simple_loot_tower, ["task"])

@startup()
script sc_tower_sniper_tasks():
    assign_tasks(sp_simple_tower_sniper, ["fallback"])

@startup()
script sc_edge_tasks():
    assign_tasks(sp_simple_edge, ["search"])

@startup()
script sc_tower_hill_tasks():
    assign_tasks(sp_simple_tower_hill, ["0x1C0AB82B"])

@startup()
script sc_lz_lurkers_tasks():
    assign_tasks(sp_simple_lz_lurkers, ["0xB15AAFD1"])

@startup()
script sc_crossroads_big_tasks():
    assign_tasks(sp_simple_crossroads_big, ["fallback"])

@startup()
script sc_dome_tasks():
    assign_tasks(sp_simple_dome, ["task_interior"])

@startup()
script sc_hab_support_tasks():
    assign_tasks(sp_simple_hab_support, ["0x218DA55F"])

@startup()
script sc_defense_large_tasks():
    assign_tasks(sp_simple_defense_large, ["fallback"])

@startup()
script sc_tower_large_tasks():
    assign_tasks(sp_simple_tower_large, ["fallback"])

@startup()
script sc_tower_small_tasks():
    assign_tasks(sp_simple_tower_small, ["fallback"])

@startup()
script sc_hab_1f_tasks():
    assign_tasks(sp_simple_hab_1f, ["fallback_2f"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])

@startup()
# The cage goes up over the terminal while it is in use, opens and clears.
# Seen once; each later use is the natural reading.
script sc_guardian_cage():
    while true:
        sleep_until(pf_placement_m1_terminal._interactable.is_active())
        o_m01_guardian_cage.create()
        sleep(11)
        o_m01_guardian_cage.set_device_position(1)
        sleep(1)
        o_m01_guardian_cage.delete_object()
        sleep_until(not pf_placement_m1_terminal._interactable.is_active())
