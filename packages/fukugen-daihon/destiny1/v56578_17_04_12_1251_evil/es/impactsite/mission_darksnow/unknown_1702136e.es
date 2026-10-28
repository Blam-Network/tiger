# es\impactsite\mission_darksnow\unknown_1702136e.es
#
# mission_darksnow's Ghost lines and the base's alarm (bundle 1702136E, file
# name unknown; every bubble loads it). The missions and the area scripts
# play them; this script plays nothing itself. The lines no run played
# (075, 135, 145) and the music row (a cue mask the host steps up as the
# mission goes on, which no native writes) are left out.

@activity_bundle(0x1702136E)

sequence phm_dks_990_020_dialogue_sequence
sequence phm_dks_990_050_dialogue_sequence
sequence phm_dks_990_070_dialogue_sequence
sequence phm_dks_990_090_dialogue_sequence
sequence phm_dks_990_100_dialogue_sequence
sequence phm_dks_990_105_dialogue_sequence
sequence phm_dks_990_130_dialogue_sequence
sequence phm_dks_990_140_dialogue_sequence
sequence phm_dks_990_180_dialogue_sequence
sequence phm_dks_010_190_dialogue_sequence
sequence phm_dks_010_210_dialogue_sequence
sequence lower_alarm_vol
sequence reset_alarm_vol
