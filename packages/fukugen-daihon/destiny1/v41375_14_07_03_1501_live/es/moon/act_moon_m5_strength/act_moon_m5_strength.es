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
# Authored from two capture runs by one player: every timing is unconfirmed
# until a third run.

@activity_bundle("act_moon_m5_strength")
# The hellmouth (2) at its default spawn point, the launch tubes (3,
# phase_cinematic owns 3.1) and the chamber (11). Two 2.3.1 captures.
@activity("act_moon_m5_strength")
@start_slice("hellmouth", "phase_2_hellmouth")
@phase("phase_2_hellmouth", "hellmouth")
@phase("phase_goto_launchtubes", "launchtubes")
@phase("phase_3_launchtubes", "launchtubes")
@phase("phase_cinematic", "launchtubes")
@phase("phase_goto_strength", "strength")
@phase("phase_strength_start", "strength")
@phase("phase_4_strength", "strength")
@phase("phase_strength_complete", "strength")
@spawn_transition("default")

act_moon_m5_strength_mission1 phase_2_hellmouth
act_moon_m5_strength_mission2 phase_goto_launchtubes
act_moon_m5_strength_mission3 phase_3_launchtubes
act_moon_m5_strength_mission4 phase_cinematic
act_moon_m5_strength_mission5 phase_goto_strength
act_moon_m5_strength_mission6 phase_strength_start
act_moon_m5_strength_mission7 phase_4_strength
act_moon_m5_strength_mission8 phase_strength_complete

@startup()
script ss_moon_m5_strength():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
