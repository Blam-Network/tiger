@activity_bundle("enc_south_tides_ch2m3")
u_globals utils
c_location_sensor_host southern_tides  # true name unknown
c_player_monitor_sensor_host pm_bubble_southern_tides bind(southern_tides)  # true name unknown
c_objective_sensor_host obj_south_tides_ch2m3  # true name unknown
c_squad_sensor_host sq_fallen01
c_squad_sensor_host sq_fallen02
c_squad_sensor_host sq_fallen03
c_squad_sensor_host sq_fallen04
c_squad_sensor_host sq_fallen05
c_squad_sensor_host sq_fallen_dropship
c_squad_member_sensor_host sq_fallen_dropship__pilot  # true name unknown
c_squad_group_sensor_host sqg_fallen  # true name unknown
c_trigger_volume_slot_host tv_fallen_fallback01
c_player_trigger_sensor_host pt_fallen_fallback01 bind(tv_fallen_fallback01)  # true name unknown
c_trigger_volume_slot_host tv_fallen_fallback02
c_player_trigger_sensor_host pt_fallen_fallback02 bind(tv_fallen_fallback02)  # true name unknown
c_trigger_volume_slot_host tv_fallen_drop
c_player_trigger_sensor_host pv_fallen_drop bind(tv_fallen_drop)  # true name unknown
c_control_point_set_sensor_host fallen_dropship01_enter  # true name unknown
c_control_point_set_sensor_host fallen_dropship01_next  # true name unknown
c_control_point_set_sensor_host fallen_dropship01_exit  # true name unknown
bool bfront = true
bool text_dialog = true
interactable_placement ch2m3_interactable bind("ch2m3_interactable")
loot_south_tides loot_venus_south_tides_1











startup thread ss_south_tides_ch2m3:
    print("script startup")
    sqg_fallen.add_child(sq_fallen01)
    sqg_fallen.add_child(sq_fallen02)
    sqg_fallen.add_child(sq_fallen03)
    sqg_fallen.add_child(sq_fallen04)
    sqg_fallen.add_child(sq_fallen05)

    sc_node01_fallback_trigger.wake()
    sc_fallen_dropship.wake()



thread sc_fallen_dropship:
    sq_fallen_dropship.place()
    sq_fallen_dropship__pilot.execute(fallen_dropship01_enter); sleep_until(sq_fallen_dropship__pilot.get_command_script_state() != e_command_script_state.executing)
    print("DROPSHIP PLACED")
    sleep_until(pv_fallen_drop.is_triggered())
    print("DROPPING SQUADS1")
    sq_fallen02.place()
    sq_fallen01.place()
    sq_fallen_dropship__pilot.execute(fallen_dropship01_next); sleep_until(sq_fallen_dropship__pilot.get_command_script_state() != e_command_script_state.executing)
    sq_fallen_dropship__pilot.execute(cs_dropship_open_doors()); sleep_until(sq_fallen_dropship__pilot.get_command_script_state() != e_command_script_state.executing)
    sq_fallen_dropship__pilot.drop_squad(sq_fallen03); sleep_until(not sq_fallen_dropship__pilot.is_dropping())
    sq_fallen_dropship__pilot.drop_squad(sq_fallen04); sleep_until(not sq_fallen_dropship__pilot.is_dropping())
    sq_fallen_dropship__pilot.drop_squad(sq_fallen05); sleep_until(not sq_fallen_dropship__pilot.is_dropping())
    sleep(5)
    sq_fallen_dropship__pilot.execute(cs_dropship_close_doors()); sleep_until(sq_fallen_dropship__pilot.get_command_script_state() != e_command_script_state.executing)
    sq_fallen_dropship__pilot.execute(fallen_dropship01_exit); sleep_until(sq_fallen_dropship__pilot.get_command_script_state() != e_command_script_state.executing)
    sq_fallen_dropship.remove()

thread sc_node01_fallback_trigger:
    sleep_until(pt_fallen_fallback01.is_triggered() or pt_fallen_fallback02.is_triggered())
    bfront = false
    print("FALLBACK TRIGGER")



command_script cs_dropship_open_doors():
    set_channel_scalar("doors", 1)
command_script cs_dropship_close_doors():
    set_channel_scalar("doors", 0)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8011
