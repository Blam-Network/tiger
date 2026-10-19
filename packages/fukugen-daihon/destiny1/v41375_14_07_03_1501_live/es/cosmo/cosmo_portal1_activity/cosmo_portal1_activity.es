# es\cosmo\cosmo_portal1_activity\cosmo_portal1_activity.es
#
# The Devils' Lair, the Cosmodrome strike. The root starts nothing; it
# declares the phases, run in member order. Mission file names are ours.
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

@activity_bundle("cosmo_portal1_activity")
# The Devils' Lair. The 2.3.1 capture starts it in the rocketyard (20, public)
# at spawn point cosmo_portal_1_phase00; the lifetime runs the eight phase rows in
# name order: the rocketyard, three refinery phases (19), the blast (2) and
# three ship phases (21).
@activity("cosmo_portal_1")
@start_slice("rocketyard", "phase00")
@phase("phase00", "rocketyard")
@phase("phase01", "refinery")
@phase("phase02", "refinery")
@phase("phase03", "refinery")
@phase("phase04", "blast")
@phase("phase05", "ship")
@phase("phase06", "ship")
@phase("phase07", "ship")
@spawn_transition("cosmo_portal_1_phase00")

cosmo_portal1_activity_mission1 phase00
cosmo_portal1_activity_mission2 phase01
cosmo_portal1_activity_mission3 phase02
cosmo_portal1_activity_mission4 phase03
cosmo_portal1_activity_mission5 phase04
cosmo_portal1_activity_mission6 phase05
cosmo_portal1_activity_mission7 phase06
cosmo_portal1_activity_mission8 phase07

startup thread ss_cosmo_portal1:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
