# es\mars\catacombs\enc_catacombs_m07.es
#
# The Black Garden's catacombs: the goblins in the hall hold their ground
# from the start, the anchors come in behind the player in the hall, the
# harpies warp into the pit on its cloud, and the foyer's minotaur and
# goblins come on at its door. The foyer hobgoblin comes back once after
# it dies and the minotaur follows it. From one retail capture: where a
# step has no trigger on the wire, the wait is that run's. Task names are
# uncracked and written as hashes.

@activity_bundle("enc_catacombs_m07")

objective obj_catacombs_m07
squad sq_hall_goblin_a
squad sq_hall_goblin_b
squad sq_hall_goblin_c
@member_counts({minotaur: 1})
squad sq_hall_anchor_minotaur
@member_counts({harpy: 2})
squad sq_hall_anchor_harpy
squad sq_pit_cloud
squad_member sq_pit_cloud__pilot
@member_counts({minotaur: 1})
squad sq_pit_minotaur_a
@member_counts({harpy: 1})
squad sq_pit_harpy_a
@member_counts({harpy: 2})
squad sq_pit_harpy_b
@member_counts({harpy: 2})
squad sq_pit_harpy_c
@member_counts({0xB84FD02D: 1, 0xB84FD02E: 1})
squad sq_foyer_hobgoblin
squad sq_foyer_minotaur_a
@member_counts({goblin: 3})
squad sq_foyer_goblin_a
@member_counts({goblin: 3})
squad sq_foyer_goblin_b
sequence seq_vex_announce
player_trigger pt_hall
player_trigger pt_pit
player_trigger pt_foyer
player_trigger pt_foyer_rear

@startup()
script sc_catacombs():
    for sq in [sq_hall_goblin_a, sq_hall_goblin_b, sq_hall_goblin_c, sq_hall_anchor_minotaur, sq_hall_anchor_harpy, sq_pit_minotaur_a, sq_pit_harpy_a, sq_pit_harpy_b, sq_pit_harpy_c, sq_foyer_hobgoblin, sq_foyer_minotaur_a, sq_foyer_goblin_a, sq_foyer_goblin_b]:
        sq.set_objective(obj_catacombs_m07)
    place_on_task(sq_hall_goblin_a, "0xBFDF7B20")
    place_on_task(sq_hall_goblin_b, "0xBFDF7B20")
    sq_pit_minotaur_a.set_task("0x68016B5C")
    place_on_task(sq_foyer_hobgoblin, "0xBB17AE36")
    sq_foyer_goblin_a.set_task("0xA595C500")
    sc_hall.wake()
    sc_pit.wake()
    sc_foyer.wake()

script sc_hall():
    sleep_until(pt_hall.is_triggered())
    sleep(1)
    place_on_task(sq_hall_anchor_harpy, "0xD8918A7C")
    place_on_task(sq_hall_anchor_minotaur, "0xD8918A7C")
    sleep(7)
    sq_hall_anchor_harpy.set_task("0xBFDF7B20")
    sq_hall_anchor_minotaur.set_task("0xBFDF7B20")

script sc_pit():
    sleep_until(pt_pit.is_triggered())
    sleep(1)
    sq_pit_harpy_a.set_task("0x60DAD4A7")
    sq_pit_harpy_b.set_task("0x96F7C1F9")
    sq_pit_harpy_c.set_task("0x96F7C1F9")
    sq_pit_cloud.place()
    for sq in [sq_pit_harpy_a, sq_pit_harpy_b, sq_pit_harpy_c]:
        sq_pit_cloud__pilot.drop_squad(sq)
    sleep_until(not sq_pit_cloud__pilot.is_dropping())
    sq_pit_cloud.remove()

script sc_foyer():
    sleep_until(pt_foyer.is_triggered())
    sleep(1)
    sq_foyer_goblin_b.set_task("0xA595C500")
    place_on_task(sq_foyer_minotaur_a, "0x4CE48FF3")
    seq_vex_announce.start()
    sleep_until(sq_foyer_hobgoblin.alive_count() == 0)
    sleep(1)
    place_on_task(sq_foyer_hobgoblin, "0x189107E2")
    sleep_until(sq_foyer_hobgoblin.alive_count() > 0)
    sleep(1)
    sq_foyer_minotaur_a.set_task("0x3B998BA4")

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
