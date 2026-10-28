# es\cosmo\act_cosmo_m6_rasputin\unknown_ef78ad7a.es
#
# The music and the Ghost's lines of act_cosmo_m6_rasputin (bundle EF78AD7A;
# file name unknown). Only this activity loads it. The phases wake each
# group of lines as their step comes; the outro is the last phase's own.
#
# From one retail 2.3.1 run. Its wipes in the core put every line and the
# music back to silent, this encounter's rows included, and the lines of the
# road there never came again. 2.3.1 renamed the music (seq_music_delta,
# seq_music_rasputin) and added lines TU0 does not have (the door opening,
# the Hive cleanse, finding and using the controls); TU0's intro music
# starts where its music did.

@activity_bundle(0xEF78AD7A)

sequence seq_music_intro
sequence seq_dialog_delta_intro
sequence seq_dialog_delta_sea_transition
sequence seq_dialog_vendor_door_complete
sequence seq_dialog_rasputin_hive

# the spawn: the music with the vendor objective, the Ghost on the road a
# few seconds later
script sc_delta():
    seq_music_intro.start()
    sleep(3)
    seq_dialog_delta_intro.start()
    seq_dialog_delta_sea_transition.start()

# the vendor bunker reached: the Ghost on its door
script sc_vendor_door():
    sleep(5.5)
    seq_dialog_vendor_door_complete.start()

# the core: the Ghost on the Hive, four seconds after the kill objective is
# up (each try at the fight)
script sc_core_hive():
    sleep(4)
    seq_dialog_rasputin_hive.start()
