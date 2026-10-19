# es\venus\act_venus_m01_engineering\act_venus_m01_engineering.es
#
# A Stranger's Call, the first Venus story mission. The root puts the lifetime
# in pregame and sets it active once the player reaches the Shattered Coast;
# the phases are the missions beside it, run in order. Mission file names are
# ours.
#
#   act_venus_m01_engineering_mission1.esp  the arrival cinematic
#   act_venus_m01_engineering_mission2.esp  the Shattered Coast: two sensor scans
#   act_venus_m01_engineering_mission3.esp  on to the Academy entrance
#   act_venus_m01_engineering_mission4.esp  the Vex conflux and the waves it calls
#   act_venus_m01_engineering_mission5.esp  hold the entrance against the Vex
#   act_venus_m01_engineering_mission6.esp  the outro: the Stranger
#
# The entrance encounter (enc_entrance_m01) and the music and Ghost lines
# (unknown_529d4bdc) are scripts of their own. Authored from one capture:
# every timing and wave rule in these files is unconfirmed.

@activity_bundle("act_venus_m01_engineering")
# The shattered coast's intro state (20.1, phase_shattered_coast_intro's), an
# empty spawn transition. After the cinematic the player stands in bubble 3 and
# walks into 20. One 2.3.1 capture: the GAS's slice and spawn transition for the
# start, the lifetime's phase index, name hash and slice for the phase order.
@activity("act_venus_m01_engineering")
@start_slice("shattered_coast", "phase_shattered_coast_intro")
@phase("phase_shattered_coast_intro", "shattered_coast")
@phase("phase_shattered_coast_sensors", "shattered_coast")
@phase("phase_entrance_goto", "entrance")
@phase("phase_entrance_vex_conflux", "entrance")
@phase("phase_entrance_resist_vex", "entrance")
@phase("phase_engineering_outro", "entrance")

act_venus_m01_engineering_mission1 phase_shattered_coast_intro
act_venus_m01_engineering_mission2 phase_shattered_coast_sensors
act_venus_m01_engineering_mission3 phase_entrance_goto
act_venus_m01_engineering_mission4 phase_entrance_vex_conflux
act_venus_m01_engineering_mission5 phase_entrance_resist_vex
act_venus_m01_engineering_mission6 phase_engineering_outro
c_location_sensor_host baby_shat
c_player_trigger_sensor_host pt_in_baby_shat bind(baby_shat)

startup thread ss_venus_m01:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
    sleep_until(pt_in_baby_shat.is_triggered())
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.active)
