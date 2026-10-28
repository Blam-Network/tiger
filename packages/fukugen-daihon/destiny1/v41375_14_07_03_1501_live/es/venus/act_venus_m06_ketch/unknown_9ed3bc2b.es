# es\venus\act_venus_m06_ketch\unknown_9ed3bc2b.es
#
# Scourge of Winter's music and Ghost lines (bundle 9ED3BC2B; file name
# unknown). The intro music and the first line play once the players are in;
# the lines on point triggers on the way to the Thieves' Den, and the dock
# music's sections, are here. The lines and music tied to an objective are
# their mission's. The first dock cue's own start trigger is off from the
# start; the dock music builds on the next three triggers and the dock's
# clear, and fades three seconds after it. md_vn06_020_10, 020_30, 020_35
# and 020_50 never played in the one run, though the triggers named after
# 020_10, 020_35 and 020_50 fired.

@activity_bundle(0x9ED3BC2B)

sequence venus_m06_intro_music
sequence venus_m06_music_cue1
sequence md_vn06_010_10
sequence md_vn06_010_25
sequence md_vn06_010_30
sequence md_vn06_010_34
trigger_volume tv_vn06_010_25
player_trigger pt_vn06_010_25 bind(tv_vn06_010_25)
trigger_volume tv_vn06_010_30
player_trigger pt_vn06_010_30 bind(tv_vn06_010_30)
trigger_volume tv_vn06_010_34
player_trigger pt_vn06_010_34 bind(tv_vn06_010_34)
trigger_volume tv_vn06_010_50
player_trigger pt_vn06_010_50 bind(tv_vn06_010_50)
trigger_volume tv_venus_m06_cue1_start
player_trigger pt_venus_m06_cue1_start bind(tv_venus_m06_cue1_start)
trigger_volume tv_venus_m06_cue1_alt2
player_trigger pt_venus_m06_cue1_alt2 bind(tv_venus_m06_cue1_alt2)
trigger_volume tv_venus_m06_cue1_alt3
player_trigger pt_venus_m06_cue1_alt3 bind(tv_venus_m06_cue1_alt3)
encounter_handle enc_fallen_dock_m06

@startup()
script sc_intro():
    pt_venus_m06_cue1_start.disable()
    sleep_until(c_player_script_utilities.all_players_are_ready())
    venus_m06_intro_music.start()
    sleep(3)
    md_vn06_010_10.start()

@startup()
# the caldera, on the way to the den (both triggers are the caldera's public
# bubble's, so they reach the public host)
script sc_caldera():
    sleep_until(pt_vn06_010_25.is_triggered())
    md_vn06_010_25.start()
    sleep_until(pt_vn06_010_30.is_triggered())
    md_vn06_010_30.start()

@startup()
# inside the den: the line came 13 s after the trigger in the one run, on
# something the wire does not show
script sc_den():
    sleep_until(pt_vn06_010_34.is_triggered())
    sleep(13)
    md_vn06_010_34.start()

@startup()
# the dock music's sections; mission 2 starts it on the first
script sc_dock_music():
    sleep_until(pt_vn06_010_50.is_triggered())
    venus_m06_music_cue1.set_switch_mask(3)
    sleep_until(pt_venus_m06_cue1_alt2.is_triggered())
    venus_m06_music_cue1.set_switch_mask(7)
    sleep_until(pt_venus_m06_cue1_alt3.is_triggered())
    venus_m06_music_cue1.set_switch_mask(15)
    sleep_until(enc_fallen_dock_m06.dock_clear)
    venus_m06_music_cue1.set_switch_mask(31)
    sleep(3)
    venus_m06_music_cue1.stop()
