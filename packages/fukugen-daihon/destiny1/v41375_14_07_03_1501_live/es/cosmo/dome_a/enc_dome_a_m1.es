# es\cosmo\dome_a\enc_dome_a_m1.es
#
# Dome A in The Dark Within: the Hive in the basement and on the upper floor.
# The door scan is a placement the player uses; when its device finishes the
# basement wakes frozen, the door below opens and the scare thralls flicker
# in the corridor until the player reaches them. The basement thaws as the
# player comes down, its troopers a moment later and their reinforcements
# after them. The upper floor wakes when a player reaches the top of the
# stairs; its squads move up as they take losses, and the wizard's death
# ends the fight and clears what is left of it.
#
# From two retail 2.3.1 captures (2026-10-24 22-14-31, 2026-10-27
# 20-33-53): the rules below hold in both. Waits without a trigger or a
# death behind them are within a second in both runs.

@activity_bundle("enc_dome_a_m1")

objective obj_hive_dome_a01
object o_door01
interactable_placement obj_placement_m1_o1b bind("0x3EA60D3D")
player_trigger pt_spawn_hive_scare02
player_trigger pt_spawn_hive_intro01
player_trigger pt_spawn_hive_intro02
player_trigger pt_spawn_hive_intro02_force
player_trigger pt_thrall_unfreeze
player_trigger pt_upper_rush01_spawn
player_trigger pt_upper_rush02_spawn
player_trigger pt_upper_wizard_fallback_disable
sequence seq_hive_wave_announce
squad sq_hive_scare02a
squad sq_hive_scare02b
squad sq_hive_scare02c
squad sq_hive_scare02d
squad sq_hive_basement_thrall01
squad_member sq_hive_basement_thrall01__thrall1
squad_member sq_hive_basement_thrall01__thrall2
squad_member sq_hive_basement_thrall01__thrall3
squad_member sq_hive_basement_thrall01__thrall4
squad_member sq_hive_basement_thrall01__thrall5
squad_member sq_hive_basement_thrall01__thrall6
squad_member sq_hive_basement_thrall01__thrall7
squad sq_hive_basement_troopers01
@member_counts({trooper: 2})
squad sq_hive_basement_troopers02
# the thralls on the ledge come in on a firing area set (fas_thrall_upper),
# against no objective until they are let loose
squad sq_hive_upper_front01
@member_counts({trooper: 3})
squad sq_hive_upper_front02
@member_counts({trooper: 4})
squad sq_hive_upper_front03
@member_counts({thrall: 2, thrall_1: 2})
squad sq_hive_upper_rush01
@member_counts({thrall: 2, thrall_1: 2})
squad sq_hive_upper_rush02
@member_counts({trooper: 4})
squad sq_hive_upper_back01
@member_counts({trooper: 2})
squad sq_hive_upper_back02
squad sq_hive_upper_wizard01
bool scan_complete = false

@startup()
# the basement door stands closed; every squad but the ledge thralls is
# against the dome's objective from the start, and the troopers at the front
# of the upper floor wait frozen
script sc_dome_a():
    o_door01.create()
    for sq in [sq_hive_scare02a, sq_hive_scare02b, sq_hive_scare02c, sq_hive_scare02d, sq_hive_basement_thrall01, sq_hive_basement_troopers01, sq_hive_basement_troopers02, sq_hive_upper_front02, sq_hive_upper_front03, sq_hive_upper_rush01, sq_hive_upper_rush02, sq_hive_upper_back01, sq_hive_upper_back02, sq_hive_upper_wizard01]:
        sq.set_objective(obj_hive_dome_a01)
    sq_hive_upper_front02.set_task("task_4")
    sq_hive_upper_front02.activate_temperament("temper_freeze")

@startup()
# the door scan: the device runs while the Ghost works, then the basement
# comes up frozen (six of its thralls; the seventh joins when it thaws), the
# door below opens and the scare thralls start
script sc_scan():
    console = obj_placement_m1_o1b._object
    sleep_until(console.is_active())
    console.set_device_position(0.4)
    sleep(4.8)
    console.set_device_position(1)
    sleep(0.5)
    scan_complete = true
    sq_hive_basement_thrall01.activate_temperament("temper_freeze")
    sq_hive_basement_thrall01.set_task("0x0A52BC0C")
    sq_hive_basement_thrall01__thrall1.place()
    sq_hive_basement_thrall01__thrall2.place()
    sq_hive_basement_thrall01__thrall3.place()
    sq_hive_basement_thrall01__thrall4.place()
    sq_hive_basement_thrall01__thrall5.place()
    sq_hive_basement_thrall01__thrall7.place()
    sq_hive_basement_troopers01.activate_temperament("temper_freeze")
    place_on_task(sq_hive_basement_troopers01, "task_19")
    sleep(3)
    o_door01.set_device_position(1)
    sleep(3.5)
    sc_scare02b.wake()
    sleep(0.5)
    sc_scare02a.wake()
    sc_scare02c.wake()
    sleep(0.5)
    sc_scare02d.wake()

# each scare thrall shows for a couple of seconds and is gone again, over and
# over (3.4 s a cycle in both runs), until the player reaches the corridor,
# which sends the ones still up away
script sc_scare02a():
    scare(sq_hive_scare02a)

script sc_scare02b():
    scare(sq_hive_scare02b)

script sc_scare02c():
    scare(sq_hive_scare02c)

script sc_scare02d():
    scare(sq_hive_scare02d)

@startup()
# the thralls thaw and charge as the player comes down, the troopers follow
# them (intro02 was 0.8 s before in one run, 26 s after in the other), and
# the second troopers come in 9 s later or as a player forces them
script sc_intro01():
    sleep_until(pt_spawn_hive_intro01.is_triggered())
    sq_hive_basement_thrall01.deactivate_temperament("temper_freeze")
    sq_hive_basement_thrall01.activate_temperament("0xA0FAA3C6")
    sq_hive_basement_thrall01.set_task("0xC0A49850")
    sq_hive_basement_thrall01__thrall6.place()
    seq_hive_wave_announce.start()
    sleep(1.5)
    sq_hive_basement_troopers01.deactivate_temperament("temper_freeze")
    sq_hive_basement_troopers01.set_task("task_3")
    sc_troopers01_push.wake()
    sleep_until_timeout(pt_spawn_hive_intro02_force.is_triggered(), 9)
    place_on_task(sq_hive_basement_troopers02, "task_10")

# the troopers push on once they lose one of their own
script sc_troopers01_push():
    sleep_until(sq_hive_basement_troopers01.alive_count() < 3)
    sq_hive_basement_troopers01.set_task("task_9")

@startup()
script sc_intro02():
    sleep_until(pt_spawn_hive_intro02.is_triggered())
    sq_hive_basement_thrall01.deactivate_temperament("0xA0FAA3C6")

@startup()
# the upper floor wakes when a player reaches the top of the stairs: the
# front troopers thaw, the ledge thralls come in, and the wizard steps forward
script sc_upper():
    sleep_until(pt_thrall_unfreeze.is_triggered())
    sq_hive_upper_front02.place()
    place_on_task(sq_hive_upper_front03, "t_thrall_frozen")
    place_on_task(sq_hive_upper_back01, "task_21")
    place_on_task(sq_hive_upper_wizard01, "task_18")
    sleep(0.4)
    sq_hive_upper_front02.deactivate_temperament("temper_freeze")
    sq_hive_upper_front02.set_task("task")
    sq_hive_upper_front01.place()
    sleep(0.7)
    sq_hive_upper_wizard01.set_task("task_17")
    sc_upper_front.wake()
    sc_upper_rush01.wake()
    sc_upper_push.wake()
    sc_wizard_fallback.wake()
    sc_wizard_death.wake()
    sleep(4)
    sq_hive_upper_front01.set_objective(obj_hive_dome_a01)
    sq_hive_upper_front01.set_task("t_upper_main")

# the front troopers move up as the two squads lose men between them (two,
# then five of their seven)
script sc_upper_front():
    sleep_until(upper_front_alive_count() <= 5)
    sq_hive_upper_front02.set_task("task_22")
    sq_hive_upper_front03.set_task("task_22")
    sleep_until(upper_front_alive_count() <= 2)
    sq_hive_upper_front02.set_task("task_13")
    sq_hive_upper_front03.set_task("task_13")

# the first rush comes once the ledge thralls are dead and the front troopers
# are nearly gone, or a player pushes on before that
script sc_upper_rush01():
    sleep_until((sq_hive_upper_front01.alive_count() == 0 and upper_front_alive_count() <= 2) or pt_upper_rush01_spawn.is_triggered())
    place_on_task(sq_hive_upper_rush01, "0x185D6C4D")

# reaching the far end (or the wizard's death) brings the second rush and
# the rear troopers, and the wizard falls back
script sc_upper_push():
    sleep_until(pt_upper_rush02_spawn.is_triggered() or sq_hive_upper_wizard01.alive_count() == 0)
    sq_hive_upper_wizard01.set_task("task_18")
    place_on_task(sq_hive_upper_rush02, "task_14")
    place_on_task(sq_hive_upper_back02, "t_troopers_frozen")

# past its fallback the wizard, if still up, makes its stand
script sc_wizard_fallback():
    sleep_until(pt_upper_wizard_fallback_disable.is_triggered())
    if sq_hive_upper_wizard01.alive_count() > 0:
        sq_hive_upper_wizard01.set_task("0x33F2C53F")

# the wizard's death ends the fight: what is left of the upper floor dies
# with it
script sc_wizard_death():
    sleep_until_dead(sq_hive_upper_wizard01)
    for sq in [sq_hive_upper_front01, sq_hive_upper_front02, sq_hive_upper_front03, sq_hive_upper_rush01, sq_hive_upper_rush02, sq_hive_upper_back01, sq_hive_upper_back02]:
        sq.kill()

def scare(sq):
    while not pt_spawn_hive_scare02.is_triggered():
        sq.place()
        sleep_until_timeout(pt_spawn_hive_scare02.is_triggered(), 2)
        sq.remove()
        sleep(1)

def upper_front_alive_count():
    return sq_hive_upper_front02.alive_count() + sq_hive_upper_front03.alive_count()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def sleep_until_dead(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)
