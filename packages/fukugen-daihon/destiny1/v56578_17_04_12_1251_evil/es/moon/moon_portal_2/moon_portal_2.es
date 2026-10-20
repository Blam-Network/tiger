# es\moon\moon_portal_2\moon_portal_2.es
#
# The Summoning Pits, the Moon strike (Phogoth). The root starts nothing; it
# declares the phases, run in member order. Mission file names are ours.
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

@activity_bundle("moon_portal_2")
# The Summoning Pits: the hellmouth (2), an empty spawn transition; the phases run
# in name order through the citadel (12), the wormway (5) and the pit (14).
@activity("moon_portal_2")
@start_slice("hellmouth")
@phase("phase00", 0x447E4EB5)
@phase("phase01", 0x447E4EB5)
@phase("phase02", 0x447E4EB5)
@phase("phase03", "lowercitadel")
@phase("phase04", 0xF25CEA8D)
@phase("phase05", 0xF25CEA8D)

moon_portal_2_mission1 phase00
moon_portal_2_mission2 phase01
moon_portal_2_mission3 phase02
moon_portal_2_mission4 phase03
moon_portal_2_mission5 phase04
moon_portal_2_mission6 phase05

@startup()
script ss_moon_portal2():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
