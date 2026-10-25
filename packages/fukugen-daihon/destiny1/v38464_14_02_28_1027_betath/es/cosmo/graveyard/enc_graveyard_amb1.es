# es\cosmo\graveyard\enc_graveyard_amb1.es
#
# The graveyard's ambient layer: Fallen in and around the buildings, a
# sniper on the roof, shanks at the back and two skiffs that fly in
# their squads (the crossroads, the tank yard). The patrol beacons stand
# from the load.
#
# Everything goes in as soon as the bubble loads: retail 2.3.1 sends
# every ambient squad, its objective and the loose objects of a
# Cosmodrome bubble in the first world update after the player gets
# there. The encounters run under the encounter manager with a budget
# that lets all of them up at once; a wiped one comes back once it has
# been out of combat for 30 s and no player is in its volume.
#
# From the cosmo patrol capture (22 minutes in the graveyard, retail's
# public host). Member counts are retail's where this build's squad has
# the member. The skiffs fly the command scripts their control points
# carry (dropship_encounter).

@activity_bundle("enc_graveyard_amb1")

encounter_manager encounters
object o_patrol_terminal
object o_patrol_terminal_1
static_array<object, 10> candy_dynamic_objects
sequence seq_graveyard_music  # WARNING: unused - never started in any capture
interactable_placement obj_placement_m0_m04 bind("0xBCF9919E")
interactable_placement obj_placement_m3_o1b bind("0x2A434703")
@member_counts({_squad: [{vandal: 1, dreg: 2}]})
simple_encounter amb_simple_far_building
@member_counts({_squad: [{dreg: 3}]})
simple_encounter amb_simple_far_building_hill
@member_counts({_squad: [{dregs: 3}]})
simple_encounter amb_simple_near_building
@member_counts({_squad: [{0xF358F4B7: 1, vandals: 3}]})
dropship_encounter amb_dropship_crossroads
simple_encounter amb_simple_back_area
@member_counts({_squad: [{0xBDC96218: 1}]})
simple_encounter amb_simple_sniper_roof
@member_counts({_squad: [{shanks: 3}]})
simple_encounter amb_simple_patrol_shanks_back_area
@member_counts({_squad: [{0x82AA10C1: 4, anchor: 1}]})
dropship_encounter amb_dropship_patrol_tank_yard
@member_counts({_squad: [{shank: 1}]})
simple_encounter amb_simple_tank_side

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 26
    encounters.add_ambient_encounter(amb_simple_far_building, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_simple_far_building_hill, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_simple_near_building, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_dropship_crossroads, 4, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_simple_back_area, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_simple_sniper_roof, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_simple_patrol_shanks_back_area, 4, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_dropship_patrol_tank_yard, 5, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_simple_tank_side, 2, 100, 20, 30, 0)

# the patrol beacons and the loose candy are out from the bubble's load
@startup()
script ss_placement_thread():
    for o in [o_patrol_terminal, o_patrol_terminal_1]:
        o.create()
    for o in candy_dynamic_objects:
        o.create()
