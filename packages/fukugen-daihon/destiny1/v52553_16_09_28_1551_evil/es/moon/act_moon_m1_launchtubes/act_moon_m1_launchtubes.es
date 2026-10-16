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
# Written from one capture: every timing below is a single-run fact.

@activity_bundle("act_moon_m1_launchtubes")
startup thread ss_moon_m1_launchtubes:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
