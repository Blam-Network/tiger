# es\venus\act_venus_m01_engineering\unknown_529d4bdc.es
#
# Music and Ghost lines for A Stranger's Call.
# The missions start most lines themselves, off their objectives, and step the
# music cue through its sections; this script plays the arrival music and
# line, the entrance trigger's line, and the ascent after the outro. The two
# triggers the missions arm start out disarmed, and the cue sits at its first
# section until mission 3. The md_vn01_m* lines never played in the capture,
# though pt_vn01_m010_30 and pt_vn01_m010_40 fired: declared, not used.

@activity_bundle(0x529D4BDC)

sequence venus_m01_intro_music
sequence venus_m01_music_cue1
sequence venus_m01_music_ascent
sequence md_vn01_010_10
sequence md_vn01_010_15
sequence md_vn01_m010_20
sequence md_vn01_m010_30
sequence md_vn01_m010_40
sequence md_vn01_m010_50
sequence md_vn01_010_60
sequence md_vn01_010_70
sequence md_vn01_010_80
sequence md_vn01_010_90
sequence md_vn01_m020_10
sequence md_vn01_m020_20
sequence md_vn01_020_30
sequence md_vn01_m020_40
sequence md_vn01_020_50
sequence md_vn01_020_60
sequence md_vn01_020_70
sequence md_vn01_m020_80
sequence md_vn01_m020_90
sequence md_vn01_020_100
trigger_volume tv_venus_m01_cue1_start
trigger_volume tv_venus_m01_cue1_alt
player_trigger pt_venus_m01_cue1_start bind(tv_venus_m01_cue1_start)
trigger_volume tv_vn01_m010_20
trigger_volume tv_vn01_m010_30
player_trigger pt_vn01_m010_30 bind(tv_vn01_m010_30)
trigger_volume tv_vn01_m010_40
player_trigger pt_vn01_m010_40 bind(tv_vn01_m010_40)
trigger_volume tv_vn01_010_70
player_trigger pt_vn01_010_70 bind(tv_vn01_010_70)
trigger_volume tv_vn01_m020_10
trigger_volume tv_vn01_m020_20
trigger_volume tv_vn01_020_30
player_trigger pt_vn01_020_30 bind(tv_vn01_020_30)
trigger_volume tv_vn01_m020_50
location entrance
cinematic_midmission pf_113_str

@startup()
script sc_audio_main():
    pt_vn01_010_70.disable()
    pt_vn01_020_30.disable()
    venus_m01_music_cue1.set_switch_mask(0)
    sleep_until(c_player_script_utilities.all_players_are_ready())
    venus_m01_intro_music.start()
    sleep(2)
    md_vn01_010_15.start()

@startup()
script sc_entrance_line():
    sleep_until(pt_vn01_020_30.is_triggered())
    md_vn01_020_30.start()

@startup()
script sc_ascent():
    sleep_until(pf_113_str._cinematic.is_done())
    venus_m01_music_ascent.start()
