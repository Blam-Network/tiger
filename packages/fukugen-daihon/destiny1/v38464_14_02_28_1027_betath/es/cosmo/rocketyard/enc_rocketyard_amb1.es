# es\cosmo\rocketyard\enc_rocketyard_amb1.es
#
# The rocketyard's ambient layer: Fallen at the front, the centre and
# the command building, Hive on the turntable, the platform and the
# front. The Devils' Lair starts here too, so the strike's public host
# runs the same layer.
#
# Everything goes in as soon as the bubble loads: retail 2.3.1 sends
# every ambient squad, its objective and the loose objects of a
# Cosmodrome bubble in the first world update after the player gets
# there. The encounters run under the encounter manager with a budget
# that lets all of them up at once; a wiped one comes back once it has
# been out of combat for 30 s and no player is in its volume.
#
# Member counts from retail's rocketyard (the cosmo patrol capture's
# public host and the strike's), where this build's squad has the
# member: retail splits the Hive squads into a trooper and a knight
# squad, this build's carry both members in one.

@activity_bundle("enc_rocketyard_amb1")

encounter_manager encounters
sequence seq_ambient_music  # WARNING: unused - never started in any capture
simple_encounter amb_smpl_fallen_front01
@member_counts({_squad: [{servitor: 1}, {dreg: 2}]})
simple_encounter amb_smpl_fallen_front02
@member_counts({_squad: [{}, {dreg: 6}]})
simple_encounter amb_smpl_fallen_center01
simple_encounter amb_smpl_fallen_command01
@member_counts({_squad: [{dreg: 6}, {}]})
simple_encounter amb_smpl_fallen_command02
@member_counts({_squad: [{trooper: 3}]})
simple_encounter amb_smpl_hive_front01
@member_counts({_squad: [{trooper: 3}, {knight: 1}]})
simple_encounter amb_smpl_hive_center01
@member_counts({_squad: [{trooper: 2}]})
simple_encounter amb_smpl_hive_turntable01
@member_counts({_squad: [{trooper: 6}]})
simple_encounter amb_smpl_hive_platform01

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 39
    encounters.add_ambient_encounter(amb_smpl_fallen_front01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_fallen_front02, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_fallen_center01, 8, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_fallen_command01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_fallen_command02, 7, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_hive_front01, 4, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_hive_center01, 4, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_hive_turntable01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_hive_platform01, 6, 100, 20, 30, 0)
