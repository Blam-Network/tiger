# es\cinematic_queen\act_cinematic_queen_102\act_cinematic_queen_102.es
#
# A Key Awaits. No encounters are written yet: the script only says how the
# activity starts.

# The 2.3.1 capture starts it in bubble 0, state 1 (phase_cine's); its spawn
# transition is empty, left out as cine_reveal's is.
@activity("act_cinematic_queen_102")
@start_slice("queens_chamber", "phase_cine")
@phase("phase_cine", "queens_chamber")
