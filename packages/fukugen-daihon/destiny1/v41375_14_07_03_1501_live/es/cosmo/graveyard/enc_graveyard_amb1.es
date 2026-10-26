# es\cosmo\graveyard\enc_graveyard_amb1.es
#
# The graveyard's ambient layer (public bubble 12): Fallen in and around
# the near and far buildings, a sniper on a roof, Shanks by the tank and in
# the back lot, and two dropship encounters at the crossroads and the tank
# yard.
#
# From one capture (the Cosmodrome patrol's graveyard host, 2026-10-23,
# 1347 s with the player in the bubble throughout; dead from 544 s on, so
# only the first nine minutes are read):
# - Every encounter but the back lot's Shanks is on the ground at the
#   bubble's load, the two dropship encounters' squads included, with no
#   ship. The Shanks go in about 40 s after the load.
# - A wiped encounter comes back 41-55 s after its last body died (six
#   returns of the buildings' Fallen), once no player is in its volume.
# - A wiped dropship encounter is brought back by its ship: 42 s after the
#   wipe, or as the player left its volume when they stayed longer (the
#   crossroads twice), and its troops are down 16 s after the ship
#   arrives.
# - The patrol beacons and the loose candy are out from the load.
# The music never played.

@activity_bundle("enc_graveyard_amb1")

static_array<object, 2> patrol_beacons
static_array<object, 10> candy_dynamic_objects
encounter_manager encounters
@member_counts({_squad: [{vandal: 1, dreg: 2}]})
simple_encounter amb_simple_far_building
@member_counts({_squad: [{dreg: 3}]})
simple_encounter amb_simple_far_building_hill
@member_counts({_squad: [{dregs: 3}]})
simple_encounter amb_simple_near_building
@member_counts({_squad: [{sniper_vandals: 1, vandal: 1}]})
simple_encounter amb_simple_sniper_roof
@member_counts({_squad: [{shanks: 3, 0xD1563614: 1}]})
simple_encounter amb_simple_patrol_shanks_back_area
@member_counts({_squad: [{shank: 2}]})
simple_encounter amb_simple_tank_side
@member_counts({_squad: [{0xF358F4B7: 1, vandals: 3}]})
dropship_encounter amb_dropship_crossroads
@member_counts({_squad: [{0x82AA10C1: 4, anchor: 1}]})
dropship_encounter amb_dropship_patrol_tank_yard

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()
    for candy in candy_dynamic_objects:
        candy.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 17
    encounters.add_ambient_encounter(amb_simple_far_building, 3, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_simple_far_building_hill, 3, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_simple_near_building, 3, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_simple_sniper_roof, 2, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_simple_tank_side, 2, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_simple_patrol_shanks_back_area, 4, 100, 20, 40, 40)

    # the dropship encounters start on the ground; the manager only takes
    # them once their first squads are gone, and their ships bring them
    # back from then on
    for enc in [amb_dropship_crossroads, amb_dropship_patrol_tank_yard]:
        encounters.add_ambient_encounter(enc, 0, 100, 20, 40, 0)
        encounters.suppress_encounter(enc, true)

@startup()
script sc_crossroads():
    on_the_ground(amb_dropship_crossroads, ["inner"])

@startup()
script sc_tank_yard():
    on_the_ground(amb_dropship_patrol_tank_yard, ["task"])

def on_the_ground(enc, tasks):
    for s in enc._squad:
        enc._squad_group.add_child(s)
    enc._objective.add_squad(enc._squad_group)
    enc._squad_group.place()
    assign_tasks(enc, tasks)

    sleep_until(enc._squad_group.alive_count() == 0)
    sleep(40)
    sleep_until(not enc._player_monitor.test_any_inside())
    encounters.suppress_encounter(enc, false)

@startup()
# TU0's squads carry no objective of their own, so each takes its
# encounter's objective and the task retail gave it (by influencer) once the
# encounter has placed it.
script sc_far_building_tasks():
    assign_tasks(amb_simple_far_building, ["inner"])

@startup()
script sc_far_building_hill_tasks():
    assign_tasks(amb_simple_far_building_hill, ["inner"])

@startup()
script sc_near_building_tasks():
    assign_tasks(amb_simple_near_building, ["inner"])

@startup()
script sc_sniper_roof_tasks():
    assign_tasks(amb_simple_sniper_roof, ["inner"])

@startup()
script sc_patrol_shanks_back_area_tasks():
    assign_tasks(amb_simple_patrol_shanks_back_area, ["inner"])

@startup()
script sc_tank_side_tasks():
    assign_tasks(amb_simple_tank_side, ["inner"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
