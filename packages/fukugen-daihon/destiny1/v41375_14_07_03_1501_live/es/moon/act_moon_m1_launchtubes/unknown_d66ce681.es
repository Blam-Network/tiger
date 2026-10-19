# es\moon\act_moon_m1_launchtubes\unknown_d66ce681.es
#
# Music and Ghost lines for The Dark Beyond. True name unknown.
# The accelerator's own lines and music cues (seq_d_o1_s11, seq_d_o1_s12 and
# seq_music_accelerator's later sections) are started by its encounter, the
# lines of the moonbase, the tubes and the gate by their missions. What is
# here plays off the player's arrival or a trigger.
# One capture: every delay is a single-run fact, nothing is confirmed.
# Never on the wire: seq_d_o1_s03 to s06, s08, s10, s13, s15 and the o2 lines
# the tv_seq_* volumes would start.

@activity_bundle(0xD66CE681)

c_sequence_host seq_music_intro  # true name unknown
c_sequence_host seq_music_accelerator  # true name unknown
c_sequence_host seq_music_launchtubes  # true name unknown
c_sequence_host seq_d_o1_s01  # true name unknown
c_sequence_host seq_d_o1_s02  # true name unknown
c_sequence_host seq_d_o1_s07  # true name unknown
c_sequence_host seq_d_o1_s09  # true name unknown
c_sequence_host seq_d_o2_s09  # true name unknown
c_player_trigger_sensor_host pt_accel_enter  # true name unknown
c_player_trigger_sensor_host pt_music_lt_alt  # true name unknown
c_player_trigger_sensor_host pt_spawn_court_interior  # true name unknown
c_squad_sensor_host sq_court_high_a_b
c_squad_sensor_host sq_court_high_b
trigger_bubble_objective pf_objective_goto

startup thread sc_main_thread:
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_music_intro.start()
    seq_music_accelerator.start()
    seq_music_accelerator.set_switch_mask(1)
    sleep(3)
    seq_d_o1_s01.start()
    sleep(9)
    seq_d_o1_s02.start()

# Into the accelerator proper: the Ghost talks while the player looks around.
startup thread sc_pt_accel_enter:
    sleep_until(pt_accel_enter.is_triggered())
    sleep(1)
    seq_d_o1_s07.start()
    sleep(14)
    seq_d_o1_s09.start()

# The launch tubes' music starts as the player reaches the tubes and moves up
# a section each time the fight moves on. The gate and the Guardian's button
# move it on elsewhere.
startup thread sc_launchtubes_music:
    sleep_until(pf_objective_goto._player_trigger.is_triggered())
    seq_music_launchtubes.start()
    seq_music_launchtubes.set_switch_mask(1)
    sleep_until(pt_music_lt_alt.is_triggered())
    sleep(1)
    seq_music_launchtubes.set_switch_mask(3)

startup thread sc_court_music:
    sleep_until(pt_spawn_court_interior.is_triggered())
    sleep(2)
    seq_d_o2_s09.start()
    seq_music_launchtubes.set_switch_mask(31)
    sleep_until(sq_court_high_a_b.alive_count() > 0)
    sleep_until(sq_court_high_a_b.alive_count() == 0)
    seq_music_launchtubes.set_switch_mask(63)
    sleep_until(sq_court_high_b.alive_count() > 0)
    sleep_until(sq_court_high_b.alive_count() == 0)
    seq_music_launchtubes.set_switch_mask(127)
    seq_music_launchtubes.stop()
