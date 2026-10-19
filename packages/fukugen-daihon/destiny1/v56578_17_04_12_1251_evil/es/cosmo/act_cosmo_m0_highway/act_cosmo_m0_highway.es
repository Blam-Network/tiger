# es\cosmo\act_cosmo_m0_highway\act_cosmo_m0_highway.es
#
# A Guardian Rises, the first story mission. The root starts nothing; the
# phases are the missions beside it, run in order. Mission file names are ours
# (true names unknown).
#
#   act_cosmo_m0_highway_mission1.esp  the Ghost finds you
#   act_cosmo_m0_highway_mission2.esp  enter the wall
#   act_cosmo_m0_highway_mission3.esp  find a weapon
#   act_cosmo_m0_highway_mission4.esp  fight through the wall
#   act_cosmo_m0_highway_mission5.esp  fight through the Fallen
#   act_cosmo_m0_highway_mission6.esp  find the ship, clear out the Fallen
#   act_cosmo_m0_highway_mission7.esp  the ship leaves
#
# The area encounters (highway, breach, graveyard, hangar) are scripts of
# their own. unknown_3c2f5ed5 holds the music and Ghost lines.

@activity_bundle("act_cosmo_m0_highway")
# The 2.3.1 captures start it in highway (14), state 1 (the intro phase's),
# GAS spawn EAEC2335. The phases are in the order the lifetime ran them in the
# captures, each with the slice the lifetime named beside it.
@activity("act_cosmo_m0_highway")
@start_slice("highway", "cosmo_m0_phase00_highway_intro")
@phase("cosmo_m0_phase00_highway_intro", "highway")
@phase("cosmo_m0_phase00_highway", "highway")
@phase("cosmo_m0_phase01_breach", "breach")
@phase("cosmo_m0_phase01b_breach", "graveyard")
@phase("cosmo_m0_phase02_graveyard", "graveyard")
@phase("cosmo_m0_phase03_hangar", "hangar")
@phase("cosmo_m0_phase04_outro", "hangar")
@spawn_transition(0xEAEC2335)
# The spawn transition the GAS names for a region once a client has been there
# (7 of 7 captures agree). A region id is bubble << 3 | state: breach,
# graveyard, hangar (states 0 and 1), highway (states 0 and 1). True names
# unknown.
@region_spawn_transition(24, 0x68935472)
@region_spawn_transition(96, 0x10FF7418)
@region_spawn_transition(104, 0x573574C2)
@region_spawn_transition(105, "")
@region_spawn_transition(112, 0xEAEC2335)
@region_spawn_transition(113, 0xEAEC2335)
# Sunset from world entry; the captures drop it to night (0.025) in the
# cosmo_m0_phase01b_breach phase.
@time_of_day(0.77)

act_cosmo_m0_highway_mission1 cosmo_m0_phase00_highway_intro
act_cosmo_m0_highway_mission2 cosmo_m0_phase00_highway
act_cosmo_m0_highway_mission3 cosmo_m0_phase01_breach
act_cosmo_m0_highway_mission4 cosmo_m0_phase01b_breach
act_cosmo_m0_highway_mission5 cosmo_m0_phase02_graveyard
act_cosmo_m0_highway_mission6 cosmo_m0_phase03_hangar
act_cosmo_m0_highway_mission7 cosmo_m0_phase04_outro
startup thread ss_cosmo_m0_highway:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
