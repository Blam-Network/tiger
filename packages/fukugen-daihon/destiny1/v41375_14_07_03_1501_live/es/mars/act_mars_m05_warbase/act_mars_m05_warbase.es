# es\mars\act_mars_m05_warbase\act_mars_m05_warbase.es
#
# The Garden's Spire, the Mars story mission to the Cabal warbase. The root
# starts nothing; the phases are the missions beside it, run in order.
# Mission file names are ours (true names unknown); the phase names are the
# bundle's. From one retail capture (2.3.1): every wait is that run's.
#
#   act_mars_m05_warbase_mission1.esp  phase_1_rubicon_goto: to the Rubicon
#   act_mars_m05_warbase_mission2.esp  phase_3_mesa_goto: to the mesa
#   act_mars_m05_warbase_mission3.esp  phase_4_mesa: the mesa console
#   act_mars_m05_warbase_mission4.esp  phase_5_gatehouse_goto: to the gatehouse
#   act_mars_m05_warbase_mission5.esp  phase_6_gatehouse: the ambush and the door
#   act_mars_m05_warbase_mission6.esp  phase_7_warbase_goto: to the warbase
#   act_mars_m05_warbase_mission7.esp  phase_7_5_warbase: up the bridge, clear the yard
#   act_mars_m05_warbase_mission8.esp  phase_8_warbase: the Minotaur eye, the boss, the Garden key
#   act_mars_m05_warbase_mission9.esp  phase_warbase_complete: the end
#
# The gatehouse and warbase encounters (enc_gatehouse_m05, unknown_f305afe6)
# are scripts of their own. unknown_3d68033c holds the music and Ghost lines
# the phases play.

act_mars_m05_warbase_mission1 phase_1_rubicon_goto
act_mars_m05_warbase_mission2 phase_3_mesa_goto
act_mars_m05_warbase_mission3 phase_4_mesa
act_mars_m05_warbase_mission4 phase_5_gatehouse_goto
act_mars_m05_warbase_mission5 phase_6_gatehouse
act_mars_m05_warbase_mission6 phase_7_warbase_goto
act_mars_m05_warbase_mission7 phase_7_5_warbase
act_mars_m05_warbase_mission8 phase_8_warbase
act_mars_m05_warbase_mission9 phase_warbase_complete

startup thread ss_mars_m05_warbase:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
