bool debug_underwatch
c_squad_sensor_host sq_underwatch_titans_guards1
c_squad_sensor_host sq_underwatch_titans_guards2
c_squad_sensor_host sq_underwatch_titans_talkers1
c_squad_sensor_host sq_underwatch_titans_talkers2
c_squad_sensor_host sq_underwatch_titans_talkers3
c_squad_sensor_host sq_underwatch_titans_talkers4
c_squad_sensor_host sq_underwatch_titans_watchers1
c_squad_sensor_host sq_underwatch_titans_watchers2
c_squad_sensor_host sq_underwatch_wolves1
c_squad_sensor_host sq_underwatch_droid_cleaners1
c_squad_member_sensor_host sq_underwatch_titans_talkers1__talker1  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_talkers1__talker2  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_talkers1__listener1  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_talkers2__talker1  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_talkers2__talker2  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_talkers2__listener1  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_talkers3__talker1  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_talkers3__talker2  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_talkers3__listener1  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_talkers4__talker1  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_talkers4__talker2  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_talkers4__listener1  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_watchers1__watcher1  # true name unknown
c_squad_member_sensor_host sq_underwatch_titans_watchers1__watcher2  # true name unknown
c_squad_member_sensor_host sq_underwatch_droid_cleaners1__sweeper1  # true name unknown
c_squad_member_sensor_host sq_underwatch_droid_cleaners1__scrubber1  # true name unknown
c_squad_member_sensor_host sq_underwatch_wolves1__wolf1  # true name unknown
c_squad_member_sensor_host sq_underwatch_wolves1__wolf2  # true name unknown
c_squad_sensor_host sq_underwatch_vendor_guardian_mentor
c_squad_sensor_host sq_underwatch_vendor_guardian_outfitter
c_squad_sensor_host sq_underwatch_vendor_guardian_quartermaster
c_squad_member_sensor_host sq_underwatch_vendor_guardian_mentor__vendor1  # true name unknown
c_squad_member_sensor_host sq_underwatch_vendor_guardian_outfitter__vendor1  # true name unknown
c_squad_member_sensor_host sq_underwatch_vendor_guardian_quartermaster__vendor1  # true name unknown
c_control_point_sensor_host ap_guardian_mentor01  # true name unknown
c_control_point_sensor_host ap_guardian_quartermaster01  # true name unknown
c_control_point_set_sensor_host cps_guardian_mentor01  # true name unknown
c_control_point_set_sensor_host cps_guardian_quartermaster01  # true name unknown
c_control_point_set_sensor_host cps_guardian_quartermaster02  # true name unknown
c_control_point_set_sensor_host cps_guardian_quartermaster03  # true name unknown
c_control_point_set_sensor_host cps_guardian_quartermaster04  # true name unknown















startup thread sc_main_underwatch_thread:

    sc_underwatch_vendor_guardian_mentor.wake()
    sc_underwatch_vendor_guardian_quartermaster.wake()
    sc_underwatch_vendor_guardian_outfitter.wake()


    sc_underwatch_titans_guards.wake()
    sc_underwatch_titans_talkers.wake()
    sc_underwatch_titans_watchers.wake()
    sc_underwatch_wolves.wake()




thread sc_underwatch_vendor_guardian_mentor:
    if debug_underwatch: print("Guardian Mentor: Spawn")

    sq_underwatch_vendor_guardian_mentor.place()
    sq_underwatch_vendor_guardian_mentor.activate_temperament("temper_tower_guard")


thread sc_underwatch_vendor_guardian_quartermaster:
    if debug_underwatch: print("Guardian Quartermaster: Spawn")

    sq_underwatch_vendor_guardian_quartermaster.place()
    sq_underwatch_vendor_guardian_quartermaster.activate_temperament("temper_tower_guard")























thread sc_underwatch_vendor_guardian_outfitter:
    if debug_underwatch: print("Guardian Outfitter: Spawn")

    sq_underwatch_vendor_guardian_outfitter.place()
    sq_underwatch_vendor_guardian_outfitter.activate_temperament("temper_tower_guard")




thread sc_underwatch_titans_guards:

    sq_underwatch_titans_guards1.place()
    sq_underwatch_titans_guards1.activate_temperament("temper_tower_guard")


    sq_underwatch_titans_guards2.place()
    sq_underwatch_titans_guards2.activate_temperament("temper_tower_guard")


thread sc_underwatch_titans_talkers:

    if random_chance(0.5):

        sq_underwatch_titans_talkers1__talker1.place()
        sq_underwatch_titans_talkers1__talker1.activate_temperament("temper_tower_guard")
        sq_underwatch_titans_talkers1__talker2.place()
        sq_underwatch_titans_talkers1__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.33):
            sq_underwatch_titans_talkers1__listener1.place()
            sq_underwatch_titans_talkers1__listener1.activate_temperament("temper_tower_guard")


        if random_chance(0.5):

            sq_underwatch_titans_talkers4__talker1.place()
            sq_underwatch_titans_talkers4__talker1.activate_temperament("temper_tower_guard")
            sq_underwatch_titans_talkers4__talker2.place()
            sq_underwatch_titans_talkers4__talker2.activate_temperament("temper_tower_guard")


            if random_chance(0.33):
                sq_underwatch_titans_talkers4__listener1.place()
                sq_underwatch_titans_talkers4__listener1.activate_temperament("temper_tower_guard")



    else:
        sq_underwatch_titans_talkers3__talker1.place()
        sq_underwatch_titans_talkers3__talker1.activate_temperament("temper_tower_guard")
        sq_underwatch_titans_talkers3__talker2.place()
        sq_underwatch_titans_talkers3__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.33):
            sq_underwatch_titans_talkers3__listener1.place()
            sq_underwatch_titans_talkers3__listener1.activate_temperament("temper_tower_guard")


        if random_chance(0.5):

            sq_underwatch_titans_talkers2__talker1.place()
            sq_underwatch_titans_talkers2__talker1.activate_temperament("temper_tower_guard")
            sq_underwatch_titans_talkers2__talker2.place()
            sq_underwatch_titans_talkers2__talker2.activate_temperament("temper_tower_guard")


            if random_chance(0.33):
                sq_underwatch_titans_talkers2__listener1.place()
                sq_underwatch_titans_talkers2__listener1.activate_temperament("temper_tower_guard")


thread sc_underwatch_titans_watchers:

    if random_chance(0.5):

        sq_underwatch_titans_watchers1__watcher1.place()
        sq_underwatch_titans_watchers1__watcher1.activate_temperament("temper_tower_guard")


        if random_chance(0.25):
            sq_underwatch_titans_watchers1__watcher2.place()
            sq_underwatch_titans_watchers1__watcher2.activate_temperament("temper_tower_guard")



    else:
        sq_underwatch_titans_watchers1__watcher2.place()
        sq_underwatch_titans_watchers1__watcher2.activate_temperament("temper_tower_guard")


        if random_chance(0.25):
            sq_underwatch_titans_watchers1__watcher1.place()
            sq_underwatch_titans_watchers1__watcher1.activate_temperament("temper_tower_guard")





thread sc_underwatch_wolves:

    sq_underwatch_wolves1__wolf1.place()
    sq_underwatch_wolves1__wolf1.activate_temperament("temper_wolf_idle")
    sq_underwatch_wolves1__wolf2.place()
    sq_underwatch_wolves1__wolf2.activate_temperament("temper_wolf_laying")


thread sc_underwatch_droid_cleaners:

    if random_chance(1):

        if random_chance(0.5):
            sq_underwatch_droid_cleaners1__sweeper1.place()
            sq_underwatch_droid_cleaners1__sweeper1.activate_temperament("temper_tower_pushbroom")
        else:
            sq_underwatch_droid_cleaners1__scrubber1.place()
            sq_underwatch_droid_cleaners1__scrubber1.activate_temperament("temper_tower_scrubbrush")




















def random_chance(chance):

    return mathlib.random_real(1) <= chance

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821E2005
