# es\cosmo\cosmo_portal2_activity\cosmo_portal2_audio.es
#
# The strike's music and Ghost lines. The intro music comes up with the
# lifetime and the Ghost speaks three seconds later; his line at dome_c's
# door plays off its volume. The lines tied to an objective are their
# missions'. TU0 has none of 2.3.1's music cues (music_cue1-3, ascent) and
# four of its lines (md_010_50, md_020_50, md_020_55, md_020_90) never
# played in the 2.3.1 run, so they are left alone. One run.

@activity_bundle("cosmo_portal2_audio")

sequence music_intro01
sequence md_010_20
player_trigger pt_md_10_40
sequence md_010_40

@startup()
script sc_audio_main():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    music_intro01.start()
    sleep(3)
    md_010_20.start()

@startup()
script sc_dome_c_door():
    sleep_until(pt_md_10_40.is_triggered())
    md_010_40.start()
