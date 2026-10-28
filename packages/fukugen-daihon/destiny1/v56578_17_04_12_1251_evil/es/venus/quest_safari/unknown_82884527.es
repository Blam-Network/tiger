# es\venus\quest_safari\unknown_82884527.es
#
# quest_safari's Fallen in the warp ruins (bundle 82884527, file name
# unknown; bubble 28, the activity's own): four door squads and the new Vex
# stand under the encounter's objective from the moment the bubble starts,
# with a skiff parked over them. Once a player is well inside, the skiff
# flies off. One retail 2.3.1 run: the rosters and tasks are its, the skiff
# left 1.4 s after the player monitor first counted the player.

@activity_bundle(0x82884527)

objective main_objective
@member_counts({cell_1: 3})
squad sq_door_a
squad sq_door_b
@member_counts({cell_1: 3})
squad sq_door_c
squad sq_door_d
@member_counts({cell_1: 2})
squad sq_new_vex
squad sq_skiff
squad_member sq_skiff__pilot
control_point_set cp_skiff
trigger_volume tv_enc_start
player_monitor pm_enc_start bind(tv_enc_start)

@startup()
script sc_fallen():
    for sq in [sq_door_a, sq_door_b, sq_door_c, sq_door_d, sq_new_vex]:
        sq.set_objective(main_objective)
    sq_door_a.place()
    sq_door_a.set_task("task")
    sq_door_b.place()
    sq_door_b.set_task("task_1")
    sq_door_c.place()
    sq_door_c.set_task("task_2")
    sq_door_d.place()
    sq_door_d.set_task("task_3")
    sq_new_vex.place()
    sq_new_vex.set_task("task_4")

@startup()
script sc_skiff():
    sq_skiff.place()
    sleep_until(pm_enc_start.test_any_inside())
    sleep(1)
    sq_skiff__pilot.execute(cs_skiff_exit(cp_skiff))

# the parked skiff pulls away and leaves
command_script cs_skiff_exit(path):
    move_to(path, 0, false)
    ability("dropship", "exit_45")
