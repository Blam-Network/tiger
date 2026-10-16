# es\cosmo\hangar\enc_hangar_m0.es
#
# The hangar in A Guardian Rises: the Fallen on the ship, then the main room
# and backup squads on their triggers.
# Names that were never cracked are written as "0x" literals.

@activity_bundle("enc_hangar_m0")
c_object_sensor_host o_hangar_gating_exit
c_object_sensor_host o_ship
c_object_sensor_host o_ship_wires
interactable_placement obj_placement_m0_m05  # archetype not authored on TU0
c_squad_sensor_host sq_m0_fallen_init
c_objective_sensor_host obj_m0_hangar_fallen  # true name unknown
c_squad_sensor_host sq_m0_fallen_init_b
c_squad_sensor_host sq_m0_fallen_gating
c_squad_sensor_host sq_ch1_fallen_on_playership_1
c_squad_sensor_host sq_ch1_fallen_on_playership_2
c_squad_sensor_host sq_ch1_fallen_on_playership_3
c_squad_sensor_host sq_m0_fallen_1
c_squad_sensor_host sq_m0_fallen_2
c_player_trigger_sensor_host pt_grenade_reinforce  # true name unknown
c_player_trigger_sensor_host pt_fallen_ship  # true name unknown
c_player_trigger_sensor_host pt_main_room  # true name unknown
c_player_trigger_sensor_host pt_fallen_backup  # true name unknown

startup thread sc_hangar_main:
    o_hangar_gating_exit.create()
    o_ship.create()
    o_ship_wires.create()
    obj_placement_m0_m05._object.create()
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

thread sc_fallen_gating:
    sleep_until(pt_grenade_reinforce.is_triggered())
    sq_m0_fallen_gating.set_task("gating")
    sq_m0_fallen_gating.place()

thread sc_fallen_on_playership:
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

thread sc_fallen_main_room:
    sleep_until(pt_main_room.is_triggered())
    sq_m0_fallen_1.set_task("task_1")
    sq_m0_fallen_1.place()
    sq_ch1_fallen_on_playership_1.set_task("objective_1")
    sq_ch1_fallen_on_playership_2.set_task("objective_1")
    sq_ch1_fallen_on_playership_3.set_task("objective_1")

thread sc_fallen_backup:
    sleep_until(pt_fallen_backup.is_triggered())
    sq_m0_fallen_2.set_task("front")
    sq_m0_fallen_2.place()
