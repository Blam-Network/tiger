# es\moon\moon_portal_2\moon_portal_2.es
#
# The Summoning Pits, the Moon strike (Phogoth). The root starts nothing; the
# phases are the missions beside it, run in order. Mission file names are ours.
#
#   moon_portal_2_mission1.esp  the upper citadel: the hall and the Hive door
#   moon_portal_2_mission2.esp  the hall: hold off the Hive while the Ghost works
#   moon_portal_2_mission3.esp  down through the lower hall
#   moon_portal_2_mission4.esp  the lower citadel: on to the wormway
#   moon_portal_2_mission5.esp  the wormway: Phogoth
#   moon_portal_2_mission6.esp  the end of the strike
#
# The upper citadel and wormway encounters, and moon_portal_2_music, are
# scripts of their own. One capture run: every timing in them is unconfirmed.

startup thread ss_moon_portal2:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
