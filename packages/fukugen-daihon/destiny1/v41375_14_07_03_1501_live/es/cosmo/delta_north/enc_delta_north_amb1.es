# es\cosmo\delta_north\enc_delta_north_amb1.es
#
# The Cosmodrome's ambient layer around dome A, the dry sea and the north
# deltas (public bubble 6, where the Last Array starts), loaded by every
# Cosmodrome activity and patrol. Nine small encounters share an actor
# budget: three or four are up at a time, and when one is wiped out another
# takes its place. Each brings its squads back on its own respawn timer.
# Also puts out the patrol beacons and mission 2's placement and sparrow pod
# cage, and keeps dome A's large volume to players on mission 1.
#
# Pooled over six 2.3.1 public hosts of the bubble (act_cosmo_m4_dome_c
# twice, act_cosmo_m1_dome_a, act_cosmo_m2_dome_c, act_cosmo_m0_5_hangar and
# the patrol); four had the bubble on the wire from a fresh start, the other
# two only its filters.
# - Every run started with dome A's Fallen and the mound cluster up, plus
#   two of the caves, the cave entrance, the mid cluster or the deltas pair:
#   the manager's pick varies. Each wipe let one encounter in within 1-2 s
#   (the north cluster twice, the dry sea cave, the deltas pair, and once the
#   dry sea cave and the cave entrance together). Every state seen filled a
#   budget of 8 at the costs below; the list order is the 782 s run's.
# - While out of combat an encounter's objective reset every 32 s in every
#   run, the simple encounters' 30 s respawn.
# - A wiped encounter came back only once a player had left its volume
#   (dome A's Fallen, 1 s after, 690 s later).
# - The lone dry sea pair never ran.
# - The cage is one run's (act_cosmo_m2_dome_c): it went up as mission 2's
#   placement became usable, opened 2 s after the placement was used and was
#   gone a second later.
# Unexplained, one run: 700 s into the 782 s run three encounters despawned
# together as the bubble's Warsat Down came in (enc_delta_n_events); dome A's
# Fallen took their room.

@activity_bundle("enc_delta_north_amb1")

static_array<object, 3> patrol_beacons
object o_sparrow_pod_cage
sequence seq_ambient_music
encounter_manager encounters
@member_counts({_squad: [{dreg: 2, vandal: 1, shank: 1}]})
simple_encounter amb_smpl_cluster_mound01
@member_counts({_squad: [{vandals: 2}, {captain: 1}]})
simple_encounter amb_smpl_domea01
@member_counts({_squad: [{dreg: 2, dreg_captain: 1}]})
simple_encounter amb_smpl_cave_domea01
@member_counts({_squad: [{dreg: 1, shank_captain: 1}]})
simple_encounter amb_smpl_cave_drysea01
@member_counts({_squad: [{vandal: 1, dreg: 3}]})
simple_encounter amb_smpl_cluster_north01
@member_counts({_squad: [{dreg: 2}]})
simple_encounter amb_smpl_cave_entrance_domea01
@member_counts({_squad: [{vandal: 1, dreg: 1}, {dreg: 3}]})
simple_encounter amb_smpl_lonemid_deltas01
@member_counts({_squad: [{dreg: 1, dreg_1: 1}, {dreg: 2}]})
simple_encounter amb_smpl_cluster_mid01
simple_encounter amb_smpl_lonetail_drysea01
interactable_placement obj_placement_m2_o1 bind("0xEAA339A4")
object_filter of_m01_handler
trigger_volume tv_domea_large
player_monitor pm_domea_large bind(tv_domea_large)
trigger_volume tv_domea_medium
player_monitor pm_domea_medium bind(tv_domea_medium)
trigger_volume tv_domea_closet
player_monitor pm_domea_closet bind(tv_domea_closet)
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
    pm_domea_large.set_filter(of_m01_handler)

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 8
    encounters.add_ambient_encounter(amb_smpl_cluster_mound01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_domea01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cave_domea01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cave_drysea01, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cluster_north01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cave_entrance_domea01, 1, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_lonemid_deltas01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_cluster_mid01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_smpl_lonetail_drysea01, 3, 100, 20, 30, 0)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them, and the cluster's "inside" for the lone pair never seen up.
script sc_cluster_mound01_tasks():
    assign_tasks(amb_smpl_cluster_mound01, ["inside"])

@startup()
script sc_domea01_tasks():
    assign_tasks(amb_smpl_domea01, ["vandals", "captain"])

@startup()
script sc_cave_domea01_tasks():
    assign_tasks(amb_smpl_cave_domea01, ["task"])

@startup()
script sc_cave_drysea01_tasks():
    assign_tasks(amb_smpl_cave_drysea01, ["task"])

@startup()
script sc_cluster_north01_tasks():
    assign_tasks(amb_smpl_cluster_north01, ["inside"])

@startup()
script sc_cave_entrance_domea01_tasks():
    assign_tasks(amb_smpl_cave_entrance_domea01, ["task"])

@startup()
script sc_lonemid_deltas01_tasks():
    assign_tasks(amb_smpl_lonemid_deltas01, ["inside", "inside"])

@startup()
script sc_cluster_mid01_tasks():
    assign_tasks(amb_smpl_cluster_mid01, ["inside", "inside"])

@startup()
script sc_lonetail_drysea01_tasks():
    assign_tasks(amb_smpl_lonetail_drysea01, ["inside"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])

@startup()
# Mission 2's sparrow pod: the cage goes up once a player can use the
# placement, and opens and goes once it has been used.
script sc_sparrow_pod_cage():
    sleep_until(obj_placement_m2_o1._activity_flag.is_active())
    o_sparrow_pod_cage.create()
    sleep_until(obj_placement_m2_o1._interactable.is_active())
    sleep(1)
    o_sparrow_pod_cage.set_device_position(1)
    sleep(1)
    o_sparrow_pod_cage.delete_object()
