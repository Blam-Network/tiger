# es\cosmo\refinery\enc_refinery_portal1.es
#
# Devils' Lair, the refinery: entrance trash and the playfight, then the
# Ghost's scan. Using the console starts the hack; the laser webs come down
# as the waves of Fallen are fought off. The console only works for players
# holding the scan objective's activity flag.

@activity_bundle("enc_refinery_portal1")

object o_laserweb01
object o_laserweb02
object o_laserweb03
object o_laserweb_pusher01
object o_laserweb_nutblock0101
object o_laserweb_nutblock0102
object o_laserweb_nutblock0201
object o_laserweb_nutblock0202
object o_laserweb_nutblock0203
object o_laserweb_nutblock0301
object o_laserweb_nutblock0302
object o_laserweb_behavior0101
object o_laserweb_behavior0102
object o_laserweb_behavior0201
object o_laserweb_behavior0202
object o_laserweb_behavior0203
object o_laserweb_behavior0301
object o_laserweb_behavior0302
interactable_placement sp_placement_array bind("0x1C450A3D")
@member_counts({thrall: 2})
squad sq_trash01_hive01
objective obj_trash
@member_counts({trooper: 2})
squad sq_trash01_hive02
@member_counts({knight: 1, trooper: 1})
squad sq_trash01_hive03
@member_counts({dreg: 2, vandal: 1})
squad sq_trash01_fallen01
@member_counts({dreg: 1, dreg_1: 1, vandal: 1})
squad sq_trash02_fallen01
objective obj_refinery_trash
@member_counts({variable: 1, variable_1: 1, variable_2: 1})
squad sq_trash02_fallen02
@member_counts({captain: 1})
squad sq_trash02_fallen03
@member_counts({troopers: 3, knight: 1})
squad sq_playfight_hive01
objective obj_refinery_playfight
@member_counts({wizard: 1, troopers: 2})
squad sq_playfight_hive02
@member_counts({dregs: 2, captain: 1, vandals: 2})
squad sq_playfight_fallen01
@member_counts({vandals: 2})
squad sq_playfight_fallen02
@member_counts({dregs_pistol: 5, vandal_shock: 0})
squad sq_objective_fallen01a
objective obj_refinery_objective
@member_counts({dregs_pistol: 5, 0xDF8CCB01: 0})
squad sq_objective_fallen01b
@member_counts({dregs_pistol: 2, 0x58330EC6: 3, vandal_shock: 0})
squad sq_objective_fallen01c
squad sq_objective_fallen01d
squad sq_objective_fallen01e
squad sq_objective_fallen02a
@member_counts({dregs: 1, vandal: 3, captain: 0})
squad sq_objective_fallen02b
@member_counts({dregs: 1, vandal: 3, captain: 0})
squad sq_objective_fallen02c
@member_counts({0xD1F11E74: 1, vandal_cloak: 3})
squad sq_objective_fallen02d
@member_counts({0xD1F11E74: 1, vandal_cloak: 3})
squad sq_objective_fallen02e
@member_counts({dregs: 2, vandal: 1})
squad sq_objective_fallen03a
@member_counts({dregs: 2, vandal: 1})
squad sq_objective_fallen03b
@member_counts({captain_major: 0, vandals: 2, dregs: 2})
squad sq_objective_fallen03c
@member_counts({thrall: 4})
squad sq_objective_hive01
@member_counts({wizard: 1, trooper: 2})
squad sq_objective_hive02
@member_counts({knight_sword: 2})
squad sq_objective_hive03
@member_counts({knight_boomer: 2, trooper: 2})
squad sq_objective_hive04
@member_counts({vandals: 2})
squad sq_objective_suppressors01
@member_counts({captain: 1})
squad sq_objective_suppressors02
@member_counts({captain: 1})
squad sq_objective_suppressors03
@member_counts({vandal_sniper_stealth: 1})
squad sq_objective_suppressors04
@member_counts({vandal_sniper_stealth: 1})
squad sq_objective_suppressors05
trigger_volume tv_wake_trash01
player_trigger pt_wake_trash01 bind(tv_wake_trash01)
trigger_volume tv_wake_playfight01
player_trigger pt_wake_playfight01 bind(tv_wake_playfight01)
object o_ghost_scan_cage_orb
object o_ghost_scan_cage_cyln
squad_member sq_objective_fallen01d__shank01
squad_member sq_objective_fallen01d__shank02
squad_member sq_objective_fallen01d__shank03
squad_member sq_objective_fallen01d__shank04
squad_member sq_objective_fallen01e__shank01
squad_member sq_objective_fallen01e__shank02
squad_member sq_objective_fallen01e__shank03
squad_member sq_objective_fallen01e__shank04
squad_member sq_objective_fallen03c__captain_major

@startup()
script sc_refinery_main():
    o_laserweb01.create()
    o_laserweb02.create()
    o_laserweb03.create()
    o_laserweb_pusher01.create()
    o_laserweb_nutblock0101.create()
    o_laserweb_nutblock0102.create()
    o_laserweb_nutblock0201.create()
    o_laserweb_nutblock0202.create()
    o_laserweb_nutblock0203.create()
    o_laserweb_nutblock0301.create()
    o_laserweb_nutblock0302.create()
    o_laserweb_behavior0101.create()
    o_laserweb_behavior0102.create()
    o_laserweb_behavior0201.create()
    o_laserweb_behavior0202.create()
    o_laserweb_behavior0203.create()
    o_laserweb_behavior0301.create()
    o_laserweb_behavior0302.create()
    sq_trash01_hive01.set_objective(obj_trash)
    sq_trash01_hive02.set_objective(obj_trash)
    sq_trash01_hive03.set_objective(obj_trash)
    sq_trash01_fallen01.set_objective(obj_trash)
    sq_trash02_fallen01.set_objective(obj_refinery_trash)
    sq_trash02_fallen02.set_objective(obj_refinery_trash)
    sq_trash02_fallen03.set_objective(obj_refinery_trash)
    sq_playfight_hive01.set_objective(obj_refinery_playfight)
    sq_playfight_hive02.set_objective(obj_refinery_playfight)
    sq_playfight_fallen01.set_objective(obj_refinery_playfight)
    sq_playfight_fallen02.set_objective(obj_refinery_playfight)
    sq_objective_fallen01a.set_objective(obj_refinery_objective)
    sq_objective_fallen01b.set_objective(obj_refinery_objective)
    sq_objective_fallen01c.set_objective(obj_refinery_objective)
    sq_objective_fallen01d.set_objective(obj_refinery_objective)
    sq_objective_fallen01e.set_objective(obj_refinery_objective)
    sq_objective_fallen02a.set_objective(obj_refinery_objective)
    sq_objective_fallen02b.set_objective(obj_refinery_objective)
    sq_objective_fallen02c.set_objective(obj_refinery_objective)
    sq_objective_fallen02d.set_objective(obj_refinery_objective)
    sq_objective_fallen02e.set_objective(obj_refinery_objective)
    sq_objective_fallen03a.set_objective(obj_refinery_objective)
    sq_objective_fallen03b.set_objective(obj_refinery_objective)
    sq_objective_fallen03c.set_objective(obj_refinery_objective)
    sq_objective_hive01.set_objective(obj_refinery_objective)
    sq_objective_hive02.set_objective(obj_refinery_objective)
    sq_objective_hive03.set_objective(obj_refinery_objective)
    sq_objective_hive04.set_objective(obj_refinery_objective)
    sq_objective_suppressors01.set_objective(obj_refinery_objective)
    sq_objective_suppressors02.set_objective(obj_refinery_objective)
    sq_objective_suppressors03.set_objective(obj_refinery_objective)
    sq_objective_suppressors04.set_objective(obj_refinery_objective)
    sq_objective_suppressors05.set_objective(obj_refinery_objective)
    sc_trash.wake()
    sc_playfight.wake()
    sc_pusher.wake()

script sc_trash():
    sleep_until(pt_wake_trash01.is_triggered())
    place_on_task(sq_trash01_hive01, "trash_encounter_hive")
    place_on_task(sq_trash01_hive02, "0xFE049731")
    place_on_task(sq_trash01_hive03, "0xAB7A7F89")
    place_on_task(sq_trash01_fallen01, "0x7B0A0B67")

script sc_playfight():
    sleep_until(pt_wake_playfight01.is_triggered())
    place_on_task(sq_playfight_hive01, "hive01")
    place_on_task(sq_playfight_hive02, "hive02")
    place_on_task(sq_playfight_fallen01, "ground_fallen")
    place_on_task(sq_playfight_fallen02, "snipers")

script sc_pusher():
    sleep_until(not o_laserweb_pusher01.is_alive())
    o_laserweb_pusher01.delete_object()

# The hack runs on the waves' deaths, not a clock: each web falls a few
# seconds after its wave is down, and the console finishes as the last
# wave's captain dies (the 2.3.1 run: web 1 2.8 s after the last shank,
# web 2 3 s after the last rusher, the console 2 s after the captain).
script sc_hack():
    o_laserweb01.delete_object()
    o_laserweb02.delete_object()
    o_laserweb03.delete_object()
    o_laserweb01.create()
    o_laserweb02.create()
    o_laserweb03.create()
    console = sp_placement_array._object
    sleep_until(console.is_active())
    console.set_device_position(0.1)
    sleep(1)
    o_ghost_scan_cage_orb.create()
    o_ghost_scan_cage_cyln.create()
    sleep(5)

    # wave 1: the floor Fallen, the third squad as the first two thin out,
    # then the shanks once they are all down
    place_on_task(sq_objective_suppressors01, "hive_disruptor04")
    place_on_task(sq_objective_suppressors02, "suppress05")
    place_on_task(sq_objective_suppressors03, "suppression")
    sleep(2)
    place_on_task(sq_objective_fallen01a, "wave01b")
    place_on_task(sq_objective_fallen01b, "wave01e")
    sleep_until(sq_objective_fallen01a.alive_count() + sq_objective_fallen01b.alive_count() <= 3)
    place_on_task(sq_objective_fallen01c, "wave01a")
    sleep_until_cleared("wave01", 3)
    place_shanks()
    sleep_until_cleared("shanks", 3)
    o_laserweb01.delete_object()
    o_laserweb_nutblock0101.delete_object()
    o_laserweb_nutblock0102.delete_object()
    o_laserweb_behavior0101.delete_object()
    o_laserweb_behavior0102.delete_object()

    # wave 2: the rushers come in as the first two squads thin out
    sleep(6)
    sq_objective_suppressors02.respawn()
    sq_objective_suppressors03.respawn()
    sleep(2)
    place_on_task(sq_objective_fallen02b, "0x54B63915")
    place_on_task(sq_objective_fallen02c, "wave02a")
    sleep(1)
    place_on_task(sq_objective_suppressors04, "suppress01")
    place_on_task(sq_objective_suppressors05, "suppress04")
    sleep_until(sq_objective_fallen02b.alive_count() + sq_objective_fallen02c.alive_count() <= 4)
    sq_objective_fallen02b.set_task("wave02a")
    sleep(4)
    place_on_task(sq_objective_fallen02d, "wave02_rush")
    place_on_task(sq_objective_fallen02e, "0xE85AA53A")
    sleep_until_cleared("wave02", 3)
    o_laserweb02.delete_object()
    o_laserweb_nutblock0201.delete_object()
    o_laserweb_nutblock0202.delete_object()
    o_laserweb_nutblock0203.delete_object()
    o_laserweb_behavior0201.delete_object()
    o_laserweb_behavior0202.delete_object()
    o_laserweb_behavior0203.delete_object()

    # wave 3: Hive and Fallen together, the second Hive pair as the first
    # is all but gone
    sleep(4)
    place_on_task(sq_objective_hive01, "wave03c")
    place_on_task(sq_objective_hive02, "hive_disruptor01")
    sleep(1)
    sq_objective_suppressors01.respawn()
    sq_objective_suppressors02.respawn()
    sq_objective_suppressors03.respawn()
    sleep(2)
    place_on_task(sq_objective_fallen03a, "rush_point")
    place_on_task(sq_objective_fallen03b, "wave03a")
    sleep(1)
    sq_objective_suppressors04.respawn()
    sq_objective_suppressors05.respawn()
    sleep_until(sq_objective_hive01.alive_count() + sq_objective_hive02.alive_count() <= 1)
    sleep(1)
    place_on_task(sq_objective_hive03, "hive_disruptor02")
    place_on_task(sq_objective_hive04, "hive_disruptor03")
    sleep_until_cleared("wave03", 4)

    # the last push: the shanks again, the rushers back as the shanks thin
    # out, wave 3's Fallen back as the rushers do, then the captain once the
    # rushers are down
    place_shanks()
    # a shank placed again reads dead until the client reports it back
    sleep_until_timeout(shanks_alive_count() > 2, 10)
    sleep_until(shanks_alive_count() <= 2)
    sq_objective_fallen02d.respawn()
    sq_objective_fallen02e.respawn()
    sleep_until(rushers_alive_count() <= 1)
    sq_objective_fallen03a.respawn()
    sq_objective_fallen03b.respawn()
    sleep_until(rushers_alive_count() == 0)
    sleep(1)
    sq_objective_fallen03c.set_task("wave03b")
    sq_objective_fallen03c__captain_major.place()
    sleep_until_timeout(sq_objective_fallen03c__captain_major.is_bound(), 10)
    sleep_until(not sq_objective_fallen03c__captain_major.is_bound())
    sleep(2)

    # the captain is dead: the hack completes and the last web falls
    o_ghost_scan_cage_orb.set_device_position(1)
    o_ghost_scan_cage_cyln.set_device_position(1)
    console.set_device_position(1)
    sleep(1)
    o_ghost_scan_cage_orb.delete_object()
    o_ghost_scan_cage_cyln.delete_object()
    sleep(1)
    o_laserweb03.delete_object()
    o_laserweb_nutblock0301.delete_object()
    o_laserweb_nutblock0302.delete_object()
    o_laserweb_behavior0301.delete_object()
    o_laserweb_behavior0302.delete_object()
    sleep(3)
    place_on_task(sq_trash02_fallen01, "0x86F5772D")
    place_on_task(sq_trash02_fallen02, "0xC8966C13")
    place_on_task(sq_trash02_fallen03, "0xC8966C10")

# the shanks drop two at a time, one from each squad (the 2.3.1 run dropped a
# squad's pairs together: 01d's 01 and 03, 01e's 02 and 04 0.9 s on, 01d's 02
# and 04 0.5 s after, 01e's 01 and 03 1.9 s after that); two of one squad
# placed in one update leave the first unspawned on ff
def place_shanks():
    sq_objective_fallen01d.set_task("0xC8389513")
    sq_objective_fallen01e.set_task("wave01d")
    sq_objective_fallen01d__shank01.place()
    sq_objective_fallen01e__shank02.place()
    sleep(1)
    sq_objective_fallen01d__shank03.place()
    sq_objective_fallen01e__shank04.place()
    sleep(1)
    sq_objective_fallen01d__shank02.place()
    sq_objective_fallen01e__shank01.place()
    sleep(1)
    sq_objective_fallen01d__shank04.place()
    sq_objective_fallen01e__shank03.place()

# a wave is down when none of its squads has anyone standing, and that holds
# for a moment (a squad reads 0 between one member dying and the next coming
# in)
def sleep_until_cleared(wave, hold):
    while true:
        sleep_until(wave_alive_count(wave) == 0)
        sleep(hold)
        if wave_alive_count(wave) == 0:
            return

def wave_alive_count(wave):
    if wave == "wave01":
        return sq_objective_fallen01a.alive_count() + sq_objective_fallen01b.alive_count() + sq_objective_fallen01c.alive_count()
    elif wave == "shanks":
        return shanks_alive_count()
    elif wave == "wave02":
        return sq_objective_fallen02b.alive_count() + sq_objective_fallen02c.alive_count() + rushers_alive_count()
    # wave 3
    return sq_objective_hive01.alive_count() + sq_objective_hive02.alive_count() + sq_objective_hive03.alive_count() + sq_objective_hive04.alive_count() + sq_objective_fallen03a.alive_count() + sq_objective_fallen03b.alive_count()

def shanks_alive_count():
    return sq_objective_fallen01d.alive_count() + sq_objective_fallen01e.alive_count()

def rushers_alive_count():
    return sq_objective_fallen02d.alive_count() + sq_objective_fallen02e.alive_count()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
