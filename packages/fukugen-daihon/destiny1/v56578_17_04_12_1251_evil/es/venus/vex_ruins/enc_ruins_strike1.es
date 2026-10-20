# es\venus\vex_ruins\enc_ruins_strike1.es
#
# The way into the vex ruins. The ledge squads come in when a player
# reaches the ledge.

@activity_bundle("enc_ruins_strike1")

trigger_volume tv_ledge
player_trigger pt_ledge bind(tv_ledge)
@member_counts({all: 3}) squad sq_ruins_ledge01
@member_counts({all: 3}) squad sq_ruins_ledge02
@member_counts({all: 3}) squad sq_ruins_ledge03
@member_counts({all: 3}) squad sq_ruins_ledge04

@startup()
script sc_main_thread():
    sc_ledge_encounter.wake()

script sc_ledge_encounter():
    sleep_until(pt_ledge.is_triggered())
    sq_ruins_ledge01.place()
    sq_ruins_ledge02.place()
    sq_ruins_ledge03.place()
    sq_ruins_ledge04.place()
