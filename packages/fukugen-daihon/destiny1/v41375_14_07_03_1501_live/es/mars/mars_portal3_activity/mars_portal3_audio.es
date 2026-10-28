# es\mars\mars_portal3_activity\mars_portal3_audio.es
#
# The strike's music and Ghost lines. The intro music comes up with the
# lifetime and the Ghost's first line plays at its volume, armed then; the
# ascent music and his last line come at the end. The missions wake each.
#
# One 2.3.1 run, in which every other line's volume fired but only these two
# were armed, so the rest are left alone (mission 3 reads one of them).
# 2.3.1 renamed the intro music (seq_mars_portal3_cue1) and added a cue for
# the hydra (cue2) TU0 does not have.

@activity_bundle("mars_portal3_audio")

sequence seq_music_cue1
sequence seq_music_ascent
dialog_trigger mss03_010_020_trigger
dialog_trigger mss03_020_030_trigger
dialog_trigger mss03_030_070_trigger

# with the lifetime (mission 1)
script sc_intro():
    seq_music_cue1.start()
    mss03_010_020_trigger.enable()

# the end of the strike (mission 6)
script sc_outro():
    seq_music_ascent.start()
    mss03_030_070_trigger.enable()
