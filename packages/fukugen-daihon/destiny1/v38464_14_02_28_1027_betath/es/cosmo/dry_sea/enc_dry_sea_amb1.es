# es\cosmo\dry_sea\enc_dry_sea_amb1.es
#
# The dry sea's ambient layer: Fallen around the wrecked ships, the
# plateau, the caves and Rasputin's island, the pikes and the hive
# shore patrols that walk their routes (patrol_encounter), and the
# story objectives' placements put out ahead of their missions.
#
# Everything goes in as soon as the bubble loads: retail 2.3.1 sends
# every ambient squad, its objective and the loose objects of a
# Cosmodrome bubble in the first world update after the player gets
# there. The encounters run under the encounter manager with a budget
# that lets all of them up at once; a wiped one comes back once it has
# been out of combat for 30 s and no player is in its volume.
#
# Member counts from retail's dry sea (act_cosmo_m2_dome_c's public
# host). Each amb_ptrl_<x> route is walked by the amb_smpl_<x> beside
# it, whose own objective has no tasks.

@activity_bundle("enc_dry_sea_amb1")

encounter_manager encounters
object o_patrol_terminal
object o_patrol_terminal_1
static_array<object, 10> candy_dynamic_objects
sequence seq_ambient_music  # WARNING: unused - never started in any capture
@member_counts({_squad: [{vandal: 2, captain: 1}, {dreg: 3}]})
simple_encounter amb_smpl_mainship01
@member_counts({_squad: [{vandal: 2}]})
simple_encounter amb_smpl_shipnose01
patrol_encounter amb_ptrl_pikes01
simple_encounter amb_smpl_pikes01
@member_counts({_squad: [{dreg: 2}]})
simple_encounter amb_smpl_fallen_deltan01
patrol_encounter amb_ptrl_hiveshore01
@member_counts({_squad: [{dreg: 1, vandal: 1}]})
simple_encounter amb_smpl_hiveshore01
@member_counts({_squad: [{dreg: 2, vandal: 1}, {captain: 1, vandal: 1}]})
simple_encounter amb_smpl_raspisland01
@member_counts({_squad: [{0xCA34EB61: 1, shank: 1}]})
simple_encounter amb_smpl_rockplateau01
@member_counts({_squad: [{dreg: 2}]})
simple_encounter amb_smpl_bigcave01
@member_counts({_squad: [{dreg: 1, shank: 1}]})
simple_encounter amb_smpl_caveopening01
simple_encounter amb_smpl_domecshed01
interactable_placement ip_bounty_dry_sea2 bind("ip_bounty_dry_sea2")
interactable_placement_set obj_m2_o2b_placement
@member_counts({_squad: [{shank: 2}]})
simple_encounter amb_smpl_southshore

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 27
    amb_ptrl_pikes01.add_patrol(amb_smpl_pikes01)
    amb_ptrl_hiveshore01.add_patrol(amb_smpl_hiveshore01)
    encounters.add_ambient_encounter(amb_smpl_mainship01, 6, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_shipnose01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_pikes01, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_fallen_deltan01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_hiveshore01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_raspisland01, 5, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_rockplateau01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_bigcave01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_caveopening01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_domecshed01, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_southshore, 2, 100, 20, 30, 0)

# the patrol beacons and the loose candy are out from the bubble's load
@startup()
script ss_placement_thread():
    for o in [o_patrol_terminal, o_patrol_terminal_1]:
        o.create()
    for o in candy_dynamic_objects:
        o.create()
