# es\venus\mission_traitor\unknown_8a595800.es
#
# The top of the Shattered Coast tower in mission_traitor. Two servitors
# stand at the boss's platform, invincible while the hop-on holds them, and
# six Vex warp gates stand from the load. Past the chasm each of the three
# skiff volumes brings a Vex cloud with a Fallen pack, the second the
# anchor as well. Mission 5 wakes sc_boss: the ultra captain comes out of a
# cloud, the servitors lose their cover, two skiffs bring his adds and the
# clouds his shanks; his stages follow his health, and once he is down to
# his last sliver the Awoken escort takes him and every squad stands down.
#
# From two retail 2.3.1 captures (2026-10-27 22-53-09, 2026-10-29 03-38-43).
# Rosters (@member_counts) are the first run's squad rosters, the skiffs'
# command scripts retail's atom for atom, task names fnv1 cracks where the
# hash fell. The boss's stages and capture follow his health in both runs
# (his client reports it in 28ths): the first stage once he is down to
# three quarters, the second under a quarter, the capture under a twentieth
# (0.7 s after the report in both). Never placed in either run: sq_captain,
# sq_cap_vandals, sq_cap_reinf01, sq_shanks_btm, sq_skiff01-03 and the adds'
# tier 2 squads.

@activity_bundle(0x8A595800)

objective obj_tower_m09
@member_counts({dregs: 3, vandals: 2})
squad sq_top_front01
@member_counts({dregs: 3, vandals: 2})
squad sq_top_side01
@member_counts({dregs: 3, vandals: 2})
squad sq_back_platform
@member_counts({vandals: 2, captain: 1})
squad sq_top_anchor
squad sq_servitor01
squad_member sq_servitor01__servitor
squad sq_servitor02
squad_member sq_servitor02__servitor
squad sq_boss
squad_member sq_boss__ultra_captain
squad sq_boss_skiff01
squad_member sq_boss_skiff01__skiff
squad sq_boss_skiff02
squad_member sq_boss_skiff02__skiff
@member_counts({dregs: 3, vandals: 1})
squad sq_boss_adds01
@member_counts({dregs: 3, vandals: 1})
squad sq_boss_adds02
@member_counts({shanks: 3})
squad sq_shanks_top
@member_counts({vandal_blade: 3})
squad sq_shanks_mid
squad sq_shanks_btm
squad sq_captain
squad sq_cap_vandals
squad sq_cap_reinf01
squad cloud_bridge_squad
squad_member cloud_bridge_squad__pilot
squad cloud_neck_squad
squad_member cloud_neck_squad__pilot
squad cloud_bend_squad
squad_member cloud_bend_squad__pilot
squad cloud_end_squad
squad_member cloud_end_squad__pilot
squad cloud_mid_squad
squad_member cloud_mid_squad__pilot
vex_warp_gate warp_gate_a_prefab
vex_warp_gate warp_gate_b_prefab
vex_warp_gate warp_gate_c_prefab
vex_warp_gate warp_gate_d_prefab
vex_warp_gate warp_gate_e_prefab
vex_warp_gate warp_gate_f_prefab
object_filter of_servitors
object_filter of_clear
hop_on ho_invincible_servitors
trigger_volume tv_mid_monitor
player_monitor pm_mid_shanks bind(tv_mid_monitor)
trigger_volume tv_skiff01
player_trigger pt_skiff01 bind(tv_skiff01)
trigger_volume tv_skiff02
player_trigger pt_skiff02 bind(tv_skiff02)
trigger_volume tv_skiff03
player_trigger pt_skiff03 bind(tv_skiff03)
control_point_set cps_enter_boss_skiff01
control_point_set cps_exit_boss_skiff01
control_point_set cps_enter_boss_skiff02
control_point_set cps_exit_boss_skiff02
sequence captain_announce_sequence
performance boss_capture_performance
awoken_escort awoken_escort_prefab
static_array<object, 10> candy_dynamic_objects
static_array<object, 10> candy_explosive_objects
bool boss_captured = false

@startup()
# every Fallen squad is against the tower's objective; the servitors and
# the gates stand from the load
script sc_tower():
    for sq in [sq_top_front01, sq_top_side01, sq_back_platform, sq_top_anchor, sq_cap_reinf01, sq_captain, sq_cap_vandals, sq_servitor01, sq_servitor02]:
        sq.set_objective(obj_tower_m09)
    for sq in [sq_boss, sq_boss_skiff01, sq_boss_skiff02, sq_boss_adds01, sq_boss_adds02, sq_shanks_top, sq_shanks_mid, sq_shanks_btm]:
        sq.set_objective(obj_tower_m09)
    for gate in [warp_gate_a_prefab, warp_gate_b_prefab, warp_gate_c_prefab, warp_gate_d_prefab, warp_gate_e_prefab, warp_gate_f_prefab]:
        gate._squad.place()
    of_servitors.add(sq_servitor01__servitor)
    of_servitors.add(sq_servitor02__servitor)
    ho_invincible_servitors.set_filter(of_servitors)
    place_on_task(sq_servitor01, "servitors")
    place_on_task(sq_servitor02, "servitors")
    for candy in candy_dynamic_objects:
        candy.create()
    for candy in candy_explosive_objects:
        candy.create()

@startup()
script sc_skiff01():
    sleep_until(pt_skiff01.is_triggered())
    cloud_open(cloud_bridge_squad__pilot)
    cloud_drop(cloud_bridge_squad__pilot, sq_top_front01, "follow")
    cloud_close(cloud_bridge_squad__pilot)

@startup()
# the anchor walks up a few seconds after the cloud's pack
script sc_skiff02():
    sleep_until(pt_skiff02.is_triggered())
    cloud_open(cloud_neck_squad__pilot)
    cloud_drop(cloud_neck_squad__pilot, sq_top_side01, "boss_adds")
    sleep(3)
    place_on_task(sq_top_anchor, "shanks_btm")
    sleep(4)
    cloud_neck_squad__pilot.remove()

@startup()
script sc_skiff03():
    sleep_until(pt_skiff03.is_triggered())
    cloud_open(cloud_bend_squad__pilot)
    cloud_drop(cloud_bend_squad__pilot, sq_back_platform, "top_front")
    cloud_close(cloud_bend_squad__pilot)

# mission 5: the ultra captain arrives. Seven seconds on his cloud fades,
# he takes his next task, the servitors come out from under the hop-on and
# the two skiffs fly in with his adds; the end cloud comes back with the
# top shanks and the mid cloud with the blade vandals.
script sc_boss():
    captain_announce_sequence.start()
    cloud_open(cloud_end_squad__pilot)
    cloud_drop(cloud_end_squad__pilot, sq_boss, "0x7C9DA825")
    sc_mid_shanks.wake()
    sleep(7)
    cloud_end_squad__pilot.remove()
    sq_boss.set_task("boss_health_low")
    sq_servitor01.set_task("boss_back")
    sq_servitor02.set_task("boss_back")
    ho_invincible_servitors.set_filter(of_clear)
    sq_boss_skiff01.set_task("boss_adds")
    sq_boss_skiff02.set_task("boss_adds")
    sc_boss_skiff01.wake()
    sc_boss_skiff02.wake()
    sleep(7)
    cloud_open(cloud_end_squad__pilot)
    cloud_drop(cloud_end_squad__pilot, sq_shanks_top, "0x3995B69E")
    sleep(8)
    cloud_end_squad__pilot.remove()
    boss = sq_boss__ultra_captain
    sleep_until(boss.get_health_fraction() <= 0.75)
    sq_boss.activate_temperament("0xA86437EF")
    sleep_until(boss.get_health_fraction() < 0.25)
    sq_boss.activate_temperament("0x61FF1F93")
    sleep_until(boss.get_health_fraction() < 0.05)
    # the capture: the Awoken take him, everyone else stands down
    boss_capture_performance.start_performance("0xEF912B79")
    awoken_escort_prefab.escort_begin()
    for sq in [sq_servitor01, sq_servitor02, sq_boss_adds01, sq_boss_adds02, sq_shanks_top, sq_shanks_mid, sq_shanks_btm]:
        sq.activate_temperament("0x1FFF4789")
    for sq in [sq_top_front01, sq_top_side01, sq_back_platform, sq_top_anchor, sq_captain, sq_cap_vandals, sq_cap_reinf01]:
        sq.activate_temperament("0x1FFF4789")
    boss_captured = true
    sleep(9)
    sq_boss.set_task("boss")
    sleep(12)
    boss_capture_performance.cue_performance("0xB6622307")

# The mid cloud's blade vandals come for a player who holds the mid platform
# through the fight: the first run's stood there 10.2 s before they came, the
# second run's never more than 4.4 s and they never came.
script sc_mid_shanks():
    held = false
    while not held and not boss_captured:
        sleep_until(pm_mid_shanks.get_count() > 0 or boss_captured)
        sleep_until_timeout(pm_mid_shanks.get_count() == 0 or boss_captured, 9)
        held = pm_mid_shanks.get_count() > 0 and not boss_captured
    if held:
        cloud_open(cloud_mid_squad__pilot)
        cloud_drop(cloud_mid_squad__pilot, sq_shanks_mid, "back_platform")
        sleep(8)
        cloud_mid_squad__pilot.remove()

script sc_boss_skiff01():
    ship = sq_boss_skiff01__skiff
    ship.place()
    ship.execute(cs_boss_skiff_enter(cps_enter_boss_skiff01))
    sleep(8)
    drop_on_task(ship, sq_boss_adds01, "shanks_mid")
    sleep(5)
    ship.execute(cs_boss_skiff01_exit(cps_exit_boss_skiff01))

script sc_boss_skiff02():
    ship = sq_boss_skiff02__skiff
    ship.place()
    ship.execute(cs_boss_skiff_enter(cps_enter_boss_skiff02))
    sleep(7)
    drop_on_task(ship, sq_boss_adds02, "shanks_mid")
    sleep(4)
    ship.execute(cs_boss_skiff02_exit(cps_exit_boss_skiff02))

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def drop_on_task(ship, sq, task):
    sq.set_task(task)
    ship.drop_squad(sq)

def cloud_open(cloud):
    cloud.place()

def cloud_drop(cloud, sq, task):
    sq.set_task(task)
    cloud.drop_squad(sq)

def cloud_close(cloud):
    sleep(7)
    cloud.remove()

# a boss skiff snaps to its path, flies its entrance and opens its doors
command_script cs_boss_skiff_enter(path):
    snap_to(path, 0)
    ability("dropship", "0x4A82B0FF")
    move_to(path, 1, true)
    set_channel_scalar("doors", 1)
    terminate_delay(2)

command_script cs_boss_skiff01_exit(path):
    move_to(path, 0, false)
    set_channel_scalar("doors", 0)
    move_to(path, 1, false)
    ability("dropship", "0x7B0D3643")

command_script cs_boss_skiff02_exit(path):
    move_to(path, 0, false)
    set_channel_scalar("doors", 0)
    move_to(path, 1, false)
    move_to(path, 2, false)
    move_to(path, 3, false)
    ability("dropship", "0x7B0D3643")
