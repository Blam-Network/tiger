bool debug_plaza
c_squad_sensor_host sq_plaza_vendor_postmaster
c_squad_sensor_host sq_plaza_vendor_crm
c_squad_sensor_host sq_plaza_vendor_pvp
c_squad_sensor_host sq_plaza_vendor_pve
c_squad_sensor_host sq_plaza_vendor_cryptarch
c_squad_sensor_host sq_plaza_vendor_tournament
c_squad_sensor_host sq_plaza_vendor_vanguard
c_squad_sensor_host sq_plaza_droid_guard1
c_squad_sensor_host sq_plaza_droid_guard2
c_squad_sensor_host sq_plaza_droid_guard3
c_squad_sensor_host sq_plaza_droid_guard4
c_squad_sensor_host sq_plaza_droid_guard5
c_squad_sensor_host sq_plaza_droid_patrol1
c_squad_sensor_host sq_plaza_droid_patrol2
c_squad_sensor_host sq_plaza_droid_patrol3
c_squad_sensor_host sq_plaza_droid_cleaners1
c_squad_sensor_host sq_plaza_civ_talkers1
c_squad_sensor_host sq_plaza_civ_talkers2
c_squad_sensor_host sq_plaza_civ_talkers3
c_squad_sensor_host sq_plaza_civ_talkers4
c_squad_sensor_host sq_plaza_civ_talkers5
c_squad_sensor_host sq_plaza_civ_talkers6
c_squad_sensor_host sq_plaza_civ_sitters1
c_squad_member_sensor_host sq_plaza_droid_cleaners1__sweeper1  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_cleaners1__scrubber1  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol1__guard1  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol1__guard2  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol1__guard3  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol1__guard4  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol2__guard1  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol2__guard2  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol2__guard3  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol3__guard1  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol3__guard2  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol3__guard3  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol3__guard4  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol3__guard5  # true name unknown
c_squad_member_sensor_host sq_plaza_droid_patrol3__guard6  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers1__talker1  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers1__talker2  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers1__listener1  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers2__talker1  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers2__talker2  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers2__listener1  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers3__talker1  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers3__talker2  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers4__talker1  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers4__talker2  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers5__talker1  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers5__talker2  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers6__talker1  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers6__talker2  # true name unknown
c_squad_member_sensor_host sq_plaza_civ_talkers6__listener1  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol1_guard1  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol1_guard2  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol1_guard3  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol1_guard4  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol2_guard1  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol2_guard2  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol2_guard3  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol3_guard1  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol3_guard2  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol3_guard3  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol3_guard4  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol3_guard5  # true name unknown
c_control_point_set_sensor_host cps_plaza_droid_patrol3_guard6  # true name unknown
c_object_sensor_host object_ball0
c_object_sensor_host object_balloon0
c_trigger_volume_slot_host tv_ball_safe_zone
c_safe_zone_sensor_host om_ball_safe_zone bind(tv_ball_safe_zone)  # true name unknown
c_safe_zone_sensor_host om_balloon_safe_zone bind(tv_ball_safe_zone)  # true name unknown
c_object_filter_sensor_host ball_filter
c_object_filter_sensor_host balloon_filter



















startup thread sc_main_plaza_thread:


    sc_plaza_vendor_postmasters.wake()
    sc_plaza_vendor_crm.wake()
    sc_plaza_vendor_cryptarch.wake()
    sc_plaza_vendor_pve.wake()
    sc_plaza_vendor_pvp.wake()
    sc_plaza_vendor_tournament.wake()
    sc_plaza_vendor_vanguard.wake()


    sc_plaza_droid_cleaners.wake()
    sc_plaza_droid_guards.wake()
    sc_plaza_droid_patrols.wake()
    sc_plaza_civ_talkers.wake()


    sc_ball_spawner.wake()
    sc_balloon_spawner.wake()




thread sc_plaza_vendor_postmasters:
    if debug_plaza: print("sc_plaza_vendor_postmasters")

    sq_plaza_vendor_postmaster.place()
    sq_plaza_vendor_postmaster.activate_temperament("temper_tower_vendor")


thread sc_plaza_vendor_crm:
    if debug_plaza: print("sc_plaza_vendor_crm")

    sq_plaza_vendor_crm.place()
    sq_plaza_vendor_crm.activate_temperament("temper_tower_guard")


thread sc_plaza_vendor_cryptarch:
    if debug_plaza: print("sc_plaza_vendor_cryptarch")

    sq_plaza_vendor_cryptarch.place()
    sq_plaza_vendor_cryptarch.activate_temperament("temper_tower_guard")


thread sc_plaza_vendor_pve:
    if debug_plaza: print("sc_plaza_vendor_pve")

    sq_plaza_vendor_pve.place()
    sq_plaza_vendor_pve.activate_temperament("temper_tower_vendor")


thread sc_plaza_vendor_pvp:
    if debug_plaza: print("sc_plaza_vendor_pvp")

    sq_plaza_vendor_pvp.place()
    sq_plaza_vendor_pvp.activate_temperament("temper_tower_vendor")


thread sc_plaza_vendor_tournament:
    if debug_plaza: print("sc_plaza_vendor_tournament")

    sq_plaza_vendor_tournament.place()
    sq_plaza_vendor_tournament.activate_temperament("temper_tower_vendor")


thread sc_plaza_vendor_vanguard:
    if debug_plaza: print("sc_plaza_vendor_vanguard")

    sq_plaza_vendor_vanguard.place()
    sq_plaza_vendor_vanguard.activate_temperament("temper_tower_vendor")




thread sc_plaza_droid_cleaners:
    if debug_plaza:
        print("sc_plaza_droid_cleaners")

    sq_plaza_droid_cleaners1__sweeper1.place()
    sq_plaza_droid_cleaners1__sweeper1.activate_temperament("temper_tower_pushbroom")
    sq_plaza_droid_cleaners1__scrubber1.place()
    sq_plaza_droid_cleaners1__scrubber1.activate_temperament("temper_tower_scrubbrush")


thread sc_plaza_droid_guards:
    if debug_plaza:
        print("sc_plaza_droid_guards")


    sq_plaza_droid_guard1.place()
    sq_plaza_droid_guard1.activate_temperament("temper_tower_guard")
    sq_plaza_droid_guard2.place()
    sq_plaza_droid_guard2.activate_temperament("temper_tower_guard")
    sq_plaza_droid_guard3.place()
    sq_plaza_droid_guard3.activate_temperament("temper_tower_guard")
    sq_plaza_droid_guard4.place()
    sq_plaza_droid_guard4.activate_temperament("temper_tower_guard")
    sq_plaza_droid_guard5.place()
    sq_plaza_droid_guard5.activate_temperament("temper_tower_guard")


thread sc_plaza_droid_patrols:

    sc_plaza_droid_patrol1_guard1.wake()
    sc_plaza_droid_patrol1_guard2.wake()
    sc_plaza_droid_patrol1_guard3.wake()
    sc_plaza_droid_patrol1_guard4.wake()


    sc_plaza_droid_patrol2_guard1.wake()
    sc_plaza_droid_patrol2_guard2.wake()
    sc_plaza_droid_patrol2_guard3.wake()


    sc_plaza_droid_patrol3_guard1.wake()
    sc_plaza_droid_patrol3_guard2.wake()
    sc_plaza_droid_patrol3_guard3.wake()
    sc_plaza_droid_patrol3_guard4.wake()
    sc_plaza_droid_patrol3_guard5.wake()
    sc_plaza_droid_patrol3_guard6.wake()


thread sc_plaza_droid_patrol1_guard1:
    if debug_plaza:
        print("sc_plaza_droid_patrol1_guard1")

    sq_plaza_droid_patrol1__guard1.place()
    sq_plaza_droid_patrol1__guard1.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol1__guard1.execute(cps_plaza_droid_patrol1_guard1); sleep_until(sq_plaza_droid_patrol1__guard1.get_command_script_state() != e_command_script_state.executing)


thread sc_plaza_droid_patrol1_guard2:
    if debug_plaza:
        print("sc_plaza_droid_patrol1_guard2")

    sq_plaza_droid_patrol1__guard2.place()
    sq_plaza_droid_patrol1__guard2.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol1__guard2.execute(cps_plaza_droid_patrol1_guard2); sleep_until(sq_plaza_droid_patrol1__guard2.get_command_script_state() != e_command_script_state.executing)







thread sc_plaza_droid_patrol1_guard3:
    if debug_plaza:
        print("sc_plaza_droid_patrol1_guard3")

    sq_plaza_droid_patrol1__guard3.place()
    sq_plaza_droid_patrol1__guard3.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol1__guard3.execute(cps_plaza_droid_patrol1_guard3); sleep_until(sq_plaza_droid_patrol1__guard3.get_command_script_state() != e_command_script_state.executing)







thread sc_plaza_droid_patrol1_guard4:
    if debug_plaza:
        print("sc_plaza_droid_patrol1_guard4")

    sq_plaza_droid_patrol1__guard4.place()
    sq_plaza_droid_patrol1__guard4.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol1__guard4.execute(cps_plaza_droid_patrol1_guard4); sleep_until(sq_plaza_droid_patrol1__guard4.get_command_script_state() != e_command_script_state.executing)


thread sc_plaza_droid_patrol2_guard1:
    if debug_plaza:
        print("sc_plaza_droid_patrol2_guard1")

    sq_plaza_droid_patrol2__guard1.place()
    sq_plaza_droid_patrol2__guard1.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol2__guard1.execute(cps_plaza_droid_patrol2_guard1); sleep_until(sq_plaza_droid_patrol2__guard1.get_command_script_state() != e_command_script_state.executing)







thread sc_plaza_droid_patrol2_guard2:
    if debug_plaza:
        print("sc_plaza_droid_patrol2_guard2")

    sq_plaza_droid_patrol2__guard2.place()
    sq_plaza_droid_patrol2__guard2.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol2__guard2.execute(cps_plaza_droid_patrol2_guard2); sleep_until(sq_plaza_droid_patrol2__guard2.get_command_script_state() != e_command_script_state.executing)







thread sc_plaza_droid_patrol2_guard3:
    if debug_plaza:
        print("sc_plaza_droid_patrol2_guard3")

    sq_plaza_droid_patrol2__guard3.place()
    sq_plaza_droid_patrol2__guard3.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol2__guard3.execute(cps_plaza_droid_patrol2_guard3); sleep_until(sq_plaza_droid_patrol2__guard3.get_command_script_state() != e_command_script_state.executing)


thread sc_plaza_droid_patrol3_guard1:
    if debug_plaza:
        print("sc_plaza_droid_patrol3_guard1")

    sq_plaza_droid_patrol3__guard1.place()
    sq_plaza_droid_patrol3__guard1.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol3__guard1.execute(cps_plaza_droid_patrol3_guard1); sleep_until(sq_plaza_droid_patrol3__guard1.get_command_script_state() != e_command_script_state.executing)







thread sc_plaza_droid_patrol3_guard2:
    if debug_plaza:
        print("sc_plaza_droid_patrol3_guard2")

    sq_plaza_droid_patrol3__guard2.place()
    sq_plaza_droid_patrol3__guard2.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol3__guard2.execute(cps_plaza_droid_patrol3_guard2); sleep_until(sq_plaza_droid_patrol3__guard2.get_command_script_state() != e_command_script_state.executing)


thread sc_plaza_droid_patrol3_guard3:
    if debug_plaza:
        print("sc_plaza_droid_patrol3_guard3")

    sq_plaza_droid_patrol3__guard3.place()
    sq_plaza_droid_patrol3__guard3.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol3__guard3.execute(cps_plaza_droid_patrol3_guard3); sleep_until(sq_plaza_droid_patrol3__guard3.get_command_script_state() != e_command_script_state.executing)


thread sc_plaza_droid_patrol3_guard4:
    if debug_plaza:
        print("sc_plaza_droid_patrol3_guard4")

    sq_plaza_droid_patrol3__guard4.place()
    sq_plaza_droid_patrol3__guard4.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol3__guard4.execute(cps_plaza_droid_patrol3_guard4); sleep_until(sq_plaza_droid_patrol3__guard4.get_command_script_state() != e_command_script_state.executing)







thread sc_plaza_droid_patrol3_guard5:
    if debug_plaza:
        print("sc_plaza_droid_patrol3_guard5")

    sq_plaza_droid_patrol3__guard5.place()
    sq_plaza_droid_patrol3__guard5.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol3__guard5.execute(cps_plaza_droid_patrol3_guard5); sleep_until(sq_plaza_droid_patrol3__guard5.get_command_script_state() != e_command_script_state.executing)







thread sc_plaza_droid_patrol3_guard6:
    if debug_plaza:
        print("sc_plaza_droid_patrol3_guard6")

    sq_plaza_droid_patrol3__guard6.place()
    sq_plaza_droid_patrol3__guard6.activate_temperament("temper_tower_guard")


    while true:
        sq_plaza_droid_patrol3__guard6.execute(cps_plaza_droid_patrol3_guard6); sleep_until(sq_plaza_droid_patrol3__guard6.get_command_script_state() != e_command_script_state.executing)


thread sc_plaza_civ_talkers:
    if debug_plaza:
        print("sc_plaza_civ_talkers")


    if random_chance(0.5):

        sq_plaza_civ_talkers1__talker1.place()
        sq_plaza_civ_talkers1__talker1.activate_temperament("temper_tower_guard")
        sq_plaza_civ_talkers1__talker2.place()
        sq_plaza_civ_talkers1__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.33):
            sq_plaza_civ_talkers1__listener1.place()
            sq_plaza_civ_talkers1__listener1.activate_temperament("temper_tower_civ_ledgesit")



    else:
        sq_plaza_civ_talkers2__talker1.place()
        sq_plaza_civ_talkers2__talker1.activate_temperament("temper_tower_guard")
        sq_plaza_civ_talkers2__talker2.place()
        sq_plaza_civ_talkers2__talker2.activate_temperament("temper_tower_civ_ledgesit")


        if random_chance(0.33):
            sq_plaza_civ_talkers2__listener1.place()
            sq_plaza_civ_talkers2__listener1.activate_temperament("temper_tower_civ_ledgesit")



    if random_chance(0.5):

        sq_plaza_civ_talkers6__talker1.place()
        sq_plaza_civ_talkers6__talker1.activate_temperament("temper_tower_guard")
        sq_plaza_civ_talkers6__talker2.place()
        sq_plaza_civ_talkers6__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.33):
            sq_plaza_civ_talkers6__listener1.place()
            sq_plaza_civ_talkers6__listener1.activate_temperament("temper_tower_civ_ledgesit")



    if random_chance(0.5):

        sq_plaza_civ_talkers3__talker1.place()
        sq_plaza_civ_talkers3__talker1.activate_temperament("temper_tower_guard")
        sq_plaza_civ_talkers3__talker2.place()
        sq_plaza_civ_talkers3__talker2.activate_temperament("temper_tower_guard")

    if random_chance(0.5):

        sq_plaza_civ_talkers4__talker1.place()
        sq_plaza_civ_talkers4__talker1.activate_temperament("temper_tower_guard")
        sq_plaza_civ_talkers4__talker2.place()
        sq_plaza_civ_talkers4__talker2.activate_temperament("temper_tower_guard")

    if random_chance(0.5):

        sq_plaza_civ_talkers5__talker1.place()
        sq_plaza_civ_talkers5__talker1.activate_temperament("temper_tower_guard")
        sq_plaza_civ_talkers5__talker2.place()
        sq_plaza_civ_talkers5__talker2.activate_temperament("temper_tower_guard")


    if random_chance(0.25):

        sq_plaza_civ_sitters1.place()
        sq_plaza_civ_sitters1.activate_temperament("temper_tower_civ_ledgesit")




thread sc_ball_spawner:


    ball_manager(object_ball0)


def ball_manager(ball):
    ball.create_anew()


    ball_filter.add(ball)


    om_ball_safe_zone.set_filter(ball_filter)


    sleep_until(not om_ball_safe_zone.any_objects_are_inside())
    print("ball no longer inside monitor")


thread sc_balloon_spawner:


    balloon_manager(object_balloon0)


def balloon_manager(balloon):
    balloon.create_anew()


    balloon_filter.add(balloon)


    om_balloon_safe_zone.set_filter(balloon_filter)


    sleep_until(not om_balloon_safe_zone.any_objects_are_inside())
    print("balloon no longer inside monitor")



def random_chance(chance):

    return mathlib.random_real(1) <= chance

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821E2004
