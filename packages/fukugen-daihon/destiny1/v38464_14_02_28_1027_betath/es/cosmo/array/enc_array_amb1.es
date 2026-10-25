# es\cosmo\array\enc_array_amb1.es
#
# The Array's ambient layer: Fallen and Hive around the helipad, dome C, the
# stairs, the valley, the tiny shack, the basement and the front door.
# Everything goes in as soon as the bubble loads (within 10 s on the Last
# Array's public host, TU0). A wiped encounter comes back 30 s later, once no
# player is in its volume. The pre-alpha has no ambush under the landing pad
# and no basement wave. Its hive valley patrol route (amb_ptrl_hive_valley01)
# is walked by amb_smpl_hive_valley01, whose objective is the one beside it
# (patrol_encounter). Member counts are TU0's where the pre-alpha's squad has
# the member (the helipad's second Fallen member is 0xCA34EB61, as in the
# Alpha Trial); the encounters TU0 lacks spawn one body per member. The patrol
# beacons stand from the load, as retail's patrol_beacons[] do in every
# patrol bubble.

@activity_bundle("enc_array_amb1")

encounter_manager encounters
object o_patrol_terminal
object o_patrol_terminal_1
sequence seq_ambient_music  # WARNING: unused - never started in any capture
@member_counts({_squad: [{dreg: 2}, {vandal: 2}]})
simple_encounter amb_smpl_fallen_domec01
@member_counts({_squad: [{vandal: 2, 0xCA34EB61: 2}, {dreg: 2}]})
simple_encounter amb_smpl_fallen_helipad01
simple_encounter amb_smpl_fallen_stairs01
@member_counts({_squad: [{dreg: 2, vandal: 1}]})
simple_encounter amb_smpl_fallen_valley01
simple_encounter amb_smpl_fallen_tinyshack01
simple_encounter amb_smpl_hive_basement01
@member_counts({_squad: [{trooper: 3}]})
simple_encounter amb_smpl_hive_frontdoor01
@member_counts({_squad: [{trooper: 4}]})
simple_encounter amb_smpl_hive_helipad01
@member_counts({_squad: [{trooper: 3}]})
simple_encounter amb_smpl_hive_domec01
simple_encounter amb_smpl_hive_valley01
patrol_encounter amb_ptrl_hive_valley01

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 48
    amb_ptrl_hive_valley01.add_patrol(amb_smpl_hive_valley01)
    for enc in [amb_smpl_fallen_domec01, amb_smpl_fallen_helipad01, amb_smpl_fallen_stairs01, amb_smpl_fallen_valley01, amb_smpl_fallen_tinyshack01, amb_smpl_hive_basement01, amb_smpl_hive_frontdoor01, amb_smpl_hive_helipad01, amb_smpl_hive_domec01, amb_smpl_hive_valley01]:
        encounters.add_ambient_encounter(enc, 6, 100, 20, 30, 0)

# the patrol beacons are out from the bubble's load
@startup()
script ss_placement_thread():
    for o in [o_patrol_terminal, o_patrol_terminal_1]:
        o.create()
