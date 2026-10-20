@activity_bundle("enc_boulevard_amb1")

bool debug_boulevard
@member_counts({vendor1: 1})
squad sq_boulevard_vendor_warlock_mentor
@member_counts({vendor1: 1})
squad sq_boulevard_vendor_warlock_quartermaster
@member_counts({vendor1: 1})
squad sq_boulevard_vendor_warlock_outfitter
@member_counts({vendor1: 1})
squad sq_boulevard_vendor_shaders
@member_counts({vendor1: 1})
squad sq_boulevard_vendor_nm
@member_counts({vendor1: 1})
squad sq_boulevard_vendor_clan
@member_counts({guard1: 1})
squad sq_boulevard_droid_guard1
@member_counts({guard1: 0, guard2: 0})
squad sq_boulevard_droid_patrol1
@member_counts({sweeper1: 0, scrubber1: 0})
squad sq_boulevard_droid_cleaners1
@member_counts({watchers1: 4})
squad sq_boulevard_warlocks1
@member_counts({talker1: 0, talker2: 0, listener1: 0})
squad sq_boulevard_civ_talkers1
@member_counts({talker1: 0, talker2: 0, listener1: 0})
squad sq_boulevard_civ_talkers2
@member_counts({talker1: 0, talker2: 0, listener1: 0})
squad sq_boulevard_civ_nm1
@member_counts({talker1: 0, talker2: 0, listener1: 0})
squad sq_boulevard_civ_nm2
@member_counts({talker1: 0, talker2: 0, listener1: 0})
squad sq_boulevard_civ_nm3
@member_counts({watcher1: 0})
squad sq_boulevard_civ_watchers1
@member_counts({watcher1: 0, player1: 0, player2: 0})
squad sq_boulevard_civ_chess1
squad_member sq_boulevard_droid_patrol1__guard1
squad_member sq_boulevard_droid_patrol1__guard2
squad_member sq_boulevard_droid_cleaners1__sweeper1
squad_member sq_boulevard_droid_cleaners1__scrubber1
squad_member sq_boulevard_civ_talkers1__talker1
squad_member sq_boulevard_civ_talkers1__talker2
squad_member sq_boulevard_civ_talkers1__listener1
squad_member sq_boulevard_civ_talkers2__talker1
squad_member sq_boulevard_civ_talkers2__talker2
squad_member sq_boulevard_civ_talkers2__listener1
squad_member sq_boulevard_civ_nm1__talker1
squad_member sq_boulevard_civ_nm1__talker2
squad_member sq_boulevard_civ_nm1__listener1
squad_member sq_boulevard_civ_nm2__talker1
squad_member sq_boulevard_civ_nm2__talker2
squad_member sq_boulevard_civ_nm2__listener1
squad_member sq_boulevard_civ_nm3__talker1
squad_member sq_boulevard_civ_nm3__talker2
squad_member sq_boulevard_civ_nm3__listener1
squad_member sq_boulevard_civ_watchers1__watcher1
squad_member sq_boulevard_civ_chess1__player1
squad_member sq_boulevard_civ_chess1__player2
squad_member sq_boulevard_civ_chess1__watcher1
control_point_set cps_boulevard_droid_patrol1_guard1
control_point_set cps_boulevard_droid_patrol1_guard2













@startup()
script sc_main_boulevard_thread():


    sc_boulevard_vendor_warlock_mentor.wake()
    sc_boulevard_vendor_warlock_quartermaster.wake()
    sc_boulevard_vendor_warlock_outfitter.wake()
    sc_boulevard_vendor_shaders.wake()
    sc_boulevard_vendor_nm.wake()



    sc_boulevard_civ_chess.wake()
    sc_boulevard_civ_talkers.wake()
    sc_boulevard_civ_watchers.wake()
    sc_boulevard_civ_nm.wake()
    sc_boulevard_droid_guard1.wake()
    sc_boulevard_droid_patrol1.wake()
    sc_boulevard_droid_cleaners.wake()
    sc_boulevard_warlocks.wake()




script sc_boulevard_vendor_warlock_mentor():
    if debug_boulevard: print("Warlock Mentor: Spawn")

    sq_boulevard_vendor_warlock_mentor.place()
    sq_boulevard_vendor_warlock_mentor.activate_temperament("temper_tower_guard")


script sc_boulevard_vendor_warlock_quartermaster():
    if debug_boulevard: print("Warlock Quartermaster: Spawn")

    sq_boulevard_vendor_warlock_quartermaster.place()
    sq_boulevard_vendor_warlock_quartermaster.activate_temperament("temper_tower_guard")


script sc_boulevard_vendor_warlock_outfitter():
    if debug_boulevard: print("Warlock Outfitter: Spawn")

    sq_boulevard_vendor_warlock_outfitter.place()
    sq_boulevard_vendor_warlock_outfitter.activate_temperament("temper_tower_guard")


script sc_boulevard_vendor_shaders():
    if debug_boulevard: print("sc_boulevard_vendor_shaders")

    sq_boulevard_vendor_shaders.place()
    sq_boulevard_vendor_shaders.activate_temperament("temper_tower_guard")


script sc_boulevard_vendor_nm():
    if debug_boulevard: print("sc_boulevard_vendor_nm")

    sq_boulevard_vendor_nm.place()
    sq_boulevard_vendor_nm.activate_temperament("temper_tower_guard")


script sc_boulevard_vendor_clan():
    if debug_boulevard: print("sc_boulevard_vendor_clan")

    sq_boulevard_vendor_clan.place()
    sq_boulevard_vendor_clan.activate_temperament("temper_tower_guard")





script sc_boulevard_civ_chess():
    if debug_boulevard:
        print("sc_boulevard_civ_chess1")




script sc_boulevard_civ_talkers():
    if debug_boulevard:
        print("sc_boulevard_civ_talkers")


    if random_chance(0.5):

        sq_boulevard_civ_talkers1__talker1.place()
        sq_boulevard_civ_talkers1__talker1.activate_temperament("temper_tower_guard")
        sq_boulevard_civ_talkers1__talker2.place()
        sq_boulevard_civ_talkers1__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.33):
            sq_boulevard_civ_talkers1__listener1.place()
            sq_boulevard_civ_talkers1__listener1.activate_temperament("temper_tower_guard")



    else:
        sq_boulevard_civ_talkers2__talker1.place()
        sq_boulevard_civ_talkers2__talker1.activate_temperament("temper_tower_guard")
        sq_boulevard_civ_talkers2__talker2.place()
        sq_boulevard_civ_talkers2__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.33):
            sq_boulevard_civ_talkers2__listener1.place()
            sq_boulevard_civ_talkers2__listener1.activate_temperament("temper_tower_guard")


script sc_boulevard_civ_nm():
    if debug_boulevard:
        print("sc_boulevard_civ_nm")


    if random_chance(0.5):

        sq_boulevard_civ_nm1__talker1.place()
        sq_boulevard_civ_nm1__talker1.activate_temperament("temper_tower_guard")
        sq_boulevard_civ_nm1__talker2.place()
        sq_boulevard_civ_nm1__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.33):
            sq_boulevard_civ_nm1__listener1.place()
            sq_boulevard_civ_nm1__listener1.activate_temperament("temper_tower_guard")



    else:
        sq_boulevard_civ_nm2__talker1.place()
        sq_boulevard_civ_nm2__talker1.activate_temperament("temper_tower_guard")
        sq_boulevard_civ_nm2__talker2.place()
        sq_boulevard_civ_nm2__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.33):
            sq_boulevard_civ_nm2__listener1.place()
            sq_boulevard_civ_nm2__listener1.activate_temperament("temper_tower_guard")


    if random_chance(0.5):

        sq_boulevard_civ_nm3__talker1.place()
        sq_boulevard_civ_nm3__talker1.activate_temperament("temper_tower_guard")
        sq_boulevard_civ_nm3__talker2.place()
        sq_boulevard_civ_nm3__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.33):
            sq_boulevard_civ_nm3__listener1.place()
            sq_boulevard_civ_nm3__listener1.activate_temperament("temper_tower_guard")


script sc_boulevard_civ_watchers():
    if debug_boulevard:
        print("sc_boulevard_civ_watchers")


    if random_chance(0.5):
        sq_boulevard_civ_watchers1__watcher1.place()
        sq_boulevard_civ_watchers1__watcher1.activate_temperament("temper_tower_guard")


script sc_boulevard_droid_cleaners():

    if random_chance(1):

        if random_chance(0.5):
            sq_boulevard_droid_cleaners1__sweeper1.place()
            sq_boulevard_droid_cleaners1__sweeper1.activate_temperament("temper_tower_pushbroom")
        else:
            sq_boulevard_droid_cleaners1__scrubber1.place()
            sq_boulevard_droid_cleaners1__scrubber1.activate_temperament("temper_tower_scrubbrush")


script sc_boulevard_droid_guard1():
    if debug_boulevard:
        print("sc_boulevard_droid_guard1")


    sq_boulevard_droid_guard1.place()
    sq_boulevard_droid_guard1.activate_temperament("temper_tower_guard")


script sc_boulevard_droid_patrol1():
    if debug_boulevard:
        print("sc_boulevard_droid_patrol1")


    if random_chance(0.75):
        sq_boulevard_droid_patrol1__guard1.place()
        sq_boulevard_droid_patrol1__guard1.activate_temperament("temper_tower_guard")


        while true:
            sq_boulevard_droid_patrol1__guard1.execute(cps_boulevard_droid_patrol1_guard1); sleep_until(sq_boulevard_droid_patrol1__guard1.get_command_script_state() != e_command_script_state.executing)


    else:
        sq_boulevard_droid_patrol1__guard2.place()
        sq_boulevard_droid_patrol1__guard2.activate_temperament("temper_tower_guard")


        while true:
            sq_boulevard_droid_patrol1__guard2.execute(cps_boulevard_droid_patrol1_guard2); sleep_until(sq_boulevard_droid_patrol1__guard2.get_command_script_state() != e_command_script_state.executing)


script sc_boulevard_warlocks():
    if debug_boulevard:
        print("sc_boulevard_warlocks")


    sq_boulevard_warlocks1.place()
    sq_boulevard_warlocks1.activate_temperament("temper_tower_guard")





def random_chance(chance):

    return mathlib.random_real(1) <= chance

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821E2002
