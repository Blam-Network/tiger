# es\venus\lower_tower\enc_lower_tower_m09.es
#
# The Terminus's lower tower. The Fallen hold the entrance, the floor and the
# snipers' perch and the anchor captain stands on the bridge; Vex goblins and
# harpies are already fighting them, and a Vex cloud brings a minotaur in as
# the players push on. The blade vandals jump the players on the way to the
# lift. Once mission 2 has the lift's controls used, sc_vanguard springs the
# trap: the cage drops across the bridge, the captain and his blades come on,
# and two shank packs follow once the majors are thinning. When the vanguard
# is dead the cage lifts and the shield over the gravlift drops. Nothing here
# was captured: every wait is a guess. Three task names are uncracked
# (hashes).

@activity_bundle("enc_lower_tower_m09")

objective obj_lower_tower_m09
@member_counts({dregs: 4})
squad sq_fallen_entrance
@member_counts({dregs: 3})
squad sq_fallen_btm01
@member_counts({0xFD2174CD: 2})
squad sq_fallen_sniper
@member_counts({shanks: 3})
squad sq_fallen_reinf_left
@member_counts({shanks: 3})
squad sq_fallen_reinf_right
squad sq_major_anchor
squad sq_major_vandal_blade
squad_member sq_major_vandal_blade__vandals
@member_counts({goblins: 3, harpies: 2})
squad sq_vex_btm01
@member_counts({goblins: 4})
squad sq_vex_btm02
@member_counts({minotaur: 1, goblins: 3})
squad sq_vex_btm03
squad sq_cloud
squad_member sq_cloud__cloud
squad_group sqg_fallen_majors
squad_group sqg_fallen_reinf
object o_gravlift_shield_controller
object o_bridge_lock_cage
interactable_placement pf_tower_elevator bind("tower_elevator")
static_array<object, 15> candy_dynamic_objects
static_array<object, 5> candy_explosive_objects
trigger_volume tv_blade_vandals
player_trigger pt_blade_vandals bind(tv_blade_vandals)
trigger_volume tv_blade_vandals_monitor
player_monitor pm_blade_vandals_monitor bind(tv_blade_vandals_monitor)
trigger_volume tv_cloud
player_trigger pt_cloud bind(tv_cloud)
bool blades_out = false
bool reinforced = false
bool vanguard_cleared = false

@startup()
script sc_lower_tower():
    for i in range(15):
        candy_dynamic_objects[i].create()
    for i in range(5):
        candy_explosive_objects[i].create()
    o_bridge_lock_cage.create()
    o_bridge_lock_cage.set_device_position(0)
    o_gravlift_shield_controller.create()
    o_gravlift_shield_controller.set_device_position(0)
    for sq in [sq_fallen_entrance, sq_fallen_btm01, sq_fallen_sniper, sq_fallen_reinf_left, sq_fallen_reinf_right, sq_major_anchor, sq_major_vandal_blade, sq_vex_btm01, sq_vex_btm02, sq_vex_btm03]:
        sq.set_objective(obj_lower_tower_m09)
    sqg_fallen_majors.add_child(sq_major_anchor)
    sqg_fallen_majors.add_child(sq_major_vandal_blade)
    sqg_fallen_reinf.add_child(sq_fallen_reinf_left)
    sqg_fallen_reinf.add_child(sq_fallen_reinf_right)
    place_on_task(sq_fallen_entrance, "fallen_entrance")
    place_on_task(sq_fallen_btm01, "fallen_btm")
    place_on_task(sq_fallen_sniper, "fallen_sniper")
    place_on_task(sq_major_anchor, "major_anchor")
    place_on_task(sq_vex_btm01, "harpies_goblins")
    place_on_task(sq_vex_btm02, "goblins")
    sc_cloud.wake()
    sc_blade_vandals.wake()

# the Vex reinforce the floor out of a cloud that lingers seven seconds
script sc_cloud():
    sleep_until(pt_cloud.is_triggered())
    sq_cloud.place()
    sleep(2)
    sq_vex_btm03.set_task("vex")
    sq_cloud__cloud.drop_squad(sq_vex_btm03)
    sleep(7)
    if sq_cloud.alive_count() > 0:
        sq_cloud.remove()

script sc_blade_vandals():
    sleep_until(pt_blade_vandals.is_triggered())
    blade_vandals_out()

# the blades press while a player is in their ground and fall back to the
# captain when nobody is
script sc_blade_vandals_press():
    pressing = true
    sleep_until(sq_major_vandal_blade.alive_count() > 0)
    while sq_major_vandal_blade.alive_count() > 0:
        inside = pm_blade_vandals_monitor.test_any_inside()
        if inside and not pressing:
            sq_major_vandal_blade.set_task("0xF9F77430")
        elif pressing and not inside:
            sq_major_vandal_blade.set_task("major_anchor")
        pressing = inside
        sleep(1)

# woken by mission 2 once the lift's controls are used
script sc_vanguard():
    o_bridge_lock_cage.set_device_position(1)
    blade_vandals_out()
    sleep(2)
    sq_major_anchor.set_task("0xF9F77430")
    sleep_until(sqg_fallen_majors.alive_count() <= 1)
    place_on_task(sq_fallen_reinf_left, "0x3E6545DC")
    sleep(2)
    place_on_task(sq_fallen_reinf_right, "0x29F4E622")
    reinforced = true
    sleep_until(sqg_fallen_majors.alive_count() + sqg_fallen_reinf.alive_count() == 0)
    sleep(2)
    o_bridge_lock_cage.set_device_position(0)
    o_gravlift_shield_controller.set_device_position(1)
    vanguard_cleared = true

def blade_vandals_out():
    if blades_out:
        return
    blades_out = true
    place_on_task(sq_major_vandal_blade, "0xF9F77430")
    sc_blade_vandals_press.wake()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
