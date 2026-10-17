# es\cosmo\breach\enc_breach_m0.es
#
# The breach in A Guardian Rises: the Fallen in the wall, the Ghost's
# light-up, the weapon chest, the gates, and each wave of Fallen on its trigger.
# Night falls when the garage fight starts.
# Names that were never cracked are written as "0x" literals.

@activity_bundle("enc_breach_m0")
c_squad_sensor_host sq_fallen_nest1
c_squad_member_sensor_host sq_fallen_nest1__dropper1  # true name unknown
c_performance_host dropper1  # true name unknown
c_squad_member_sensor_host sq_fallen_nest1__crawler1  # true name unknown
c_performance_host crawler1  # true name unknown
c_squad_member_sensor_host sq_fallen_nest1__crawler2  # true name unknown
c_performance_host crawler2  # true name unknown
c_squad_member_sensor_host sq_fallen_nest1__crawler3  # true name unknown
c_performance_host crawler3  # true name unknown
c_squad_member_sensor_host sq_fallen_nest1__crawler4  # true name unknown
c_performance_host crawler4  # true name unknown
c_squad_member_sensor_host sq_fallen_nest1__crawler5  # true name unknown
c_performance_host crawler5  # true name unknown
c_squad_member_sensor_host sq_fallen_nest1__swinger1  # true name unknown
c_performance_host swinger1  # true name unknown
c_squad_member_sensor_host sq_fallen_nest1__runner1  # true name unknown
c_performance_host runner1  # true name unknown
c_squad_sensor_host sq_fallen_nest2
c_squad_member_sensor_host sq_fallen_nest2__crawler6  # true name unknown
c_performance_host crawler6  # true name unknown
c_squad_member_sensor_host sq_fallen_nest2__crawler7  # true name unknown
c_performance_host crawler7  # true name unknown
c_squad_member_sensor_host sq_fallen_nest2__runner3  # true name unknown
c_performance_host runner3  # true name unknown
c_squad_member_sensor_host sq_fallen_nest2__runner4  # true name unknown
c_performance_host runner4  # true name unknown
c_squad_member_sensor_host sq_fallen_nest2__shank1  # true name unknown
c_performance_host shank1  # true name unknown
c_squad_member_sensor_host sq_fallen_nest2__shank2  # true name unknown
c_performance_host shank2  # true name unknown
@member_counts({vandal: 1})
c_squad_sensor_host sq_fallen_first_vandal
c_objective_sensor_host obj_breach_fallen01  # true name unknown
c_squad_sensor_host sq_fallen_bouncedown_a
c_squad_sensor_host sq_fallen_bouncedown_c
c_squad_sensor_host sq_fallen_wall_l_a
c_squad_sensor_host sq_fallen_floor_a
c_squad_sensor_host sq_fallen_floor_b
c_squad_sensor_host sq_fallen_wall_r_b
c_squad_sensor_host sq_fallen_wall_l_b
c_squad_sensor_host sq_fallen_dropdown_c
c_squad_sensor_host sq_fallen_wall_l_c
c_squad_sensor_host sq_fallen_floor_c
c_squad_sensor_host sq_fallen_dropdown_e
c_squad_sensor_host sq_fallen_dropdown_f
c_squad_sensor_host sq_fallen_floor_f
c_squad_sensor_host sq_fallen_wall_r_f
c_squad_sensor_host sq_fallen_dropdown_g
c_squad_sensor_host sq_fallen_wall_l_g
@member_counts({dreg: 1, dreg_1: 1})
c_squad_sensor_host sq_fallen_h
c_squad_sensor_host sq_fallen_1c
c_squad_sensor_host sq_fallen_2
c_squad_sensor_host sq_fallen_bridge
c_squad_sensor_host sq_fallen_sniper
c_squad_sensor_host sq_fallen_garage_obj
c_squad_sensor_host sq_fallen_garage_melee
c_squad_sensor_host sq_fallen_garage_vandals_2
c_squad_sensor_host sq_fallen_garage_vandals_3
@member_counts({dregs: 1, dregs_1: 1, vandal: 1})
c_squad_sensor_host sq_fallen_garage_exit
c_location_sensor_host breach  # true name unknown
c_player_trigger_sensor_host pt_bubble bind(breach)  # true name unknown
c_object_sensor_host o_breach_gating_lights
c_object_sensor_host o_fallen_tripwire_1
c_object_sensor_host o_fallen_tripwire_2
c_object_sensor_host o_fallen_tripwire_3
c_object_sensor_host o_fallen_tripwire_4
c_object_sensor_host o_fallen_tripwire_5
c_object_sensor_host o_fallen_tripwire_6
c_object_sensor_host o_fallen_tripwire_7
c_object_sensor_host o_chest_primary_weapon
c_object_sensor_host o_device_invis_light
c_object_sensor_host o_floor_grate_2a
c_object_sensor_host o_floor_grate_2b
c_player_trigger_sensor_host pt_nux_first_fallen_wall_climb  # true name unknown
c_squad_member_sensor_host sq_fallen_nest2__crawler8  # true name unknown
c_performance_host crawler8  # true name unknown
c_player_trigger_sensor_host pt_nux_ghost_light_up_start  # true name unknown
c_object_sensor_host o_breach_nut_back
c_squad_sensor_host sq_nux_ghost
c_squad_member_sensor_host sq_nux_ghost__ghost  # true name unknown
c_performance_host nux_ghost  # true name unknown
c_object_filter_sensor_host of_ghostlight
c_hop_on_sensor_host ho_ghostlight  # true name unknown
c_object_sensor_host o_breach_gating_back
c_object_sensor_host o_breach_control
c_player_trigger_sensor_host pt_fallen_1b_spawn  # true name unknown
c_player_trigger_sensor_host pt_fallen_c_spawn  # true name unknown
c_squad_member_sensor_host sq_fallen_bouncedown_c__vandal_blade  # true name unknown
c_sequence_host seq_fallen_intro_vandal_drop  # true name unknown
c_squad_member_sensor_host sq_fallen_wall_l_c__dreg  # true name unknown
c_sequence_host seq_fallen_vault_right  # true name unknown
c_player_trigger_sensor_host pt_fallen_melee  # true name unknown
c_squad_member_sensor_host sq_fallen_dropdown_e__dreg  # true name unknown
c_sequence_host seq_breach_fallen_drop  # true name unknown
c_player_trigger_sensor_host pt_fallen_arena_spawn  # true name unknown
c_squad_member_sensor_host sq_fallen_1c__dreg  # true name unknown
c_squad_member_sensor_host sq_fallen_2__dreg_a  # true name unknown
c_squad_member_sensor_host sq_fallen_2__dreg_b  # true name unknown
c_object_sensor_host o_breach_cables
c_player_trigger_sensor_host pt_corr_spawn_b  # true name unknown
c_squad_member_sensor_host sq_fallen_dropdown_f__dreg  # true name unknown
c_squad_member_sensor_host sq_fallen_dropdown_f__dreg1  # true name unknown
c_player_trigger_sensor_host pt_corr_spawn_b_melee  # true name unknown
c_squad_member_sensor_host sq_fallen_floor_f__dreg  # true name unknown
c_sequence_host seq_breach_fallen_grate_intro  # true name unknown
c_squad_member_sensor_host sq_fallen_wall_r_f__dreg  # true name unknown
c_sequence_host seq_fallen_vault_left  # true name unknown
c_player_trigger_sensor_host pt_corr_spawn_b_rear  # true name unknown
c_squad_member_sensor_host sq_fallen_dropdown_g__dreg  # true name unknown
c_squad_member_sensor_host sq_fallen_wall_l_g__dreg  # true name unknown
c_player_trigger_sensor_host pt_fallen_vandal_spawn  # true name unknown
c_squad_member_sensor_host sq_fallen_garage_vandals_2__vandal_2  # true name unknown
c_squad_member_sensor_host sq_fallen_garage_vandals_3__vandal_3  # true name unknown
c_squad_member_sensor_host sq_fallen_garage_melee__dreg1  # true name unknown
c_squad_member_sensor_host sq_fallen_garage_melee__dreg2  # true name unknown
c_squad_member_sensor_host sq_fallen_garage_melee__dreg3  # true name unknown
c_player_trigger_sensor_host pt_fallen_3_spawn  # true name unknown
c_command_script __cs  # true name unknown

startup thread sc_breach_main:
    sq_fallen_nest1__dropper1.place()
    dropper1.start_performance("act_perch_drop_1")
    sq_fallen_nest1__crawler1.place()
    crawler1.start_performance("act_perch_crawl_2")
    sq_fallen_nest1__crawler2.place()
    crawler2.start_performance("act_perch_crawl_1")
    sq_fallen_nest1__crawler3.place()
    crawler3.start_performance("act_perch_crawl_1")
    sq_fallen_nest1__crawler4.place()
    crawler4.start_performance("act_perch_crawl_1")
    sq_fallen_nest1__crawler5.place()
    crawler5.start_performance("act_perch_crawl_2")
    sq_fallen_nest1__swinger1.place()
    swinger1.start_performance("act_perch_swing_1")
    sq_fallen_nest1__runner1.place()
    runner1.start_performance("act_bridge_run_1")
    sq_fallen_nest2__crawler6.place()
    crawler6.start_performance("act_perch_crawl_2")
    sq_fallen_nest2__crawler7.place()
    crawler7.start_performance("act_perch_crawl_2")
    sq_fallen_nest2__runner3.place()
    runner3.start_performance("act_bridge_run_1")
    sq_fallen_nest2__runner4.place()
    runner4.start_performance("act_bridge_run_1")
    sq_fallen_nest2__shank1.place()
    shank1.start_performance("0xF45284BA")
    sq_fallen_nest2__shank2.place()
    shank2.start_performance("0xF45284B9")
    sq_fallen_first_vandal.set_objective(obj_breach_fallen01)
    sq_fallen_bouncedown_a.set_objective(obj_breach_fallen01)
    sq_fallen_bouncedown_c.set_objective(obj_breach_fallen01)
    sq_fallen_wall_l_a.set_objective(obj_breach_fallen01)
    sq_fallen_floor_a.set_objective(obj_breach_fallen01)
    sq_fallen_floor_b.set_objective(obj_breach_fallen01)
    sq_fallen_wall_r_b.set_objective(obj_breach_fallen01)
    sq_fallen_wall_l_b.set_objective(obj_breach_fallen01)
    sq_fallen_dropdown_c.set_objective(obj_breach_fallen01)
    sq_fallen_wall_l_c.set_objective(obj_breach_fallen01)
    sq_fallen_floor_c.set_objective(obj_breach_fallen01)
    sq_fallen_dropdown_e.set_objective(obj_breach_fallen01)
    sq_fallen_dropdown_f.set_objective(obj_breach_fallen01)
    sq_fallen_floor_f.set_objective(obj_breach_fallen01)
    sq_fallen_wall_r_f.set_objective(obj_breach_fallen01)
    sq_fallen_dropdown_g.set_objective(obj_breach_fallen01)
    sq_fallen_wall_l_g.set_objective(obj_breach_fallen01)
    sq_fallen_h.set_objective(obj_breach_fallen01)
    sq_fallen_1c.set_objective(obj_breach_fallen01)
    sq_fallen_2.set_objective(obj_breach_fallen01)
    sq_fallen_bridge.set_objective(obj_breach_fallen01)
    sq_fallen_sniper.set_objective(obj_breach_fallen01)
    sq_fallen_garage_obj.set_objective(obj_breach_fallen01)
    sq_fallen_garage_melee.set_objective(obj_breach_fallen01)
    sq_fallen_garage_vandals_2.set_objective(obj_breach_fallen01)
    sq_fallen_garage_vandals_3.set_objective(obj_breach_fallen01)
    sq_fallen_garage_exit.set_objective(obj_breach_fallen01)
    sc_breach_objects.wake()
    sc_nest_wall_climb.wake()
    sc_ghost_light_up.wake()
    sc_fallen_first_vandal.wake()
    sc_fallen_c.wake()
    sc_fallen_melee.wake()
    sc_fallen_arena.wake()
    sc_fallen_corridor_b.wake()
    sc_fallen_corridor_b_melee.wake()
    sc_fallen_corridor_b_rear.wake()
    sc_fallen_garage.wake()
    sc_chest_primary_weapon.wake()
    sc_fallen_tripwire_1.wake()
    sc_fallen_tripwire_2.wake()
    sc_fallen_tripwire_3.wake()
    sc_fallen_tripwire_4.wake()
    sc_fallen_tripwire_5.wake()
    sc_fallen_tripwire_6.wake()
    sc_fallen_tripwire_7.wake()

thread sc_breach_objects:
    sleep_until(pt_bubble.is_triggered())
    o_breach_gating_lights.create()
    o_fallen_tripwire_1.create()
    o_fallen_tripwire_2.create()
    o_fallen_tripwire_3.create()
    o_fallen_tripwire_4.create()
    o_fallen_tripwire_5.create()
    o_fallen_tripwire_6.create()
    o_fallen_tripwire_7.create()
    o_chest_primary_weapon.create()
    o_device_invis_light.create()
    o_floor_grate_2a.create()
    o_floor_grate_2b.create()

thread sc_nest_wall_climb:
    sleep_until(pt_nux_first_fallen_wall_climb.is_triggered())
    sq_fallen_nest2__crawler8.place()
    crawler8.start_performance("0x74E80629")
    crawler8.cue_performance("begin_action")
    sleep(3)
    enter(sq_fallen_nest2__crawler8, "delete_self")

thread sc_nest_scatter:
    sleep(6)
    crawler5.cue_performance("begin_action")
    sleep(3)
    enter(sq_fallen_nest1__crawler5, "delete_self")
    sleep(2)
    crawler6.cue_performance("begin_action")
    sleep(4)
    enter(sq_fallen_nest2__crawler6, "delete_self")
    sleep(4)
    crawler3.cue_performance("begin_action")
    sleep(1)
    crawler2.cue_performance("begin_action")
    runner1.cue_performance("begin_action")
    crawler7.cue_performance("begin_action")
    shank2.cue_performance("begin_action")
    runner3.cue_performance("begin_action")
    runner4.cue_performance("begin_action")
    sleep(1)
    dropper1.cue_performance("begin_action")
    shank1.cue_performance("begin_action")
    sleep(1)
    crawler1.cue_performance("begin_action")
    swinger1.cue_performance("begin_action")
    crawler4.cue_performance("begin_action")
    enter(sq_fallen_nest1__crawler3, "delete_self")
    sleep(1)
    enter(sq_fallen_nest1__crawler2, "delete_self")
    enter(sq_fallen_nest2__crawler7, "delete_self")
    sleep(1)
    enter(sq_fallen_nest1__crawler1, "delete_self")
    enter(sq_fallen_nest1__crawler4, "delete_self")
    sleep(6)
    enter(sq_fallen_nest1__runner1, "delete_self")
    enter(sq_fallen_nest2__runner3, "delete_self")
    enter(sq_fallen_nest2__runner4, "delete_self")
    sleep(1)
    enter(sq_fallen_nest2__shank2, "delete_self")
    sleep(1)
    enter(sq_fallen_nest2__shank1, "delete_self")
    sleep(1)
    enter(sq_fallen_nest1__dropper1, "delete_self")
    sleep(1)
    enter(sq_fallen_nest1__swinger1, "delete_self")

thread sc_ghost_light_up:
    sleep_until(pt_nux_ghost_light_up_start.is_triggered())
    o_breach_nut_back.create()
    sq_nux_ghost__ghost.place()
    nux_ghost.start_performance("nux_breach_test")
    of_ghostlight.add(sq_nux_ghost__ghost)
    ho_ghostlight.set_filter(of_ghostlight)
    sc_nest_scatter.wake()
    sleep(1)
    o_breach_gating_back.create()
    sleep(14)
    o_breach_control.create()
    sleep(0.5)
    o_breach_control.set_device_position(1)
    sleep(0.5)
    ho_ghostlight.clear_filter()
    sleep(5)
    nux_ghost.cue_performance("0x7A3E66D9")
    sleep(2)
    o_breach_gating_lights.set_device_position(1)

thread sc_fallen_first_vandal:
    sleep_until(pt_fallen_1b_spawn.is_triggered())
    sq_fallen_first_vandal.activate_temperament("temper_combat_flee")
    sq_fallen_first_vandal.set_task("drop_downs_anchor_fallback")
    sq_fallen_first_vandal.place()

thread sc_fallen_c:
    sleep_until(pt_fallen_c_spawn.is_triggered())
    sq_fallen_bouncedown_c.set_task("0xAE2DC12E")
    sq_fallen_bouncedown_c.place()
    enter(sq_fallen_bouncedown_c__vandal_blade, "act_fallen_intro_vandal_drop", seq_fallen_intro_vandal_drop)
    sq_fallen_wall_l_c.set_task("drop_downs_b")
    sq_fallen_wall_l_c.place()
    enter(sq_fallen_wall_l_c__dreg, "act_fallen_vault_right", seq_fallen_vault_right)

thread sc_fallen_melee:
    sleep_until(pt_fallen_melee.is_triggered())
    sq_fallen_dropdown_e.set_task("drop_downs_melee")
    sq_fallen_dropdown_e.place()
    enter(sq_fallen_dropdown_e__dreg, "fallen_drop", seq_breach_fallen_drop)

thread sc_fallen_arena:
    sleep_until(pt_fallen_arena_spawn.is_triggered())
    sq_fallen_1c.set_task("bridge_rush")
    sq_fallen_2.set_task("bridge_rush")
    sq_fallen_1c.place()
    sq_fallen_2.place()
    enter(sq_fallen_1c__dreg, "fallen_drop")
    enter(sq_fallen_2__dreg_a, "fallen_drop")
    enter(sq_fallen_2__dreg_b, "fallen_drop")
    sq_fallen_first_vandal.set_task("first_vandal")
    o_breach_cables.create()

thread sc_fallen_corridor_b:
    sleep_until(pt_corr_spawn_b.is_triggered())
    sq_fallen_dropdown_f.set_task("drop_downs_c")
    sq_fallen_dropdown_f.place()
    enter(sq_fallen_dropdown_f__dreg, "fallen_drop")
    enter(sq_fallen_dropdown_f__dreg1, "fallen_drop")

thread sc_fallen_corridor_b_melee:
    sleep_until(pt_corr_spawn_b_melee.is_triggered())
    sq_fallen_floor_f.set_task("drop_downs_f_rear")
    sq_fallen_floor_f.place()
    enter(sq_fallen_floor_f__dreg, "act_fallen_intro_grate_climb", seq_breach_fallen_grate_intro)
    sq_fallen_wall_r_f.set_task("drop_downs_f_rear")
    sq_fallen_wall_r_f.place()
    enter(sq_fallen_wall_r_f__dreg, "act_fallen_vault_left", seq_fallen_vault_left)

thread sc_fallen_corridor_b_rear:
    sleep_until(pt_corr_spawn_b_rear.is_triggered())
    sq_fallen_dropdown_g.set_task("drop_downs_f")
    sq_fallen_wall_l_g.set_task("drop_downs_f")
    sq_fallen_dropdown_g.place()
    sq_fallen_wall_l_g.place()
    enter(sq_fallen_dropdown_g__dreg, "fallen_drop")
    enter(sq_fallen_wall_l_g__dreg, "act_fallen_vault_right")
    sleep(1)
    sq_fallen_h.set_task("drop_downs_g")
    sq_fallen_h.place()

thread sc_fallen_garage:
    sleep_until(pt_fallen_vandal_spawn.is_triggered())
    sq_fallen_garage_vandals_2.activate_temperament("temper_combat_no_active_camo")
    sq_fallen_garage_vandals_3.activate_temperament("temper_combat_no_active_camo")
    sq_fallen_garage_vandals_2.set_task("garage_vandals_fallback")
    sq_fallen_garage_vandals_3.set_task("garage_vandals_fallback")
    sq_fallen_garage_melee.set_task("garage_melee_fallback")
    sq_fallen_garage_vandals_2.place()
    sq_fallen_garage_vandals_3.place()
    sq_fallen_garage_melee.place()
    enter(sq_fallen_garage_vandals_2__vandal_2, "act_fallen_intro_vandal_drop")
    enter(sq_fallen_garage_vandals_3__vandal_3, "act_fallen_intro_vandal_drop")
    enter(sq_fallen_garage_melee__dreg1, "fallen_drop")
    enter(sq_fallen_garage_melee__dreg2, "fallen_drop")
    enter(sq_fallen_garage_melee__dreg3, "fallen_drop")
    sleep(1)
    c_lifetime_script_utilities.get_lifetime_sensor().set_time_of_day(0.025)
    sleep_until(pt_fallen_3_spawn.is_triggered())
    sleep_until(sq_fallen_garage_vandals_2.alive_count() + sq_fallen_garage_vandals_3.alive_count() + sq_fallen_garage_melee.alive_count() == 0)
    sq_fallen_garage_exit.set_task("garage_exit")
    sq_fallen_garage_exit.place()

thread sc_chest_primary_weapon:
    delete_when_destroyed(o_chest_primary_weapon)

thread sc_fallen_tripwire_1:
    delete_when_destroyed(o_fallen_tripwire_1)

thread sc_fallen_tripwire_2:
    delete_when_destroyed(o_fallen_tripwire_2)

thread sc_fallen_tripwire_3:
    delete_when_destroyed(o_fallen_tripwire_3)

thread sc_fallen_tripwire_4:
    delete_when_destroyed(o_fallen_tripwire_4)

thread sc_fallen_tripwire_5:
    delete_when_destroyed(o_fallen_tripwire_5)

thread sc_fallen_tripwire_6:
    delete_when_destroyed(o_fallen_tripwire_6)

thread sc_fallen_tripwire_7:
    delete_when_destroyed(o_fallen_tripwire_7)

def enter(actor, sequence, audio):
    __cs.clear()
    __cs.scripted_sequence(sequence)
    actor.execute(__cs)
    if audio:
        audio.start(actor)

def delete_when_destroyed(object):
    sleep_until(object.is_alive())
    sleep_until(not object.is_alive())
    object.delete_object()
