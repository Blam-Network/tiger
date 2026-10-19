# es\mars\act_mars_m01_valley\act_mars_m01_valley.es
#
# Exclusion Zone, the first Mars story mission. The root starts nothing; the
# phases are the missions beside it, run in order. Mission file names are
# ours.
#
#   act_mars_m01_valley_mission1.esp  the arrival cinematic
#   act_mars_m01_valley_mission2.esp  the plains: open the vent, use the garage control
#   act_mars_m01_valley_mission3.esp  clear the base
#   act_mars_m01_valley_mission4.esp  cross the battleground to the checkpoint, use the console
#   act_mars_m01_valley_mission5.esp  the checkpoint boss
#   act_mars_m01_valley_mission6.esp  the valley overlook, the outro
#
# The plains and checkpoint encounters are scripts of their own
# (enc_plains_m01, enc_checkpoint_m01). unknown_11b7a83e holds the music
# and the Ghost's lines that play off the triggers.
#
# From one capture run: every timing here is a single-run fact.

@activity_bundle("act_mars_m01_valley")
# The plains' cinematic state (18.1), an empty spawn transition; the checkpoint
# (3) and the valley (26) follow. One 2.3.1 capture.
@activity("act_mars_m01_valley")
@start_slice("plains", "phase_plains_cinematic")
@phase("phase_plains_cinematic", "plains")
@phase("phase_plains_intro", "plains")
@phase("phase_plains_base", "plains")
@phase("phase_checkpoint", "cabal_checkpoint")
@phase("phase_checkpoint_boss", "cabal_checkpoint")
@phase("phase_valley", "valley")

act_mars_m01_valley_mission1 phase_plains_cinematic
act_mars_m01_valley_mission2 phase_plains_intro
act_mars_m01_valley_mission3 phase_plains_base
act_mars_m01_valley_mission4 phase_checkpoint
act_mars_m01_valley_mission5 phase_checkpoint_boss
act_mars_m01_valley_mission6 phase_valley

startup thread ss_mars_m01_valley:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
