# es\cosmo\cosmo_portal1_activity\cosmo_portal1_activity.es
#
# The Devils' Lair, the Cosmodrome strike. The root starts nothing; it
# declares the phases, run in member order. Mission file names are ours.
#
#   cosmo_portal1_activity_mission1.esp  the rocketyard: move to the ship
#   cosmo_portal1_activity_mission2.esp  the refinery: locate the relay
#   cosmo_portal1_activity_mission3.esp  the beacon: repel the Fallen
#   cosmo_portal1_activity_mission4.esp  out of the refinery
#   cosmo_portal1_activity_mission5.esp  the blast: the Devil Walker
#   cosmo_portal1_activity_mission6.esp  the ship: kill the guards
#   cosmo_portal1_activity_mission7.esp  Sepiks Prime
#   cosmo_portal1_activity_mission8.esp  return to orbit
#
# The pre-alpha's phases hold their own player objectives and dialogue
# (phase00.po_move_to_ship, phase02.m02_x20) and the whole boss fight
# (phase05, phase06), where the Alpha Trial's hold obj_s1_phase*_m*
# objectives and leave the fight to the ship encounter. The refinery, blast
# and ship encounters, and cosmo_portal1_audio, are scripts of their own.

@activity_bundle("cosmo_portal1_activity")
# The scenario client has TU0's four strike regions as its bubbles 17
# (rocketyard, public), 16 (refinery), 1 (blast) and 18 (ship); the lifetime
# runs the eight phase rows in name order over them, as TU0's does. No
# rocketyard spawn point is cosmo_portal_1_phase00, so the strike starts at
# the default one.
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

cosmo_portal1_activity_mission1 phase00
cosmo_portal1_activity_mission2 phase01
cosmo_portal1_activity_mission3 phase02
cosmo_portal1_activity_mission4 phase03
cosmo_portal1_activity_mission5 phase04
cosmo_portal1_activity_mission6 phase05
cosmo_portal1_activity_mission7 phase06
cosmo_portal1_activity_mission8 phase07

@startup()
script ss_cosmo_portal1():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
