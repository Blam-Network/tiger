# es\cosmo\dome_hive\enc_dome_hive_portal2.es
#
# The second Cosmodrome strike's dome_hive (private bubble 10): the Ghost's
# scan point at the gate, then the witch and the Hive on the hillside. Each
# wave comes in off a volume on the way down: the witch at the first, the
# Thrall on the ground at the second, a squad at a time, and the hillside's
# troopers and Ogre at the third, with the witch moving between her posts as
# they come. Mission 6 reads the hillside and the witch.
#
# From two 2.3.1 runs, which agree with TU0's task lists by influencer for
# every task here but the troopers' (influencer 11 against TU0's 10). The
# witch's doppelgangers, the Knights and the battle's Thrall never came in
# 2.3.1 (it brought a boss and adds TU0 does not have instead), so they are
# left alone.

@activity_bundle("enc_dome_hive_portal2")

interactable_placement pf_strike_ghost02 bind("0xAF65BC8D")
objective obj_witch_intro
squad sq_bossbattle_boss01
squad_member sq_bossbattle_boss01__wizard01
squad sq_ground_hive01
squad sq_ground_hive02
squad sq_ground_hive03
squad sq_hillside_hive01
squad sq_hillside_hive02
squad sq_hillside_hive03
squad sq_hillside_hive04
squad_member sq_hillside_hive04__trooper01
squad_member sq_hillside_hive04__trooper02
player_trigger pt_spawn_boss_init
player_trigger pt_spawn_boss_attack01
player_trigger pt_spawn_boss_attack02
player_trigger pt_boss_fight
bool b_boss_placed = false
bool b_hillside_placed = false

@startup()
script sc_dome_hive_main():
    for sq in [sq_bossbattle_boss01, sq_ground_hive01, sq_ground_hive02, sq_ground_hive03, sq_hillside_hive01, sq_hillside_hive02, sq_hillside_hive03, sq_hillside_hive04]:
        sq.set_objective(obj_witch_intro)

@startup()
# the witch shows herself a second after the first volume
script sc_witch():
    sleep_until(pt_spawn_boss_init.is_triggered())
    sleep(1)
    place_on_task(sq_bossbattle_boss01, "0xEFF40392")
    b_boss_placed = true

@startup()
script sc_ground():
    sleep_until(pt_spawn_boss_attack01.is_triggered())
    sleep(4)
    place_on_task(sq_ground_hive01, "0xEFF40391")
    sleep(2)
    sq_bossbattle_boss01.set_task("0xEFF40393")
    sleep(1.5)
    place_on_task(sq_ground_hive02, "0xEFF40391")
    sleep(3.5)
    place_on_task(sq_ground_hive03, "0xEFF40391")

@startup()
# the hillside's troopers and Ogre, the witch to her last post among them;
# the second 2.3.1 run brought them 20.7 s after the volume (the first 3.4 s)
# with the same spacing after the first squad, so what else they wait on is
# not on the wire
script sc_hillside():
    sleep_until(pt_spawn_boss_attack02.is_triggered())
    sleep(3.5)
    place_on_task(sq_hillside_hive02, "0xA33DBF3E")
    sleep(1.5)
    place_on_task(sq_hillside_hive03, "0xA33DBF3E")
    sq_bossbattle_boss01.set_task("0xDB85920E")
    sleep(2.5)
    place_on_task(sq_hillside_hive01, "0xE1E7FD99")
    b_hillside_placed = true
    # the last squad came with two of its three troopers in 2.3.1
    sleep(5)
    sq_hillside_hive04.set_task("0xA33DBF3E")
    sq_hillside_hive04__trooper01.place()
    sq_hillside_hive04__trooper02.place()

# a try at the fight after a wipe: the players are back in the arena, past
# the volumes, and the witch comes at once to her last post (2.3.1's boss
# was in 0.3 s into each retry)
script sc_witch_return():
    place_on_task(sq_bossbattle_boss01, "0xDB85920E")
    b_boss_placed = true

def hillside_alive_count():
    return sq_hillside_hive01.alive_count() + sq_hillside_hive02.alive_count() + sq_hillside_hive03.alive_count() + sq_hillside_hive04.alive_count()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
