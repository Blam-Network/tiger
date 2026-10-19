@activity_bundle("enc_ketch_bay_amb1")

@task("equipment_room", squad: sqg_equipment)
@task("control_room", squad: sqg_control)
@task(0xAD141C5E, squad: sq_control_anchor, condition: is_player_in_pm_anchor)
@task(0x55E1B71C, squad: sq_control_anchor)
@task(0x4D7B1CFE, squad: sq_control01)
@task(0x4E407B7A, squad: sq_control02)
@task(0x36A1AEFF, squad: sq_control_right_mc)
@task("throne", squad: sqg_throne)
@task(0xA5B8C907, condition: is_body_count_reached)
@task("captain", squad: sq_throne_captain)
@task(0xA422EB12, squad: sq_throne_back)
@task("advance", condition: can_advance)
@task("mid", squad: sq_throne_mid)
@task("right_hall", squad: sq_right_hall)
c_objective_sensor_host obj_ketch_bay_amb1  # true name unknown
@member_counts({shank: 2, vandal: 1})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_equipment01
@member_counts({dreg: 2, vandal: 1})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_equipment02
@member_counts({dreg: 3})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_equipment03
@member_counts({dreg: 2, vandal: 2})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_right_hall
@member_counts({captain: 1})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_control_anchor
@member_counts({dreg: 2, shank: 2})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_control01
@member_counts({shanks: 2, vandals: 2})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_control02
@member_counts({dregs: 3, servitor: 1})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_control03
@member_counts({dregs: 2, vandals: 1})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_control_right_mc
@member_counts({shanks: 2, vandals: 1})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_control_left_mc
@member_counts({dregs: 4})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_throne_front
@member_counts({vandals: 2})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_throne_mid
@member_counts({vandals: 2})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_throne_back
@member_counts({captain: 1})
@objective(obj_ketch_bay_amb1)
c_squad_sensor_host sq_throne_captain
c_squad_group_sensor_host sqg_equipment  # true name unknown
c_squad_group_sensor_host sqg_control  # true name unknown
c_squad_group_sensor_host sqg_throne  # true name unknown
c_trigger_volume_slot_host tv_spawn01
c_trigger_volume_slot_host tv_spawn02
c_trigger_volume_slot_host tv_anchor
c_trigger_volume_slot_host tv_right_mc
c_trigger_volume_slot_host tv_left_mc
c_trigger_volume_slot_host tv_throne
c_player_trigger_sensor_host pt_spawn01 bind(tv_spawn01)  # true name unknown
c_player_trigger_sensor_host pt_spawn02 bind(tv_spawn02)  # true name unknown
c_player_trigger_sensor_host pt_right_mc bind(tv_right_mc)  # true name unknown
c_player_trigger_sensor_host pt_left_mc bind(tv_left_mc)  # true name unknown
c_player_trigger_sensor_host pt_throne bind(tv_throne)  # true name unknown
c_player_monitor_sensor_host pm_anchor bind(tv_anchor)  # true name unknown
bool is_body_count_reached
bool can_advance
bool is_player_in_pm_anchor
bool is_right_mc_active = true
bool is_left_mc_active = true
loot_ketch loot_venus_ketch_1



















startup thread ss_main_thread:

    sleep(3)
    print("---------------------------------------------------------")
    print("KETCH BAY ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")

    sqg_equipment.add_child(sq_equipment01)
    sqg_equipment.add_child(sq_equipment02)
    sqg_equipment.add_child(sq_equipment03)

    sqg_control.add_child(sq_control_anchor)
    sqg_control.add_child(sq_control01)
    sqg_control.add_child(sq_control02)
    sqg_control.add_child(sq_control03)
    sqg_control.add_child(sq_control_right_mc)
    sqg_control.add_child(sq_control_left_mc)

    sqg_throne.add_child(sq_throne_front)
    sqg_throne.add_child(sq_throne_mid)
    sqg_throne.add_child(sq_throne_back)
    sqg_throne.add_child(sq_throne_captain)

    sc_equipment_room.wake()
    sc_control_room.wake()
    sc_control_anchor.wake()
    sc_throne.wake()


thread sc_equipment_room:

    sq_equipment01.respawn()
    sleep_until(pt_spawn01.is_triggered())
    sq_equipment02.respawn()
    sq_right_hall.respawn()
    sleep_until(sqg_equipment.alive_count() <= 3)
    sq_equipment03.respawn()

thread sc_control_room:

    sq_control_anchor.respawn()
    sq_control01.respawn()
    sq_control02.respawn()
    sq_control03.respawn()

    mc_count = 0

    while mc_count < 2:
        sleep(1)

        if pt_right_mc.is_triggered() and is_right_mc_active:
            sq_control_right_mc.respawn()
            is_right_mc_active = false
            mc_count = mc_count + 1

        if pt_left_mc.is_triggered() and is_left_mc_active:
            sq_control_left_mc.respawn()
            is_left_mc_active = false
            mc_count = mc_count + 1

thread sc_control_anchor:

    while true:
        sleep(1)
        if pm_anchor.test_any_inside():
            is_player_in_pm_anchor = true
        else:
            is_player_in_pm_anchor = false

thread sc_throne:

    sq_throne_captain.respawn()
    sleep_until(pt_spawn02.is_triggered())
    sq_throne_front.respawn()
    sq_throne_mid.respawn()
    sq_throne_back.respawn()
    sleep_until(pt_throne.is_triggered())
    can_advance = true
    sleep_until(sq_throne_back.alive_count() <= 0)
    is_body_count_reached = true

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B800C
