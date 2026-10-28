# es\hiveship\mission_touchdown\mission_touchdown.es
#
# Touchdown, the Taken King's landing on the Dreadnaught: the landing
# cinematic, then through the Taken in the shroud to the core, break the
# three shells that hold the shroud up while the Taken defend them, and on
# to the breech, where the Ghost deploys a link and the Cabal assault has to
# be beaten back. The root puts the lifetime in pregame; the phases are the
# missions beside it, run in order. Mission file names are ours.
#
#   mission_touchdown_mission1.esp  phase_touchdown_cinematic_landing: the landing
#   mission_touchdown_mission2.esp  phase_touchdown_infiltrate_shroud: through the shroud to the core
#   mission_touchdown_mission3.esp  phase_touchdown_disable_core: the three nodes and their shells
#   mission_touchdown_mission4.esp  phase_touchdown_goto_breech: investigate the Cabal, deploy the link
#   mission_touchdown_mission5.esp  phase_touchdown_secure_breech: the Cabal assault
#   mission_touchdown_mission6.esp  phase_touchdown_outro: the Ghost's last lines
#
# Each area's encounter is a script of its own beside this one:
# unknown_9405a5b0 (the shroud), unknown_9e7d3c02 (the core), unknown_4612a11e
# (the core's doors, which nothing moved) and unknown_0c6ea3a4 (the breech).
# unknown_5476e5b1 holds the Ghost's lines, which the missions play. From
# one retail 2.3.1 capture (tiger-packet-analysis docs/missions/
# mission_touchdown.md): every wait is that run's, unconfirmed.

@activity_bundle("mission_touchdown")
# The 2.3.1 capture starts it in the shroud's cinematic state (129, bubble 16
# state 1) at the default spawn; the lifetime runs the landing and the
# infiltration in the shroud (16), the core phase in the core (9) and the
# rest at the breech (1). The region transitions are the ones the GAS named
# once the client had been there: the shroud (128), the core (72) and the
# breech (8).
@activity("mission_touchdown")
@start_slice("shroud", "phase_touchdown_cinematic_landing")
@phase("phase_touchdown_cinematic_landing", "shroud")
@phase("phase_touchdown_infiltrate_shroud", "shroud")
@phase("phase_touchdown_disable_core", "core")
@phase("phase_touchdown_goto_breech", "breech")
@phase("phase_touchdown_secure_breech", "breech")
@phase("phase_touchdown_outro", "breech")
@region_spawn_transition(128, 0xE3BC126F)
@region_spawn_transition(72, 0x60631260)
@region_spawn_transition(8, 0x769DA214)

mission_touchdown_mission1 phase_touchdown_cinematic_landing
mission_touchdown_mission2 phase_touchdown_infiltrate_shroud
mission_touchdown_mission3 phase_touchdown_disable_core
mission_touchdown_mission4 phase_touchdown_goto_breech
mission_touchdown_mission5 phase_touchdown_secure_breech
mission_touchdown_mission6 phase_touchdown_outro

@startup()
script ss_mission_touchdown():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
