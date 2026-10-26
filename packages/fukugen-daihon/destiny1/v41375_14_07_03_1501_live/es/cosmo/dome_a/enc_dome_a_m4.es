# es\cosmo\dome_a\enc_dome_a_m4.es
#
# The Last Array's dome_a: Hive and Fallen fighting on the upper floor as the
# player passes through on the way to the Array. Both sides go to their posts
# when a player reaches the upper floor. From two retail runs, one that let
# the two sides fight and one that cleared the Hive first: the moves follow
# the deaths. hive03 comes in once hive02 is dead; the Fallen front falls back
# when one dreg is left, and the Hive push on then if any are still up (only
# the first run had any); the last of hive01 retreats if it gets there before
# that push (only the second); the Fallen fall back to their anchors once two
# of the front, back and sniper are left.

@activity_bundle("enc_dome_a_m4")

objective obj_dome_a_hive_m4
objective obj_dome_a_fallen_m4
player_monitor pm_players_domea_upper02
@member_counts({trooper: 3})
squad sq_hive_upper01
@member_counts({trooper: 2})
squad sq_hive_upper02
@member_counts({trooper: 2})
squad sq_hive_upper03
@member_counts({dreg: 4})
squad sq_fallen_upper_front01
@member_counts({dreg: 2})
squad sq_fallen_upper_back01
@member_counts({vandal: 1})
squad sq_fallen_upper_sniper01
@member_counts({captain: 1, vandal: 2})
squad sq_fallen_upper_anchors01
object o_door01
bool b_hive_pushed = false

@startup()
script sc_dome_a():
    o_door01.create()
    o_door01.set_device_position(1)
    for sq in [sq_hive_upper01, sq_hive_upper02, sq_hive_upper03]:
        sq.set_objective(obj_dome_a_hive_m4)
    for sq in [sq_fallen_upper_front01, sq_fallen_upper_back01, sq_fallen_upper_sniper01, sq_fallen_upper_anchors01]:
        sq.set_objective(obj_dome_a_fallen_m4)
    sleep_until(pm_players_domea_upper02.test_any_inside())
    place_on_task(sq_hive_upper01, "0x185D6C4D")
    place_on_task(sq_hive_upper02, "task_4")
    place_on_task(sq_fallen_upper_front01, "task")
    place_on_task(sq_fallen_upper_back01, "task_1")
    place_on_task(sq_fallen_upper_sniper01, "task_5")
    place_on_task(sq_fallen_upper_anchors01, "0xE52F741B")
    sq_hive_upper03.set_task("task_8")
    sc_hive_reinforcement.wake()
    sc_hive_retreat.wake()
    sc_fallen_fall_back.wake()
    sleep_until(sq_fallen_upper_front01.alive_count() <= 1)
    sq_fallen_upper_front01.set_task("task_4")
    if hive_alive_count() > 0:
        b_hive_pushed = true
        for sq in [sq_hive_upper01, sq_hive_upper02, sq_hive_upper03]:
            sq.set_task("task")

script sc_hive_reinforcement():
    sleep_until(sq_hive_upper02.alive_count() > 0)
    sleep_until(sq_hive_upper02.alive_count() == 0)
    sq_hive_upper03.place()

script sc_hive_retreat():
    sleep_until(sq_hive_upper01.alive_count() <= 1 or b_hive_pushed)
    if not b_hive_pushed:
        sq_hive_upper01.set_task("0xBA28BF7E")

script sc_fallen_fall_back():
    sleep_until(fallen_front_alive_count() <= 2)
    for sq in [sq_fallen_upper_front01, sq_fallen_upper_back01, sq_fallen_upper_sniper01]:
        sq.set_task("0xE52F741B")

def hive_alive_count():
    return sq_hive_upper01.alive_count() + sq_hive_upper02.alive_count() + sq_hive_upper03.alive_count()

def fallen_front_alive_count():
    return sq_fallen_upper_front01.alive_count() + sq_fallen_upper_back01.alive_count() + sq_fallen_upper_sniper01.alive_count()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
