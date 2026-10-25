# es\cosmo\delta_s\enc_delta_south_amb1.es
#
# The delta south's ambient layer (the steppes, where the patrol lands
# in retail): Fallen at the shacks, the comms tower, the crashed ship
# and the overpass, three skiffs (the crashed ship, the hangar, the
# shack), the Hive ambush in the cable trench, the south road patrol
# and the story objectives' placements.
#
# Everything goes in as soon as the bubble loads: retail 2.3.1 sends
# every ambient squad, its objective and the loose objects of a
# Cosmodrome bubble in the first world update after the player gets
# there. The encounters run under the encounter manager with a budget
# that lets all of them up at once; a wiped one comes back once it has
# been out of combat for 30 s and no player is in its volume.
#
# From the cosmo patrol capture and the Cosmodrome missions' public
# hosts (21 runs pooled). The hangar skiff came in once in two runs,
# 88 s after the load; the ambushes take their objective at the load
# and go in as a player reaches their volume. The south patrol
# (amb_ptrl_south01) is walked by amb_ptrl_smpl_south01.

@activity_bundle("enc_delta_south_amb1")

encounter_manager encounters
sequence seq_ambient_music  # WARNING: unused - never started in any capture
@member_counts({_squad: [{shanks: 1, vandal: 2}]})
dropship_encounter amb_dropship_crashedship_1
@member_counts({_squad: [{shanks: 1, vandal: 1, dreg: 1}]})
dropship_encounter amb_dropship_hangar_1
dropship_encounter amb_dropship_shack_1
simple_encounter amb_smpl_comms01
simple_encounter amb_smpl_crashedship01
ambush_encounter amb_triggered_ch2ambush
simple_encounter amb_smpl_cliffshack01
simple_encounter amb_ptrl_smpl_road01
@member_counts({_squad: [{dreg: 2, 0xB6192288: 2, vandal: 2}]})
simple_encounter amb_smpl_shack01
patrol_encounter amb_ptrl_south01
@member_counts({_squad: [{dreg: 2}]})
simple_encounter amb_ptrl_smpl_south01
simple_encounter amb_smpl_overpass01
@member_counts({_squad: [{trooper: 2}]})
ambush_encounter amb_ambush_cablehive01
simple_encounter amb_smpl_transit01
interactable_placement obj_placement_ch2_m01 bind("0xD8D5AC5C")
interactable_placement obj_placement_ch3_m03 bind("0x3E483AD7")
interactable_placement obj_placement_m1_o1 bind("0x5FF143DF")
interactable_placement obj_placement_m0_5_o1 bind("0x6607D3FA")
interactable_placement obj_placement_m0_5_o2 bind("0xDE0933DB")
static_array<object, 10> candy_dynamic_objects

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 40
    amb_ptrl_south01.add_patrol(amb_ptrl_smpl_south01)
    encounters.add_ambient_encounter(amb_dropship_crashedship_1, 4, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_dropship_hangar_1, 4, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_dropship_shack_1, 4, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_comms01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_crashedship01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_triggered_ch2ambush, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cliffshack01, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_ptrl_smpl_road01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_shack01, 7, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_ptrl_smpl_south01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_overpass01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_ambush_cablehive01, 4, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_transit01, 2, 100, 20, 30, 0)

# the patrol beacons and the loose candy are out from the bubble's load
@startup()
script ss_placement_thread():
    for o in candy_dynamic_objects:
        o.create()
