# es\cosmo\cosmo_portal2_activity\cosmo_portal2_activity.es
#
# The second Cosmodrome strike, down through dome_c and the Array into the
# Hive's dome. The root starts nothing; it declares the phases, run in
# member order. Mission file names are ours.
#
#   cosmo_portal2_activity_mission1.esp  dry_sea: on to dome_c
#   cosmo_portal2_activity_mission2.esp  dome_c: through the Fallen
#   cosmo_portal2_activity_mission3.esp  dome_c: the major and his ships
#   cosmo_portal2_activity_mission4.esp  out to the Array
#   cosmo_portal2_activity_mission5.esp  dome_hive: the Ghost's scan
#   cosmo_portal2_activity_mission6.esp  dome_hive: the hillside, the witch
#   cosmo_portal2_activity_mission7.esp  the end of the strike
#
# dome_c's and dome_hive's encounters, and cosmo_portal2_audio, are scripts
# of their own. From two retail 2.3.1 runs, the second with ten wipes
# (tiger-packet-analysis docs/missions/cosmo_portal_2.md): every wait is
# unconfirmed.

@activity_bundle("cosmo_portal2_activity")
# The 2.3.1 capture starts it in dry_sea (11, public) and the lifetime runs
# the phase rows in name order: dry_sea, two dome_c phases (9), the Array
# (0), then dome_hive (10). TU0 has seven phase rows where 2.3.1 has eight:
# its phase05 holds both of 2.3.1's dome_hive fights, so its phase06 is the
# end. The spawn point is not decoded from the capture.
@activity("cosmo_portal_2")
@start_slice("dry_sea", "phase00")
@phase("phase00", "dry_sea")
@phase("phase01", "dome_c")
@phase("phase02", "dome_c")
@phase("phase03", "array")
@phase("phase04", "dome_hive")
@phase("phase05", "dome_hive")
@phase("phase06", "dome_hive")

cosmo_portal2_activity_mission1 phase00
cosmo_portal2_activity_mission2 phase01
cosmo_portal2_activity_mission3 phase02
cosmo_portal2_activity_mission4 phase03
cosmo_portal2_activity_mission5 phase04
cosmo_portal2_activity_mission6 phase05
cosmo_portal2_activity_mission7 phase06

# mission 6's hillside, once taken: a wipe in the fight after it starts the
# fight over, not the hillside
bool b_hillside_secured = false

@startup()
script ss_cosmo_portal2():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
