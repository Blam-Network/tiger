# es\cosmo\hangar\enc_hangar_m0.es
#
# The hangar in A Guardian Rises: the Fallen on the ship, then the main room
# and backup squads on their triggers.
# Names that were never cracked are written as "0x" literals.

@activity_bundle("enc_hangar_m0")

object o_hangar_gating_exit
object o_ship
object o_ship_wires
interactable_placement obj_placement_m0_m05
@member_counts({dreg: 1, dreg_2: 1})
squad sq_m0_fallen_init
objective obj_m0_hangar_fallen
@member_counts({dreg_1: 1})
squad sq_m0_fallen_init_b
@member_counts({dreg: 1, dreg_1: 1, vandal: 1})
squad sq_m0_fallen_gating
@member_counts({captain: 1})
squad sq_ch1_fallen_on_playership_1
@member_counts({0xD1F11E74: 1})
squad sq_ch1_fallen_on_playership_2
@member_counts({vandal: 1})
squad sq_ch1_fallen_on_playership_3
@member_counts({dreg: 3})
squad sq_m0_fallen_1
@member_counts({dreg: 1, shank: 2})
squad sq_m0_fallen_2
player_trigger pt_grenade_reinforce
player_trigger pt_fallen_ship
player_trigger pt_main_room
player_trigger pt_fallen_backup

@startup()
script sc_hangar_main():
    o_hangar_gating_exit.create()
    o_ship.create()
    o_ship_wires.create()
    sq_m0_fallen_init.set_objective(obj_m0_hangar_fallen)
    sq_m0_fallen_init_b.set_objective(obj_m0_hangar_fallen)
    sq_m0_fallen_gating.set_objective(obj_m0_hangar_fallen)
    sq_ch1_fallen_on_playership_1.set_objective(obj_m0_hangar_fallen)
    sq_ch1_fallen_on_playership_2.set_objective(obj_m0_hangar_fallen)
    sq_ch1_fallen_on_playership_3.set_objective(obj_m0_hangar_fallen)
    sq_m0_fallen_1.set_objective(obj_m0_hangar_fallen)
    sq_m0_fallen_2.set_objective(obj_m0_hangar_fallen)
    sq_m0_fallen_init.set_task("initial_room")
    sq_m0_fallen_init.place()
    sq_m0_fallen_init_b.activate_temperament("0x8AEFBA13")
    sq_m0_fallen_init_b.set_task("initial_room_b")
    sq_m0_fallen_init_b.place()
    sc_fallen_gating.wake()
    sc_fallen_on_playership.wake()
    sc_fallen_main_room.wake()
    sc_fallen_backup.wake()

script sc_fallen_gating():
    sleep_until(pt_grenade_reinforce.is_triggered())
    sq_m0_fallen_gating.set_task("gating")
    sq_m0_fallen_gating.place()

script sc_fallen_on_playership():
    sleep_until(pt_fallen_ship.is_triggered())
    sq_ch1_fallen_on_playership_1.activate_temperament("0xFD455938")
    sq_ch1_fallen_on_playership_2.activate_temperament("0xC88E5DC7")
    sq_ch1_fallen_on_playership_3.activate_temperament("0xC9730C60")
    sq_ch1_fallen_on_playership_1.set_task("objective")
    sq_ch1_fallen_on_playership_2.set_task("objective")
    sq_ch1_fallen_on_playership_3.set_task("objective")
    sq_ch1_fallen_on_playership_1.place()
    sq_ch1_fallen_on_playership_2.place()
    sq_ch1_fallen_on_playership_3.place()

# the main room comes alive when a player reaches it, or once the captain on
# the ship is dead (a player who stays at the ship); its squad falls back to
# the room's last task when one dreg is left
script sc_fallen_main_room():
    sleep_until(pt_main_room.is_triggered() or sq_ch1_fallen_on_playership_1.alive_count() > 0)
    sleep_until(pt_main_room.is_triggered() or sq_ch1_fallen_on_playership_1.alive_count() == 0)
    sq_m0_fallen_1.set_task("task_1")
    sq_m0_fallen_1.place()
    sq_ch1_fallen_on_playership_1.set_task("objective_1")
    sq_ch1_fallen_on_playership_2.set_task("objective_1")
    sq_ch1_fallen_on_playership_3.set_task("objective_1")
    sleep_until(sq_m0_fallen_1.alive_count() <= 1)
    sq_m0_fallen_1.set_task("task")

script sc_fallen_backup():
    sleep_until(pt_fallen_backup.is_triggered())
    sq_m0_fallen_2.set_task("front")
    sq_m0_fallen_2.place()
