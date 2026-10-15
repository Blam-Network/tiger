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

c_location_sensor_host baby_shat
c_player_trigger_sensor_host pt_in_baby_shat bind(baby_shat)

startup thread ss_venus_m01:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
    sleep_until(pt_in_baby_shat.is_triggered())
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.active)
