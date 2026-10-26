# es\moon\act_moon_m1_launchtubes\act_moon_m1_launchtubes.es
#
# The Dark Beyond, the first Moon story mission. The root starts nothing; the
# phases are the missions beside it, run in order. Mission file names are ours.
#
#   act_moon_m1_launchtubes_mission1.esp  the intro cinematic
#   act_moon_m1_launchtubes_mission2.esp  the accelerator: explore, hit the button, hold off the Fallen
#   act_moon_m1_launchtubes_mission3.esp  the moonbase terminal
#   act_moon_m1_launchtubes_mission4.esp  on to the launch tubes
#   act_moon_m1_launchtubes_mission5.esp  the fallen Guardian, the false button
#   act_moon_m1_launchtubes_mission6.esp  the Hive emerge (cinematic)
#   act_moon_m1_launchtubes_mission7.esp  fight through the door
#   act_moon_m1_launchtubes_mission8.esp  reach the Ghost, kill the Knight
#   act_moon_m1_launchtubes_mission9.esp  take the Ghost; the mission ends
#
# The accelerator (unknown_2495f541) and the launch tubes (unknown_43f9e8c0)
# are scripts of their own; unknown_d66ce681 holds the music and Ghost lines.
# Written from two 2.3.1 runs (2026-10-03 and 2026-10-24, one player each):
# every timing below held in both, nothing is confirmed past that. The
# moonbase (6) is a public bubble: its public host session (the Moon's public
# checksum 4776B394) carries the player's terminal use and kills there.

@activity_bundle("act_moon_m1_launchtubes")
# The accelerator's intro state (1.1, phase_intro_cin's) at spawn 87875158, the
# moonbase (6) and the launch tubes (3, whose phase_4_launchtubes owns 3.1). Both
# 2.3.1 runs.
@activity("act_moon_m1_launchtubes")
@start_slice("accelerator", "phase_intro_cin")
@phase("phase_intro_cin", "accelerator")
@phase("phase_1_accelerator", "accelerator")
@phase("phase_moonbase", "moonbase")
@phase("phase_goto_launchtubes", "launchtubes")
@phase("phase_3_launchtubes", "launchtubes")
@phase("phase_4_launchtubes", "launchtubes")
@phase("phase_door_launchtubes", "launchtubes")
@phase("phase_5_launchtubes", "launchtubes")
@phase("phase_launchtubes_complete", "launchtubes")
@spawn_transition(0x87875158)

act_moon_m1_launchtubes_mission1 phase_intro_cin
act_moon_m1_launchtubes_mission2 phase_1_accelerator
act_moon_m1_launchtubes_mission3 phase_moonbase
act_moon_m1_launchtubes_mission4 phase_goto_launchtubes
act_moon_m1_launchtubes_mission5 phase_3_launchtubes
act_moon_m1_launchtubes_mission6 phase_4_launchtubes
act_moon_m1_launchtubes_mission7 phase_door_launchtubes
act_moon_m1_launchtubes_mission8 phase_5_launchtubes
act_moon_m1_launchtubes_mission9 phase_launchtubes_complete

@startup()
script ss_moon_m1_launchtubes():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
