# es\mars\act_mars_m01_valley\unknown_11b7a83e.es
#
# Music and the Ghost's lines for Exclusion Zone. True name unknown.
# The lines tied to objectives and phases are started by the missions; this
# script plays the ones on the spawn and the point triggers. The volumes
# this bundle holds have no sensors of their own: the sequences play off
# them on the client once started.
#
# One run: the 3 s between the tunnel line and the intro line is as
# captured.

@activity_bundle(0x11B7A83E)
c_sequence_host seq_music_intro
c_sequence_host seq_music_cabal_intro
c_sequence_host seq_dialog_plains_tunnel
c_sequence_host seq_dialog_plains_intro
c_player_trigger_sensor_host pt_dunes
c_sequence_host seq_dialog_plains_dunes
c_player_trigger_sensor_host pt_control
c_sequence_host seq_dialog_plains_control
c_player_trigger_sensor_host pt_control_near
c_sequence_host seq_dialog_plains_control_near
c_player_trigger_sensor_host pt_checkpoint_music_start
c_sequence_host seq_music_checkpoint

startup thread sc_audio_main:
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_music_intro.start()
    seq_music_cabal_intro.start()
    seq_music_cabal_intro.set_switch_mask(1)
    seq_dialog_plains_tunnel.start()
    sleep(3)
    seq_dialog_plains_intro.start()

startup thread sc_dunes:
    sleep_until(pt_dunes.is_triggered())
    seq_dialog_plains_dunes.start()

startup thread sc_control:
    sleep_until(pt_control.is_triggered())
    seq_dialog_plains_control.start()

startup thread sc_control_near:
    sleep_until(pt_control_near.is_triggered())
    seq_dialog_plains_control_near.start()

startup thread sc_checkpoint_music:
    sleep_until(pt_checkpoint_music_start.is_triggered())
    seq_music_checkpoint.start()
    seq_music_checkpoint.set_switch_mask(1)
