# es\mars\atrium\enc_atrium_m03.es
#
# The Buried City's office and atrium. The office's Cabal stand from the
# start and more come in on the office triggers; leaving the office brings
# the atrium's Cabal down below, and the atrium's entry warps the Vex in on
# two clouds into the middle of them. Halfway up the Cabal above come in,
# and at the top their centurion. A squad that loses a member, or is wiped,
# moves to its next task. Task names are uncracked and written as hashes.
#
# One run (2026-11-01): each step follows its trigger by about a second,
# each task change a squad's loss by about half a second, every cloud stays
# seven to eight seconds. The upper psions' drop to no task after their
# first losses is the host's, not this script's.

@activity_bundle("enc_atrium_m03")

object o_dummy_door_low
object o_dummy_up_ele_door_ne
object o_dummy_up_ele_door_nw
object o_dummy_up_ele_door_se
object o_dummy_up_ele_door_sw
object o_dummy_dn_ele_door_sw
object o_dummy_dn_ele_door_ne
object o_dummy_dn_ele_door_nw
object o_dummy_dn_ele_door_se
object o_dummy_door_atrium_to_dt_portal
objective obj_atrium_m03_office
objective obj_atrium_m03_atrium
@objective(obj_atrium_m03_office)
@member_counts({phalanx: 2})
squad sq_office_cabal_support1
@objective(obj_atrium_m03_office)
@member_counts({phalanx: 2})
squad sq_office_cabal_support2
@objective(obj_atrium_m03_office)
@member_counts({psion: 2})
squad sq_office_cabal_support3
@objective(obj_atrium_m03_office)
squad sq_office_cabal_support4
@objective(obj_atrium_m03_office)
@member_counts({psion: 2})
squad sq_office_cabal_support5
@objective(obj_atrium_m03_office)
squad sq_office_cabal_support6
@objective(obj_atrium_m03_atrium)
@member_counts({legionary: 3})
squad sq_atrium_dn_cabal_support1
@objective(obj_atrium_m03_atrium)
squad sq_atrium_dn_cabal_support2
@objective(obj_atrium_m03_atrium)
@member_counts({legionary: 2})
squad sq_atrium_dn_cabal_support3
@objective(obj_atrium_m03_atrium)
@member_counts({legionary: 2})
squad sq_atrium_dn_cabal_support4
@objective(obj_atrium_m03_atrium)
squad sq_atrium_dn_vex_cloud1
squad_member sq_atrium_dn_vex_cloud1__vex_cloud
@objective(obj_atrium_m03_atrium)
squad sq_atrium_dn_vex_cloud2
squad_member sq_atrium_dn_vex_cloud2__vex_cloud
@objective(obj_atrium_m03_atrium)
squad sq_atrium_dn_vex_anchor1
squad_member sq_atrium_dn_vex_anchor1__minotaur
@objective(obj_atrium_m03_atrium)
@member_counts({goblin: 3})
squad sq_atrium_dn_vex_support1
@objective(obj_atrium_m03_atrium)
@member_counts({goblin: 3})
squad sq_atrium_dn_vex_support2
@objective(obj_atrium_m03_atrium)
squad sq_atrium_up_cabal_anchor1
squad_member sq_atrium_up_cabal_anchor1__centurion
@objective(obj_atrium_m03_atrium)
@member_counts({psion: 3})
squad sq_atrium_up_cabal_support1
@objective(obj_atrium_m03_atrium)
@member_counts({psion: 2})
squad sq_atrium_up_cabal_support2
@objective(obj_atrium_m03_atrium)
@member_counts({psion: 2})
squad sq_atrium_up_cabal_support3
trigger_volume tv_office_entry
player_trigger pt_office_entry bind(tv_office_entry)
trigger_volume tv_office_third
player_trigger pt_office_third bind(tv_office_third)
trigger_volume tv_office_exit
player_trigger pt_office_exit bind(tv_office_exit)
trigger_volume tv_atrium_entry
player_trigger pt_atrium_entry bind(tv_atrium_entry)
trigger_volume tv_atrium_mid
player_trigger pt_atrium_mid bind(tv_atrium_mid)
trigger_volume tv_atrium_up
player_trigger pt_atrium_up bind(tv_atrium_up)
sequence seq_d_atrium_vex_s01

@startup()
script sc_atrium():
    # the elevator and portal doors as the bubble loads
    for door in [o_dummy_door_low, o_dummy_up_ele_door_se, o_dummy_dn_ele_door_sw, o_dummy_dn_ele_door_ne, o_dummy_dn_ele_door_nw, o_dummy_dn_ele_door_se]:
        door.create()
        door.set_device_position(1)
    for door in [o_dummy_up_ele_door_ne, o_dummy_up_ele_door_nw, o_dummy_up_ele_door_sw, o_dummy_door_atrium_to_dt_portal]:
        door.create()
        door.set_device_position(0)
    place_on_task(sq_office_cabal_support1, "0x2A038087")
    place_on_task(sq_office_cabal_support2, "0xA176E21B")
    sc_office.wake()
    sc_office_third.wake()
    sc_office_support1.wake()
    sc_office_support2.wake()
    sc_atrium_dn.wake()
    sc_atrium_up.wake()

# Office ------------------------------------------------------------------

script sc_office():
    sleep_until(pt_office_entry.is_triggered())
    sleep(1)
    place_on_task(sq_office_cabal_support3, "0x2A038084")
    sleep_until(lost_one(sq_office_cabal_support3, 2))
    sq_office_cabal_support3.set_task("0xF26797C2")
    sleep_until(sq_office_cabal_support3.alive_count() == 0)
    sq_office_cabal_support3.set_task("0x7A8A82D7")

script sc_office_third():
    sleep_until(pt_office_third.is_triggered())
    sleep(1)
    place_on_task(sq_office_cabal_support5, "0x2A038085")
    sleep_until(lost_one(sq_office_cabal_support5, 2))
    sq_office_cabal_support5.set_task("0xD4835EF0")

script sc_office_support1():
    sleep_until(lost_one(sq_office_cabal_support1, 2))
    sq_office_cabal_support1.set_task("0x428AA904")

script sc_office_support2():
    sleep_until(lost_one(sq_office_cabal_support2, 2))
    sq_office_cabal_support1.set_task("0xE11B49CF")
    sq_office_cabal_support2.set_task("0xE11B49CF")

# Atrium, down below ------------------------------------------------------

script sc_atrium_dn():
    sleep_until(pt_office_exit.is_triggered())
    sleep(1.5)
    place_on_task(sq_atrium_dn_cabal_support1, "0x791843AC")
    sleep_until(pt_atrium_entry.is_triggered())
    sleep(1)
    sq_atrium_dn_cabal_support1.set_task("0x12989F93")
    place_on_task(sq_atrium_dn_cabal_support3, "0xAC9556B9")
    place_on_task(sq_atrium_dn_cabal_support4, "0xDA3FE181")
    sc_atrium_dn_cabal.wake()
    sc_vex_cloud1.wake()
    sleep(2)
    sc_vex_cloud2.wake()
    sleep(4.5)
    seq_d_atrium_vex_s01.start()

script sc_vex_cloud1():
    vex_cloud_in(sq_atrium_dn_vex_cloud1, sq_atrium_dn_vex_cloud1__vex_cloud)
    sq_atrium_dn_vex_anchor1.set_task("0x754B10E3")
    sq_atrium_dn_vex_support2.set_task("0xC633272D")
    sq_atrium_dn_vex_cloud1__vex_cloud.drop_squad(sq_atrium_dn_vex_anchor1)
    sq_atrium_dn_vex_cloud1__vex_cloud.drop_squad(sq_atrium_dn_vex_support2)
    sc_atrium_dn_vex.wake()
    sleep(7)
    sq_atrium_dn_vex_cloud1.remove()

script sc_vex_cloud2():
    vex_cloud_in(sq_atrium_dn_vex_cloud2, sq_atrium_dn_vex_cloud2__vex_cloud)
    sq_atrium_dn_vex_support1.set_task("0xDCB4F965")
    sq_atrium_dn_vex_cloud2__vex_cloud.drop_squad(sq_atrium_dn_vex_support1)
    sleep(6.3)
    sq_atrium_dn_vex_cloud2.remove()

script sc_atrium_dn_cabal():
    sleep_until(lost_one(sq_atrium_dn_cabal_support3, 2))
    sq_atrium_dn_cabal_support3.set_task("0xFF6FAE77")
    sleep_until(sq_atrium_dn_cabal_support3.alive_count() == 0)
    sq_atrium_dn_cabal_support3.set_task("0x077DFD1A")
    sq_atrium_dn_cabal_support4.set_task("0x077DFD1A")

script sc_atrium_dn_vex():
    sleep_until(sq_atrium_dn_vex_support1.alive_count() == 3)
    sleep_until(lost_two(sq_atrium_dn_vex_support1, 3))
    sq_atrium_dn_vex_support1.set_task("0xE8D502DB")
    sleep_until(sq_atrium_dn_vex_support1.alive_count() == 0)
    sq_atrium_dn_vex_anchor1.set_task("0xDC032616")
    sq_atrium_dn_vex_support1.set_task("0x1D2E4C56")
    sq_atrium_dn_vex_support2.set_task("0x1D2E4C56")

# Atrium, up above --------------------------------------------------------

script sc_atrium_up():
    sleep_until(pt_atrium_mid.is_triggered())
    sleep(0.7)
    place_on_task(sq_atrium_up_cabal_support1, "0x29AEF815")
    place_on_task(sq_atrium_up_cabal_support2, "0x29AEF816")
    place_on_task(sq_atrium_up_cabal_support3, "0x29AEF816")
    sleep_until(pt_atrium_up.is_triggered())
    sleep(1)
    sq_atrium_up_cabal_anchor1.set_task("0x96EC5FC0")
    sq_atrium_up_cabal_anchor1__centurion.place()
    sleep_until(not sq_atrium_up_cabal_anchor1__centurion.is_alive())
    sq_atrium_up_cabal_anchor1.set_task("0x1AB5EF41")

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

# A squad of the given size that has lost a member, or two.
def lost_one(sq, size):
    return sq.alive_count() <= size - 1

def lost_two(sq, size):
    return sq.alive_count() <= size - 2

# A Vex cloud warps in and its pilot gets ready to drop.
def vex_cloud_in(cloud, pilot):
    cloud.place()
    pilot.execute(cs_vex_cloud())
    sleep(0.8)

command_script cs_vex_cloud():
    set_channel_scalar("0x80296344", 1)
