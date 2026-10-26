# es\venus\act_venus_m02_southern_tides\act_venus_m02_southern_tides.es
#
# Ishtar Collective, the second Venus story mission: through the headlands
# for the loot the Vex Cyclops carries, down into the southern tides, clear the
# Fallen camp, then analyze the Ishtar terminal in the dome and hold it
# against three Vex waves out of their clouds. The root puts the lifetime in
# pregame; the phases are the missions beside it, run in order. Mission file
# names are ours.
#
#   act_venus_m02_southern_tides_mission1.esp  the headlands: the Cyclops' loot
#   act_venus_m02_southern_tides_mission2.esp  on to the southern tides
#   act_venus_m02_southern_tides_mission3.esp  the tides: clear out the Fallen
#   act_venus_m02_southern_tides_mission4.esp  the dome: analyze, defend, return
#   act_venus_m02_southern_tides_mission5.esp  the outro
#
# The tides' own encounter is es\venus\southern_tides\enc_southern_tides_m02.es;
# the music and Ghost lines are seq_venus_m02_southern_tides. Authored from one
# retail 2.3.1 capture (tiger-packet-analysis
# docs/missions/act_venus_m02_southern_tides.md): every wait is unconfirmed.

@activity_bundle("act_venus_m02_southern_tides")
# The player spawns in baby_shat (24, bubble 3 state 0) at the GAS's spawn
# FFBA6F9C and walks through the shattered coast (20) and the headlands (10)
# to the southern tides (21); the lifetime runs phase00 in the headlands and
# the rest in the tides. The region transitions are the ones the GAS named
# once the client had been there.
@activity("act_venus_m02_southern_tides")
@start_slice("baby_shat")
@phase("phase00", "headlands")
@phase("phase_goto_tides", "southern_tides")
@phase("phase01", "southern_tides")
@phase("phase02", "southern_tides")
@phase("phase_southern_tides_outro", "southern_tides")
@spawn_transition(0xFFBA6F9C)
@region_spawn_transition(24, 0xFFBA6F9C)
@region_spawn_transition(160, 0x368F3B79)
@region_spawn_transition(80, 0xFEEFDC44)
@region_spawn_transition(224, 0x0385BDB2)
@region_spawn_transition(168, 0xF46BE2BA)

act_venus_m02_southern_tides_mission1 phase00
act_venus_m02_southern_tides_mission2 phase_goto_tides
act_venus_m02_southern_tides_mission3 phase01
act_venus_m02_southern_tides_mission4 phase02
act_venus_m02_southern_tides_mission5 phase_southern_tides_outro

@startup()
script ss_venus_m02_southern_tides():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
