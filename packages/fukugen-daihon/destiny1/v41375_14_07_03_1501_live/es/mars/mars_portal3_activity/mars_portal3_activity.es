# es\mars\mars_portal3_activity\mars_portal3_activity.es
#
# The Hypogeum, the Mars strike: from the lower garden up through the upper
# garden, past the Cyclops, down into the Hypogeum and the Vex's ultra
# hydra. The root starts nothing; it declares the phases, run in member
# order. Mission file names are ours.
#
#   mars_portal3_activity_mission1.esp  the lower garden: on to the upper
#   mars_portal3_activity_mission2.esp  the upper garden: to its gate
#   mars_portal3_activity_mission3.esp  the upper garden: the Cyclops
#   mars_portal3_activity_mission4.esp  down to the Hypogeum's gate
#   mars_portal3_activity_mission5.esp  the ultra hydra
#   mars_portal3_activity_mission6.esp  the end of the strike
#
# The gardens' and the Hypogeum's encounters, and mars_portal3_audio, are
# scripts of their own. From one retail 2.3.1 run (tiger-packet-analysis
# docs/missions/mars_portal_3.md): every wait is a single-run fact.

@activity_bundle("mars_portal3_activity")
# The 2.3.1 capture starts it in the lower garden (104, bubble 13 state 0) at
# the spawn its GAS names; the lifetime runs the six phase rows in this
# order: the lower garden, two upper garden phases (25), then three in the
# Hypogeum (11).
@activity("mars_portal_3")
@start_slice("lowergarden", "phase_lowergarden")
@phase("phase_lowergarden", "lowergarden")
@phase("phase_uppergarden", "uppergarden")
@phase("phase_upper_uppergarden", "uppergarden")
@phase("phase_hypogeum", "hypogeum")
@phase("phase_boss", "hypogeum")
@phase("phase_end", "hypogeum")
@spawn_transition(0xFB76ECC4)
# The transitions the GAS names as the client reaches the lower garden, the
# upper garden and the Hypogeum.
@region_spawn_transition(104, 0xFB76ECC4)
@region_spawn_transition(200, 0xB72B95E3)
@region_spawn_transition(88, 0x14D6E821)

mars_portal3_activity_mission1 phase_lowergarden
mars_portal3_activity_mission2 phase_uppergarden
mars_portal3_activity_mission3 phase_upper_uppergarden
mars_portal3_activity_mission4 phase_hypogeum
mars_portal3_activity_mission5 phase_boss
mars_portal3_activity_mission6 phase_end

@startup()
script ss_mars_portal3():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
