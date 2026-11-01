# es\mars\act_mars_m06_subway\act_mars_m06_subway.es
#
# A Rising Tide, the Mars story mission into the subway. The root only
# readies the lifetime; the phases are the missions beside it, run in order.
# Mission file names are ours. First authored from an earlier run, checked
# and fixed against the 2026-11-01 run (docs/missions/act_mars_m06_subway.md
# in tiger-packet-analysis): one run each, so every timing is unconfirmed.
#
#   act_mars_m06_subway_mission1.esp  go to the battleground
#   act_mars_m06_subway_mission2.esp  scan the battleground
#   act_mars_m06_subway_mission3.esp  go to the lobby
#   act_mars_m06_subway_mission4.esp  the lobby, south hall
#   act_mars_m06_subway_mission5.esp  the lobby, north platform
#   act_mars_m06_subway_mission6.esp  go to the subway
#   act_mars_m06_subway_mission7.esp  destroy the warp gates, clear the Vex
#   act_mars_m06_subway_mission8.esp  scan the conflux, the mission ends
#
# The lobby and subway encounters are scripts of their own (enc_lobby_m06,
# enc_subway_m06); unknown_04e6ac69 holds the music and the Ghost lines that
# follow the fights; the lines tied to an objective are its mission's.
# 890B869A (one firing area, never on the wire) has no script.

@activity_bundle("act_mars_m06_subway")
# The same landing zone, the battleground (1), the lobby (12) and the subway
# (22), as the 2.3.1 run's lifetime phase index went.
@activity("act_mars_m06_subway")
@start_slice("plains")
@phase("phase_m06_battleground_goto", "battleground")
@phase("phase_m06_battleground", "battleground")
@phase("phase_m06_lobby_goto", "lobby")
@phase("phase_m06_lobby_s", "lobby")
@phase("phase_m06_lobby_n", "lobby")
@phase("phase_m06_subway_goto", "subway")
@phase("phase_m06_subway", "subway")
@phase("phase_m06_subway_close", "subway")
@spawn_transition("landing_zone")

act_mars_m06_subway_mission1 phase_m06_battleground_goto
act_mars_m06_subway_mission2 phase_m06_battleground
act_mars_m06_subway_mission3 phase_m06_lobby_goto
act_mars_m06_subway_mission4 phase_m06_lobby_s
act_mars_m06_subway_mission5 phase_m06_lobby_n
act_mars_m06_subway_mission6 phase_m06_subway_goto
act_mars_m06_subway_mission7 phase_m06_subway
act_mars_m06_subway_mission8 phase_m06_subway_close

@startup()
script ss_mars_m06_subway():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
