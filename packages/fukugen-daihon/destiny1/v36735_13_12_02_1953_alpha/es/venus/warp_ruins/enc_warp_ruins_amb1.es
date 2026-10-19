@activity_bundle("enc_warp_ruins_amb1")

u_globals utils
c_encounter_manager encounters  # true name unknown
@member_counts({_squad: [{cell: 5}]})
ambush_encounter ambush_encounter_1
@member_counts({_squad: [{cell: 4, cell_1: 1}]})
ambush_encounter ambush_encounter_2
@member_counts({_squad: [{cell: 4, leader: 1}]})
ambush_encounter ambush_encounter_3
@member_counts({_squad: [{cell_1: 2, cell_2: 1}]})
simple_encounter simple_encounter_1
@member_counts({_squad: [{cell_1: 5}]})
simple_encounter simple_encounter_2
c_objective_sensor_host obj_raid_bridge_minotaur_phase00  # true name unknown
c_activity_flag raid_encounter bind("raid_phase0")  # true name unknown
c_activity_flag raid_gate bind("raid_gate_phase0")  # true name unknown
c_object_sensor_host vex_infinity_portal_gate
c_device_host d_vex_infinity_portal_gate bind(vex_infinity_portal_gate)
c_timer_sensor_host center_switch_pillar_timer  # true name unknown
c_timer_sensor_host left_switch_pillar_timer  # true name unknown
c_timer_sensor_host right_switch_pillar_timer  # true name unknown
@member_counts({major: 1})
c_squad_sensor_host sq_raid_phase00_right_leader
@member_counts({goblins: 4})
c_squad_sensor_host sq_raid_phase00_right
@member_counts({major: 1})
c_squad_sensor_host sq_raid_phase00_left_leader
@member_counts({goblins: 4})
c_squad_sensor_host sq_raid_phase00_left
@member_counts({minotaurs: 3})
c_squad_sensor_host sq_raid_phase00_center
@member_counts({minotaurs: 1})
c_squad_sensor_host sq_raid_phase00_center_leader
@member_counts({pilot: 0})
c_squad_sensor_host sq_raid_phase00_cloud
@member_counts({pilot: 0})
c_squad_sensor_host sq_raid_phase00_right_cloud
@member_counts({pilot: 0})
c_squad_sensor_host sq_raid_phase00_left_cloud
c_squad_member_sensor_host sq_raid_phase00_cloud__pilot  # true name unknown
c_squad_member_sensor_host sq_raid_phase00_right_cloud__pilot  # true name unknown
c_squad_member_sensor_host sq_raid_phase00_left_cloud__pilot  # true name unknown
c_object_sensor_host vex_pillar
c_objective_timer_host ot_vex_pillar bind(vex_pillar)  # true name unknown
int int_objective_timer = 120
bool left_ai_goal
bool right_ai_goal
bool center_ai_goal
bool b_raid_end
venus_raid_pillar_switch left_switch_pillar bind(7)
venus_raid_pillar_switch right_switch_pillar bind(7)
venus_raid_pillar_switch center_switch_pillar bind(7)
string_hash phase00_raid_end = "phase00_raid_end"
loot_warp_ruins loot_venus_warp_ruins_1















startup thread ss_encounter_controller_thread:
    encounters.actor_budget = 16
    encounters.add_ambient_encounter(ambush_encounter_1, 5, 100, 20, 300, 120)
    encounters.add_ambient_encounter(ambush_encounter_2, 5, 80, 20, 300, 120)
    encounters.add_ambient_encounter(ambush_encounter_3, 5, 100, 20, 300, 120)
    encounters.add_ambient_encounter(simple_encounter_1, 3, 60, 20, 300, 120)
    encounters.add_ambient_encounter(simple_encounter_2, 5, 60, 20, 300, 120)


startup thread sc_main_thread:

    print("---------------------------------------------------------")
    print("WARP RUINS ENCOUNTER AMBIENT v. 1.1")
    print("---------------------------------------------------------")
    vex_infinity_portal_gate.create()
    vex_pillar.create()
    while true:
        sleep_until(raid_encounter.is_active() and not raid_gate.is_active())
        b_raid_end = false
        disable_public_encounters()
        sc_left_switch_pillar.restart()
        sc_right_switch_pillar.restart()
        sc_center_switch_pillar.restart()
        sc_phase00_encounter.restart()
        print("setting up the Raid encounter...")
        sleep_until(b_raid_end == true or not raid_encounter.is_active())
        if b_raid_end == true:
            sc_raid_gate_function.restart()
        enable_public_encounters()



thread sc_phase00_encounter:
    right_switch_pillar.create()
    left_switch_pillar.create()
    center_switch_pillar.create()
    sleep_until(left_switch_pillar.succeed == true or right_switch_pillar.succeed == true or right_switch_pillar.succeed == true)
    ot_vex_pillar.activate(int_objective_timer)
    ot_vex_pillar.start()
    print("STARTING PILLAR")
    while raid_encounter.is_active() and b_raid_end == false:
        sleep(1)
        if raid_phase00_reset():
            pillar_reset()
            print("RESET PILLAR SMOOTH")
        elif raid_phase00_increment():
            ot_vex_pillar.start()
            print("INCREASE COMPLETE TIMER")
        else:
            ot_vex_pillar.stop()
            print("PAUSE COMPLETE TIMER")
        print("MAIN PILLAR TIMER:")
        print(ot_vex_pillar.get_remaining_time_in_seconds())
        print("=====================================")
        if ot_vex_pillar.get_remaining_time_in_seconds() <= 0:
            b_raid_end = true
            c_incident_utilities.submit_incident_hash(phase00_raid_end)
            print("OPEN GATE")

def pillar_reset():
    ot_vex_pillar.set_rate_multiplier(-7)
    sleep_until_timeout(ot_vex_pillar.get_remaining_time_in_seconds() >= int_objective_timer - 4, 20)
    ot_vex_pillar.activate(int_objective_timer)
    print("RESET TIMER END")
    ot_vex_pillar.set_rate_multiplier(1)


def pillar_reset_slow():
    ot_vex_pillar.set_rate_multiplier(-2)
    sleep_until(ot_vex_pillar.get_remaining_time_in_seconds() >= int_objective_timer)
    ot_vex_pillar.stop()
    print("RESET TIMER SLOWLY")

thread sc_raid_gate_function:
    sleep_until(raid_gate.is_active())
    raid_clean_up()
    d_vex_infinity_portal_gate.set_device_position(1)
    sleep_until(not raid_gate.is_active())
    print("CLOSE GATE")
    d_vex_infinity_portal_gate.set_device_position(0)
    pillar_reset_slow()
    sleep_until(d_vex_infinity_portal_gate.get_device_position == 0)


def raid_phase00_reset():
    if (left_ai_goal == true or left_switch_pillar.succeed == false) and (right_ai_goal == true or right_switch_pillar.succeed == false) and (center_ai_goal == true or center_switch_pillar.succeed == false):
        return true
    else:
        return false


def raid_phase00_increment():

    if left_ai_goal == false and left_switch_pillar.succeed == true:

        return true
    else:
        return false

thread sc_left_switch_pillar:
    while raid_encounter.is_active():
        sleep_until(left_switch_pillar.succeed == true)
        sleep(2)
        raid_random_spawn(sq_raid_phase00_left_leader, sq_raid_phase00_left, sq_raid_phase00_left_cloud__pilot)
        sleep(3)
        ai_left_switch_pillar(sq_raid_phase00_left_leader, obj_raid_bridge_minotaur_phase00, left_switch_pillar_timer)
        sleep_until(sq_raid_phase00_left_leader.alive_count() <= 0 or sq_raid_phase00_left.alive_count() <= 0)
    sq_raid_phase00_left_cloud.remove()
    sq_raid_phase00_left.remove()
    sq_raid_phase00_left_leader.remove()

thread sc_right_switch_pillar:
    while raid_encounter.is_active():
        sleep_until(right_switch_pillar.succeed == true)
        sleep(2)
        raid_random_spawn(sq_raid_phase00_right_leader, sq_raid_phase00_right, sq_raid_phase00_right_cloud__pilot)
        sleep(3)
        ai_right_switch_pillar(sq_raid_phase00_right_leader, obj_raid_bridge_minotaur_phase00, right_switch_pillar_timer)
        sleep_until(sq_raid_phase00_right_leader.alive_count() <= 0 or sq_raid_phase00_right.alive_count() <= 0)
    sq_raid_phase00_right_cloud.remove()
    sq_raid_phase00_right.remove()
    sq_raid_phase00_right_leader.remove()


thread sc_center_switch_pillar:
    while raid_encounter.is_active():
        sleep_until(center_switch_pillar.succeed == true)
        sleep(2)
        raid_random_spawn(sq_raid_phase00_center_leader, sq_raid_phase00_center, sq_raid_phase00_cloud__pilot)
        sleep(3)
        ai_center_switch_pillar(sq_raid_phase00_center_leader, obj_raid_bridge_minotaur_phase00, center_switch_pillar_timer)
        sleep_until(sq_raid_phase00_center_leader.alive_count() <= 0)
    sq_raid_phase00_cloud.remove()
    sq_raid_phase00_center_leader.remove()
    sq_raid_phase00_center.remove()

def ai_left_switch_pillar(sq, obj, timer):
    print("spawning AI to LEFT point")
    left_ai_goal = false
    while sq.alive_count() > 0:
        sleep(1)
        if left_switch_pillar.succeed == true:
            sleep(1)
            left_switch_pillar._ai_objective.add_squad(sq)
            print("AI to attack left PILLAR because player has the warp gate open")
            if left_ai_goal == false:
                sleep(1)
                sleep_until(sq.count_at_firing_area() >= 1 or sq.alive_count() <= 0)
                print("VEX HAVE REACHED THE left POINT!")
                vex_timer(5, sq, timer)
                if sq.alive_count() >= 1:
                    print("AI SUCCESS!!!! VEX TOOK THE left PILLAR!")
                    left_ai_goal = true
                    sleep_until(sq.count_at_firing_area() <= 0 or sq.alive_count() <= 0)
                    left_switch_pillar.reset()
                    left_ai_goal = false
                else:
                    left_ai_goal = false
        elif left_switch_pillar.succeed == false:
            sleep(1)
            obj.add_squad(sq)
            print("AI to attack the left PLAYER because the warp gate is closed")
            left_ai_goal = false

def raid_random_spawn(leader, minion, cloud):
    i_rand_num = mathlib.random_int_inclusive(1, 4)
    b_alt_wave = false
    if b_alt_wave == false:
        b_alt_wave = true
    else:
        b_alt_wave = false

    if i_rand_num == 1:

        cloud.place()
        if leader.alive_count() <= 0 and b_alt_wave == true:
            cloud.drop_squad(leader); sleep_until(not cloud.is_dropping())
        cloud.drop_squad(minion); sleep_until(not cloud.is_dropping())
        cloud.remove()

    if i_rand_num == 2:

        if leader.alive_count() <= 0 and b_alt_wave == true:
            cloud.place()
            cloud.drop_squad(leader); sleep_until(not cloud.is_dropping())
            cloud.remove()
        minion.respawn()

    if i_rand_num == 3:

        cloud.place()
        cloud.drop_squad(minion); sleep_until(not cloud.is_dropping())
        cloud.remove()
        if leader.alive_count() <= 0 and b_alt_wave == true:
            leader.place()
    if i_rand_num == 4:

        if leader.alive_count() <= 0 and b_alt_wave == true:
            leader.place()
        minion.respawn()
    leader.activate_temperament("temper_combat_no_teleport_path")

def ai_right_switch_pillar(sq, obj, timer):
    print("spawning AI to right point")
    right_ai_goal = false
    while sq.alive_count() > 0:
        sleep(1)
        if right_switch_pillar.succeed == true:
            sleep(1)
            right_switch_pillar._ai_objective.add_squad(sq)
            print("AI to attack right PILLAR because player has the warp gate open")
            if right_ai_goal == false:
                sleep(1)
                sleep_until(sq.count_at_firing_area() >= 1 or sq.alive_count() <= 0)
                print("VEX HAVE REACHED THE right POINT!")
                vex_timer(5, sq, timer)
                if sq.alive_count() >= 1:
                    print("AI SUCCESS!!!! VEX TOOK THE right PILLAR!")
                    right_ai_goal = true
                    sleep_until(sq.count_at_firing_area() <= 0 or sq.alive_count() <= 0)
                    right_switch_pillar.reset()
                    right_ai_goal = false
                else:
                    right_ai_goal = false
        elif right_switch_pillar.succeed == false:
            sleep(1)
            obj.add_squad(sq)
            print("AI to attack the right PLAYER because the warp gate is closed")
            right_ai_goal = false

def ai_center_switch_pillar(sq, obj, timer):
    print("spawning AI to center point")
    center_ai_goal = false
    while sq.alive_count() > 0:
        sleep(1)
        if center_switch_pillar.succeed == true:
            sleep(1)
            center_switch_pillar._ai_objective.add_squad(sq)
            print("AI to attack center PILLAR because player has the warp gate open")
            if center_ai_goal == false:
                sleep(1)
                sleep_until(sq.count_at_firing_area() >= 1 or sq.alive_count() <= 0)
                print("VEX HAVE REACHED THE center POINT!")
                vex_timer(5, sq, timer)
                if sq.alive_count() >= 1:
                    print("AI SUCCESS!!!! VEX TOOK THE center PILLAR!")
                    center_ai_goal = true
                    sleep_until(sq.count_at_firing_area() <= 0 or sq.alive_count() <= 0)
                    center_switch_pillar.reset()
                    center_ai_goal = false
                else:
                    center_ai_goal = false
        elif center_switch_pillar.succeed == false:
            sleep(1)
            obj.add_squad(sq)
            print("AI to attack the center PLAYER because the warp gate is closed")
            center_ai_goal = false

def vex_timer(time, sq, a_timer):
    a_timer.reset(time)
    a_timer.show_progress_bar()
    a_timer.start()
    sleep_until(a_timer.is_expired() or sq.alive_count() <= 0)
    print("Timer complete.")
    a_timer.hide_progress_bar()
    a_timer.stop()

def disable_public_encounters():
    encounters.suppress_encounter(ambush_encounter_1, true)
    encounters.suppress_encounter(ambush_encounter_2, true)
    encounters.suppress_encounter(ambush_encounter_3, true)
    ambush_encounter_1.deactivate()
    ambush_encounter_2.deactivate()
    ambush_encounter_3.deactivate()

def enable_public_encounters():
    encounters.suppress_encounter(ambush_encounter_1, false)
    encounters.suppress_encounter(ambush_encounter_2, false)
    encounters.suppress_encounter(ambush_encounter_3, false)

def raid_clean_up():
    left_ai_goal = false
    right_ai_goal = false
    center_ai_goal = false
    sc_left_switch_pillar.kill()
    sc_right_switch_pillar.kill()
    sc_center_switch_pillar.kill()
    right_switch_pillar.de_activate()
    left_switch_pillar.de_activate()
    center_switch_pillar.de_activate()
    print("RAID CLEAN UP")

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8014
