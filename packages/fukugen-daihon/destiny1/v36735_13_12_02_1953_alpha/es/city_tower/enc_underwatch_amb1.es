@activity_bundle("enc_underwatch_amb1")

bool debug_underwatch
@member_counts({guards1: 2})
squad sq_underwatch_titans_guards1
@member_counts({guards1: 4})
squad sq_underwatch_titans_guards2
@member_counts({talker1: 0, talker2: 0, listener1: 0})
squad sq_underwatch_titans_talkers1
@member_counts({talker1: 0, talker2: 0, listener1: 0})
squad sq_underwatch_titans_talkers2
@member_counts({talker1: 0, talker2: 0, listener1: 0})
squad sq_underwatch_titans_talkers3
@member_counts({talker1: 0, talker2: 0, listener1: 0})
squad sq_underwatch_titans_talkers4
@member_counts({watcher1: 0, watcher2: 0})
squad sq_underwatch_titans_watchers1
@member_counts({watcher1: 1, watcher2: 1})
squad sq_underwatch_titans_watchers2
@member_counts({wolf1: 0, wolf2: 0})
squad sq_underwatch_wolves1
@member_counts({sweeper1: 0, scrubber1: 0})
squad sq_underwatch_droid_cleaners1
squad_member sq_underwatch_titans_talkers1__talker1
squad_member sq_underwatch_titans_talkers1__talker2
squad_member sq_underwatch_titans_talkers1__listener1
squad_member sq_underwatch_titans_talkers2__talker1
squad_member sq_underwatch_titans_talkers2__talker2
squad_member sq_underwatch_titans_talkers2__listener1
squad_member sq_underwatch_titans_talkers3__talker1
squad_member sq_underwatch_titans_talkers3__talker2
squad_member sq_underwatch_titans_talkers3__listener1
squad_member sq_underwatch_titans_talkers4__talker1
squad_member sq_underwatch_titans_talkers4__talker2
squad_member sq_underwatch_titans_talkers4__listener1
squad_member sq_underwatch_titans_watchers1__watcher1
squad_member sq_underwatch_titans_watchers1__watcher2
squad_member sq_underwatch_droid_cleaners1__sweeper1
squad_member sq_underwatch_droid_cleaners1__scrubber1
squad_member sq_underwatch_wolves1__wolf1
squad_member sq_underwatch_wolves1__wolf2
@member_counts({vendor1: 0})
squad sq_underwatch_vendor_guardian_mentor
@member_counts({vendor1: 0})
squad sq_underwatch_vendor_guardian_outfitter
@member_counts({vendor1: 0})
squad sq_underwatch_vendor_guardian_quartermaster
squad_member sq_underwatch_vendor_guardian_mentor__vendor1
squad_member sq_underwatch_vendor_guardian_outfitter__vendor1
squad_member sq_underwatch_vendor_guardian_quartermaster__vendor1
control_point ap_guardian_mentor01
control_point ap_guardian_quartermaster01
control_point_set cps_guardian_mentor01
control_point_set cps_guardian_quartermaster01
control_point_set cps_guardian_quartermaster02
control_point_set cps_guardian_quartermaster03
control_point_set cps_guardian_quartermaster04














@startup()
script sc_main_underwatch_thread():

    sc_underwatch_vendor_guardian_mentor.wake()
    sc_underwatch_vendor_guardian_quartermaster.wake()
    sc_underwatch_vendor_guardian_outfitter.wake()


    sc_underwatch_titans_guards.wake()
    sc_underwatch_titans_talkers.wake()
    sc_underwatch_titans_watchers.wake()
    sc_underwatch_wolves.wake()




script sc_underwatch_vendor_guardian_mentor():
    if debug_underwatch: print("Guardian Mentor: Spawn")

    sq_underwatch_vendor_guardian_mentor.place()
    sq_underwatch_vendor_guardian_mentor.activate_temperament("temper_tower_guard")


script sc_underwatch_vendor_guardian_quartermaster():
    if debug_underwatch: print("Guardian Quartermaster: Spawn")

    sq_underwatch_vendor_guardian_quartermaster.place()
    sq_underwatch_vendor_guardian_quartermaster.activate_temperament("temper_tower_guard")























script sc_underwatch_vendor_guardian_outfitter():
    if debug_underwatch: print("Guardian Outfitter: Spawn")

    sq_underwatch_vendor_guardian_outfitter.place()
    sq_underwatch_vendor_guardian_outfitter.activate_temperament("temper_tower_guard")




script sc_underwatch_titans_guards():

    sq_underwatch_titans_guards1.place()
    sq_underwatch_titans_guards1.activate_temperament("temper_tower_guard")


    sq_underwatch_titans_guards2.place()
    sq_underwatch_titans_guards2.activate_temperament("temper_tower_guard")


script sc_underwatch_titans_talkers():

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


script sc_underwatch_titans_watchers():

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





script sc_underwatch_wolves():

    sq_underwatch_wolves1__wolf1.place()
    sq_underwatch_wolves1__wolf1.activate_temperament("temper_wolf_idle")
    sq_underwatch_wolves1__wolf2.place()
    sq_underwatch_wolves1__wolf2.activate_temperament("temper_wolf_laying")


script sc_underwatch_droid_cleaners():

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
