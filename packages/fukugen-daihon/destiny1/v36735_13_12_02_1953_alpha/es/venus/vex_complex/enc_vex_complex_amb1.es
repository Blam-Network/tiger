@activity_bundle("enc_vex_complex_amb1")
u_globals utils
c_objective_sensor_host obj_complex_amb1  # true name unknown
u_event_world_controller event_controller
c_encounter_manager encounters  # true name unknown
@member_counts({_squad: [{minotaur: 1, goblins: 2}, {goblins: 3}]}) simple_encounter simple_south
@member_counts({_squad: [{minotaur: 2}, {goblins: 3}, {goblins: 3}]}) simple_encounter simple_north
@member_counts({_squad: [{minotaur: 2, major_minotaur: 1}]}) simple_encounter simple_tower
@member_counts({_squad: [{minotaur: 1, goblins: 3}, {goblins: 4}]}) simple_encounter simple_bridge
interactable_placement pf_crows_beacon bind("crows_beacon")
@member_counts({minotaur_major: 1}) c_squad_sensor_host sq_bridge_guardian01
@member_counts({minotaur_major: 1}) c_squad_sensor_host sq_bridge_guardian02
c_squad_group_sensor_host sqg_bridge_guardians  # true name unknown
loot_complex loot_venus_complex_1












startup thread sc_main_thread:

    sleep(3)
    print("---------------------------------------------------------")
    print("COMPLEX ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")

    sqg_bridge_guardians.add_child(sq_bridge_guardian01)
    sqg_bridge_guardians.add_child(sq_bridge_guardian02)

    sc_bridge_guardians.wake()

startup thread ss_encounter_controller_thread:

    encounters.actor_budget = 25

    encounters.add_ambient_encounter(simple_bridge, 8, 150, 30, 60, 0)
    encounters.add_ambient_encounter(simple_north, 8, 100, 30, 60, 0)
    encounters.add_ambient_encounter(simple_south, 6, 200, 30, 180, 300)







startup thread ss_event_thread:

    sleep(mathlib.random_int_inclusive(40, 90))


    event_controller.set_event_frequency(200)



thread sc_bridge_guardians:

    sq_bridge_guardian01.place()
    sq_bridge_guardian02.place()

    while true:

        sleep_until(sqg_bridge_guardians.alive_count() <= 0)
        sleep(45)
        sq_bridge_guardian01.respawn()
        sq_bridge_guardian02.respawn()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8005
