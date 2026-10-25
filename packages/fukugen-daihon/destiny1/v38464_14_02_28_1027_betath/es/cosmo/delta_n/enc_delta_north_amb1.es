# es\cosmo\delta_n\enc_delta_north_amb1.es
#
# The Cosmodrome's ambient layer around dome A, the dry sea and the deltas
# (bubble 4, delta_n), loaded by every Cosmodrome activity. Small encounters
# share an actor budget: a few are up at a time, and when one is wiped out
# another takes its place. Each brings its squads back on its own respawn
# timer. Also puts out mission 2's placement.
# TU0's, from one capture (act_cosmo_m4_dome_c's public host), on the
# pre-alpha's rows: it has three encounters TU0 lacks (cluster_south01,
# mainroad01, boulders_mid01) and no patrol beacons, sparrow pod cage or dome A
# volumes. Member counts are TU0's where the squad has the member; domea01 is
# one dreg squad here, not TU0's vandals and captain. Its mainroad patrol
# route (amb_ptrl_mainroad01) is walked by amb_smpl_mainroad01, whose own
# objective has no tasks (patrol_encounter).

@activity_bundle("enc_delta_north_amb1")

encounter_manager encounters
sequence seq_ambient_music  # WARNING: unused - never started in any capture
object candy_transition  # WARNING: unused - no capture created it
simple_encounter amb_smpl_domea01
@member_counts({_squad: [{dreg: 2}]})
simple_encounter amb_smpl_cave_domea01
simple_encounter amb_smpl_cave_drysea01
@member_counts({_squad: [{dreg: 2, vandal: 1, shank: 1}]})
simple_encounter amb_smpl_cluster_mound01
@member_counts({_squad: [{vandal: 1, dreg: 3}]})
simple_encounter amb_smpl_cluster_north01
simple_encounter amb_smpl_cave_entrance_domea01
simple_encounter amb_smpl_lonetail_drysea01
simple_encounter amb_smpl_lonemid_deltas01
simple_encounter amb_smpl_cluster_mid01
simple_encounter amb_smpl_cluster_south01
simple_encounter amb_smpl_mainroad01
patrol_encounter amb_ptrl_mainroad01
simple_encounter amb_smpl_boulders_mid01
interactable_placement obj_placement_m2_o1 bind("0xEAA339A4")
trigger_volume killvolume
trigger_volume kv_delta_n
trigger_volume kv_delta_n_1
trigger_volume kv_delta_n_2
trigger_volume kv_delta_n_3

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 9
    amb_ptrl_mainroad01.add_patrol(amb_smpl_mainroad01)
    encounters.add_ambient_encounter(amb_smpl_domea01, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cave_domea01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cave_drysea01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cluster_mound01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cluster_north01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cave_entrance_domea01, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_lonetail_drysea01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_lonemid_deltas01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cluster_mid01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cluster_south01, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_mainroad01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_boulders_mid01, 2, 100, 20, 30, 0)

# The squads carry no objective of their own, so each takes its encounter's
# objective and the task the objective names once the encounter has placed
# it ("task" in the caves and dome A, "inside" out in the open). mainroad01's
# objective has no task.
@startup()
script sc_domea01_tasks():
    assign_tasks(amb_smpl_domea01, ["task"])

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
    assign_tasks(amb_smpl_lonemid_deltas01, ["inside"])

@startup()
script sc_cluster_mid01_tasks():
    assign_tasks(amb_smpl_cluster_mid01, ["inside", "inside"])

@startup()
script sc_cluster_south01_tasks():
    assign_tasks(amb_smpl_cluster_south01, ["inside"])

@startup()
script sc_boulders_mid01_tasks():
    assign_tasks(amb_smpl_boulders_mid01, ["inside"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
