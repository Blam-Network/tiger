# es\cinematic_trv\cine_end\cine_end.es
#
# The end of The Black Garden: the outro cutscene. Nobody spawns; the one
# phase plays one cinematic and the activity ends when it finishes. From one
# retail 2.3.1 capture (2026-10-26_23-57-02 #7, after act_mars_m07_lowergarden,
# played to the end, not skipped).
#
#   cine_end_mission1.esp  cine_123a_end

@activity_bundle("cine_end")
# The capture starts it in military (bubble 2) at state 1, the state
# cine_123a_end_phase owns; the lifetime names that phase and bubble 2 from
# the first snapshot.
@activity("cine_end")
@start_slice("military", "cine_123a_end_phase")
@phase("cine_123a_end_phase", "military")

cine_end_mission1 cine_123a_end_phase

# Pregame as soon as the scripts run, as cine_speaker's root does. Retail
# sends it 0.5 s after the client's first players[0] sense, 15.7 s after
# world entry: the client was still loading.
@startup()
script ss_cine_end():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
