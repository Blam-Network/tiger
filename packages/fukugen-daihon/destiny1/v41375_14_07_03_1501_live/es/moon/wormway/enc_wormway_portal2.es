# es\moon\wormway\enc_wormway_portal2.es
#
# The Summoning Pits, Phogoth's chamber. The ogre waits in its chains. When
# the players drop in and it roars (mission 5 wakes sc_boss_fight), the
# chamber door shuts behind them, the floor Hive and the snipers take their
# posts and two thrall packs rush in. As the floor squads fall the next one
# pushes. Later the sniper reinforcements come up, and the tomb ship makes
# two passes, dropping knights each time; once the first ship is gone more
# Hive come up, then the ground squads.
#
# One capture run. The fight's later beats (the sniper reinforcements, the
# ship passes, the ground squads) are on that run's clock; their real cue is
# most likely Phogoth's health, which the capture does not show.

@activity_bundle("enc_wormway_portal2")

objective obj_bossbattle_hive
squad sq_bossbattle_boss01
static_array<object, 19> dynamics
object o_chains
object o_door_dummy
squad sq_bossbattle_hive01
squad sq_bossbattle_hive02
squad sq_bossbattle_hive03
squad sq_bossbattle_hive04
squad sq_bossbattle_snipers01
squad sq_bossbattle_snipers02
squad sq_bossbattle_snipers03
squad sq_bossbattle_snipers_reinf01
squad sq_bossbattle_snipers_reinf02
squad sq_bossbattle_reinf01_2nd
squad sq_bossbattle_reinf01_3rd
squad sq_bossbattle_reinf01_4th
squad sq_bossbattle_reinf02_3rd
squad sq_bossbattle_reinf02_4th
squad sq_bossbattle_ground01
squad sq_bossbattle_ground02
squad sq_dropship_hive01
squad_member sq_dropship_hive01__pilot
control_point_set cp_dropship_hive01_enter
control_point_set cp_dropship_hive01_exit

@startup()
script sc_wormway_main():
    for dynamic in dynamics:
        dynamic.create()
    o_chains.create()
    o_door_dummy.create()
    o_door_dummy.set_device_position(0)
    for sq in [sq_bossbattle_boss01, sq_bossbattle_hive01, sq_bossbattle_hive02, sq_bossbattle_hive03, sq_bossbattle_hive04, sq_bossbattle_snipers01, sq_bossbattle_snipers02, sq_bossbattle_snipers03, sq_bossbattle_snipers_reinf01, sq_bossbattle_snipers_reinf02, sq_bossbattle_reinf01_2nd, sq_bossbattle_reinf01_3rd, sq_bossbattle_reinf01_4th, sq_bossbattle_reinf02_3rd, sq_bossbattle_reinf02_4th, sq_bossbattle_ground01, sq_bossbattle_ground02]:
        sq.set_objective(obj_bossbattle_hive)
    # Phogoth, in its chains
    place_on_task(sq_bossbattle_boss01, "0x82903A2F")

script sc_boss_fight():
    o_door_dummy.set_device_position(1)
    place_on_task(sq_bossbattle_hive01, "0xF0BD0FA3")
    place_on_task(sq_bossbattle_hive02, "0xF0BD0FA3")
    place_on_task(sq_bossbattle_snipers01, "0x18A8066A")
    place_on_task(sq_bossbattle_snipers02, "0xE419C3BA")
    place_on_task(sq_bossbattle_snipers03, "0xA70B5572")
    sc_floor.wake()
    sleep(0.5)
    place_on_task(sq_bossbattle_hive03, "0x9C9F9DAB")
    place_on_task(sq_bossbattle_hive04, "0x9C9F9DAB")
    sc_thrall_rush.wake()

    sleep(95)
    place_on_task(sq_bossbattle_snipers_reinf01, "0x2BEB3C63")
    place_on_task(sq_bossbattle_snipers_reinf02, "0xE419C3BA")
    sleep(13)
    tomb_ship_enter()
    sleep(22)
    drop_on_task(sq_bossbattle_reinf01_2nd, "0xA098B5FA")
    sleep(3)
    tomb_ship_leave()
    sleep_until(sq_dropship_hive01.alive_count() == 0)
    place_on_task(sq_bossbattle_reinf01_3rd, "0xC2507157")
    place_on_task(sq_bossbattle_reinf01_4th, "0xC2507157")
    sleep(35)
    place_on_task(sq_bossbattle_ground01, "0x950ECE24")
    place_on_task(sq_bossbattle_ground02, "0x950ECE24")
    sleep(47)
    tomb_ship_enter()
    sleep(22)
    drop_on_task(sq_bossbattle_reinf02_3rd, "0xA098B5F9")
    drop_on_task(sq_bossbattle_reinf02_4th, "0xA098B5F9")
    sleep(3)
    tomb_ship_leave()

# as each floor squad is cleared the next one pushes
script sc_floor():
    sleep_until_wiped(sq_bossbattle_hive01)
    sq_bossbattle_hive02.set_task("0xE419C3BA")
    sleep_until_wiped(sq_bossbattle_hive02)
    sq_bossbattle_hive01.set_task("0xE419C3BA")
    sleep_until_wiped(sq_bossbattle_hive01)
    sq_bossbattle_snipers03.set_task("0xE419C3BA")

script sc_thrall_rush():
    sleep(23)
    sq_bossbattle_hive04.set_task("0xE419C3BA")

# Phogoth is dead: the fight stops sending squads and the chamber's Hive,
# the tomb ship among them, die with him
def end_boss_fight():
    sc_boss_fight.kill()
    sc_floor.kill()
    sc_thrall_rush.kill()
    for sq in [sq_bossbattle_hive01, sq_bossbattle_hive02, sq_bossbattle_hive03, sq_bossbattle_hive04, sq_bossbattle_snipers01, sq_bossbattle_snipers02, sq_bossbattle_snipers03, sq_bossbattle_snipers_reinf01, sq_bossbattle_snipers_reinf02, sq_bossbattle_reinf01_2nd, sq_bossbattle_reinf01_3rd, sq_bossbattle_reinf01_4th, sq_bossbattle_reinf02_3rd, sq_bossbattle_reinf02_4th, sq_bossbattle_ground01, sq_bossbattle_ground02, sq_dropship_hive01]:
        sq.kill()

# the tomb ship comes in and holds over the chamber; it is a new ship each
# pass
def tomb_ship_enter():
    sq_dropship_hive01__pilot.place()
    sq_dropship_hive01__pilot.execute(cs_tomb_ship_enter(cp_dropship_hive01_enter))

def tomb_ship_leave():
    sq_dropship_hive01__pilot.execute(cs_tomb_ship_exit(cp_dropship_hive01_exit))

def drop_on_task(sq, task):
    sq.set_task(task)
    sq_dropship_hive01__pilot.drop_squad(sq)

def sleep_until_wiped(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

command_script cs_tomb_ship_enter(path):
    snap_to(path, 0)
    ability("dropship", "enter_1")
    move_to(path, 1, false)
    move_to(path, 2, false)
    move_to(path, 3, true)
    set_channel_scalar("doors", 1)

command_script cs_tomb_ship_exit(path):
    move_to(path, 0, false)
    move_to(path, 1, false)
    move_to(path, 2, false)
    ability("dropship", "exit_1")
