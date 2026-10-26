# es\moon\act_moon_m1_launchtubes\unknown_d66ce681.es
#
# Music and Ghost lines for The Dark Beyond.
# What plays here plays off the player's arrival or a trigger. The
# accelerator's own lines and music cues (seq_d_o1_s11, seq_d_o1_s12 and
# seq_music_accelerator's later sections) are started by its encounter; the
# lines of the moonbase, the tubes and the court, and the launch tubes
# music's later sections, by the missions.
# From two 2.3.1 runs (2026-10-03 and 2026-10-24); every delay held in both.
# In the second the tubes music missed its first section: the bubble trigger
# and the goto objective's fired in one frame, and it only started on
# pt_music_lt_alt (mask 2, not 3). Never on the wire: seq_d_o1_s03 to s06,
# s08, s10, s13, s15 and the o2 lines the tv_seq_* volumes would start.

@activity_bundle(0xD66CE681)

sequence seq_music_intro
sequence seq_music_accelerator
sequence seq_music_launchtubes
sequence seq_d_o1_s01
sequence seq_d_o1_s02
sequence seq_d_o1_s07
sequence seq_d_o1_s09
player_trigger pt_accel_obj
player_trigger pt_accel_enter
player_trigger pt_music_lt_start
player_trigger pt_music_lt_alt

@startup()
script sc_main_thread():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_music_intro.start()
    seq_music_accelerator.start()
    seq_music_accelerator.set_switch_mask(1)
    sleep(3)
    seq_d_o1_s01.start()

@startup()
# The Ghost's next line waits for the player to head into the accelerator,
# and for its first to finish.
script sc_pt_accel_obj():
    sleep_until(pt_accel_obj.is_triggered())
    sleep_until(seq_d_o1_s01.is_done())
    seq_d_o1_s02.start()

@startup()
# Into the accelerator proper: the Ghost talks while the player looks around.
script sc_pt_accel_enter():
    sleep_until(pt_accel_enter.is_triggered())
    sleep(1)
    seq_d_o1_s07.start()
    sleep(14)
    seq_d_o1_s09.start()

@startup()
# The launch tubes' music starts as the player reaches the tubes and moves up
# a section on the way down to the fallen Guardian.
script sc_launchtubes_music():
    sleep_until(pt_music_lt_start.is_triggered())
    seq_music_launchtubes.start()
    seq_music_launchtubes.set_switch_mask(1)
    sleep_until(pt_music_lt_alt.is_triggered())
    sleep(1)
    seq_music_launchtubes.set_switch_mask(3)
