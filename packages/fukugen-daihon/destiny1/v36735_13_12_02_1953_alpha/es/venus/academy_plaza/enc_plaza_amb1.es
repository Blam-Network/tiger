c_objective_sensor_host obj_plaza_amb1  # true name unknown
c_encounter_manager encounters  # true name unknown
simple_encounter vex_simple_encounter01
simple_encounter vex_simple_encounter02
simple_encounter vex_simple_encounter03
simple_encounter fallen_simple_encounter01
simple_encounter fallen_simple_encounter02
simple_encounter fallen_simple_encounter03
c_squad_group_sensor_host sqg_fallen  # true name unknown
c_squad_group_sensor_host sqg_vex  # true name unknown
loot_plaza loot_venus_plaza_1









startup thread ss_main_thread:

    sqg_fallen.add_child(fallen_simple_encounter01._squad_group)
    sqg_fallen.add_child(fallen_simple_encounter02._squad_group)
    sqg_vex.add_child(vex_simple_encounter01._squad_group)
    sqg_vex.add_child(vex_simple_encounter02._squad_group)
    sqg_vex.add_child(vex_simple_encounter03._squad_group)

    print("---------------------------------------------------------")
    print("ACADEMY PLAZA ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")

startup thread ss_encounter_controller_thread:
    encounters.actor_budget = 23
    encounters.add_ambient_encounter(vex_simple_encounter01, 6, 100, 20, 300, 0)
    encounters.add_ambient_encounter(vex_simple_encounter02, 6, 100, 20, 300, 0)
    encounters.add_ambient_encounter(vex_simple_encounter03, 6, 80, 20, 300, 0)
    encounters.add_ambient_encounter(fallen_simple_encounter01, 6, 120, 20, 300, 0)
    encounters.add_ambient_encounter(fallen_simple_encounter02, 6, 100, 20, 300, 0)
    encounters.add_ambient_encounter(fallen_simple_encounter03, 6, 100, 20, 300, 0)

    vex_simple_encounter01.set_objective(obj_plaza_amb1)
    vex_simple_encounter02.set_objective(obj_plaza_amb1)
    vex_simple_encounter03.set_objective(obj_plaza_amb1)
    fallen_simple_encounter02.set_objective(obj_plaza_amb1)
    fallen_simple_encounter03.set_objective(obj_plaza_amb1)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B800F
