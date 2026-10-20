@activity_bundle("enc_south_tides_ch2m3")

u_globals utils
location southern_tides
player_monitor pm_bubble_southern_tides bind(southern_tides)
@task(0xC8E719E3, squad: sqg_fallen)
@task(0x29FEA8EC, condition: bfront)
@task("front", condition: bfront)
objective obj_south_tides_ch2m3
@member_counts({raider: 1})
@objective(obj_south_tides_ch2m3)
squad sq_fallen01
@member_counts({dreg_4: 4})
@objective(obj_south_tides_ch2m3)
squad sq_fallen02
@member_counts({cell_1: 2})
@objective(obj_south_tides_ch2m3)
squad sq_fallen03
@member_counts({raider: 1, shank: 1})
@objective(obj_south_tides_ch2m3)
squad sq_fallen04
@member_counts({cell_1: 2})
@objective(obj_south_tides_ch2m3)
squad sq_fallen05
@member_counts({pilot: 0})
squad sq_fallen_dropship
squad_member sq_fallen_dropship__pilot
squad_group sqg_fallen
trigger_volume tv_fallen_fallback01
player_trigger pt_fallen_fallback01 bind(tv_fallen_fallback01)
trigger_volume tv_fallen_fallback02
player_trigger pt_fallen_fallback02 bind(tv_fallen_fallback02)
trigger_volume tv_fallen_drop
player_trigger pv_fallen_drop bind(tv_fallen_drop)
control_point_set fallen_dropship01_enter
control_point_set fallen_dropship01_next
control_point_set fallen_dropship01_exit
bool bfront = true
bool text_dialog = true
interactable_placement ch2m3_interactable bind("ch2m3_interactable")
loot_south_tides loot_venus_south_tides_1











@startup()
script ss_south_tides_ch2m3():
    print("script startup")
    sqg_fallen.add_child(sq_fallen01)
    sqg_fallen.add_child(sq_fallen02)
    sqg_fallen.add_child(sq_fallen03)
    sqg_fallen.add_child(sq_fallen04)
    sqg_fallen.add_child(sq_fallen05)

    sc_node01_fallback_trigger.wake()
    sc_fallen_dropship.wake()



script sc_fallen_dropship():
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

script sc_node01_fallback_trigger():
    sleep_until(pt_fallen_fallback01.is_triggered() or pt_fallen_fallback02.is_triggered())
    bfront = false
    print("FALLBACK TRIGGER")



command_script cs_dropship_open_doors():
    set_channel_scalar("doors", 1)
command_script cs_dropship_close_doors():
    set_channel_scalar("doors", 0)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8011
