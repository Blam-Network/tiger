# es\cosmo\refinery\enc_refinery_portal1.es
#
# Devils' Lair, the refinery: entrance trash, the playfight on the central
# floor, then the Ghost's hack at the relay's console. The pre-alpha's
# refinery is barred by three sets of tripwires, each with its kill volume,
# where the Alpha Trial's has laser webs; the sets come down one by one as
# the waves of Fallen and Hive are fought off. It has no suppressor squads
# and no scan cage. The console only works for players holding the scan
# objective's activity flag. Member counts and the hack's pacing are the
# Alpha Trial's, on the pre-alpha's squads and tasks.

@activity_bundle("enc_refinery_portal1")

object o_tripwire10
object o_tripwire11
object o_tripwire12
object o_tripwire20
object o_tripwire21
object o_tripwire22
object o_tripwire30
object o_tripwire31
object o_tripwire32
trigger_group t_kill_volume_tripwire01
trigger_group t_kill_volume_tripwire02
trigger_group t_kill_volume_tripwire03
interactable_placement sp_placement_array bind("0x1C450A3D")
objective obj_trash
@member_counts({thrall: 2})
squad sq_trash01_hive01
@member_counts({trooper: 2})
squad sq_trash01_hive02
@member_counts({variable: 2})
squad sq_trash01_hive03
objective obj_refinery_trash
@member_counts({dreg: 2, vandal: 1})
squad sq_trash02_fallen01
@member_counts({variable: 3})
squad sq_trash02_fallen02
@member_counts({captain: 1})
squad sq_trash02_fallen03
objective obj_refinery_playfight
@member_counts({troopers: 3, knight: 1})
squad sq_playfight_hive01
@member_counts({wizard: 1, troopers: 2})
squad sq_playfight_hive02
@member_counts({dregs: 2, captain: 1, vandals: 2})
squad sq_playfight_fallen01
@member_counts({vandals: 2})
squad sq_playfight_fallen02
objective obj_refinery_objective
@member_counts({dregs_pistol: 5, vandal_shock: 0})
squad sq_objective_fallen01a
@member_counts({dregs_pistol: 5, 0xDF8CCB01: 0})
squad sq_objective_fallen01b
@member_counts({dregs_pistol: 2, 0x58330EC6: 3, vandal_shock: 0})
squad sq_objective_fallen01c
squad sq_objective_fallen01d
squad sq_objective_fallen01e
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
    for tripwire in [o_tripwire10, o_tripwire11, o_tripwire12, o_tripwire20, o_tripwire21, o_tripwire22, o_tripwire30, o_tripwire31, o_tripwire32]:
        tripwire.create()
    t_kill_volume_tripwire01.activate()
    t_kill_volume_tripwire02.activate()
    t_kill_volume_tripwire03.activate()
    for sq in [sq_trash01_hive01, sq_trash01_hive02, sq_trash01_hive03]:
        sq.set_objective(obj_trash)
    for sq in [sq_trash02_fallen01, sq_trash02_fallen02, sq_trash02_fallen03]:
        sq.set_objective(obj_refinery_trash)
    for sq in [sq_playfight_hive01, sq_playfight_hive02, sq_playfight_fallen01, sq_playfight_fallen02]:
        sq.set_objective(obj_refinery_playfight)
    for sq in [sq_objective_fallen01a, sq_objective_fallen01b, sq_objective_fallen01c, sq_objective_fallen01d, sq_objective_fallen01e, sq_objective_fallen02b, sq_objective_fallen02c, sq_objective_fallen02d, sq_objective_fallen02e, sq_objective_fallen03a, sq_objective_fallen03b, sq_objective_fallen03c, sq_objective_hive01, sq_objective_hive02, sq_objective_hive03, sq_objective_hive04]:
        sq.set_objective(obj_refinery_objective)
    sc_trash.wake()

# The pre-alpha's refinery has no wake trigger for its entrance trash: it
# goes in as the refinery loads.
script sc_trash():
    place_on_task(sq_trash01_hive01, "trash_encounter_hive")
    place_on_task(sq_trash01_hive02, "0xFE049731")
    place_on_task(sq_trash01_hive03, "0xAB7A7F89")

script sc_playfight():
    place_on_task(sq_playfight_hive01, "hive01")
    place_on_task(sq_playfight_hive02, "hive02")
    place_on_task(sq_playfight_fallen01, "ground_fallen")
    place_on_task(sq_playfight_fallen02, "snipers")

# The hack runs on the waves' deaths, not a clock: each set of tripwires falls
# a few seconds after its wave is down, and the console finishes as the last
# wave's captain dies (the Alpha Trial's 2.3.1 run: web 1 2.8 s after the
# last shank, web 2 3 s after the last rusher, the console 2 s after the
# captain).
script sc_hack():
    console = sp_placement_array._object
    sleep_until(console.is_active())
    console.set_device_position(0.1)
    sleep(8)

    # wave 1: the floor Fallen, the third squad as the first two thin out,
    # then the shanks once they are all down
    place_on_task(sq_objective_fallen01a, "wave01b")
    place_on_task(sq_objective_fallen01b, "wave01e")
    sleep_until(sq_objective_fallen01a.alive_count() + sq_objective_fallen01b.alive_count() <= 3)
    place_on_task(sq_objective_fallen01c, "wave01a")
    sleep_until_cleared("wave01", 3)
    place_shanks()
    sleep_until_cleared("shanks", 3)
    drop_tripwires(o_tripwire10, o_tripwire11, o_tripwire12, t_kill_volume_tripwire01)

    # wave 2: the rushers come in as the first two squads thin out
    sleep(8)
    place_on_task(sq_objective_fallen02b, "wave02a")
    place_on_task(sq_objective_fallen02c, "wave02a")
    sleep_until(sq_objective_fallen02b.alive_count() + sq_objective_fallen02c.alive_count() <= 4)
    sleep(4)
    place_on_task(sq_objective_fallen02d, "wave02_rush")
    place_on_task(sq_objective_fallen02e, "wave02_rush")
    sleep_until_cleared("wave02", 3)
    drop_tripwires(o_tripwire20, o_tripwire21, o_tripwire22, t_kill_volume_tripwire02)

    # wave 3: Hive and Fallen together, the second Hive pair as the first
    # is all but gone
    sleep(4)
    place_on_task(sq_objective_hive01, "wave03c")
    place_on_task(sq_objective_hive02, "hive_disruptor01")
    sleep(3)
    place_on_task(sq_objective_fallen03a, "rush_point")
    place_on_task(sq_objective_fallen03b, "wave03a")
    sleep_until(sq_objective_hive01.alive_count() + sq_objective_hive02.alive_count() <= 1)
    sleep(1)
    place_on_task(sq_objective_hive03, "wave03c")
    place_on_task(sq_objective_hive04, "hive_disruptor01")
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

    # the captain is dead: the hack completes and the last tripwires fall
    console.set_device_position(1)
    sleep(2)
    drop_tripwires(o_tripwire30, o_tripwire31, o_tripwire32, t_kill_volume_tripwire03)
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

def drop_tripwires(a, b, c, kill_volume):
    kill_volume.deactivate()
    a.delete_object()
    b.delete_object()
    c.delete_object()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
