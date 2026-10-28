# es\cosmo\quest_infidel\quest_infidel.es
#
# Fang of Ir Yut, the Cosmodrome quest (Taken King): land in the graveyard, go
# down the breach to the cliff, then hold the highway against the Fallen
# skiffs and dropships until the captain and the last wave are dead. The root
# starts nothing; the phases are the missions beside it, run in order. Mission
# file names are ours. From one retail capture, so every rule and wait here is
# unconfirmed.
#
#   quest_infidel_mission1.esp  phase_graveyard: the landing
#   quest_infidel_mission2.esp  phase_breach: through the breach to the cliff
#   quest_infidel_mission3.esp  phase_highway: the cliff, the captain, the last wave
#   quest_infidel_mission4.esp  phase_highway_end: the outro
#
# The breach's Fallen are unknown_bf1d6e1a's, the highway's unknown_bd3354e6's.

@activity_bundle("quest_infidel")
# The 2.3.1 capture starts it in the graveyard (bubble 12, public) at spawn
# point 0x9EDE0874; its lifetime runs phase_graveyard, phase_breach (bubble 3)
# and the two highway phases (14). The region spawns are the ones the GAS named
# as the player reached the breach and the highway.
@activity("quest_infidel")
@start_slice("graveyard", "phase_graveyard")
@phase("phase_graveyard", "graveyard")
@phase("phase_breach", "breach")
@phase("phase_highway", "highway")
@phase("phase_highway_end", "highway")
@spawn_transition(0x9EDE0874)
@region_spawn_transition(24, "breach_to_graveyard")
@region_spawn_transition(112, 0x68935472)

quest_infidel_mission1 phase_graveyard
quest_infidel_mission2 phase_breach
quest_infidel_mission3 phase_highway
quest_infidel_mission4 phase_highway_end

@startup()
script ss_quest_infidel():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
