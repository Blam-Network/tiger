c_squad_sensor_host sq_downstairs_shanks
c_squad_sensor_host sq_downstairs_melee
c_squad_sensor_host sq_downstairs01
c_squad_sensor_host sq_downstairs02
c_squad_sensor_host sq_back_mc
c_squad_sensor_host sq_anchor_vault01
c_squad_sensor_host sq_anchor_vault02
c_squad_sensor_host sq_upper_sniper
c_squad_sensor_host sq_sniper03
c_squad_group_sensor_host sqg_downstairs  # true name unknown
c_squad_group_sensor_host sqg_upstairs  # true name unknown
c_squad_group_sensor_host sqg_anchor_vault  # true name unknown
c_objective_sensor_host obj_archive_amb1  # true name unknown
c_trigger_volume_slot_host tv_archive01
c_trigger_volume_slot_host tv_back_mc01
c_trigger_volume_slot_host tv_back_mc02
c_player_trigger_sensor_host pt_archive01 bind(tv_archive01)  # true name unknown
c_player_trigger_sensor_host pt_back_mc01 bind(tv_back_mc01)  # true name unknown
c_player_trigger_sensor_host pt_back_mc02 bind(tv_back_mc02)  # true name unknown
bool can_advance
loot_archive loot_venus_archive











startup thread ss_main_thread:

    print("---------------------------------------------------------")
    print("ACADEMY ARCHIVE ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")


    sqg_downstairs.add_child(sq_downstairs_shanks)
    sqg_downstairs.add_child(sq_downstairs01)
    sqg_downstairs.add_child(sq_downstairs02)
    sqg_downstairs.add_child(sq_back_mc)
    sqg_anchor_vault.add_child(sq_anchor_vault01)
    sqg_anchor_vault.add_child(sq_anchor_vault02)

    sc_init_squads.wake()
    sc_back_mc.wake()

thread sc_init_squads:

    sqg_anchor_vault.respawn()
    sq_upper_sniper.respawn()
    sq_downstairs_shanks.respawn()

    sleep_until(pt_archive01.is_triggered())
    can_advance = true
    sq_downstairs01.respawn()
    sq_downstairs02.respawn()

thread sc_back_mc:

    sleep_until(pt_back_mc01.is_triggered() or pt_back_mc02.is_triggered())
    sq_back_mc.respawn()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8002
