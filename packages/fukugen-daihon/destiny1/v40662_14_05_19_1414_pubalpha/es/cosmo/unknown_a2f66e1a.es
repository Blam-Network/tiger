# es\cosmo\unknown_a2f66e1a.es
#
# The Cosmodrome's ambient layer around dome A, the dry sea and the deltas
# (bubble 6, where the Last Array starts), loaded by every Cosmodrome activity
# and patrol. Nine small encounters share an actor budget: four or five are up
# at a time, and when one is wiped out another takes its place. Each brings
# its squads back on its own respawn timer (the objective reset every 32 s on
# the wire). Also puts out the patrol beacons and mission 2's placement, and
# keeps dome A's mission 1 volume (TU0's large one; the alpha names it for
# the handler) to players on mission 1.
# From one capture (act_cosmo_m4_dome_c's public host, 780 s): four
# encounters were up on arrival, cluster_north01 went in 1 s after domea01
# was wiped, and none of the rest ever did. Budget and order are fit to that
# run. domea01 came back 1 s after the player left its volume, 690 s later.

@activity_bundle(0xA2F66E1A)

static_array<object, 3> patrol_beacons
object o_sparrow_pod_cage
sequence seq_ambient_music
encounter_manager encounters
@member_counts({_squad: [{vandals: 2}, {captain: 1}]})
simple_encounter amb_smpl_domea01
@member_counts({_squad: [{dreg: 2, dreg_captain: 1}]})
simple_encounter amb_smpl_cave_domea01
@member_counts({_squad: [{dreg: 1, shank_captain: 1}]})
simple_encounter amb_smpl_cave_drysea01
@member_counts({_squad: [{dreg: 2, vandal: 1, shank: 1}]})
simple_encounter amb_smpl_cluster_mound01
@member_counts({_squad: [{vandal: 1, dreg: 3}]})
simple_encounter amb_smpl_cluster_north01
simple_encounter amb_smpl_cave_entrance_domea01
simple_encounter amb_smpl_lonetail_drysea01
simple_encounter amb_smpl_lonemid_deltas01
simple_encounter amb_smpl_cluster_mid01
interactable_placement obj_placement_m2_o1 bind("0xEAA339A4")
object_filter of_m01_handler
trigger_volume tv_m01_handler
player_monitor pm_m01_handler bind(tv_m01_handler)
trigger_volume tv_domea_guards_spawner
player_monitor pm_domea_guards_spawner bind(tv_domea_guards_spawner)
trigger_volume killvolume
trigger_volume kv_delta_n
trigger_volume kv_delta_n_1
trigger_volume kv_delta_n_2
trigger_volume kv_delta_n_3
squad_group sg_m01

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()

    # players on mission 1 (flag name not cracked)
    of_m01_handler.add_players_with_activity_flag("0x31CAA01C")
    pm_m01_handler.set_filter(of_m01_handler)

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 9
    encounters.add_ambient_encounter(amb_smpl_domea01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cave_domea01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cave_drysea01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cluster_mound01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cluster_north01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cave_entrance_domea01, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_lonetail_drysea01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_lonemid_deltas01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cluster_mid01, 3, 100, 20, 30, 0)

@startup()
# The squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them, and the cluster's "inside" for the four never seen up. The alpha's
# domea01 objective has no vandals task: its tasks are captain,
# captain_fallback and two uncracked ones, and the vandals take the first of
# those.
script sc_domea01_tasks():
    assign_tasks(amb_smpl_domea01, ["0xBA8322FC", "captain"])

@startup()
script sc_cave_domea01_tasks():
    assign_tasks(amb_smpl_cave_domea01, ["task"])

@startup()
script sc_cave_drysea01_tasks():
    assign_tasks(amb_smpl_cave_drysea01, ["task"])

@startup()
script sc_cluster_mound01_tasks():
    assign_tasks(amb_smpl_cluster_mound01, ["inside"])

@startup()
script sc_cluster_north01_tasks():
    assign_tasks(amb_smpl_cluster_north01, ["inside"])

@startup()
script sc_cave_entrance_domea01_tasks():
    assign_tasks(amb_smpl_cave_entrance_domea01, ["task"])

@startup()
script sc_lonetail_drysea01_tasks():
    assign_tasks(amb_smpl_lonetail_drysea01, ["inside"])

@startup()
script sc_lonemid_deltas01_tasks():
    assign_tasks(amb_smpl_lonemid_deltas01, ["inside", "inside"])

@startup()
script sc_cluster_mid01_tasks():
    assign_tasks(amb_smpl_cluster_mid01, ["inside", "inside"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
