# es\cosmo\dome_c\enc_dome_c_m2.es
#
# Dome C in the second dome mission. The Fallen hold the pipe room (two
# groups and the reinforcements, each coming on as the group before thins
# out or the player reaches its spawn), then the guards' hall (two triggers:
# the captain's group and four vandals). When the captain falls the last of
# his group fall back and mission 3 moves the music on. Once the console is
# used mission 4 wakes the waves: the first comes in as the objective does
# and each later step follows how many of the wave before are left, the
# second's shanks three seconds apart, the third (two servitors with their
# dregs) once the second's last squad is dead. The console (a placement the
# player uses) and the beacon (one the player destroys) are the missions'
# objectives; their devices start at rest and come on as mission 5 starts.
#
# From one retail run: each threshold and wait is that run's. Body counts
# are that run's deaths per member (a member none of whom died is 0). The
# servitors are named members of squads that also have dregs, so they are
# placed with their squads by hand. The t2 squads only get their objective:
# this run never placed them. The squads whose task the run moved to none
# (the waves once the third is nearly done, some of the second and third at
# the hall's first trigger) are left on theirs: TU0 has no verb to clear a
# task.

@activity_bundle("enc_dome_c_m2")

bool guards_captain_down = false
bool waves_clear = false
objective obj_fallen_dome_c_m2_piperoom
objective obj_fallen_dome_c_m2_guards
object o_basement_door01
trigger_volume tv_fallen_piperoom_spawn02
player_monitor pm_fallen_piperoom_spawn02 bind(tv_fallen_piperoom_spawn02)
trigger_volume tv_fallen_guards_spawn01
player_trigger pt_fallen_guards_spawn01 bind(tv_fallen_guards_spawn01)
trigger_volume tv_fallen_guards_spawn02
player_trigger pt_fallen_guards_spawn02 bind(tv_fallen_guards_spawn02)
sequence seq_fallen_wave_announce
interactable_placement obj_placement_m2_o3a bind("0x9DF3A02E")
destructible_placement obj_placement_m2_o4b bind("0x365FAC19")
@member_counts({dreg: 2})
squad sq_fallen_piperoom01a
squad sq_fallen_piperoom01b
squad sq_fallen_piperoom02a
squad sq_t2_fallen_piperoom02a
@member_counts({dreg: 2})
squad sq_fallen_piperoom02b
@member_counts({dreg: 3, captain: 1})
squad sq_fallen_piperoom_reinf01
squad sq_t2_fallen_piperoom_reinf01
squad sq_t2_fallen_stairs_ambush01
@member_counts({captain: 1, dreg: 2})
squad sq_fallen_guards01
squad sq_t2_fallen_guards01
squad sq_fallen_guards02a
squad sq_fallen_guards02b
squad sq_fallen_guards02c
squad sq_fallen_guards02d
@member_counts({dreg: 4, vandal: 0})
squad sq_fallen_wave01a
@member_counts({vandal: 2, dreg: 0})
squad sq_fallen_wave01b
@member_counts({dreg: 3, vandal: 0, 0xFD2174CD: 1})
squad sq_fallen_wave01c
@member_counts({dreg: 4, captain: 1})
squad sq_fallen_wave02a
squad sq_t2_fallen_wave02a
@member_counts({dreg: 4, captain: 1})
squad sq_fallen_wave02b
squad sq_t2_fallen_wave02b
@member_counts({shank: 2})
squad sq_fallen_wave02c
@member_counts({shank: 2})
squad sq_fallen_wave02d
@member_counts({shank: 2})
squad sq_fallen_wave02e
@member_counts({dreg: 3})
squad sq_fallen_wave03a
squad_member sq_fallen_wave03a__servitor
@member_counts({dreg: 3})
squad sq_fallen_wave03b
squad_member sq_fallen_wave03b__servitor
squad sq_fallen_wave03c

@startup()
script sc_dome_c_m2():
    o_basement_door01.create()
    for sq in [sq_fallen_piperoom01a, sq_fallen_piperoom01b, sq_fallen_piperoom02a, sq_t2_fallen_piperoom02a, sq_fallen_piperoom02b, sq_fallen_piperoom_reinf01, sq_t2_fallen_piperoom_reinf01, sq_t2_fallen_stairs_ambush01]:
        sq.set_objective(obj_fallen_dome_c_m2_piperoom)
    for sq in [sq_fallen_guards01, sq_t2_fallen_guards01, sq_fallen_guards02a, sq_fallen_guards02b, sq_fallen_guards02c, sq_fallen_guards02d, sq_fallen_wave01a, sq_fallen_wave01b, sq_fallen_wave01c, sq_fallen_wave02a, sq_t2_fallen_wave02a, sq_fallen_wave02b, sq_t2_fallen_wave02b, sq_fallen_wave02c, sq_fallen_wave02d, sq_fallen_wave02e, sq_fallen_wave03a, sq_fallen_wave03b, sq_fallen_wave03c]:
        sq.set_objective(obj_fallen_dome_c_m2_guards)
    place_on_task(sq_fallen_piperoom01a, "0x8F0587D8")
    place_on_task(sq_fallen_piperoom01b, "0x8F0587D6")
    # the waves sit on their first tasks from the start
    sq_fallen_wave01a.set_task("task")
    sq_fallen_wave01b.set_task("0x92058C94")
    sq_fallen_wave01c.set_task("0xC8FC7A6F")
    for sq in [sq_fallen_wave02a, sq_t2_fallen_wave02a, sq_fallen_wave02b, sq_t2_fallen_wave02b, sq_fallen_wave02c, sq_fallen_wave02d, sq_fallen_wave02e]:
        sq.set_task("0x92058C93")
    for sq in [sq_fallen_wave03a, sq_fallen_wave03b, sq_fallen_wave03c]:
        sq.set_task("0x92058C91")
    sc_devices.wake()
    sc_piperoom.wake()
    sc_guards01.wake()
    sc_guards02.wake()

# the console's and the beacon's devices start at rest
script sc_devices():
    console = obj_placement_m2_o3a._object
    beacon = obj_placement_m2_o4b._object
    sleep_until(console.is_alive() and beacon.is_alive())
    console.set_device_position(0)
    beacon.set_device_position(0)

# mission 5: the beacon comes on with its objective, the console a second
# later
script sc_beacon():
    obj_placement_m2_o4b._object.set_device_position(1)
    sleep(1)
    obj_placement_m2_o3a._object.set_device_position(1)

# the pipe room: the first group falls back at its first loss and the door
# below opens once it is dead; the second group comes as the player reaches
# its spawn, and the reinforcements once half of it is down. A squad's count
# is its members at their firing areas: it climbs as they get there after
# place(), so each wait on losses starts a few seconds on.
script sc_piperoom():
    sleep(4)
    sleep_until(piperoom01_alive() < 3)
    sq_fallen_piperoom01a.set_task("task_5")
    sq_fallen_piperoom01b.set_task("task_5")
    sleep_until(piperoom01_alive() == 0)
    o_basement_door01.set_device_position(1)
    sleep_until(pm_fallen_piperoom_spawn02.test_any_inside())
    place_on_task(sq_fallen_piperoom02a, "0x8F0587D9")
    place_on_task(sq_fallen_piperoom02b, "task_5")
    sleep(4)
    sleep_until(sq_fallen_piperoom02a.alive_count() + sq_fallen_piperoom02b.alive_count() <= 2)
    place_on_task(sq_fallen_piperoom_reinf01, "task")
    sleep(4)
    sleep_until(sq_fallen_piperoom_reinf01.alive_count() == 0)
    sq_fallen_piperoom_reinf01.set_task("task_6")

# the guards' hall: the captain's group at the first trigger; when the
# captain falls the rest of it fall back
script sc_guards01():
    sleep_until(pt_fallen_guards_spawn01.is_triggered())
    place_on_task(sq_fallen_guards01, "task_3")
    sleep(4)
    sleep_until(sq_fallen_guards01.alive_count() <= 1)
    sq_fallen_guards01.set_task("0x92058C9E")
    guards_captain_down = true

# the four vandals at the second trigger, the last a second behind
script sc_guards02():
    sleep_until(pt_fallen_guards_spawn02.is_triggered())
    for sq in [sq_fallen_guards02a, sq_fallen_guards02b, sq_fallen_guards02c]:
        place_on_task(sq, "0x8F0587DD")
    sleep(1)
    place_on_task(sq_fallen_guards02d, "0x8F0587DD")

# mission 4: the three waves
script sc_waves():
    sleep(2)
    seq_fallen_wave_announce.start()
    sleep(2)
    for sq in [sq_fallen_wave01a, sq_fallen_wave01b, sq_fallen_wave01c]:
        sq.place()
    # the first wave runs in from further off
    sleep(6)
    sleep_until(wave01_alive() <= 6)
    for sq in [sq_fallen_wave01a, sq_fallen_wave01b, sq_fallen_wave01c]:
        sq.set_task("0x043EEF51")
    sleep_until(wave01_alive() <= 3)
    for sq in [sq_fallen_wave01a, sq_fallen_wave01b, sq_fallen_wave01c]:
        sq.set_task("0x043EEF52")
    sleep_until(wave01_alive() <= 2)
    place_on_task(sq_fallen_wave02a, "0x043EEF53")
    sq_fallen_wave02b.place()
    sleep(6)
    place_on_task(sq_fallen_wave02c, "0xB4CD5448")
    sleep(3)
    place_on_task(sq_fallen_wave02d, "0xB4CD5448")
    sleep(3)
    place_on_task(sq_fallen_wave02e, "0xB4CD5448")
    sleep_until(wave02_alive() <= 2)
    sq_fallen_wave02a.set_task("0x52670312")
    sleep_until(wave02_alive() <= 1)
    sq_fallen_wave02a.set_task("0x92058C93")
    sleep_until(wave02_alive() == 0)
    place_on_task(sq_fallen_wave03a, "0x91058B21")
    sq_fallen_wave03a__servitor.place()
    sleep(2)
    place_on_task(sq_fallen_wave03b, "0x2C9B98FD")
    sq_fallen_wave03b__servitor.place()
    sleep(4)
    sleep_until(wave03_alive() <= 1)
    sq_fallen_wave03b.set_task("0x91058B27")
    sleep_until(wave03_alive() == 0)
    waves_clear = true

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def piperoom01_alive():
    return sq_fallen_piperoom01a.alive_count() + sq_fallen_piperoom01b.alive_count()

def wave01_alive():
    return sq_fallen_wave01a.alive_count() + sq_fallen_wave01b.alive_count() + sq_fallen_wave01c.alive_count()

def wave02_alive():
    return sq_fallen_wave02a.alive_count() + sq_fallen_wave02b.alive_count() + sq_fallen_wave02c.alive_count() + sq_fallen_wave02d.alive_count() + sq_fallen_wave02e.alive_count()

# the third wave, servitors and dregs
def wave03_alive():
    return sq_fallen_wave03a.alive_count() + sq_fallen_wave03b.alive_count()
