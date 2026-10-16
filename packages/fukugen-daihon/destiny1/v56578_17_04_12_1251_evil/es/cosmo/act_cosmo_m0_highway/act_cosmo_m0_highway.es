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
startup thread ss_cosmo_m0_highway:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
