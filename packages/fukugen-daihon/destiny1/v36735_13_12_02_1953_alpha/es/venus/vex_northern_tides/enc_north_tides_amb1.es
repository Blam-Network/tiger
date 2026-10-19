@activity_bundle("enc_north_tides_amb1")

c_objective_sensor_host obj_north_tides_amb1  # true name unknown
c_encounter_manager encounters  # true name unknown
@member_counts({_squad: [{hobgoblin_2: 2}, {minotaur_1: 1, goblin_3: 3}]})
simple_encounter vex_simple_encounter01
@member_counts({_squad: [{harpy_2: 2, minotaur_1: 1}, {goblin_3: 3}]})
simple_encounter vex_simple_encounter02
@member_counts({_squad: [{hobgoblin_3: 3}, {goblin_3: 3}]})
simple_encounter vex_simple_encounter03
@member_counts({_squad: [{goblin_3: 3}, {minotaur_1: 1, goblin_2: 2}]})
simple_encounter vex_simple_encounter04
@member_counts({_squad: [{hydra_1: 1, goblin_2: 2}, {goblin_3: 3}], _dropship_squad: {pilot: 0}})
dropship_encounter vex_dropship_encounter01
loot_north_tides loot_venus_north_tides_1
c_squad_group_sensor_host sqg_hydra  # true name unknown
c_squad_group_sensor_host sqg_sniper  # true name unknown






startup thread sc_main_thread:

    print("---------------------------------------------------------")
    print("NORTHERN TIDES ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")

    sqg_hydra.add_child(vex_dropship_encounter01._squad_group)
    sqg_sniper.add_child(vex_simple_encounter01._squad[0])

startup thread ss_encounter_controller_thread:
    encounters.actor_budget = 25
    encounters.add_ambient_encounter(vex_simple_encounter01, 6, 100, 20, 120, 0)
    encounters.add_ambient_encounter(vex_simple_encounter02, 6, 100, 20, 120, 0)
    encounters.add_ambient_encounter(vex_simple_encounter03, 6, 80, 20, 120, 0)
    encounters.add_ambient_encounter(vex_simple_encounter04, 6, 80, 20, 120, 0)
    encounters.add_ambient_encounter(vex_dropship_encounter01, 7, 120, 20, 120, 0)

    vex_simple_encounter01.set_objective(obj_north_tides_amb1)
    vex_simple_encounter02.set_objective(obj_north_tides_amb1)
    vex_simple_encounter03.set_objective(obj_north_tides_amb1)
    vex_simple_encounter04.set_objective(obj_north_tides_amb1)
    vex_dropship_encounter01.set_objective(obj_north_tides_amb1)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8016
