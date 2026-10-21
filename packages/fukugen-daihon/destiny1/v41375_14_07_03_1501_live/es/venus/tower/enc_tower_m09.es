# es\venus\tower\enc_tower_m09.es
#
# The Terminus itself, the top of the tower. The Fallen hold the lift's
# landing with shanks above and below; they fall back as the players reach
# the top, and skiffs bring in the flank, the back platform and the
# captain's reinforcements as the players cross. The captain blinks in at the
# third landing with his vandals. Mission 4 wakes sc_boss: the ultra captain
# holds at the back of its platform until a player comes forward, two boss
# skiffs bring its adds and their second tier follows as they fall. The
# servitors that come at their perch keep it invincible while they live.
# Nothing here was captured: every wait is a guess. Two task names are
# uncracked (hashes).

@activity_bundle("enc_tower_m09")

objective obj_tower_m09
@member_counts({dregs: 3, vandals: 1})
squad sq_top_front01
@member_counts({dregs: 2, vandals: 2})
squad sq_top_side01
@member_counts({dregs: 2, vandals: 2})
squad sq_back_platform
@member_counts({vandals: 2})
squad sq_top_anchor
@member_counts({dregs: 3})
squad sq_cap_reinf01
squad sq_captain
@member_counts({vandals: 3})
squad sq_cap_vandals
squad sq_skiff01
squad_member sq_skiff01__skiff
squad sq_skiff02
squad_member sq_skiff02__skiff
squad sq_skiff03
squad_member sq_skiff03__skiff
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
@member_counts({dregs: 3, vandals: 2})
squad sq_boss_adds01
@member_counts({vandals: 3})
squad sq_boss_adds01_tier2
@member_counts({dregs: 3, vandals: 2})
squad sq_boss_adds02
@member_counts({vandals: 3})
squad sq_boss_adds02_tier2
@member_counts({shanks: 3})
squad sq_shanks_top
@member_counts({shanks: 4})
squad sq_shanks_btm
squad_group sqg_servitors
squad_group sqg_boss_adds
squad_group sqg_adds01
squad_group sqg_adds02
hop_on ho_invincible
object_filter of_servitors
object o_captain_spawn_in
static_array<object, 10> candy_dynamic_objects
static_array<object, 10> candy_explosive_objects
trigger_volume tv_skiff01
player_trigger pt_skiff01 bind(tv_skiff01)
trigger_volume tv_skiff02
player_trigger pt_skiff02 bind(tv_skiff02)
trigger_volume tv_skiff03
player_trigger pt_skiff03 bind(tv_skiff03)
trigger_volume tv_spawn03
player_trigger pt_spawn03 bind(tv_spawn03)
trigger_volume tv_top_monitor
player_monitor pm_top_monitor bind(tv_top_monitor)
trigger_volume tv_btm_monitor
player_monitor pm_btm_shanks bind(tv_btm_monitor)
trigger_volume tv_servitor_monitor
player_monitor pm_servitor_monitor bind(tv_servitor_monitor)
trigger_volume tv_boss_monitor
player_monitor pm_boss_monitor bind(tv_boss_monitor)
trigger_volume tv_allow_boss_advance
player_monitor pm_allow_boss_advance bind(tv_allow_boss_advance)
control_point_set cps_enter_skiff01
control_point_set cps_exit_skiff01
control_point_set cps_enter_skiff02
control_point_set cps_exit_skiff02
control_point_set cps_enter_skiff03
control_point_set cps_exit_skiff03
control_point_set cps_enter_skiff03_adds
control_point_set cps_exit_skiff03_adds
control_point_set cps_enter_boss_skiff01
control_point_set cps_exit_boss_skiff01
control_point_set cps_enter_boss_skiff02
control_point_set cps_exit_boss_skiff02
c_command_script __cs
bool boss_arrived = false
bool boss_dead = false

@startup()
script sc_tower():
    for i in range(10):
        candy_dynamic_objects[i].create()
    for i in range(10):
        candy_explosive_objects[i].create()
    for sq in [sq_top_front01, sq_top_side01, sq_back_platform, sq_top_anchor, sq_cap_reinf01, sq_captain, sq_cap_vandals, sq_servitor01, sq_servitor02, sq_boss, sq_boss_adds01, sq_boss_adds01_tier2, sq_boss_adds02, sq_boss_adds02_tier2, sq_shanks_top, sq_shanks_btm]:
        sq.set_objective(obj_tower_m09)
    sqg_servitors.add_child(sq_servitor01)
    sqg_servitors.add_child(sq_servitor02)
    sqg_adds01.add_child(sq_boss_adds01)
    sqg_adds01.add_child(sq_boss_adds01_tier2)
    sqg_adds02.add_child(sq_boss_adds02)
    sqg_adds02.add_child(sq_boss_adds02_tier2)
    for sq in [sq_boss_adds01, sq_boss_adds01_tier2, sq_boss_adds02, sq_boss_adds02_tier2]:
        sqg_boss_adds.add_child(sq)
    place_on_task(sq_top_front01, "top_front")
    place_on_task(sq_top_anchor, "top_front")
    place_on_task(sq_shanks_top, "shanks_top")
    sc_top.wake()
    sc_shanks_btm.wake()
    sc_skiff01.wake()
    sc_skiff02.wake()
    sc_skiff03.wake()
    sc_captain.wake()

# the landing's defenders give ground once a player is up top
script sc_top():
    sleep_until(pm_top_monitor.test_any_inside())
    sq_top_front01.set_task("back")
    sq_top_anchor.set_task("back")
    sq_shanks_top.set_task("back")

script sc_shanks_btm():
    sleep_until(pm_btm_shanks.test_any_inside())
    place_on_task(sq_shanks_btm, "shanks_btm")

script sc_skiff01():
    sleep_until(pt_skiff01.is_triggered())
    skiff_drop(sq_skiff01__skiff, sq_top_side01, "0xFA92A116", cps_enter_skiff01, 2, cps_exit_skiff01, 4)

script sc_skiff02():
    sleep_until(pt_skiff02.is_triggered())
    skiff_drop(sq_skiff02__skiff, sq_back_platform, "back_platform", cps_enter_skiff02, 4, cps_exit_skiff02, 3)

script sc_skiff03():
    sleep_until(pt_skiff03.is_triggered())
    skiff_drop(sq_skiff03__skiff, sq_cap_reinf01, "cap_reinf", cps_enter_skiff03, 2, cps_exit_skiff03, 3)

# the captain blinks in with his vandals
script sc_captain():
    sleep_until(pt_spawn03.is_triggered())
    o_captain_spawn_in.create()
    o_captain_spawn_in.set_device_position(1)
    sleep(1)
    place_on_task(sq_captain, "0x7C9DA825")
    place_on_task(sq_cap_vandals, "0x7C9DA825")
    sleep(2)
    o_captain_spawn_in.delete_object()

# the ultra captain, woken by mission 4
script sc_boss():
    sleep_until(pm_boss_monitor.test_any_inside())
    place_on_task(sq_boss, "boss_back")
    sc_servitors.wake()
    sleep_until(sq_boss__ultra_captain.is_bound())
    boss_arrived = true
    sc_boss_advance.wake()
    sc_boss_adds.wake()
    sleep_until(not sq_boss__ultra_captain.is_bound())
    boss_dead = true

# the servitors shield the captain while they live
script sc_servitors():
    sleep_until(pm_servitor_monitor.test_any_inside())
    of_servitors.add(sq_boss__ultra_captain)
    ho_invincible.set_filter(of_servitors)
    place_on_task(sq_servitor01, "servitors")
    place_on_task(sq_servitor02, "servitors")
    sleep_until(sqg_servitors.alive_count() > 0)
    sleep_until(sqg_servitors.alive_count() == 0)
    ho_invincible.clear_filter()
    of_servitors.clear()

# the captain comes forward while a player holds the front of its platform
script sc_boss_advance():
    forward = false
    while not boss_dead:
        inside = pm_allow_boss_advance.test_any_inside()
        if inside and not forward:
            sq_boss.set_task("boss")
        elif forward and not inside:
            sq_boss.set_task("boss_back")
        forward = inside
        sleep(1)

# each boss skiff drops a wave; a wave's second tier comes once the first
# waves are down to two, on the third skiff's adds run and the second boss
# skiff's return
script sc_boss_adds():
    skiff_drop(sq_boss_skiff01__skiff, sq_boss_adds01, "boss_adds", cps_enter_boss_skiff01, 2, cps_exit_boss_skiff01, 2)
    sleep(4)
    skiff_drop(sq_boss_skiff02__skiff, sq_boss_adds02, "boss_adds", cps_enter_boss_skiff02, 2, cps_exit_boss_skiff02, 4)
    sleep_until(sqg_boss_adds.alive_count() <= 2 or boss_dead)
    sleep_until(sqg_adds01.alive_count() == 0 or boss_dead)
    if not boss_dead:
        skiff_drop(sq_skiff03__skiff, sq_boss_adds01_tier2, "boss_adds", cps_enter_skiff03_adds, 3, cps_exit_skiff03_adds, 2)
    sleep_until(sqg_adds02.alive_count() == 0 or boss_dead)
    if not boss_dead:
        skiff_drop(sq_boss_skiff02__skiff, sq_boss_adds02_tier2, "boss_adds", cps_enter_boss_skiff02, 2, cps_exit_boss_skiff02, 4)

# a skiff flies its entry path to the last control point, drops its squad
# there and leaves five seconds later. A path starts out in the air off the
# tower; the counts are each path's control points.
def skiff_drop(pilot, sq, task, enter, enter_points, exit, exit_points):
    skiff_enter(pilot, enter, enter_points)
    sleep_until_timeout(pilot.get_command_script_state() != e_command_script_state.executing, 20)
    sq.set_task(task)
    pilot.drop_squad(sq)
    sleep(5)
    skiff_leave(pilot, exit, exit_points)

def skiff_enter(pilot, path, points):
    __cs.clear()
    __cs.snap_to(path, 0)
    __cs.ability("dropship", "enter_45")
    for i in range(1, points):
        __cs.move_to(path, i, i == points - 1)
    __cs.set_channel_scalar("doors", 1)
    pilot.place()
    pilot.execute(__cs)

def skiff_leave(pilot, path, points):
    __cs.clear()
    __cs.set_channel_scalar("doors", 0)
    for i in range(points):
        __cs.move_to(path, i, false)
    __cs.ability("dropship", "exit_25")
    pilot.execute(__cs)

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
