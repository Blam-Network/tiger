# es\venus\strike_1_activity\strike_1_activity.es
#
# The Nexus, the Venus strike (the academy strike). The root puts the
# lifetime in pregame; the phases are the missions beside it, run in order.
# Mission file names are ours; the phase rows are in brackets.
#
#   venus_strike_1_mission1.esp  engineering: clear the floor (engineering_phase)
#   venus_strike_1_mission2.esp  on to the dig site (engineering_trans_phase)
#   venus_strike_1_mission3.esp  across the dig site (dig_site_phase)
#   venus_strike_1_mission4.esp  the ruins: the guards and the Nexus Mind (ruins_phase)
#   venus_strike_1_mission5.esp  the end of the strike (end_phase)
#
# The engineering, dig site and ruins encounters, and strike_1_audio, are
# scripts of their own. Ported from the alpha's strike and checked against
# one 2.3.1 run (The Nexus#1): every timing in these files is a single-run
# fact until more runs land.

@activity_bundle("strike_1_activity")
# Starts in the academy plaza at the plaza's venus_strike_1_phase01 spawn point.
# Its default spawn point is the entrance_to_plaza one, on the entrance's load
# zone: a player started there crosses straight into the entrance (8).
@activity("venus_portal_1")
@start_slice("plaza")
@spawn_transition("venus_strike_1_phase01")

venus_strike_1_mission1 engineering_phase
venus_strike_1_mission2 engineering_trans_phase
venus_strike_1_mission3 dig_site_phase
venus_strike_1_mission4 ruins_phase
venus_strike_1_mission5 end_phase

@startup()
script ss_venus_strike1():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
