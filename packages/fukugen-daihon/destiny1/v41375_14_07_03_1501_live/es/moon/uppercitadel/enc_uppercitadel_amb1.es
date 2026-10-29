# es\moon\uppercitadel\enc_uppercitadel_amb1.es
#
# The upper citadel's ambient layer (the Moon's private bubble 12, from the
# hellmouth's gate to the chain rooms), loaded by the Moon patrol and the
# Moon story missions that pass through it: the door held open and the
# Hive on the overlook, in the hall, the caves and both chain rooms, all
# placed as the bubble loads.
#
# From one run, the Moon patrol (Patrol Luna of 2026-10-28), which went
# through the bubble twice: every squad was placed within a second of the
# player's first arrival with the door already open, and none was placed
# again; on the second visit, 11 minutes on, the ones left standing were
# still there. Bodies are the ones the server placed; tasks are the
# objective's, matched by influencer (TU0's list is 2.3.1's). The squads'
# later moves between tasks were their own (the objective's), not the
# script's.

@activity_bundle("enc_uppercitadel_amb1")

object o_door_dummy
objective obj_uppercitadel_amb1
@member_counts({trooper: 3})
squad sq_up_overlook_support1
@member_counts({trooper: 3})
squad sq_up_overlook_support2
@member_counts({thrall: 3})
squad sq_up_hall_support1
@member_counts({wizard: 1})
squad sq_up_chainroom_anchor1
@member_counts({trooper: 3})
squad sq_up_chainroom_support1
@member_counts({trooper: 3})
squad sq_up_chainroom_support2
@member_counts({trooper: 3})
squad sq_up_chainroom_support3
@member_counts({thrall: 3})
squad sq_mid_cave_support1
@member_counts({thrall: 3})
squad sq_mid_cave_support2
@member_counts({knight_boomer: 1})
squad sq_dn_chainroom_anchor1
@member_counts({trooper: 3})
squad sq_dn_chainroom_support1
@member_counts({trooper: 3})
squad sq_dn_chainroom_support2

@startup()
script sc_main_thread():
    o_door_dummy.create()
    o_door_dummy.set_device_position(1)
    place_on_task(sq_up_overlook_support1, "0x5D21DD10")
    place_on_task(sq_up_overlook_support2, "0x5D21DD10")
    place_on_task(sq_up_hall_support1, "0x446B928B")
    place_on_task(sq_up_chainroom_anchor1, "0x0832341E")
    place_on_task(sq_up_chainroom_support1, "0xC0E913FE")
    place_on_task(sq_up_chainroom_support2, "0xF1AF1F1C")
    place_on_task(sq_up_chainroom_support3, "0xBBA13819")
    place_on_task(sq_mid_cave_support1, "0x61ACA8A2")
    place_on_task(sq_mid_cave_support2, "0x61ACA8A2")
    place_on_task(sq_dn_chainroom_anchor1, "0x27779121")
    place_on_task(sq_dn_chainroom_support1, "0xEE919028")
    place_on_task(sq_dn_chainroom_support2, "0xEE919028")

def place_on_task(sq, task):
    sq.set_objective(obj_uppercitadel_amb1)
    sq.set_task(task)
    sq.place()
