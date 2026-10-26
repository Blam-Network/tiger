# es\venus\southern_tides\enc_southern_tides_m02.es
#
# The southern tides in Ishtar Collective. Mission 3 wakes the Fallen camp:
# seven squads at once, a shank pack once the wire vandal is dead and the
# last vandals once the dreg pack is; the camp is clear when all nine are
# dead. Mission 4 wakes the defence of the dome: three Vex waves out of their
# clouds. Each opens with harpies from a dome cloud; once one of them is down
# the rest of the wave comes out of the gate, square and ruins clouds, and the
# wave's last few push in. The Ghost speaks five seconds after each wave dies
# and the next one follows his line. A cloud fades once its drop is done.
#
# From one retail 2.3.1 capture (2026-10-25 20-15-34, unconfirmed). Which
# squads each cloud drops, and how many bodies (@member_counts), is the
# wire's; every wait without a death behind it is that run's gap. Never
# placed in that run: the Fallen dropships (pm_fallen_drop and the fallback
# triggers fired, nothing followed), sq_vexcloud_center, sq_vexcloud_round,
# the hydra (sq_wave4_v1) and wave1_v2/v5, wave2_v2/v5/v8, wave3_v6-8 and
# wave4_v3/v4/v6.

@activity_bundle("enc_southern_tides_m02")

objective obj_southern_tides_m02
static_array<object, 12> candy_dynamic_objects
static_array<object, 5> candy_explosive_objects
@member_counts({shank: 1, dreg_pistol: 1})
squad sq_fallen01
@member_counts({vandal_rifle: 1, dreg_pistol: 3})
squad sq_fallen02
@member_counts({shank: 1, dreg_pistol: 1})
squad sq_fallen03
@member_counts({vandal_rifle: 1, dreg_pistol: 3})
squad sq_fallen04
@member_counts({vandal_wire: 1})
squad sq_fallen05
@member_counts({0xA2836910: 1, vandal_rifle: 2})
squad sq_fallen06
@member_counts({shank: 4})
squad sq_fallen07
@member_counts({vandal_rifle: 2})
squad sq_fallen08
@member_counts({dreg_pistol: 4})
squad sq_fallen09
squad sq_vexcloud_dome1
squad_member sq_vexcloud_dome1__pilot
squad sq_vexcloud_dome2
squad_member sq_vexcloud_dome2__pilot
squad sq_vexcloud_gate1
squad_member sq_vexcloud_gate1__pilot
squad sq_vexcloud_gate2
squad_member sq_vexcloud_gate2__pilot
squad sq_vexcloud_square
squad_member sq_vexcloud_square__pilot
squad sq_vexcloud_ruins
squad_member sq_vexcloud_ruins__pilot
@member_counts({harpy: 2})
squad sq_wave1_v1
squad sq_wave1_v2
@member_counts({0xDB9353A1: 5})
squad sq_wave1_v3
@member_counts({0xDB9353A1: 5})
squad sq_wave1_v4
squad sq_wave1_v5
@member_counts({harpy: 2})
squad sq_wave2_v1
squad sq_wave2_v2
@member_counts({0xDB9353A1: 4})
squad sq_wave2_v3
@member_counts({0xDB9353A1: 4})
squad sq_wave2_v4
squad sq_wave2_v5
@member_counts({0xB9D0E8FA: 1})
squad sq_wave2_v6
@member_counts({0xB9D0E8FA: 1})
squad sq_wave2_v7
squad sq_wave2_v8
@member_counts({harpy: 2})
squad sq_wave3_v1
@member_counts({harpy: 2})
squad sq_wave3_v2
@member_counts({0x40DDCDB1: 1})
squad sq_wave3_v3
@member_counts({0x40DDCDB1: 1})
squad sq_wave3_v4
@member_counts({0x40DDCDB1: 1})
squad sq_wave3_v5
squad sq_wave3_v6
squad sq_wave3_v7
squad sq_wave3_v8
squad sq_wave4_v1
@member_counts({harpy: 2})
squad sq_wave4_v2
squad sq_wave4_v3
squad sq_wave4_v4
@member_counts({harpy: 2})
squad sq_wave4_v5
squad sq_wave4_v6
sequence seq_vn02_020_s060
sequence seq_vn02_020_s065
sequence seq_wave_spawn_vex
int i_reserves = 0
int i_wave = 0
bool fallen_clear = false
bool defend_clear = false

@startup()
# the loose candy is out and every Fallen and Vex squad is against the
# tides' objective as the tides come in
script sc_southern_tides():
    for candy in candy_dynamic_objects:
        candy.create()
    for candy in candy_explosive_objects:
        candy.create()
    for sq in [sq_fallen01, sq_fallen02, sq_fallen03, sq_fallen04, sq_fallen05, sq_fallen06, sq_fallen07, sq_fallen08, sq_fallen09]:
        sq.set_objective(obj_southern_tides_m02)
    for sq in [sq_wave1_v1, sq_wave1_v2, sq_wave1_v3, sq_wave1_v4, sq_wave1_v5, sq_wave2_v1, sq_wave2_v2, sq_wave2_v3, sq_wave2_v4, sq_wave2_v5, sq_wave2_v6, sq_wave2_v7, sq_wave2_v8]:
        sq.set_objective(obj_southern_tides_m02)
    for sq in [sq_wave3_v1, sq_wave3_v2, sq_wave3_v3, sq_wave3_v4, sq_wave3_v5, sq_wave3_v6, sq_wave3_v7, sq_wave3_v8, sq_wave4_v1, sq_wave4_v2, sq_wave4_v3, sq_wave4_v4, sq_wave4_v5, sq_wave4_v6]:
        sq.set_objective(obj_southern_tides_m02)

# mission 3: the camp comes up as the objective does
script sc_fallen():
    fallen_place(sq_fallen01, "0x75933BE0")
    fallen_place(sq_fallen02, "0xDEA960FB")
    fallen_place(sq_fallen03, "0x75933BE0")
    fallen_place(sq_fallen04, "0xF8B77E3C")
    fallen_place(sq_fallen05, "0x1464B42B")
    fallen_place(sq_fallen08, "0x489B62B8")
    fallen_place(sq_fallen09, "0x489B62B8")
    sc_fallen_shanks.wake()
    sc_fallen_vandals.wake()
    sleep_until(i_reserves == 2)
    sleep_until(fallen_alive() == 0)
    fallen_clear = true

# the shank pack, once the wire vandal is dead
script sc_fallen_shanks():
    sleep_until(sq_fallen05.alive_count() == 0)
    fallen_place(sq_fallen07, "0xC4765660")
    i_reserves = i_reserves + 1

# the last vandals, once the dreg pack is dead; the shanks move up with
# them, and the vandals follow once the shanks are gone
script sc_fallen_vandals():
    sleep_until(sq_fallen09.alive_count() == 0)
    fallen_place(sq_fallen06, "0xF8B77E3C")
    sq_fallen07.set_task("0xC8E719E3")
    i_reserves = i_reserves + 1
    sleep_until(sq_fallen07.alive_count() == 0)
    sq_fallen06.set_task("0xC8E719E3")

def fallen_place(sq, task):
    sq.set_task(task)
    sq.place()

def fallen_alive():
    return sq_fallen01.alive_count() + sq_fallen02.alive_count() + sq_fallen03.alive_count() + sq_fallen04.alive_count() + sq_fallen05.alive_count() + sq_fallen06.alive_count() + sq_fallen07.alive_count() + sq_fallen08.alive_count() + sq_fallen09.alive_count()

# mission 4: the terminal is being analyzed; the waves start five seconds on
script sc_defend():
    sleep(5)
    # wave 1: harpies from the dome, goblins out of both gate clouds
    i_wave = 1
    cloud_drop(sq_vexcloud_dome1__pilot, sq_wave1_v1, "0x73D5EE2B")
    sc_fade_dome1.restart()
    sleep_until(sq_wave1_v1.alive_count() <= 1)
    cloud_drop(sq_vexcloud_gate1__pilot, sq_wave1_v3, "0x73D5EE2B")
    sc_fade_gate1.restart()
    sleep(4)
    cloud_drop(sq_vexcloud_gate2__pilot, sq_wave1_v4, "0x73D5EE2B")
    sc_fade_gate2.restart()
    sleep_until(sq_wave1_v1.alive_count() + sq_wave1_v3.alive_count() + sq_wave1_v4.alive_count() == 0)
    sleep(5)
    seq_vn02_020_s060.start()
    sleep_until(seq_vn02_020_s060.is_done())
    # wave 2: harpies from the dome, hobgoblins then goblins out of the
    # square and ruins clouds (the second pair once both clouds are gone);
    # its last two push in
    i_wave = 2
    cloud_drop(sq_vexcloud_dome2__pilot, sq_wave2_v1, "0x64F9DD6C")
    sc_fade_dome2.restart()
    sleep_until(sq_wave2_v1.alive_count() <= 1)
    cloud_drop(sq_vexcloud_square__pilot, sq_wave2_v7, "0x867833C4")
    cloud_drop(sq_vexcloud_ruins__pilot, sq_wave2_v6, "0x867833C4")
    sc_fade_square.restart()
    sc_fade_ruins.restart()
    sleep_until(sc_fade_square.is_finished() and sc_fade_ruins.is_finished())
    sleep(2)
    cloud_drop(sq_vexcloud_square__pilot, sq_wave2_v4, "0x64F9DD6C")
    cloud_drop(sq_vexcloud_ruins__pilot, sq_wave2_v3, "0x64F9DD6C")
    sc_fade_square.restart()
    sc_fade_ruins.restart()
    sleep_until(sq_wave2_v4.alive_count() <= 1)
    sq_wave2_v4.set_task("0xEC6A4326")
    sq_wave2_v7.set_task("0xEC6A4326")
    sleep_until(sq_wave2_v1.alive_count() + sq_wave2_v3.alive_count() + sq_wave2_v4.alive_count() + sq_wave2_v6.alive_count() + sq_wave2_v7.alive_count() == 0)
    sleep(5)
    seq_vn02_020_s065.start()
    sleep(6)
    # wave 3: harpies from the dome, then harpies and a minotaur out of each
    # of the gate, square and ruins clouds; its last three push in
    i_wave = 3
    cloud_drop(sq_vexcloud_dome1__pilot, sq_wave4_v2, "0x88450233")
    sc_fade_dome1.restart()
    sleep_until(sq_wave4_v2.alive_count() <= 1)
    cloud_drop(sq_vexcloud_gate2__pilot, sq_wave3_v1, "0x88450233")
    sq_wave3_v3.set_task("0xCAC79E12")
    sq_vexcloud_gate2__pilot.drop_squad(sq_wave3_v3)
    sc_fade_gate2.restart()
    sleep(0.6)
    seq_wave_spawn_vex.start()
    sleep(0.7)
    cloud_drop(sq_vexcloud_square__pilot, sq_wave3_v2, "0x88450233")
    sq_wave3_v4.set_task("0xCAC79E12")
    sq_vexcloud_square__pilot.drop_squad(sq_wave3_v4)
    sc_fade_square.restart()
    sleep(0.4)
    cloud_drop(sq_vexcloud_ruins__pilot, sq_wave4_v5, "0x88450233")
    sq_wave3_v5.set_task("0xCAC79E12")
    sq_vexcloud_ruins__pilot.drop_squad(sq_wave3_v5)
    sc_fade_ruins.restart()
    sleep_until(sq_wave4_v5.alive_count() <= 1)
    sq_wave3_v4.set_task("0xEACB25D1")
    sq_wave3_v5.set_task("0xEACB25D1")
    sq_wave4_v5.set_task("0xEC6A4326")
    sleep_until(sq_wave4_v2.alive_count() + sq_wave3_v1.alive_count() + sq_wave3_v2.alive_count() + sq_wave3_v3.alive_count() + sq_wave3_v4.alive_count() + sq_wave3_v5.alive_count() + sq_wave4_v5.alive_count() == 0)
    defend_clear = true

# a cloud opens, takes its squad's task and drops it
def cloud_drop(cloud, sq, task):
    cloud.place()
    sq.set_task(task)
    cloud.drop_squad(sq)

# each cloud fades seven seconds after it opens (6.2 to 7.3 s in the run)
script sc_fade_dome1():
    sleep(7)
    sq_vexcloud_dome1__pilot.remove()

script sc_fade_dome2():
    sleep(7)
    sq_vexcloud_dome2__pilot.remove()

script sc_fade_gate1():
    sleep(7)
    sq_vexcloud_gate1__pilot.remove()

script sc_fade_gate2():
    sleep(7)
    sq_vexcloud_gate2__pilot.remove()

script sc_fade_square():
    sleep(7)
    sq_vexcloud_square__pilot.remove()

script sc_fade_ruins():
    sleep(7)
    sq_vexcloud_ruins__pilot.remove()
