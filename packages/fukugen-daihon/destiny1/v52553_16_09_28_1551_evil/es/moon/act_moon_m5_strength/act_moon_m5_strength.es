# es\moon\act_moon_m5_strength\act_moon_m5_strength.es
#
# Chamber of Night, the Moon's fifth story mission. The root starts nothing;
# the phases are the missions beside it, run in order. Mission file names are
# ours.
#
#   act_moon_m5_strength_mission1.esp  the Hellmouth: the Ghost reads the ritual
#   act_moon_m5_strength_mission2.esp  on to the launch tubes
#   act_moon_m5_strength_mission3.esp  the launch tubes: reach the cinematic
#   act_moon_m5_strength_mission4.esp  the cinematic
#   act_moon_m5_strength_mission5.esp  on to the Chamber of Night
#   act_moon_m5_strength_mission6.esp  into the chamber
#   act_moon_m5_strength_mission7.esp  the ritual: the wizards, then the Hive waves
#   act_moon_m5_strength_mission8.esp  the shard: use the button, the activity ends
#
# The approach (strength) is es\moon\strength\enc_strength_m5.es; the chamber
# itself is unknown_d53aaa20.es and the music and Ghost lines unknown_f385d0ca.es
# beside this file (both bundle names uncracked).
#
# Authored from one capture run: every timing below is a single-run fact,
# unconfirmed.

startup thread ss_moon_m5_strength:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
