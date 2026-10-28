# es\cinematic_queen\act_cinematic_queen_101\enc_cinematic_queen_101.es
#
# The Awoken: the Queen's cutscenes. Nobody spawns; each phase plays one
# cinematic. From one retail 2.3.1 capture (2026-10-26_22-24-55 #1, both
# cinematics played to the end, not skipped).
#
#   enc_cinematic_queen_101_mission1.esp  pf_115_rfr
#   enc_cinematic_queen_101_mission2.esp  pf_116_cro

@activity_bundle("enc_cinematic_queen_101")
# The capture starts it in bubble 2 (its region never cracked) at state 1,
# phase_cine_1's. When the lifetime names phase_cine_2 the client moves to
# queens_chamber (bubble 0), state 1.
@activity("act_cinematic_queen_101")
@start_slice("0x1A8DC399", "phase_cine_1")
@phase("phase_cine_1", "0x1A8DC399")
@phase("phase_cine_2", "queens_chamber")

enc_cinematic_queen_101_mission1 phase_cine_1
enc_cinematic_queen_101_mission2 phase_cine_2

# Pregame as soon as the scripts run, as cine_reveal's root does. Retail
# sends it 0.4 s after the client's first players[0] sense, 13.2 s after
# world entry: the client was still loading.
@startup()
script ss_enc_cinematic_queen_101():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
