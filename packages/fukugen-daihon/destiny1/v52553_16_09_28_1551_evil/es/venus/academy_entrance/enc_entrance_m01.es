# es\venus\academy_entrance\enc_entrance_m01.es
#
# The Academy entrance in A Stranger's Call. Quiet until the player hacks the
# Vex conflux; then the Vex come out of their clouds: the march, the mid group
# and the anchor while mission 4 runs, and once mission 5 holds the entrance,
# three defensive waves with a ledge sniper between them. The missions wake
# the threads; the flags tell them when the entrance is quiet.
#
# From one capture. Which squads each cloud drops is the wire's; when the next
# wave comes is our reading of it (the march cloud stays twelve seconds, the
# rest seven; a defensive wave follows the ledge sniper's death). Never placed
# in that run: sq_anchor_tier2, sq_mid_minotaur, sq_def_anchor_tier2,
# sq_dummies. The task swaps the squads make on their own (the defensive front
# refilling, the marchers spreading out) are the AI's, not the script's.

@activity_bundle("enc_entrance_m01")
c_objective_sensor_host obj_entrance_m01
c_object_sensor_host o_vex_block_network_a
interactable_placement pf_vex_block
interactable_placement pf_door_hack
static_array<c_object_sensor_host, 15> candy_dynamic_objects
static_array<c_object_sensor_host, 5> candy_explosive_objects
c_trigger_volume_slot_host tv_spawn02
c_player_monitor_sensor_host pm_spawn02 bind(tv_spawn02)
c_trigger_volume_slot_host tv_top_left
c_player_monitor_sensor_host pm_top_left bind(tv_top_left)
c_trigger_volume_slot_host tv_top_right
c_player_monitor_sensor_host pm_top_right bind(tv_top_right)
c_action_point_host ps_enter
c_squad_sensor_host sq_anchor
c_squad_sensor_host sq_anchor_tier2
c_squad_sensor_host sq_center01
c_squad_sensor_host sq_mid_minotaur
c_squad_sensor_host sq_mid_snipers
c_squad_sensor_host sq_mid_goblins
c_squad_sensor_host sq_def_center01
c_squad_sensor_host sq_def_center02
c_squad_sensor_host sq_def_anchor01
c_squad_sensor_host sq_def_anchor02
c_squad_sensor_host sq_def_anchor_tier2
c_squad_sensor_host sq_left_ledge_sniper
c_squad_sensor_host sq_right_ledge_sniper
c_squad_sensor_host sq_cloud01
c_squad_member_sensor_host sq_cloud01__cloud
c_squad_sensor_host sq_cloud02
c_squad_member_sensor_host sq_cloud02__cloud
c_squad_sensor_host sq_cloud03
c_squad_member_sensor_host sq_cloud03__cloud
c_squad_sensor_host sq_cloud04
c_squad_member_sensor_host sq_cloud04__cloud
c_squad_sensor_host sq_cloud05
c_squad_member_sensor_host sq_cloud05__cloud
c_squad_sensor_host sq_left_ledge_cloud
c_squad_member_sensor_host sq_left_ledge_cloud__cloud
c_squad_sensor_host sq_right_ledge_cloud
c_squad_member_sensor_host sq_right_ledge_cloud__cloud
c_squad_sensor_host sq_march01
c_squad_member_sensor_host sq_march01__goblin01
c_squad_member_sensor_host sq_march01__goblin02
c_squad_member_sensor_host sq_march01__goblin03
c_squad_member_sensor_host sq_march01__goblin04
c_squad_sensor_host sq_march02
c_squad_member_sensor_host sq_march02__goblin01
c_squad_member_sensor_host sq_march02__goblin02
c_squad_member_sensor_host sq_march02__goblin03
c_squad_member_sensor_host sq_march02__goblin04
c_squad_sensor_host sq_march03
c_squad_member_sensor_host sq_march03__goblin01
c_squad_member_sensor_host sq_march03__goblin02
c_squad_member_sensor_host sq_march03__goblin03
c_squad_member_sensor_host sq_march03__goblin04
c_squad_sensor_host sq_dummies
c_squad_group_sensor_host sqg_center
c_squad_group_sensor_host sqg_mid
c_squad_group_sensor_host sqg_marching
c_squad_group_sensor_host sqg_wave02
c_squad_group_sensor_host sqg_defensive_wave
c_squad_group_sensor_host sqg_defensive_anchor
bool conflux_clear
bool entrance_clear
int i_resist_wave

startup thread sc_entrance_main:
    print("script startup")
    sq_anchor.set_objective(obj_entrance_m01)
    sq_anchor_tier2.set_objective(obj_entrance_m01)
    sq_center01.set_objective(obj_entrance_m01)
    sq_mid_minotaur.set_objective(obj_entrance_m01)
    sq_mid_snipers.set_objective(obj_entrance_m01)
    sq_mid_goblins.set_objective(obj_entrance_m01)
    sq_def_center01.set_objective(obj_entrance_m01)
    sq_def_center02.set_objective(obj_entrance_m01)
    sq_def_anchor01.set_objective(obj_entrance_m01)
    sq_def_anchor02.set_objective(obj_entrance_m01)
    sq_def_anchor_tier2.set_objective(obj_entrance_m01)
    sq_left_ledge_sniper.set_objective(obj_entrance_m01)
    sq_right_ledge_sniper.set_objective(obj_entrance_m01)
    sq_cloud01.set_objective(obj_entrance_m01)
    sq_cloud02.set_objective(obj_entrance_m01)
    sq_cloud03.set_objective(obj_entrance_m01)
    sq_cloud04.set_objective(obj_entrance_m01)
    sq_cloud05.set_objective(obj_entrance_m01)
    sq_left_ledge_cloud.set_objective(obj_entrance_m01)
    sq_right_ledge_cloud.set_objective(obj_entrance_m01)
    sq_march01.set_objective(obj_entrance_m01)
    sq_march02.set_objective(obj_entrance_m01)
    sq_march03.set_objective(obj_entrance_m01)
    sq_dummies.set_objective(obj_entrance_m01)
    sqg_marching.add_child(sq_march01)
    sqg_marching.add_child(sq_march02)
    sqg_marching.add_child(sq_march03)
    sqg_mid.add_child(sq_mid_minotaur)
    sqg_mid.add_child(sq_mid_snipers)
    sqg_mid.add_child(sq_mid_goblins)
    sqg_center.add_child(sq_anchor)
    sqg_center.add_child(sq_anchor_tier2)
    sqg_center.add_child(sq_center01)
    sqg_wave02.add_child(sq_left_ledge_sniper)
    sqg_wave02.add_child(sq_right_ledge_sniper)
    sqg_defensive_wave.add_child(sq_def_center01)
    sqg_defensive_wave.add_child(sq_def_center02)
    sqg_defensive_anchor.add_child(sq_def_anchor01)
    sqg_defensive_anchor.add_child(sq_def_anchor02)
    sqg_defensive_anchor.add_child(sq_def_anchor_tier2)
    o_vex_block_network_a.create()
    o_vex_block_network_a.set_device_position(1)
    pf_vex_block._object.set_device_position(0.1)
    for candy in candy_dynamic_objects:
        candy.create()
    for candy in candy_explosive_objects:
        candy.create()

# mission 4: the conflux is hacked. The network goes down, the marchers come
# out of the first cloud, then the mid group and the anchor as each wave dies.
thread sc_conflux_hacked:
    pf_vex_block._object.set_device_position(1)
    cloud_open(sq_cloud01, sq_cloud01__cloud)
    cloud_drop(sq_cloud01__cloud, sq_march01, "0xE32043F4")
    cloud_drop(sq_cloud01__cloud, sq_march02, "0xE32043F4")
    cloud_drop(sq_cloud01__cloud, sq_march03, "0xE32043F4")
    sleep(1)
    o_vex_block_network_a.set_device_position(0)
    sleep(5)
    o_vex_block_network_a.delete_object()
    sleep(4)
    pf_vex_block._object.set_device_position(0)
    sleep(2)
    sq_cloud01__cloud.remove()
    sleep(2)
    pf_vex_block._object.set_device_position(0.1)
    sleep_until(sqg_marching.alive_count() == 0)
    sleep(1)
    cloud_open(sq_cloud05, sq_cloud05__cloud)
    cloud_drop(sq_cloud05__cloud, sq_mid_snipers, "0x23AC25CE")
    cloud_drop(sq_cloud05__cloud, sq_mid_goblins, "0x9ABA5A6D")
    cloud_close(sq_cloud05__cloud)
    sleep_until(sqg_mid.alive_count() == 0)
    cloud_open(sq_cloud02, sq_cloud02__cloud)
    cloud_drop(sq_cloud02__cloud, sq_anchor, "anchor")
    cloud_drop(sq_cloud02__cloud, sq_center01, "0x18E267F1")
    cloud_close(sq_cloud02__cloud)
    sleep_until(sqg_center.alive_count() == 0)
    conflux_clear = true

# mission 5: hold the entrance. The centre pair comes back with every wave;
# the ledge snipers and the anchors join in turn.
thread sc_resist:
    i_resist_wave = 1
    cloud_open(sq_cloud03, sq_cloud03__cloud)
    cloud_open(sq_right_ledge_cloud, sq_right_ledge_cloud__cloud)
    cloud_drop(sq_cloud03__cloud, sq_def_center01, "0xCE91FA0C")
    cloud_drop(sq_cloud03__cloud, sq_def_center02, "0xE19FB2F8")
    cloud_drop(sq_right_ledge_cloud__cloud, sq_right_ledge_sniper, "0x1C116117")
    sleep(7)
    sq_cloud03__cloud.remove()
    sq_right_ledge_cloud__cloud.remove()
    sleep_until(sq_right_ledge_sniper.alive_count() == 0)
    sleep(1)
    i_resist_wave = 2
    cloud_open(sq_cloud03, sq_cloud03__cloud)
    cloud_open(sq_left_ledge_cloud, sq_left_ledge_cloud__cloud)
    cloud_drop(sq_cloud03__cloud, sq_def_center01, "0xCE91FA0C")
    cloud_drop(sq_cloud03__cloud, sq_def_center02, "0xE19FB2F8")
    cloud_drop(sq_left_ledge_cloud__cloud, sq_left_ledge_sniper, "0xE150238E")
    sleep(7)
    sq_cloud03__cloud.remove()
    sq_left_ledge_cloud__cloud.remove()
    sleep_until(sq_left_ledge_sniper.alive_count() == 0)
    i_resist_wave = 3
    cloud_open(sq_cloud03, sq_cloud03__cloud)
    cloud_open(sq_cloud04, sq_cloud04__cloud)
    cloud_drop(sq_cloud03__cloud, sq_def_center01, "0xCE91FA0C")
    cloud_drop(sq_cloud03__cloud, sq_def_center02, "0xE19FB2F8")
    cloud_drop(sq_cloud04__cloud, sq_def_anchor01, "0x2F6F76C2")
    cloud_drop(sq_cloud04__cloud, sq_def_anchor02, "0x2F6F76C2")
    sleep(7)
    sq_cloud03__cloud.remove()
    sq_cloud04__cloud.remove()
    sleep_until(sqg_defensive_wave.alive_count() + sqg_defensive_anchor.alive_count() + sqg_wave02.alive_count() == 0)
    entrance_clear = true

# mission 6: the loot goes with the fight
thread sc_cleanup:
    for candy in candy_dynamic_objects:
        candy.delete_object()
    for candy in candy_explosive_objects:
        candy.delete_object()

def cloud_open(sq_cloud, cloud):
    sq_cloud.set_task("mid")
    cloud.place()

def cloud_drop(cloud, sq, task):
    sq.set_task(task)
    cloud.drop_squad(sq)

def cloud_close(cloud):
    sleep(7)
    cloud.remove()
