# es\cosmo\cosmo_portal1_activity\cosmo_portal1_activity.es
#
# The Devils' Lair, the Cosmodrome strike. The root starts nothing; the
# phases are the missions beside it, run in order. Mission file names are ours.
#
#   cosmo_portal1_activity_mission1.esp  the rocketyard: into the refinery
#   cosmo_portal1_activity_mission2.esp  the refinery: clear the entrance
#   cosmo_portal1_activity_mission3.esp  the Ghost's scan: repel the Fallen
#   cosmo_portal1_activity_mission4.esp  on to the blast
#   cosmo_portal1_activity_mission5.esp  the blast: the Devil Walker
#   cosmo_portal1_activity_mission6.esp  the ship: kill the guards
#   cosmo_portal1_activity_mission7.esp  Sepiks Prime
#   cosmo_portal1_activity_mission8.esp  the end of the strike
#
# The refinery, blast and ship encounters, and cosmo_portal1_audio, are
# scripts of their own.

startup thread ss_cosmo_portal1:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
