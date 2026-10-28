# es\venus\mission_traitor\unknown_253d3c66.es
#
# The lower tower in mission_traitor. The Fallen at the bottom and the
# entrance, the vanguard's captain and blade vandals and two Vex packs
# stand from the load. The goblins move up as a player reaches their
# volume; at the cloud's volume the sniper and the shank reinforcements
# come in and a Vex cloud drops the last pack; the blade vandals go to the
# front at theirs. Once every Fallen of the vanguard is dead mission 2 moves
# on to the grav lift; using its console wakes sc_grav_lift.
#
# From one retail 2.3.1 capture (2026-10-27 22-53-09, unconfirmed). Rosters
# (@member_counts) are the wire's squad rosters, task names fnv1 cracks
# where the hash fell. The candy comes up as the players first reach the
# lower tower.

@activity_bundle(0x253D3C66)

objective obj_lower_tower_m09
@member_counts({dregs: 5})
squad sq_fallen_btm01
squad sq_fallen_sniper
@member_counts({shanks: 3})
squad sq_fallen_reinf_left
@member_counts({shanks: 3})
squad sq_fallen_reinf_right
squad sq_major_captain
squad_member sq_major_captain__captain
@member_counts({vandals: 1})
squad sq_major_vandal_blade
squad_member sq_major_vandal_blade__vandals
@member_counts({dregs: 3})
squad sq_fallen_entrance
@member_counts({goblins: 3, harpies: 2})
squad sq_vex_btm01
@member_counts({goblins: 4})
squad sq_vex_btm02
@member_counts({0xE7FA1537: 1, goblins: 5})
squad sq_vex_btm03
squad sq_cloud
squad_member sq_cloud__cloud
squad_group sqg_fallen_majors
squad_group sqg_fallen_reinf
trigger_volume tv_goblins_advance
player_trigger pt_goblins_advance bind(tv_goblins_advance)
trigger_volume tv_cloud
player_trigger pt_cloud bind(tv_cloud)
trigger_volume tv_blade_vandals
player_trigger pt_blade_vandals bind(tv_blade_vandals)
trigger_volume tv_blade_vandals_monitor
player_monitor pm_blade_vandals_monitor bind(tv_blade_vandals_monitor)
countdown_placement pf_tower_elevator bind("0xCCE30769")
object o_bridge_lock_cage
object o_gravlift_shield_controller
static_array<object, 15> candy_dynamic_objects
static_array<object, 5> candy_explosive_objects
bool vanguard_dead = false
bool grav_lift_up = false

@startup()
# every squad is against the lower tower's objective; the bottom, the
# entrance and the vanguard stand from the load
script sc_lower_tower():
    for sq in [sq_fallen_btm01, sq_fallen_sniper, sq_fallen_reinf_left, sq_fallen_reinf_right, sq_major_captain, sq_major_vandal_blade, sq_fallen_entrance]:
        sq.set_objective(obj_lower_tower_m09)
    for sq in [sq_vex_btm01, sq_vex_btm02, sq_vex_btm03, sq_cloud]:
        sq.set_objective(obj_lower_tower_m09)
    sqg_fallen_majors.add_child(sq_major_captain)
    sqg_fallen_majors.add_child(sq_major_vandal_blade)
    sqg_fallen_reinf.add_child(sq_fallen_sniper)
    sqg_fallen_reinf.add_child(sq_fallen_reinf_left)
    sqg_fallen_reinf.add_child(sq_fallen_reinf_right)
    o_gravlift_shield_controller.create()
    place_on_task(sq_fallen_btm01, "0xF9F77430")
    place_on_task(sq_fallen_entrance, "fallen_entrance")
    place_on_task(sq_major_vandal_blade, "anchor_back")
    place_on_task(sq_major_captain, "major_captain")
    place_on_task(sq_vex_btm01, "harpies_goblins")
    place_on_task(sq_vex_btm02, "advance")
    for candy in candy_dynamic_objects:
        candy.create()
    for candy in candy_explosive_objects:
        candy.create()

@startup()
script sc_goblins_advance():
    sleep_until(pt_goblins_advance.is_triggered())
    sq_vex_btm02.set_task("goblins")

@startup()
# the reinforcements: the sniper and the shanks walk in, the cloud drops
# the last Vex pack and fades seven seconds later
script sc_cloud():
    sleep_until(pt_cloud.is_triggered())
    place_on_task(sq_fallen_sniper, "0x3E6545DC")
    place_on_task(sq_fallen_reinf_left, "fallen_btm")
    place_on_task(sq_fallen_reinf_right, "fallen_btm")
    sq_cloud.set_task("fallen_btm")
    sq_cloud__cloud.place()
    sq_vex_btm03.set_task("0x29F4E622")
    sq_cloud__cloud.drop_squad(sq_vex_btm03)
    sleep(7)
    sq_cloud__cloud.remove()

@startup()
script sc_blade_vandals():
    sleep_until(pt_blade_vandals.is_triggered())
    sq_major_vandal_blade.set_task("anchor_front")

@startup()
# the vanguard is the majors and the reinforcements, so it can only be dead
# once the reinforcements are in
script sc_vanguard():
    sleep_until(pt_cloud.is_triggered())
    sleep_until(sqg_fallen_reinf.alive_count() > 0)
    sleep_until(sqg_fallen_majors.alive_count() == 0 and sqg_fallen_reinf.alive_count() == 0)
    vanguard_dead = true

# mission 2: the lift's console is used. The console comes on, the cage
# over the bridge appears, the lift and the shield controller come up and
# the cage is gone as the players ride up.
script sc_grav_lift():
    sleep(2)
    pf_tower_elevator._object.set_device_position(0.1)
    o_bridge_lock_cage.create()
    sleep(3)
    pf_tower_elevator._object.set_device_position(1)
    sleep(2)
    o_bridge_lock_cage.set_device_position(1)
    o_gravlift_shield_controller.set_device_position(1)
    sleep(1)
    o_bridge_lock_cage.delete_object()
    grav_lift_up = true

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
