@activity_bundle("enc_ruins_strike1")

objective obj_ruins_strike_entrance
@member_counts({all: 3})
@objective(obj_ruins_strike_entrance)
squad sq_ruins_ledge01
@member_counts({all: 3})
@objective(obj_ruins_strike_entrance)
squad sq_ruins_ledge02
@member_counts({all: 3})
@objective(obj_ruins_strike_entrance)
squad sq_ruins_ledge03
@member_counts({all: 3})
@objective(obj_ruins_strike_entrance)
squad sq_ruins_ledge04
trigger_volume tv_ledge
player_trigger pt_ledge bind(tv_ledge)
loot_ruins loot_venus_ruins_1



@startup()
script sc_main_thread():
    sc_ledge_encounter.wake()

script sc_ledge_encounter():
    sleep_until(pt_ledge.is_triggered())
    sq_ruins_ledge01.place()
    sq_ruins_ledge02.place()
    sq_ruins_ledge03.place()
    sq_ruins_ledge04.place()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B801B
