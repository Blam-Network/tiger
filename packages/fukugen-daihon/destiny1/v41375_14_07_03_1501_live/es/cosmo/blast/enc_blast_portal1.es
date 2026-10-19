# es\cosmo\blast\enc_blast_portal1.es
#
# Devils' Lair, the blast: the Devil Walker lands, drops its shanks and
# reinforcements come in. Killing the Walker clears the phase and opens the
# exit door.

@activity_bundle("enc_blast_portal1")

c_squad_sensor_host sq_fallen_left01
c_objective_sensor_host obj_ground  # true name unknown
c_squad_sensor_host sq_fallen_left02
c_squad_sensor_host sq_fallen_right01
c_squad_sensor_host sq_fallen_right02
@member_counts({captain: 1, dreg: 2, vandal: 1})
c_squad_sensor_host sq_fallen_rear01
@member_counts({dreg: 2, vandal: 2})
c_squad_sensor_host sq_fallen_door01
@member_counts({shank: 2})
c_squad_sensor_host sq_fallen_shanks01
c_objective_sensor_host obj_shanks  # true name unknown
@member_counts({shank: 2})
c_squad_sensor_host sq_fallen_shanks02
@member_counts({captain: 1, dreg: 2, vandal: 1})
c_squad_sensor_host sq_fallen_mid01
@member_counts({dreg: 2, vandal: 2})
c_squad_sensor_host sq_fallen_mid02
@member_counts({dreg: 1, vandal: 2})
c_squad_sensor_host sq_fallen_mid03
@member_counts({dreg: 1, vandal: 1})
c_squad_sensor_host sq_fallen_mid04
@member_counts({vandal: 1})
c_squad_sensor_host sq_fallen_mid05
c_player_trigger_sensor_host pt_play_s01_x100_s01_x110  # true name unknown
c_squad_sensor_host sq_tank
c_objective_sensor_host obj_tank  # true name unknown
c_squad_member_sensor_host sq_tank__tank  # true name unknown
c_command_script __cs  # true name unknown
c_control_point_set_sensor_host dropship_entry_path  # true name unknown
c_squad_sensor_host sq_dropship_tank
c_squad_member_sensor_host sq_dropship_tank__dropship  # true name unknown
c_control_point_set_sensor_host dropship_exit_path  # true name unknown

startup thread sc_blast_main:
    sq_fallen_left01.set_objective(obj_ground)
    sq_fallen_left02.set_objective(obj_ground)
    sq_fallen_right01.set_objective(obj_ground)
    sq_fallen_right02.set_objective(obj_ground)
    sq_fallen_rear01.set_objective(obj_ground)
    sq_fallen_door01.set_objective(obj_ground)
    sq_fallen_shanks01.set_objective(obj_shanks)
    sq_fallen_shanks02.set_objective(obj_shanks)
    hold_ground(sq_fallen_mid01, "mid02")
    hold_ground(sq_fallen_mid02, "retreat_point")
    hold_ground(sq_fallen_mid03, "mid01")
    hold_ground(sq_fallen_mid04, "mid_high")
    hold_ground(sq_fallen_mid05, "mid03")
    sc_walker.wake()

thread sc_walker:
    sleep_until(pt_play_s01_x100_s01_x110.is_triggered())
    sleep(1)
    sq_tank.set_objective(obj_tank)
    sq_tank.set_task("tank")
    sq_tank.place()
    sleep(1)
    skiff_enter()
    sc_reinforcements.wake()
    sc_shanks.wake()
    sleep(12)
    skiff_leave()
    sleep_until(sq_tank.alive_count() == 0)
    sleep(3)
    place_on_task(sq_fallen_door01, "task")

thread sc_reinforcements:
    sleep(42)
    place_on_task(sq_fallen_rear01, "mid04")
    sleep(27)
    sq_fallen_mid01.set_task("mid_pit")

thread sc_shanks:
    sleep(45)
    while sq_tank.alive_count() > 0:
        sq_fallen_shanks01.set_task("ammo")
        sq_fallen_shanks02.set_task("shank_gate")
        sq_tank__tank.drop_squad(sq_fallen_shanks01)
        sq_tank__tank.drop_squad(sq_fallen_shanks02)
        sleep(10)
        sleep_until(sq_tank.alive_count() == 0 or sq_fallen_shanks01.alive_count() + sq_fallen_shanks02.alive_count() == 0)
        sleep(40)

def skiff_enter():
    __cs.clear()
    __cs.snap_to(dropship_entry_path, 0)
    __cs.ability("dropship", "enter_45")
    __cs.move_to(dropship_entry_path, 1, false)
    __cs.move_to(dropship_entry_path, 2, true)
    sq_dropship_tank__dropship.place()
    sq_dropship_tank__dropship.execute(__cs)

def skiff_leave():
    __cs.clear()
    __cs.move_to(dropship_exit_path, 0, false)
    __cs.move_to(dropship_exit_path, 1, false)
    __cs.ability("dropship", "exit_45")
    sq_dropship_tank__dropship.execute(__cs)

def hold_ground(sq, task):
    sq.set_objective(obj_ground)
    sq.set_task(task)
    sq.place()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
