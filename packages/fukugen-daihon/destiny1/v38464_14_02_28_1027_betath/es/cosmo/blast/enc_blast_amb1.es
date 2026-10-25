# es\cosmo\blast\enc_blast_amb1.es
#
# The blast's ambient layer: Fallen at the refinery's mouth, the pits,
# the rocketyard gate and the ship. The Walker rows (sq_tank, its
# skiff and paths) stay with a branch no capture has shown.
#
# Everything goes in as soon as the bubble loads: retail 2.3.1 sends
# every ambient squad, its objective and the loose objects of a
# Cosmodrome bubble in the first world update after the player gets
# there. The encounters run under the encounter manager with a budget
# that lets all of them up at once; a wiped one comes back once it has
# been out of combat for 30 s and no player is in its volume.
#
# No capture has the patrol in the blast (retail sent one row of it);
# this is the other bubbles' rule on this bundle's encounters, with
# one body per member.

@activity_bundle("enc_blast_amb1")

encounter_manager encounters
objective obj_tank  # WARNING: unused - the Walker and its skiff; no run placed them in the patrol's blast (the strike's Walker is enc_blast_portal1's)
squad sq_tank  # WARNING: unused - the Walker and its skiff; no run placed them in the patrol's blast (the strike's Walker is enc_blast_portal1's)
squad_member sq_tank__tank  # WARNING: unused - the Walker and its skiff; no run placed them in the patrol's blast (the strike's Walker is enc_blast_portal1's)
squad sq_dropship_tank  # WARNING: unused - the Walker and its skiff; no run placed them in the patrol's blast (the strike's Walker is enc_blast_portal1's)
squad_member sq_dropship_tank__dropship  # WARNING: unused - the Walker and its skiff; no run placed them in the patrol's blast (the strike's Walker is enc_blast_portal1's)
simple_encounter amb_smpl_refinery01
simple_encounter amb_smpl_pit01
simple_encounter amb_smpl_pit02
simple_encounter amb_smpl_rocketyard01
simple_encounter amb_smpl_rocketyard02
simple_encounter amb_smpl_ship01
simple_encounter amb_smpl_ch4
interactable_placement obj_placement_ch4_m03 bind("0x4DC4EE04")
passenger skiff_passenger  # WARNING: unused - the Walker and its skiff; no run placed them in the patrol's blast (the strike's Walker is enc_blast_portal1's)
control_point_set dropship_entry_path  # WARNING: unused - the Walker and its skiff; no run placed them in the patrol's blast (the strike's Walker is enc_blast_portal1's)
control_point_set dropship_exit_path  # WARNING: unused - the Walker and its skiff; no run placed them in the patrol's blast (the strike's Walker is enc_blast_portal1's)

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 17
    encounters.add_ambient_encounter(amb_smpl_refinery01, 4, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_pit01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_pit02, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_rocketyard01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_rocketyard02, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_ship01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_ch4, 1, 100, 20, 30, 0)
