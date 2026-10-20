# es\moon\wormway\enc_wormway_portal2.es
#
# The Summoning Pits, Phogoth's chamber. The ogre sits in its chains. When the
# players drop in and it roars (mission 5 wakes sc_boss_fight), the chamber
# door shuts behind them, the floor Hive and the snipers take their posts and
# two thrall packs rush in; the chains hold it until a player comes close. As the floor squads fall the next one
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
squad_member sq_bossbattle_boss01__ogre
passenger phogoth_chains_seat
player_trigger pt_phogoth_prox
static_array<object, 19> dynamics
object o_chains
object o_door_dummy
@member_counts({trooper: 3})
squad sq_bossbattle_hive01
@member_counts({trooper: 3})
squad sq_bossbattle_hive02
squad sq_bossbattle_hive03
squad sq_bossbattle_hive04
@member_counts({knight: 1, trooper: 2})
squad sq_bossbattle_snipers01
@member_counts({knight: 2})
squad sq_bossbattle_snipers02
@member_counts({trooper: 2, knight: 1})
squad sq_bossbattle_snipers03
@member_counts({trooper: 1})
squad sq_bossbattle_snipers_reinf01
@member_counts({trooper: 1})
squad sq_bossbattle_snipers_reinf02
@member_counts({thrall: 3, knight: 1})
squad sq_bossbattle_reinf01_2nd
@member_counts({trooper: 3, knight: 1})
squad sq_bossbattle_reinf01_3rd
@member_counts({trooper: 3, knight: 1})
squad sq_bossbattle_reinf01_4th
@member_counts({knight: 1, thrall: 3})
squad sq_bossbattle_reinf02_3rd
@member_counts({knight: 1, thrall: 3})
squad sq_bossbattle_reinf02_4th
@member_counts({thrall: 3})
squad sq_bossbattle_ground01
@member_counts({thrall: 3})
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
    # Phogoth, seated in its chains and held by its temperament
    place_on_task(sq_bossbattle_boss01, "0x82903A2F")
    sq_bossbattle_boss01.activate_temperament("0x07882AA8")
    phogoth_chains_seat.seat(sq_bossbattle_boss01__ogre)
    sc_chains.wake()

# a player close to Phogoth breaks his chains: the seat lets him go and the
# temperament is dropped (one run: 1.6 s after the proximity trigger, 83 s
# into the fight)
script sc_chains():
    sleep_until(pt_phogoth_prox.is_triggered())
    sleep(1.6)
    phogoth_chains_seat.release()
    sq_bossbattle_boss01.deactivate_temperament("0x07882AA8")

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
