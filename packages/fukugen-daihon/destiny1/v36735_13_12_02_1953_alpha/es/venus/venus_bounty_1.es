@activity_bundle("bounty_1_activity")
@activity("venus_bounty_1")
@start_slice("shattered_coast")

string_hash sh_first_play = "first_play"
u_globals u_globals
string_hash invalid
c_nav_point_host ap_goto_headlands  # true name unknown
c_nav_point_host ap_goto_shattered_coast  # true name unknown
c_nav_point_host ap_goto_fallen_caldera  # true name unknown
c_nav_point_host ap_goto_complex  # true name unknown
c_nav_point_host ap_goto_warp_ruins  # true name unknown
c_location_sensor_host headlands  # true name unknown
c_location_sensor_host shattered_coast  # true name unknown
c_location_sensor_host fallen_caldera  # true name unknown
c_location_sensor_host complex  # true name unknown
c_location_sensor_host warp_ruins  # true name unknown
string_hash sh_headlands = "headlands"
string_hash sh_shattered_coast = "shattered_coast"
string_hash sh_fallen_caldera = "fallen_caldera"
string_hash sh_complex = "complex"
string_hash sh_warp_ruins = "warp_ruins"
static_array<c_player_objective_sensor_host, 1> po_bounty_headlands
static_array<c_player_objective_sensor_host, 1> po_bounty_shattered_coast
static_array<c_player_objective_sensor_host, 2> po_bounty_fallen_caldera
static_array<c_player_objective_sensor_host, 2> po_bounty_complex
static_array<c_player_objective_sensor_host, 2> po_bounty_warp_ruins
c_player_objective_sensor_host po_bounty_goto_headlands
c_player_objective_sensor_host po_bounty_goto_shattered_coast
c_player_objective_sensor_host po_bounty_goto_fallen_caldera
c_player_objective_sensor_host po_bounty_goto_complex
c_player_objective_sensor_host po_bounty_goto_warp_ruins
c_player_trigger_sensor_host pt_headlands bind(headlands)  # true name unknown
c_player_trigger_sensor_host pt_shattered_coast bind(shattered_coast)  # true name unknown
c_player_trigger_sensor_host pt_fallen_caldera bind(fallen_caldera)  # true name unknown
c_player_trigger_sensor_host pt_complex bind(complex)  # true name unknown
c_player_trigger_sensor_host pt_warp_ruins bind(warp_ruins)  # true name unknown
c_loot_host loot_quest_item_fallen_caldera1  # true name unknown
c_loot_host loot_quest_item_complex1  # true name unknown
c_loot_host loot_quest_item_warp_ruins1  # true name unknown
int g_active_public_bounty_bubbles = 5
int g_i_bounty_streak_accumulator













































startup thread main:
    print("venus Bounty 1 script startup")
    g_i_bounty_streak_accumulator = 0

    while true:
        i_selected_bubble = mathlib.random_int_never_highest_value(0, g_active_public_bounty_bubbles)

        print("send to bubble: " + i_selected_bubble)

        if i_selected_bubble == 0:
            func_venus_warp_ruins_start()

        elif i_selected_bubble == 1:
            func_venus_complex_start()

        elif i_selected_bubble == 2:
            func_venus_fallen_caldera_start()

        elif i_selected_bubble == 3:
            func_venus_shattered_coast_start()

        elif i_selected_bubble == 4:
            func_venus_headlands_start()



        print("Bounty Completed in this Mission: " + g_i_bounty_streak_accumulator)
        if g_i_bounty_streak_accumulator >= 3:
            if g_i_bounty_streak_accumulator == 3:
                print("CITY IS SENDING A CARE PACKAGE...")


                set_activity_complete()
            print("KEEP THE STREAK ALIVE.")

        print("finished with mission... incoming new mission in 3")
        sleep(3)






def func_venus_headlands_start():



    if c_player_script_utilities.get_minimum_power_level() < 8:
        return


    i_selected_variation = mathlib.random_int_never_highest_value(0, len(po_bounty_headlands))
    print("picked bountyID: " + i_selected_variation)


    u_globals.objective_start(po_bounty_goto_headlands)
    po_bounty_goto_headlands.nav_point_activate(ap_goto_headlands)
    print("nav point activated")


    pt_headlands.reset()
    if not pt_headlands.is_triggered():
        po_bounty_goto_headlands.nav_point_activate(ap_goto_headlands)
    sleep_until(pt_headlands.is_triggered())


    u_globals.objective_end_silent(po_bounty_goto_headlands)
    sleep(1)



    if i_selected_variation == 0:
        u_globals.objective_start(po_bounty_headlands[0])
        u_globals.kill_accum_combatant_bubble_hash(invalid, sh_headlands, po_bounty_headlands[0], 0, 5)
        u_globals.objective_end(po_bounty_headlands[0])
















    pt_headlands.reset()
    g_i_bounty_streak_accumulator = g_i_bounty_streak_accumulator + 1




def func_venus_shattered_coast_start():



    i_selected_variation = mathlib.random_int_never_highest_value(0, len(po_bounty_shattered_coast))
    print("picked bountyID: " + i_selected_variation)



    u_globals.objective_start(po_bounty_goto_shattered_coast)
    po_bounty_goto_shattered_coast.nav_point_activate(ap_goto_shattered_coast)
    print("nav point activated")


    pt_shattered_coast.reset()
    if not pt_shattered_coast.is_triggered():
        po_bounty_goto_shattered_coast.nav_point_activate(ap_goto_shattered_coast)
    sleep_until(pt_shattered_coast.is_triggered())
    u_globals.objective_end_silent(po_bounty_goto_shattered_coast)
    sleep(1)



    if i_selected_variation == 0:
        u_globals.objective_start(po_bounty_shattered_coast[0])
        u_globals.kill_accum_combatant_bubble_hash(invalid, sh_shattered_coast, po_bounty_shattered_coast[0], 0, 10)
        u_globals.objective_end(po_bounty_shattered_coast[0])























    pt_shattered_coast.reset()
    g_i_bounty_streak_accumulator = g_i_bounty_streak_accumulator + 1




def func_venus_fallen_caldera_start():


    if c_player_script_utilities.get_minimum_power_level() < 15:
        return


    i_selected_variation = mathlib.random_int_never_highest_value(0, len(po_bounty_fallen_caldera))
    print("picked bountyID: " + i_selected_variation)


    u_globals.objective_start(po_bounty_goto_fallen_caldera)
    po_bounty_goto_fallen_caldera.nav_point_activate(ap_goto_fallen_caldera)
    print("nav point activated")


    pt_fallen_caldera.reset()
    if not pt_fallen_caldera.is_triggered():
        po_bounty_goto_fallen_caldera.nav_point_activate(ap_goto_fallen_caldera)
    sleep_until(pt_fallen_caldera.is_triggered())

    u_globals.objective_end_silent(po_bounty_goto_fallen_caldera)
    sleep(1)



    if i_selected_variation == 0:

        u_globals.objective_start(po_bounty_fallen_caldera[0])
        u_globals.kill_accum_combatant_bubble_hash(invalid, sh_fallen_caldera, po_bounty_fallen_caldera[0], 0, 10)
        u_globals.objective_end(po_bounty_fallen_caldera[0])

    elif i_selected_variation == 1:
        u_globals.objective_start(po_bounty_fallen_caldera[1])
        loot_quest_item_fallen_caldera1.enable()
        loot_quest_item_fallen_caldera1.reset()

        po_bounty_fallen_caldera[1].progress_activate(0, 5)
        while loot_quest_item_fallen_caldera1.get_count() < 5:
            po_bounty_fallen_caldera[1].progress_update(loot_quest_item_fallen_caldera1.get_count())
            sleep(1)
        u_globals.objective_end(po_bounty_fallen_caldera[1])
        loot_quest_item_fallen_caldera1.disable()

    pt_fallen_caldera.reset()
    g_i_bounty_streak_accumulator = g_i_bounty_streak_accumulator + 1




def func_venus_complex_start():



    if c_player_script_utilities.get_minimum_power_level() < 15:
        return


    i_selected_variation = mathlib.random_int_never_highest_value(0, len(po_bounty_complex))
    print("picked bountyID: " + i_selected_variation)


    u_globals.objective_start(po_bounty_goto_complex)
    po_bounty_goto_complex.nav_point_activate(ap_goto_complex)
    print("nav point activated")


    pt_complex.reset()
    if not pt_complex.is_triggered():
        po_bounty_goto_complex.nav_point_activate(ap_goto_complex)
    sleep_until(pt_complex.is_triggered())

    u_globals.objective_end_silent(po_bounty_goto_complex)
    sleep(1)



    if i_selected_variation == 0:
        u_globals.objective_start(po_bounty_complex[0])
        u_globals.kill_accum_combatant_bubble_hash(invalid, sh_complex, po_bounty_complex[0], 0, 10)
        u_globals.objective_end(po_bounty_complex[0])
    elif i_selected_variation == 1:
        u_globals.objective_start(po_bounty_complex[1])
        loot_quest_item_complex1.enable()
        loot_quest_item_complex1.reset()

        po_bounty_complex[1].progress_activate(0, 10)
        while loot_quest_item_complex1.get_count() < 10:
            po_bounty_complex[1].progress_update(loot_quest_item_complex1.get_count())
            sleep(1)
        u_globals.objective_end(po_bounty_complex[1])
        loot_quest_item_complex1.disable()
    pt_complex.reset()
    g_i_bounty_streak_accumulator = g_i_bounty_streak_accumulator + 1




def func_venus_warp_ruins_start():



    if c_player_script_utilities.get_minimum_power_level() < 8:
        return


    i_selected_variation = mathlib.random_int_never_highest_value(0, len(po_bounty_warp_ruins))
    print("picked bountyID: " + i_selected_variation)


    u_globals.objective_start(po_bounty_goto_warp_ruins)
    po_bounty_goto_warp_ruins.nav_point_activate(ap_goto_warp_ruins)
    print("nav point activated")


    pt_warp_ruins.reset()
    if not pt_warp_ruins.is_triggered():
        po_bounty_goto_warp_ruins.nav_point_activate(ap_goto_warp_ruins)
    sleep_until(pt_warp_ruins.is_triggered())

    u_globals.objective_end_silent(po_bounty_goto_warp_ruins)
    sleep(1)



    if i_selected_variation == 0:
        u_globals.objective_start(po_bounty_warp_ruins[0])
        u_globals.kill_accum_combatant_bubble_hash(invalid, sh_warp_ruins, po_bounty_warp_ruins[0], 0, 10)
        u_globals.objective_end(po_bounty_warp_ruins[0])
    elif i_selected_variation == 1:
        u_globals.objective_start(po_bounty_warp_ruins[1])
        loot_quest_item_warp_ruins1.enable()
        loot_quest_item_warp_ruins1.reset()

        po_bounty_warp_ruins[1].progress_activate(0, 5)
        while loot_quest_item_warp_ruins1.get_count() < 5:
            po_bounty_warp_ruins[1].progress_update(loot_quest_item_warp_ruins1.get_count())
            sleep(1)
        u_globals.objective_end(po_bounty_warp_ruins[1])
        loot_quest_item_warp_ruins1.disable()

    pt_warp_ruins.reset()
    g_i_bounty_streak_accumulator = g_i_bounty_streak_accumulator + 1

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B801C
