# es\cinematic_trv\cine_speaker\cine_speaker.es
#
# Restoration: the Speaker's cutscene. Nobody spawns; the one phase plays one
# cinematic and the activity ends when it finishes. From one retail 2.3.1
# capture (2026-10-24_22-31-16 #1, played to the end, not skipped).
#
#   cine_speaker_mission1.esp  the Speaker

@activity_bundle("cine_speaker")
# The capture starts it in boulevard (bubble 0) at state 1, the state
# cine_108_spk_phase owns; the lifetime names that phase and bubble 0 from
# the first snapshot.
@activity("cine_speaker")
@start_slice("boulevard", "cine_108_spk_phase")
@phase("cine_108_spk_phase", "boulevard")

cine_speaker_mission1 cine_108_spk_phase

# Pregame as soon as the scripts run, as cine_reveal's root does. Retail
# sends it 0.3 s after the client's first players[0] sense, 18.6 s after
# world entry: the client was still loading.
@startup()
script ss_cine_speaker():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
