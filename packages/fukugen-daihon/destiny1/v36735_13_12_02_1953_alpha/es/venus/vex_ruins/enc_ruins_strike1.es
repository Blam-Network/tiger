@activity_bundle("enc_ruins_strike1")

c_objective_sensor_host obj_ruins_strike_entrance  # true name unknown
@member_counts({all: 3})
c_squad_sensor_host sq_ruins_ledge01
@member_counts({all: 3})
c_squad_sensor_host sq_ruins_ledge02
@member_counts({all: 3})
c_squad_sensor_host sq_ruins_ledge03
@member_counts({all: 3})
c_squad_sensor_host sq_ruins_ledge04
c_trigger_volume_slot_host tv_ledge
c_player_trigger_sensor_host pt_ledge bind(tv_ledge)  # true name unknown
loot_ruins loot_venus_ruins_1



startup thread sc_main_thread:
    sc_ledge_encounter.wake()

thread sc_ledge_encounter:
    sleep_until(pt_ledge.is_triggered())
    sq_ruins_ledge01.place()
    sq_ruins_ledge02.place()
    sq_ruins_ledge03.place()
    sq_ruins_ledge04.place()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B801B
