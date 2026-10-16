@activity_bundle("enc_south_tides_amb1")
c_objective_sensor_host obj_south_tides_amb_fallen  # true name unknown
c_objective_sensor_host obj_south_tides_amb_south  # true name unknown
c_objective_sensor_host obj_south_tides_amb_mid  # true name unknown
c_objective_sensor_host obj_south_tides_amb_north  # true name unknown
c_squad_group_sensor_host sqg_wall_snipers  # true name unknown
c_squad_group_sensor_host sqg_wall_solo  # true name unknown
loot_south_tides loot_venus_south_tides_1
c_encounter_manager encounters  # true name unknown
ambush_encounter vex_ambush_encounter
ambush_encounter vex_ambush_encounter_1
ambush_encounter vex_ambush_encounter_2
ambush_encounter vex_ambush_encounter_3
ambush_encounter vex_ambush_encounter_4
ambush_encounter vex_ambush_encounter_5
ambush_encounter vex_ambush_encounter_6
ambush_encounter vex_ambush_encounter_7
ambush_encounter vex_ambush_encounter_8
simple_encounter vex_simple_encounter
simple_encounter vex_simple_encounter_1
simple_encounter vex_simple_encounter_2
simple_encounter vex_simple_encounter_3
simple_encounter vex_simple_encounter_4
simple_encounter vex_simple_encounter_5
simple_encounter vex_simple_encounter_6
simple_encounter vex_simple_encounter_7
simple_encounter vex_simple_encounter_8
simple_encounter vex_simple_encounter_turret_1
simple_encounter vex_simple_encounter_turret_2
simple_encounter fallen_simple_encounter
vex_warp_gate vex_warp_gate00
vex_warp_gate vex_warp_gate01
vex_warp_gate vex_warp_gate02
vex_warp_gate vex_warp_gate03







startup thread sc_main_thread:
    print("---------------------------------------------------------")
    print("SOUTHERN TIDES ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")


startup thread ss_encounter_controller_thread:

    sqg_wall_snipers.add_child(vex_ambush_encounter_3._squad_group)
    sqg_wall_snipers.add_child(vex_simple_encounter_3._squad_group)
    sqg_wall_solo.add_child(vex_ambush_encounter_6._squad_group)
    sqg_wall_solo.add_child(vex_simple_encounter_6._squad_group)

    encounters.actor_budget = 23
    obj_south_tides_amb_fallen.reset()
    obj_south_tides_amb_south.reset()
    obj_south_tides_amb_mid.reset()
    obj_south_tides_amb_north.reset()
    encounters.add_ambient_encounter(fallen_simple_encounter, 7, 120, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_ambush_encounter, 4, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_simple_encounter, 4, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_ambush_encounter_1, 3, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_simple_encounter_1, 3, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_ambush_encounter_2, 3, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_simple_encounter_2, 3, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_ambush_encounter_3, 3, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_simple_encounter_3, 3, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_ambush_encounter_4, 4, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_simple_encounter_4, 4, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_ambush_encounter_5, 4, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_simple_encounter_5, 4, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_ambush_encounter_6, 1, 80, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_simple_encounter_6, 1, 80, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_ambush_encounter_7, 6, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_simple_encounter_7, 6, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_ambush_encounter_8, 2, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_simple_encounter_8, 2, 100, 10000, 240, 500)
    encounters.add_ambient_encounter(vex_simple_encounter_turret_1, 1, 120, 5000, 240, 500)
    encounters.add_ambient_encounter(vex_simple_encounter_turret_2, 1, 120, 5000, 240, 500)

    encounters.add_exclusion(vex_ambush_encounter, vex_simple_encounter)
    encounters.add_exclusion(vex_ambush_encounter_1, vex_simple_encounter_1)
    encounters.add_exclusion(vex_ambush_encounter_2, vex_simple_encounter_2)
    encounters.add_exclusion(vex_ambush_encounter_3, vex_simple_encounter_3)
    encounters.add_exclusion(vex_ambush_encounter_4, vex_simple_encounter_4)
    encounters.add_exclusion(vex_ambush_encounter_5, vex_simple_encounter_5)
    encounters.add_exclusion(vex_ambush_encounter_6, vex_simple_encounter_6)
    encounters.add_exclusion(vex_ambush_encounter_7, vex_simple_encounter_7)
    encounters.add_exclusion(vex_ambush_encounter_8, vex_simple_encounter_8)

    fallen_simple_encounter.set_objective(obj_south_tides_amb_fallen)
    vex_ambush_encounter.set_objective(obj_south_tides_amb_south)
    vex_simple_encounter.set_objective(obj_south_tides_amb_south)
    vex_ambush_encounter_1.set_objective(obj_south_tides_amb_south)
    vex_simple_encounter_1.set_objective(obj_south_tides_amb_south)
    vex_ambush_encounter_2.set_objective(obj_south_tides_amb_south)
    vex_simple_encounter_2.set_objective(obj_south_tides_amb_south)

    vex_ambush_encounter_3.set_objective(obj_south_tides_amb_mid)
    vex_simple_encounter_3.set_objective(obj_south_tides_amb_mid)
    vex_ambush_encounter_4.set_objective(obj_south_tides_amb_mid)
    vex_simple_encounter_4.set_objective(obj_south_tides_amb_mid)
    vex_ambush_encounter_5.set_objective(obj_south_tides_amb_mid)
    vex_simple_encounter_5.set_objective(obj_south_tides_amb_mid)

    vex_ambush_encounter_6.set_objective(obj_south_tides_amb_north)
    vex_simple_encounter_6.set_objective(obj_south_tides_amb_north)
    vex_ambush_encounter_7.set_objective(obj_south_tides_amb_north)
    vex_simple_encounter_7.set_objective(obj_south_tides_amb_north)
    vex_ambush_encounter_8.set_objective(obj_south_tides_amb_north)
    vex_simple_encounter_8.set_objective(obj_south_tides_amb_north)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8017
