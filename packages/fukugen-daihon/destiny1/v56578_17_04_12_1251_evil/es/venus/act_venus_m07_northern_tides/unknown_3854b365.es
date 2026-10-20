# es\venus\act_venus_m07_northern_tides\unknown_3854b365.es
#
# Eye of a Gatelord's music and Ghost lines (bundle 3854B365; file name
# unknown). The intro music and the first line play once the player is in;
# the lines on point triggers are here, the ones tied to an objective or a
# fight are their mission's or encounter's. The first music cue, the lines
# md_vn07_010_20 and md_vn07_020_30/40/60/90/110 and the trigger
# pt_vn07_020_10 never fired in the one run.

@activity_bundle(0x3854B365)

sequence venus_m07_intro_music
sequence venus_m07_music_cue2
sequence md_vn07_010_10
sequence md_vn07_020_20
sequence md_vn07_020_70
trigger_volume tv_vn07_020_20
player_trigger pt_vn07_020_20 bind(tv_vn07_020_20)
trigger_volume tv_vn07_020_70
player_trigger pt_vn07_020_70 bind(tv_vn07_020_70)

@startup()
script sc_intro():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    venus_m07_intro_music.start()
    sleep(3)
    md_vn07_010_10.start()

@startup()
# the pocket in the southern tides
script sc_pocket():
    sleep_until(pt_vn07_020_20.is_triggered())
    md_vn07_020_20.start()

@startup()
# into the northern tides: the line and the music's next section
script sc_transition():
    sleep_until(pt_vn07_020_70.is_triggered())
    md_vn07_020_70.start()
    venus_m07_music_cue2.set_switch_mask(3)
