# es\cosmo\dome_a\enc_dome_a_amb1.es
#
# Dome A's ambient layer: Fallen on the upper floor and the loading
# dock, Hive on the lower floor, both at the control set; a Hive squad
# and a thrall scare come in as a player reaches their volumes, and the
# upper Fallen fall back once a player is up with them.
#
# No capture has the patrol in dome A (retail never sent this bundle;
# the door belongs to the story missions, enc_dome_a_m1 opens it). The
# rule is read off the rows and their task names.
#
# A private bubble's world is built again each time a player comes in
# (retail's hangar: both squads back on their first tasks when the
# player came back 340 s after leaving), so these squads are placed
# once, at the load, with no respawn of their own.

@activity_bundle("enc_dome_a_amb1")

object o_door01  # WARNING: unused - the story missions' door (enc_dome_a_m1 creates it in retail)
objective obj_fallen_dome_a01
objective obj_hive_dome_a01
squad sq_fallen_domea_loadingdock01
squad sq_fallen_domea_upper01
squad sq_fallen_domea_upper01b
squad sq_fallen_domea_upper02
squad sq_hive_domea_upper01a
squad sq_hive_domea_upper01b
squad sq_hive_domea_lower01a
squad sq_hive_domea_lower01b
squad sq_hive_domea_lower02
squad sq_hive_domea_lower_scare01
squad sq_hive_domea_ctrlset01
squad sq_fallen_domea_ctrlset01
trigger_volume tv_players_domea_upper01
player_monitor pm_players_domea_upper01 bind(tv_players_domea_upper01)
trigger_volume tv_players_domea_upper02
player_monitor pm_players_domea_upper02 bind(tv_players_domea_upper02)
trigger_volume tv_hive_domea_upper01b_spawn
player_monitor pm_hive_domea_upper01b_spawn bind(tv_hive_domea_upper01b_spawn)
trigger_volume tv_hive_domea_lower_scare01
player_monitor pm_hive_domea_lower_scare01 bind(tv_hive_domea_lower_scare01)
squad_group sqg_hive_domea_lower01
squad_group sqg_hive_domea_upper01
squad_group sqg_fallen_domea_upper
squad_group sqg_fallen_domea_upper_dregs

@startup()
script sc_fallen():
    sqg_fallen_domea_upper.add_child(sq_fallen_domea_upper01)
    sqg_fallen_domea_upper.add_child(sq_fallen_domea_upper02)
    sqg_fallen_domea_upper_dregs.add_child(sq_fallen_domea_upper01b)
    hold(sq_fallen_domea_loadingdock01, obj_fallen_dome_a01, "t_loadingdock01")
    hold(sq_fallen_domea_ctrlset01, obj_fallen_dome_a01, "t_ctrlset01")
    obj_fallen_dome_a01.add_squad(sqg_fallen_domea_upper)
    obj_fallen_dome_a01.add_squad(sqg_fallen_domea_upper_dregs)
    sqg_fallen_domea_upper.place()
    sqg_fallen_domea_upper_dregs.place()
    sleep_until(pm_players_domea_upper01.test_any_inside() or pm_players_domea_upper02.test_any_inside())
    for sq in [sq_fallen_domea_upper01, sq_fallen_domea_upper01b, sq_fallen_domea_upper02]:
        sq.set_task("t_domea_upper01_fallback")

@startup()
script sc_hive():
    for sq in [sq_hive_domea_lower01a, sq_hive_domea_lower01b, sq_hive_domea_lower02]:
        sqg_hive_domea_lower01.add_child(sq)
        hold(sq, obj_hive_dome_a01, "t_domea_lower01_root")
    sqg_hive_domea_upper01.add_child(sq_hive_domea_upper01a)
    sqg_hive_domea_upper01.add_child(sq_hive_domea_upper01b)
    hold(sq_hive_domea_ctrlset01, obj_hive_dome_a01, "t_ctrlset01")
    sq_hive_domea_upper01a.set_objective(obj_hive_dome_a01)
    sq_hive_domea_upper01a.place()
    sleep_until(pm_hive_domea_upper01b_spawn.test_any_inside())
    sq_hive_domea_upper01b.set_objective(obj_hive_dome_a01)
    sq_hive_domea_upper01b.place()

@startup()
script sc_lower_scare():
    sleep_until(pm_hive_domea_lower_scare01.test_any_inside())
    sq_hive_domea_lower_scare01.set_objective(obj_hive_dome_a01)
    sq_hive_domea_lower_scare01.place()

def hold(sq, obj, task):
    sq.set_objective(obj)
    sq.set_task(task)
    sq.place()
