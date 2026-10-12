u_globals utils
c_location_sensor_host shattered_coast  # true name unknown
c_location_sensor_host headlands  # true name unknown
c_objective_sensor_host obj_shattered_amb1  # true name unknown
u_event_world_controller event_controller
c_encounter_manager encounters  # true name unknown
dropship_encounter dropship_entrance
dropship_encounter dropship_mid
simple_encounter simple_hospital01
simple_encounter simple_hospital02
simple_encounter simple_headlands
c_control_point_set_sensor_host cps_dropship_baby_shat_enter  # true name unknown
c_control_point_set_sensor_host cps_dropship_baby_shat_exit  # true name unknown
c_squad_sensor_host sq_street
c_squad_sensor_host sq_baby_shat
c_squad_sensor_host sq_dropship_baby_shat
c_squad_member_sensor_host sq_dropship_baby_shat__skiff  # true name unknown
loot_shattered loot_venus_shattered_1
interactable_placement pf_sensor01 bind("sensor01")
interactable_placement pf_sensor02 bind("sensor02")
interactable_placement pf_sensor03 bind("sensor03")









startup thread ss_main_thread:

    print("---------------------------------------------------------")
    print("SHATTERED COAST ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")

    sc_baby_shat.wake()
    sc_street.wake()

thread sc_baby_shat:

    while true:

        utils.dropship_drop(sq_dropship_baby_shat__skiff, sq_baby_shat, cps_dropship_baby_shat_enter, cps_dropship_baby_shat_exit)
        sleep_until(sq_baby_shat.alive_count() <= 0)
        sleep(120)

thread sc_street:

    while true:

        sq_street.respawn()
        sleep_until(sq_street.alive_count() <= 0)
        sleep(120)

startup thread ss_encounter_controller_thread:

    encounters.actor_budget = 15

    encounters.add_ambient_encounter(dropship_entrance, 7, 300, 30, 120, 300)
    encounters.add_ambient_encounter(dropship_mid, 7, 100, 30, 120, 300)
    encounters.add_ambient_encounter(simple_hospital01, 5, 200, 30, 120, 300)
    encounters.add_ambient_encounter(simple_hospital02, 5, 100, 30, 120, 300)
    encounters.add_ambient_encounter(simple_headlands, 5, 200, 30, 120, 300)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8010
