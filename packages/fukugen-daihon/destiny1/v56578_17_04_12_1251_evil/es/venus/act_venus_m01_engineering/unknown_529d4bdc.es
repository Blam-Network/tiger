# es\venus\act_venus_m01_engineering\unknown_529d4bdc.es
#
# Music and Ghost lines for A Stranger's Call. True name unknown.
# The missions start most lines themselves, off their objectives, and step the
# music cue through its sections; this script plays the arrival music and
# line, the entrance trigger's line, and the ascent after the outro. The
# md_vn01_m* lines and their volumes never played in the capture: declared,
# not used.

@activity_bundle(0x529D4BDC)

c_sequence_host venus_m01_intro_music
c_sequence_host venus_m01_music_cue1
c_sequence_host venus_m01_music_ascent
c_sequence_host md_vn01_010_10
c_sequence_host md_vn01_010_15
c_sequence_host md_vn01_m010_20
c_sequence_host md_vn01_m010_30
c_sequence_host md_vn01_m010_40
c_sequence_host md_vn01_m010_50
c_sequence_host md_vn01_010_60
c_sequence_host md_vn01_010_70
c_sequence_host md_vn01_010_80
c_sequence_host md_vn01_010_90
c_sequence_host md_vn01_m020_10
c_sequence_host md_vn01_m020_20
c_sequence_host md_vn01_020_30
c_sequence_host md_vn01_m020_40
c_sequence_host md_vn01_020_50
c_sequence_host md_vn01_020_60
c_sequence_host md_vn01_020_70
c_sequence_host md_vn01_m020_80
c_sequence_host md_vn01_m020_90
c_sequence_host md_vn01_020_100
c_trigger_volume_slot_host tv_venus_m01_cue1_start
c_trigger_volume_slot_host tv_venus_m01_cue1_alt
c_player_trigger_sensor_host pt_venus_m01_cue1_start bind(tv_venus_m01_cue1_start)
c_trigger_volume_slot_host tv_vn01_m010_20
c_trigger_volume_slot_host tv_vn01_m010_30
c_player_trigger_sensor_host pt_vn01_m010_30 bind(tv_vn01_m010_30)
c_trigger_volume_slot_host tv_vn01_m010_40
c_player_trigger_sensor_host pt_vn01_m010_40 bind(tv_vn01_m010_40)
c_trigger_volume_slot_host tv_vn01_010_70
c_player_trigger_sensor_host pt_vn01_010_70 bind(tv_vn01_010_70)
c_trigger_volume_slot_host tv_vn01_m020_10
c_trigger_volume_slot_host tv_vn01_m020_20
c_trigger_volume_slot_host tv_vn01_020_30
c_player_trigger_sensor_host pt_vn01_020_30 bind(tv_vn01_020_30)
c_trigger_volume_slot_host tv_vn01_m020_50
c_location_sensor_host entrance
cinematic_midmission pf_113_str

startup thread sc_audio_main:
    sleep_until(c_player_script_utilities.all_players_are_ready())
    venus_m01_intro_music.start()
    sleep(2)
    md_vn01_010_15.start()

startup thread sc_entrance_line:
    sleep_until(pt_vn01_020_30.is_triggered())
    md_vn01_020_30.start()

startup thread sc_ascent:
    sleep_until(pf_113_str._cinematic.is_done())
    venus_m01_music_ascent.start()
