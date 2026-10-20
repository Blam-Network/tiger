@activity_bundle("enc_plaza_amb1")

@task("vex", squad: sqg_vex)
@task("fallen", squad: sqg_fallen)
objective obj_plaza_amb1
encounter_manager encounters
@member_counts({_squad: [{goblins: 3}, {goblins: 3}]})
simple_encounter vex_simple_encounter01
@member_counts({_squad: [{goblins: 3}, {goblins: 3}]})
simple_encounter vex_simple_encounter02
@member_counts({_squad: [{goblins: 3}, {goblins: 3}]})
simple_encounter vex_simple_encounter03
@member_counts({_squad: [{captain: 1, dreg: 5}]})
@objective({_squad: obj_plaza_amb1})
simple_encounter fallen_simple_encounter01
@member_counts({_squad: [{dregs: 3}, {vandals: 3}]})
@objective({_squad: obj_plaza_amb1})
simple_encounter fallen_simple_encounter02
@member_counts({_squad: [{dregs: 3}, {shank: 2, vandal: 1}]})
@objective({_squad: obj_plaza_amb1})
simple_encounter fallen_simple_encounter03
squad_group sqg_fallen
squad_group sqg_vex
loot_plaza loot_venus_plaza_1








@startup()
script ss_main_thread():

    sqg_fallen.add_child(fallen_simple_encounter01._squad_group)
    sqg_fallen.add_child(fallen_simple_encounter02._squad_group)
    sqg_vex.add_child(vex_simple_encounter01._squad_group)
    sqg_vex.add_child(vex_simple_encounter02._squad_group)
    sqg_vex.add_child(vex_simple_encounter03._squad_group)

    print("---------------------------------------------------------")
    print("ACADEMY PLAZA ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")

@startup()
script ss_encounter_controller_thread():
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
