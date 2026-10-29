# es\cinematic_trv\cine_hangar\cine_hangar.es
#
# The hangar cutscene after the Taken King's mission_elevator. Nobody spawns;
# the one phase plays one cinematic and the activity ends when it finishes.
# From one retail 2.3.1 capture (2026-10-28_16-02-29 #3, a fireteam of three,
# skipped 7.5 s in).
#
#   cine_hangar_mission1.esp  the hangar

@activity_bundle("cine_hangar")
# The capture starts it in military (bubble 2) at state 1, the state
# cine_175_hng_phase owns; the lifetime names that phase and bubble 2 from
# the first snapshot.
@activity("cine_hangar")
@start_slice("military", "cine_175_hng_phase")
@phase("cine_175_hng_phase", "military")

cine_hangar_mission1 cine_175_hng_phase

# Pregame as soon as the scripts run, as the other cinematic activities' roots
# do. Retail sent it 2.6 s after world entry, 0.7 s after the client's second
# players[2] sense.
@startup()
script ss_cine_hangar():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
