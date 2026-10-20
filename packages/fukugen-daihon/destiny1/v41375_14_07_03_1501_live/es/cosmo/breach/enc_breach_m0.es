# es\cosmo\breach\enc_breach_m0.es
#
# The breach in A Guardian Rises: the Fallen in the wall, the Ghost's
# light-up, the weapon chest, the gates, and each wave of Fallen on its trigger.
# Night falls when the garage fight starts.
# Names that were never cracked are written as "0x" literals.

@activity_bundle("enc_breach_m0")

squad sq_fallen_nest1
squad_member sq_fallen_nest1__dropper1
performance dropper1
squad_member sq_fallen_nest1__crawler1
performance crawler1
squad_member sq_fallen_nest1__crawler2
performance crawler2
squad_member sq_fallen_nest1__crawler3
performance crawler3
squad_member sq_fallen_nest1__crawler4
performance crawler4
squad_member sq_fallen_nest1__crawler5
performance crawler5
squad_member sq_fallen_nest1__swinger1
performance swinger1
squad_member sq_fallen_nest1__runner1
performance runner1
squad sq_fallen_nest2
squad_member sq_fallen_nest2__crawler6
performance crawler6
squad_member sq_fallen_nest2__crawler7
performance crawler7
squad_member sq_fallen_nest2__runner3
performance runner3
squad_member sq_fallen_nest2__runner4
performance runner4
squad_member sq_fallen_nest2__shank1
performance shank1
squad_member sq_fallen_nest2__shank2
performance shank2
@member_counts({vandal: 1})
squad sq_fallen_first_vandal
objective obj_breach_fallen01
squad sq_fallen_bouncedown_a
squad sq_fallen_bouncedown_c
squad sq_fallen_wall_l_a
squad sq_fallen_floor_a
squad sq_fallen_floor_b
squad sq_fallen_wall_r_b
squad sq_fallen_wall_l_b
squad sq_fallen_dropdown_c
squad sq_fallen_wall_l_c
squad sq_fallen_floor_c
squad sq_fallen_dropdown_e
squad sq_fallen_dropdown_f
squad sq_fallen_floor_f
squad sq_fallen_wall_r_f
squad sq_fallen_dropdown_g
squad sq_fallen_wall_l_g
@member_counts({dreg: 1, dreg_1: 1})
squad sq_fallen_h
squad sq_fallen_1c
squad sq_fallen_2
squad sq_fallen_bridge
squad sq_fallen_sniper
squad sq_fallen_garage_obj
squad sq_fallen_garage_melee
squad sq_fallen_garage_vandals_2
squad sq_fallen_garage_vandals_3
@member_counts({dregs: 1, dregs_1: 1, vandal: 1})
squad sq_fallen_garage_exit
location breach
player_trigger pt_bubble bind(breach)
object o_breach_gating_lights
object o_fallen_tripwire_1
object o_fallen_tripwire_2
object o_fallen_tripwire_3
object o_fallen_tripwire_4
object o_fallen_tripwire_5
object o_fallen_tripwire_6
object o_fallen_tripwire_7
object o_chest_primary_weapon
object o_device_invis_light
object o_floor_grate_2a
object o_floor_grate_2b
player_trigger pt_nux_first_fallen_wall_climb
squad_member sq_fallen_nest2__crawler8
performance crawler8
player_trigger pt_nux_ghost_light_up_start
object o_breach_nut_back
squad sq_nux_ghost
squad_member sq_nux_ghost__ghost
performance nux_ghost
object_filter of_ghostlight
hop_on ho_ghostlight
object o_breach_gating_back
object o_breach_control
player_trigger pt_fallen_1b_spawn
player_trigger pt_fallen_c_spawn
squad_member sq_fallen_bouncedown_c__vandal_blade
sequence seq_fallen_intro_vandal_drop
squad_member sq_fallen_wall_l_c__dreg
sequence seq_fallen_vault_right
player_trigger pt_fallen_melee
squad_member sq_fallen_dropdown_e__dreg
sequence seq_breach_fallen_drop
player_trigger pt_fallen_arena_spawn
squad_member sq_fallen_1c__dreg
squad_member sq_fallen_2__dreg_a
squad_member sq_fallen_2__dreg_b
object o_breach_cables
player_trigger pt_corr_spawn_b
squad_member sq_fallen_dropdown_f__dreg
squad_member sq_fallen_dropdown_f__dreg1
player_trigger pt_corr_spawn_b_melee
squad_member sq_fallen_floor_f__dreg
sequence seq_breach_fallen_grate_intro
squad_member sq_fallen_wall_r_f__dreg
sequence seq_fallen_vault_left
player_trigger pt_corr_spawn_b_rear
squad_member sq_fallen_dropdown_g__dreg
squad_member sq_fallen_wall_l_g__dreg
player_trigger pt_fallen_vandal_spawn
squad_member sq_fallen_garage_vandals_2__vandal_2
squad_member sq_fallen_garage_vandals_3__vandal_3
squad_member sq_fallen_garage_melee__dreg1
squad_member sq_fallen_garage_melee__dreg2
squad_member sq_fallen_garage_melee__dreg3
player_trigger pt_fallen_3_spawn
c_command_script __cs  # true name unknown

@startup()
script sc_breach_main():
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

script sc_breach_objects():
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

script sc_nest_wall_climb():
    sleep_until(pt_nux_first_fallen_wall_climb.is_triggered())
    sq_fallen_nest2__crawler8.place()
    crawler8.start_performance("0x74E80629")
    crawler8.cue_performance("begin_action")
    sleep(3)
    enter(sq_fallen_nest2__crawler8, "delete_self")

script sc_nest_scatter():
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

script sc_ghost_light_up():
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

script sc_fallen_first_vandal():
    sleep_until(pt_fallen_1b_spawn.is_triggered())
    sq_fallen_first_vandal.activate_temperament("temper_combat_flee")
    sq_fallen_first_vandal.set_task("drop_downs_anchor_fallback")
    sq_fallen_first_vandal.place()

script sc_fallen_c():
    sleep_until(pt_fallen_c_spawn.is_triggered())
    sq_fallen_bouncedown_c.set_task("0xAE2DC12E")
    sq_fallen_bouncedown_c.place()
    enter(sq_fallen_bouncedown_c__vandal_blade, "act_fallen_intro_vandal_drop", seq_fallen_intro_vandal_drop)
    sq_fallen_wall_l_c.set_task("drop_downs_b")
    sq_fallen_wall_l_c.place()
    enter(sq_fallen_wall_l_c__dreg, "act_fallen_vault_right", seq_fallen_vault_right)

script sc_fallen_melee():
    sleep_until(pt_fallen_melee.is_triggered())
    sq_fallen_dropdown_e.set_task("drop_downs_melee")
    sq_fallen_dropdown_e.place()
    enter(sq_fallen_dropdown_e__dreg, "fallen_drop", seq_breach_fallen_drop)

script sc_fallen_arena():
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

script sc_fallen_corridor_b():
    sleep_until(pt_corr_spawn_b.is_triggered())
    sq_fallen_dropdown_f.set_task("drop_downs_c")
    sq_fallen_dropdown_f.place()
    enter(sq_fallen_dropdown_f__dreg, "fallen_drop")
    enter(sq_fallen_dropdown_f__dreg1, "fallen_drop")

script sc_fallen_corridor_b_melee():
    sleep_until(pt_corr_spawn_b_melee.is_triggered())
    sq_fallen_floor_f.set_task("drop_downs_f_rear")
    sq_fallen_floor_f.place()
    enter(sq_fallen_floor_f__dreg, "act_fallen_intro_grate_climb", seq_breach_fallen_grate_intro)
    sq_fallen_wall_r_f.set_task("drop_downs_f_rear")
    sq_fallen_wall_r_f.place()
    enter(sq_fallen_wall_r_f__dreg, "act_fallen_vault_left", seq_fallen_vault_left)

script sc_fallen_corridor_b_rear():
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

script sc_fallen_garage():
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

script sc_chest_primary_weapon():
    delete_when_destroyed(o_chest_primary_weapon)

script sc_fallen_tripwire_1():
    delete_when_destroyed(o_fallen_tripwire_1)

script sc_fallen_tripwire_2():
    delete_when_destroyed(o_fallen_tripwire_2)

script sc_fallen_tripwire_3():
    delete_when_destroyed(o_fallen_tripwire_3)

script sc_fallen_tripwire_4():
    delete_when_destroyed(o_fallen_tripwire_4)

script sc_fallen_tripwire_5():
    delete_when_destroyed(o_fallen_tripwire_5)

script sc_fallen_tripwire_6():
    delete_when_destroyed(o_fallen_tripwire_6)

script sc_fallen_tripwire_7():
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
