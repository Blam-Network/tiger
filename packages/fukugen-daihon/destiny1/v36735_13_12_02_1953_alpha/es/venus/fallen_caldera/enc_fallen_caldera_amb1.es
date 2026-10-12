c_objective_sensor_host obj_caldera_amb1  # true name unknown
u_event_world_controller event_controller
c_encounter_manager encounters  # true name unknown
simple_encounter simple_amb_pocket
simple_encounter simple_btm_ramp
simple_encounter simple_tank_inf
simple_encounter simple_thieves
static_array<u_event_dropship_multipoint_temp, 1> pf_event_dropship_multipoint_fallen_temp
static_array<u_event_vex_block, 1> pf_event_vex_block
c_squad_sensor_host sq_rim01
c_squad_sensor_host sq_rim02
c_squad_sensor_host sq_lower01
c_squad_sensor_host sq_tank_inf
c_squad_sensor_host sq_pike01
c_squad_sensor_host sq_pike02
c_squad_sensor_host sq_spider_tank01
c_squad_sensor_host sq_pocket01
c_squad_group_sensor_host sqg_pikes  # true name unknown
c_squad_group_sensor_host sqg_rim  # true name unknown
c_squad_group_sensor_host sqg_lower  # true name unknown
c_control_point_sensor_host dropship_enter  # true name unknown
c_control_point_sensor_host dropship_exit  # true name unknown
loot_caldera loot_venus_caldera_1











startup thread ss_main_thread:

    print("---------------------------------------------------------")
    print("FALLEN CALDERA ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")




    sqg_rim.add_child(sq_rim01)
    sqg_rim.add_child(sq_rim02)

    sqg_lower.add_child(sq_lower01)

    sqg_pikes.add_child(sq_pike01)
    sqg_pikes.add_child(sq_pike02)









startup thread ss_encounter_controller_thread:

    encounters.actor_budget = 23

    encounters.add_ambient_encounter(simple_thieves, 7, 300, 10, 60, 0)
    encounters.add_ambient_encounter(simple_btm_ramp, 5, 200, 30, 120, 0)
    encounters.add_ambient_encounter(simple_tank_inf, 4, 100, 30, 120, 300)
    encounters.add_ambient_encounter(simple_amb_pocket, 6, 100, 30, 120, 300)

    encounters.add_unmanaged_encounter(pf_event_dropship_multipoint_fallen_temp[0], 8)
    encounters.add_unmanaged_encounter(pf_event_vex_block[0], 7)

startup thread ss_event_thread:

    sleep(mathlib.random_int_inclusive(40, 90))


    event_controller.set_event_frequency(60)
    event_controller.start_2_weighted(pf_event_vex_block, 50, pf_event_dropship_multipoint_fallen_temp, 50)

thread sc_pike_squads:



    sq_pike01.respawn()
    sq_pike02.respawn()

    while true:
        sleep_until(sqg_pikes.alive_count() <= 0 and not pf_event_vex_block[0].main.is_running())
        sleep(90)
        sq_pike01.respawn()
        sq_pike02.respawn()

thread sc_rim_squads:

    sq_rim01.respawn()
    sq_rim02.respawn()

    while true:

        for wave in range(3):
            sleep_until(sqg_rim.alive_count() <= 5)
            sqg_rim.respawn()

        sleep_until(sqg_rim.alive_count() <= 0)
        sleep(75)
        sqg_rim.respawn()

thread sc_lower_squads:

    sq_lower01.respawn()

    while true:

        sleep_until(sqg_lower.alive_count() <= 2)
        sleep(45)
        sq_lower01.respawn()

thread sc_spider_tank:

    sq_spider_tank01.respawn()

    while true:

        sleep_until(sq_spider_tank01.alive_count() <= 0)
        sleep(90)
        sq_spider_tank01.respawn()

thread sc_tank_inf:

    sq_tank_inf.respawn()

    while true:

        sleep_until(sq_tank_inf.alive_count() <= 0)
        sleep(60)
        sq_tank_inf.respawn()

thread sc_pockets:

    sq_pocket01.respawn()

    while true:

        sleep_until(sq_pocket01.alive_count() <= 0)
        sleep(30)
        sq_pocket01.respawn()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B800A
