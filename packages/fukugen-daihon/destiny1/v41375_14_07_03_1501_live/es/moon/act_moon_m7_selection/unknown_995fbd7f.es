# es\moon\act_moon_m7_selection\unknown_995fbd7f.es
#
# Now Come Salvation's music and Ghost lines (bundle 995FBD7F; file name
# unknown). The intro music and the accelerator, moonbase and launch tubes
# lines start together three seconds after the players are in (the frame
# the launch tubes phase starts in the one run); the lines tied to a phase
# or a fight are their mission's or encounter's. TU0's dialogue volumes
# (tv_*) have no trigger rows, so nothing here waits on them.

@activity_bundle(0x995FBD7F)

sequence seq_music_intro
sequence seq_dialog_accelerator_intro
sequence seq_dialog_accelerator_moonbase_transition
sequence seq_dialog_moonbase_launchtubes_transition

@startup()
script sc_intro():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    sleep(3)
    for line in [seq_music_intro, seq_dialog_accelerator_intro, seq_dialog_accelerator_moonbase_transition, seq_dialog_moonbase_launchtubes_transition]:
        line.start()
