@activity_bundle("enc_entrance_amb1")

c_location_sensor_host entrance  # true name unknown
c_player_monitor_sensor_host pm_bubble_entrance bind(entrance)  # true name unknown
c_objective_sensor_host obj_entrance_amb1  # true name unknown
@member_counts({_squad: [{goblin: 3, harpy: 1, hybrid: 2}, {harpy: 1, hybrid: 3}], _dropship_squad: {pilot: 0}})
dropship_encounter vex_dropship_encounter01
@member_counts({_squad: [{leader: 1, fallen: 3, vandal: 2}]})
simple_encounter fallen_simple_encounter01a
@member_counts({_squad: [{leader: 1, fallen: 3, vandal: 2}]})
simple_encounter fallen_simple_encounter01b
@member_counts({_squad: [{fallen: 2, vandal: 4}, {fallen: 4}]})
simple_encounter fallen_simple_encounter02
@member_counts({_squad: [{leader: 4}, {fallen: 6}]})
simple_encounter fallen_simple_encounter03
@member_counts({_squad: [{goblin: 3}, {hybrid: 2, goblin: 2}, {minotaur: 1}]})
simple_encounter vex_simple_encounter02
@member_counts({_squad: [{goblin: 6}, {hybrid: 2, goblin: 2}, {minotaur: 1}]})
simple_encounter vex_simple_encounter03
wave_encounter entrance_amb_wave_encounter
c_squad_group_sensor_host sqg_fallen  # true name unknown
c_squad_group_sensor_host sqg_vex  # true name unknown
loot_entrance loot_venus_entrance_1
bool b_encounter_1
bool b_encounter_2
bool b_encounter_3









startup thread sc_main_thread:

    print("---------------------------------------------------------")
    print("ACADEMY ENTRANCE ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")

startup thread ss_encounter_controller_thread:






    sqg_fallen.add_child(fallen_simple_encounter01a._squad_group)
    sqg_fallen.add_child(fallen_simple_encounter01b._squad_group)
    sqg_vex.add_child(vex_dropship_encounter01._squad_group)
    sqg_fallen.add_child(fallen_simple_encounter02._squad_group)
    sqg_vex.add_child(vex_simple_encounter02._squad_group)
    vex_dropship_encounter01.set_objective(obj_entrance_amb1)
    fallen_simple_encounter01a.set_objective(obj_entrance_amb1)
    fallen_simple_encounter01b.set_objective(obj_entrance_amb1)
    vex_simple_encounter02.set_objective(obj_entrance_amb1)
    fallen_simple_encounter02.set_objective(obj_entrance_amb1)
    vex_simple_encounter03.set_objective(obj_entrance_amb1)
    fallen_simple_encounter03.set_objective(obj_entrance_amb1)


    sleep_until(pm_bubble_entrance.test_any_inside())
    while true:
        rand_encounter = mathlib.random_int_inclusive(1, 3)

        if rand_encounter == 1:

            b_encounter_1 = true
            vex_dropship_encounter01.activate()
            fallen_simple_encounter01a.activate()
            fallen_simple_encounter01b.activate()

        elif rand_encounter == 2:

            b_encounter_2 = true
            fallen_simple_encounter02.activate()
            vex_simple_encounter02.activate()
        elif rand_encounter == 3:

            b_encounter_3 = true
            fallen_simple_encounter03.activate()
        elif rand_encounter == 4:
            b_encounter_3 = true
            vex_simple_encounter03.activate()
        else:
            print(rand_encounter)

        sleep_until(not pm_bubble_entrance.test_any_inside())
        sleep(6000)
        sleep_until(not pm_bubble_entrance.test_any_inside())
        b_encounter_1 = false
        b_encounter_2 = false
        b_encounter_3 = false
        vex_dropship_encounter01.deactivate()
        fallen_simple_encounter01a.deactivate()
        fallen_simple_encounter01b.deactivate()
        fallen_simple_encounter02.deactivate()
        fallen_simple_encounter03.deactivate()
        vex_simple_encounter02.deactivate()
        vex_simple_encounter03.deactivate()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8015
