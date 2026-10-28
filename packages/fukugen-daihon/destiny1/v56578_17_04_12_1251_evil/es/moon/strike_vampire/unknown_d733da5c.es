# es\moon\strike_vampire\unknown_d733da5c.es
#
# strike_vampire's launch tubes (bundle D733DA5C, file name unknown; bubble
# 3, the activity's own). The turret Hive stand at the gateway once the
# players are in; two seconds on, with mission 1's objective, the Fallen at
# the tube objective and a second later the Hive there. Down the descent the
# pods break open (the knights and the wizards) with the Fallen and the Hive
# of the tube, and the Ketch's volume toggle comes on; at the arena's far end
# the tube objective's Hive fall back to the exit.
#
# One retail 2.3.1 run: every wait is that run's, unconfirmed. Never placed
# in that run: the gateway's drop, ranged, thrall and melee squads, the
# court's Hive, the boomer acolytes and the tube objective's first Fallen.

@activity_bundle(0xD733DA5C)

objective obj_launchtubes_hive
squad sq_gateway_turret
squad sq_tube_fallen01
squad sq_tube_hive01
squad sq_tube_obj_hive01
squad sq_tube_obj_hive02
squad sq_tube_obj_hive03
squad sq_tube_obj_fallen02
squad sq_pod_knights
squad sq_pod_wizard
trigger_group tg_ketch_lt2
trigger_volume tv_descent
player_trigger pt_descent bind(tv_descent)
trigger_volume tv_tube
player_trigger pt_tube bind(tv_tube)
trigger_volume tv_arena_end
player_trigger pt_arena_end bind(tv_arena_end)
trigger_volume tv_exit_launchtubes
player_trigger pt_exit_launchtubes bind(tv_exit_launchtubes)

@startup()
script sc_gateway():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    sq_gateway_turret.set_objective(obj_launchtubes_hive)
    sq_gateway_turret.place()
    sleep(2)
    place_squad(sq_tube_obj_fallen02, "0x701B4E52")
    sleep(1)
    for sq in [sq_tube_obj_hive01, sq_tube_obj_hive02, sq_tube_obj_hive03]:
        place_squad(sq, "0x3945EC2A")

@startup()
script sc_descent():
    sleep_until(pt_descent.is_triggered())
    sleep(1)
    place_squad(sq_pod_knights, "0x0B46BC95")
    place_squad(sq_pod_wizard, "0xB9606E24")
    place_squad(sq_tube_fallen01, "0x52A6648C")
    place_squad(sq_tube_hive01, "0x8DDF5F18")
    tg_ketch_lt2.activate()

@startup()
script sc_arena_end():
    sleep_until(pt_arena_end.is_triggered())
    sleep(1)
    sq_tube_obj_hive01.set_task("0xCE8FC7CE")
    sq_tube_obj_hive02.set_task("0x1EE58D28")
    sq_tube_obj_hive03.set_task("0x1EE58D2B")

def place_squad(sq, task):
    sq.set_objective(obj_launchtubes_hive)
    sq.place()
    sq.set_task(task)
