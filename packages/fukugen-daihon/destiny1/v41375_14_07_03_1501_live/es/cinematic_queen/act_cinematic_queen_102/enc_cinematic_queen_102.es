# es\cinematic_queen\act_cinematic_queen_102\enc_cinematic_queen_102.es
#
# A Key Awaits: the Queen's cutscene. Nobody spawns; the one phase plays one
# cinematic and the activity ends when it finishes. From two retail 2.3.1
# sessions: 2026-10-01_21-06-51 #8 (skipped) and 2026-10-26_23-01-56 #8
# (played to the end).
#
#   enc_cinematic_queen_102_mission1.esp  pf_117_que

@activity_bundle("enc_cinematic_queen_102")
# Both captures start it in queens_chamber (bubble 0) at state 1, the state
# phase_cine owns; the lifetime names that phase and bubble 0 from the first
# snapshot.
@activity("act_cinematic_queen_102")
@start_slice("queens_chamber", "phase_cine")
@phase("phase_cine", "queens_chamber")

enc_cinematic_queen_102_mission1 phase_cine

# Pregame as soon as the scripts run, as cine_speaker's root does. Retail
# sends it 0.4-0.7 s after the client's first players[0] sense, 12.8-12.9 s
# after world entry: the client was still loading.
@startup()
script ss_enc_cinematic_queen_102():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
