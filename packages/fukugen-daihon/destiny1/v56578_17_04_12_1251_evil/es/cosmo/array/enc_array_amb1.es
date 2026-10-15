# es\cosmo\array\enc_array_amb1.es
#
# The Array's ambient layer: Fallen and Hive around the helipad, dome C, the
# valley and the front door, and an ambush under the landing pad. Everything
# goes in as soon as the bubble loads (within 10 s on the Last Array's public
# host). A wiped encounter comes back 30 s later, once no player is in its
# volume (retail's dome A Fallen were back a second after the player left).
# The Last Array's dead Ghosts drop from these Fallen. The strike rows
# (obj_strike_2, the captain and his dropship) never moved in any capture
# and are left alone.

c_encounter_manager encounters
simple_encounter amb_smpl_fallen_domec01
simple_encounter amb_smpl_fallen_helipad01
simple_encounter amb_smpl_fallen_valley01
simple_encounter amb_smpl_hive_frontdoor01
simple_encounter amb_smpl_hive_basement02
simple_encounter amb_smpl_hive_helipad01
simple_encounter amb_smpl_hive_domec01
ambush_encounter amb_ambush_underpad
wave_encounter amb_wave_hive_basement

startup thread ss_encounter_controller_thread:
    encounters.actor_budget = 48
    for enc in [amb_smpl_fallen_domec01, amb_smpl_fallen_helipad01, amb_smpl_fallen_valley01, amb_smpl_hive_frontdoor01, amb_smpl_hive_basement02, amb_smpl_hive_helipad01, amb_smpl_hive_domec01]:
        encounters.add_ambient_encounter(enc, 6, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_ambush_underpad, 3, 100, 20, 30, 0)
