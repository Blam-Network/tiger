@activity_bundle("enc_engineering_amb1")
c_objective_sensor_host obj_engineering_amb1  # true name unknown
c_encounter_manager encounters  # true name unknown
@member_counts({_squad: [{cell: 3, cell_1: 2}]}) simple_encounter corner_encounter_1
@member_counts({_squad: [{cell: 3, cell_1: 1}, {cell: 3, cell_1: 1}]}) simple_encounter large_encounter_2
@member_counts({_squad: [{cell: 5, cell_1: 1}]}) simple_encounter main_encounter_3
@member_counts({_squad: [{cell: 3, cell_1: 1}, {cell: 3, cell_1: 1}]}) simple_encounter top_encounter_4
@member_counts({_squad: [{cell: 3, cell_1: 1}, {cell: 3, cell_1: 1}]}) simple_encounter small_encounter_5
loot_engineering loot_venus_engineering_1





startup thread ss_main_thread:

    print("---------------------------------------------------------")
    print("ENGINEERING ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")

startup thread ss_encounter_controller_thread:
    encounters.actor_budget = 25
    encounters.add_ambient_encounter(corner_encounter_1, 8, 80, 20, 120, 0)
    encounters.add_ambient_encounter(large_encounter_2, 8, 80, 20, 120, 0)
    encounters.add_ambient_encounter(main_encounter_3, 8, 120, 20, 120, 0)
    encounters.add_ambient_encounter(top_encounter_4, 8, 120, 20, 120, 0)
    encounters.add_ambient_encounter(small_encounter_5, 8, 80, 20, 120, 0)

    corner_encounter_1.set_objective(obj_engineering_amb1)
    large_encounter_2.set_objective(obj_engineering_amb1)
    main_encounter_3.set_objective(obj_engineering_amb1)
    top_encounter_4.set_objective(obj_engineering_amb1)
    small_encounter_5.set_objective(obj_engineering_amb1)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8008
