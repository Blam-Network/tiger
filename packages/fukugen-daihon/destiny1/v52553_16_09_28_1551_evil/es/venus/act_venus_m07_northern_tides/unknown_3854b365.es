# es\venus\act_venus_m07_northern_tides\unknown_3854b365.es
#
# Eye of a Gatelord's music and Ghost lines (bundle 3854B365; file name
# unknown). The intro music and the first line play once the player is in;
# the lines on point triggers are here, the ones tied to an objective or a
# fight are their mission's or encounter's. The first music cue, the lines
# md_vn07_010_20 and md_vn07_020_30/40/60/90/110 and the trigger
# pt_vn07_020_10 never fired in the one run.

@activity_bundle(0x3854B365)
c_sequence_host venus_m07_intro_music
c_sequence_host venus_m07_music_cue2
c_sequence_host md_vn07_010_10
c_sequence_host md_vn07_020_20
c_sequence_host md_vn07_020_70
c_trigger_volume_slot_host tv_vn07_020_20
c_player_trigger_sensor_host pt_vn07_020_20 bind(tv_vn07_020_20)
c_trigger_volume_slot_host tv_vn07_020_70
c_player_trigger_sensor_host pt_vn07_020_70 bind(tv_vn07_020_70)

startup thread sc_intro:
    sleep_until(c_player_script_utilities.all_players_are_ready())
    venus_m07_intro_music.start()
    sleep(3)
    md_vn07_010_10.start()

# the pocket in the southern tides
startup thread sc_pocket:
    sleep_until(pt_vn07_020_20.is_triggered())
    md_vn07_020_20.start()

# into the northern tides: the line and the music's next section
startup thread sc_transition:
    sleep_until(pt_vn07_020_70.is_triggered())
    md_vn07_020_70.start()
    venus_m07_music_cue2.set_switch_mask(3)
