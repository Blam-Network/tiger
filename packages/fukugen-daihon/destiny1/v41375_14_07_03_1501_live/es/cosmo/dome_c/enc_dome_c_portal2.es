# es\cosmo\dome_c\enc_dome_c_portal2.es
#
# The second Cosmodrome strike's dome_c (private bubble 9). The lasers, the
# blocking grids and the basement door stand from the bubble's start; the
# Ghost's scan point is the first objective's. The Fallen at the door and
# the two squads behind them break the grids open; once the major's floor
# is open the Fallen ship brings his men in three flights, the major on the
# second, and a last squad comes up after he dies. The ship's command
# scripts are retail's atom for atom.
#
# From one 2.3.1 run. 2.3.1 put squads TU0 does not have in front of these
# (sq_fallen_initial*, the captains, the shanks and stealth vandals, the
# Hive trash, the snipers and the major floor's own squads), so where a
# step waited on one of those the wait here is the step's own: the door
# squads come with the door's volume, the ship 97 s into the major's
# objective. TU0's sq_fallen_trash00-04, the ground squads and the second
# major never came in 2.3.1 and are left alone.

@activity_bundle("enc_dome_c_portal2")

object o_basement_door01
object o_fallen_laser01
object o_fallen_laser02
object o_fallen_laser03
object o_fallen_laser_behavior01
object o_fallen_laser_nutblock01
object o_fallen_blockinggrid01
object o_fallen_blockinggrid02
object o_fallen_blockinggrid01_behavior01
object o_fallen_blockinggrid01_nutblock01
interactable_placement pf_strike_ghost01 bind("0xAF65BC8E")
objective obj_fallen_trash
@member_counts({dreg: 3, vandal: 2, 0x3483C155: 1})
squad sq_fallen_trash05
@member_counts({dreg: 3, vandal: 2, 0x3483C155: 1})
squad sq_fallen_trash06
@member_counts({dreg: 6})
squad sq_fallen_trash_boss01
@member_counts({vandal: 5, 0x3483C155: 1})
squad sq_fallen_trash_boss02
objective obj_objective_fallen
squad sq_dropship_fallen01
squad_member sq_dropship_fallen01__pilot
control_point_set cp_dropship_fallen01_enter
control_point_set cp_dropship_fallen01_exit
@member_counts({0xD1F11E74: 2})
squad sq_objective_dropsquad01
@member_counts({vandal_rifle: 4})
squad sq_objective_dropsquad02
@member_counts({0x83AD11DC: 4})
squad sq_objective_dropsquad03
@member_counts({0x20CF2549: 4})
squad sq_objective_dropsquad04
@member_counts({0x8A32A224: 4})
squad sq_objective_dropsquad05
@member_counts({0x0E8B8A4E: 2})
squad sq_objective_dropsquad06
@member_counts({adds: 5})
squad sq_objective_major00_adds
@member_counts({major: 1})
squad sq_objective_major00
@member_counts({dregs: 4})
squad sq_objective_endsquad
player_trigger pt_md_10_40
sequence md_010_40

@startup()
script sc_dome_c_main():
    for sq in [sq_fallen_trash05, sq_fallen_trash06, sq_fallen_trash_boss01, sq_fallen_trash_boss02]:
        sq.set_objective(obj_fallen_trash)
    for sq in [sq_objective_dropsquad01, sq_objective_dropsquad02, sq_objective_dropsquad03, sq_objective_dropsquad04, sq_objective_dropsquad05, sq_objective_dropsquad06, sq_objective_major00_adds, sq_objective_major00, sq_objective_endsquad]:
        sq.set_objective(obj_objective_fallen)
    for o in [o_fallen_laser01, o_fallen_laser02, o_fallen_laser03, o_fallen_laser_behavior01, o_fallen_laser_nutblock01, o_fallen_blockinggrid01, o_fallen_blockinggrid02, o_fallen_blockinggrid01_behavior01, o_fallen_blockinggrid01_nutblock01, o_basement_door01]:
        o.create()
    o_basement_door01.set_device_position(1)
    sc_grids.wake()

# The door squads with the door's volume; both of them dead, the Ghost's
# door line is cut off, the first captain's squad comes on and the grids
# drop a second later, the second captain's four seconds after that.
script sc_grids():
    sleep_until(pt_md_10_40.is_triggered())
    place_on_task(sq_fallen_trash05, "0xEFFC41FC")
    place_on_task(sq_fallen_trash06, "0xEFFC41FF")
    sleep_until(door_squads_alive_count() > 0)
    sleep_until(door_squads_alive_count() == 0)
    md_010_40.stop()
    place_on_task(sq_fallen_trash_boss02, "0x13B7E292")
    sleep(1)
    for grid in [o_fallen_blockinggrid01, o_fallen_blockinggrid02, o_fallen_blockinggrid01_behavior01, o_fallen_blockinggrid01_nutblock01]:
        grid.delete_object()
    sleep(4)
    place_on_task(sq_fallen_trash_boss01, "0x733561A5")

# Mission 3 wakes this with the major's objective. The ship comes in, drops
# two squads five seconds apart and leaves; it is back for the major and
# his adds, then for the last four squads, two at a time. The squad that
# finishes the floor comes 4 s after the major dies (2.3.1's task for it is
# past the end of TU0's list).
script sc_major():
    pilot = sq_dropship_fallen01__pilot
    sleep(97)
    dropship_enter(pilot)
    sleep(8.5)
    drop_on_task(pilot, sq_objective_dropsquad01, "0xD8477072")
    sleep(5)
    drop_on_task(pilot, sq_objective_dropsquad02, "dropsquad01")
    sleep(4)
    pilot.execute(cs_dropship_exit(cp_dropship_fallen01_exit))
    sleep(10)
    dropship_enter(pilot)
    sleep(8.5)
    drop_on_task(pilot, sq_objective_major00_adds, "0x4BA59F34")
    sleep(5)
    drop_on_task(pilot, sq_objective_major00, "0x4BA59F34")
    sleep(4)
    pilot.execute(cs_dropship_exit(cp_dropship_fallen01_exit))
    sleep(6)
    dropship_enter(pilot)
    sleep(8.5)
    drop_on_task(pilot, sq_objective_dropsquad03, "0x57C73476")
    drop_on_task(pilot, sq_objective_dropsquad04, "0x7EB447AD")
    sleep(5)
    drop_on_task(pilot, sq_objective_dropsquad05, "0x9514A38C")
    drop_on_task(pilot, sq_objective_dropsquad06, "0x05CFCE14")
    sleep(5)
    pilot.execute(cs_dropship_exit(cp_dropship_fallen01_exit))
    sleep_until_dead(sq_objective_major00)
    sleep(4)
    sq_objective_endsquad.place()

# the ship comes in on its path, opens up and holds
command_script cs_dropship_enter(path):
    snap_to(path, 0)
    ability("dropship", "0x5C0A584A")
    ability("0xEEDB72CC", "fire")
    terminate_delay(3)
    set_channel_scalar("doors", 1)

command_script cs_dropship_exit(path):
    move_to(path, 0, false)
    set_channel_scalar("doors", 0)
    ability("dropship", "0x63C56F3B")

def dropship_enter(pilot):
    pilot.place()
    pilot.execute(cs_dropship_enter(cp_dropship_fallen01_enter))

def drop_on_task(pilot, sq, task):
    sq.set_task(task)
    pilot.drop_squad(sq)

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def door_squads_alive_count():
    return sq_fallen_trash05.alive_count() + sq_fallen_trash06.alive_count()

def sleep_until_dead(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)
