# es\mars\subway\enc_subway_m06.es
#
# The subway for A Rising Tide: the platform fight on the way in, then five
# warp gates along the tracks that drop Vex as the player reaches them. The
# gates are invincible until the warp gate objective starts; the mission
# (act_mars_m06_subway_mission7) counts their kills. Squads along the tracks
# spawn off the player triggers; a gate's drop is the vex_warp_gate archetype.
# Mid-fight task changes follow one run and are unconfirmed.

@activity_bundle("enc_subway_m06")

objective obj_subway_m06_plat_wide
objective obj_subway_m06_plat_thin
objective obj_subway_m06_tracks_bend
objective obj_subway_m06_maint
player_trigger pt_entry
player_trigger pt_tracks_slope_enter
player_trigger pt_plat_thin_despawn
player_trigger pt_warpgate1
player_trigger pt_warpgate2
player_trigger pt_warpgate3and4and5resident
player_trigger pt_warpgate3and4and5
object_filter of_warpgate
hop_on ho_warpgate_invincible
string_hash vex_warpgate = "vex_warpgate"
vex_warp_gate pf_warp_gate1
vex_warp_gate pf_warp_gate2
vex_warp_gate pf_warp_gate3
vex_warp_gate pf_warp_gate4
vex_warp_gate pf_warp_gate5
squad sq_plat_wide_support1
squad sq_plat_wide_support2
squad sq_plat_wide_support3
squad sq_plat_wide_support4
squad sq_plat_wide_cloud
squad_member sq_plat_wide_cloud__vex_cloud
squad sq_plat_thin_support1
squad sq_plat_thin_support2
squad sq_warpgate1_support1
squad sq_warpgate1_support2
squad sq_warpgate1_support3
squad sq_warpgate1_support4
squad sq_warpgate1_support_infinite
squad sq_warpgate2_support1
squad sq_warpgate2_support2
squad sq_warpgate2_support3
squad sq_warpgate2_support4
squad sq_warpgate2_support_infinite
squad sq_warpgate3_anchor1
squad sq_warpgate3_support1
squad sq_warpgate3_support2
squad sq_warpgate3_support_infinite
squad sq_warpgate4_major_anchor1
squad sq_warpgate4_support1
squad sq_warpgate4_support2
squad sq_warpgate4_support_infinite
squad sq_warpgate5_anchor1
squad sq_warpgate5_support1
squad sq_warpgate5_support2
squad sq_warpgate5_support_infinite

@startup()
script sc_subway_startup():
    sq_plat_wide_support1.set_objective(obj_subway_m06_plat_wide)
    sq_plat_wide_support2.set_objective(obj_subway_m06_plat_wide)
    sq_plat_wide_support3.set_objective(obj_subway_m06_plat_wide)
    sq_plat_wide_support4.set_objective(obj_subway_m06_plat_wide)
    sq_plat_thin_support1.set_objective(obj_subway_m06_plat_thin)
    sq_plat_thin_support2.set_objective(obj_subway_m06_plat_thin)
    sq_warpgate1_support1.set_objective(obj_subway_m06_plat_thin)
    sq_warpgate1_support2.set_objective(obj_subway_m06_plat_thin)
    sq_warpgate1_support3.set_objective(obj_subway_m06_plat_thin)
    sq_warpgate1_support4.set_objective(obj_subway_m06_plat_thin)
    sq_warpgate1_support_infinite.set_objective(obj_subway_m06_plat_thin)
    sq_warpgate2_support1.set_objective(obj_subway_m06_tracks_bend)
    sq_warpgate2_support2.set_objective(obj_subway_m06_tracks_bend)
    sq_warpgate2_support3.set_objective(obj_subway_m06_tracks_bend)
    sq_warpgate2_support4.set_objective(obj_subway_m06_tracks_bend)
    sq_warpgate2_support_infinite.set_objective(obj_subway_m06_tracks_bend)
    sq_warpgate3_anchor1.set_objective(obj_subway_m06_maint)
    sq_warpgate3_support1.set_objective(obj_subway_m06_maint)
    sq_warpgate3_support2.set_objective(obj_subway_m06_maint)
    sq_warpgate3_support_infinite.set_objective(obj_subway_m06_maint)
    sq_warpgate4_major_anchor1.set_objective(obj_subway_m06_maint)
    sq_warpgate4_support1.set_objective(obj_subway_m06_maint)
    sq_warpgate4_support2.set_objective(obj_subway_m06_maint)
    sq_warpgate4_support_infinite.set_objective(obj_subway_m06_maint)
    sq_warpgate5_anchor1.set_objective(obj_subway_m06_maint)
    sq_warpgate5_support1.set_objective(obj_subway_m06_maint)
    sq_warpgate5_support2.set_objective(obj_subway_m06_maint)
    sq_warpgate5_support_infinite.set_objective(obj_subway_m06_maint)
    of_warpgate.add_combatant_type(vex_warpgate)
    ho_warpgate_invincible.set_filter(of_warpgate)
    pf_warp_gate1._squad.place()
    pf_warp_gate2._squad.place()
    pf_warp_gate3._squad.place()
    pf_warp_gate4._squad.place()
    pf_warp_gate5._squad.place()

@startup()
# The platform: the Vex are there when the subway loads; a cloud drops one more.
script sc_platform():
    sq_plat_wide_support1.set_task("0x36C31FD1")
    sq_plat_wide_support2.set_task("0x20A42AC5")
    sq_plat_wide_support3.set_task("0xC32A1969")
    sq_plat_thin_support1.set_task("0xDE52224B")
    sq_plat_thin_support2.set_task("0x5B2A550F")
    sq_plat_wide_support1.place()
    sq_plat_wide_support2.place()
    sq_plat_wide_support3.place()
    sq_plat_thin_support1.place()
    sq_plat_thin_support2.place()
    sq_plat_wide_support4.set_task("0x6AC57B9F")
    sq_plat_wide_cloud.place()
    sq_plat_wide_cloud__vex_cloud.execute(cs_vex_cloud())
    sleep(1)
    sq_plat_wide_cloud__vex_cloud.drop_squad(sq_plat_wide_support4); sleep_until(not sq_plat_wide_cloud__vex_cloud.is_dropping())
    sq_plat_wide_cloud.remove()
    sleep(2)
    sq_plat_wide_support1.set_task("0x3A8CE58F")
    sleep_until(sq_plat_wide_support4.alive_count() == 0)
    sq_plat_wide_support1.set_task("0xAC2C587F")
    sleep_until(sq_plat_wide_support3.alive_count() <= 1)
    sq_plat_wide_support3.set_task("0x3A8CE58F")
    sleep_until(sq_plat_thin_support2.alive_count() <= 1)
    sq_plat_wide_support2.set_task("0x185D9E52")
    sq_plat_wide_support3.set_task("0x185D9E52")

@startup()
# Warp gate 1: the gates become vulnerable here, with the objective.
script sc_warpgate1():
    sleep_until(pt_warpgate1.is_triggered())
    sleep(1)
    of_warpgate.remove(pf_warp_gate1._squad)
    of_warpgate.remove(pf_warp_gate2._squad)
    of_warpgate.remove(pf_warp_gate3._squad)
    of_warpgate.remove(pf_warp_gate4._squad)
    of_warpgate.remove(pf_warp_gate5._squad)
    sq_warpgate1_support1.set_task("0xAC171CF7")
    sq_warpgate1_support1.place()
    sq_warpgate1_support3.set_task("0xAC171CF7")
    pf_warp_gate1.drop_begin(sq_warpgate1_support3)
    sleep_until(sq_warpgate1_support1.alive_count() <= 2)
    sq_warpgate1_support1.set_task("0x80C9B1F0")
    sq_warpgate1_support3.set_task("0x80C9B1F0")

@startup()
script sc_warpgate2():
    sleep_until(pt_warpgate2.is_triggered())
    sleep(1)
    sq_warpgate2_support1.set_task("0x64B8747A")
    sq_warpgate2_support4.set_task("0xF23A76E1")
    sq_warpgate2_support1.place()
    sq_warpgate2_support4.place()
    sq_warpgate2_support2.set_task("0x64B8747A")
    pf_warp_gate2.drop_begin(sq_warpgate2_support2)
    sleep_until(sq_warpgate2_support4.alive_count() <= 2)
    sq_warpgate2_support1.set_task("0x7FC280D9")
    sq_warpgate2_support2.set_task("0x7FC280D9")
    sq_warpgate2_support4.set_task("0x4E9047FD")

@startup()
# Gates 3 to 5 share the maintenance stretch: residents first, then the
# gates drop as the player closes in, and the Vex regroup as each gate falls.
script sc_warpgate345_resident():
    sleep_until(pt_warpgate3and4and5resident.is_triggered())
    sleep(1)
    sq_warpgate3_support1.set_task("0x3D02BDC8")
    sq_warpgate4_major_anchor1.set_task("0x54F2200A")
    sq_warpgate4_support1.set_task("0x0AA58791")
    sq_warpgate5_support1.set_task("0x5CC353D6")
    sq_warpgate3_support1.place()
    sq_warpgate4_major_anchor1.place()
    sq_warpgate4_support1.place()
    sq_warpgate5_support1.place()

@startup()
script sc_warpgate3():
    sleep_until(pt_warpgate3and4and5.is_triggered())
    sleep(2)
    sq_warpgate3_support2.set_task("0x9D6DEEFC")
    pf_warp_gate3.drop_begin(sq_warpgate3_support2)

@startup()
script sc_warpgate5():
    sleep_until(pt_warpgate3and4and5.is_triggered())
    sleep(3)
    sq_warpgate5_support2.set_task("0x9D6DEEFC")
    pf_warp_gate5.drop_begin(sq_warpgate5_support2)

@startup()
script sc_gates_fall():
    sleep_until(pt_warpgate3and4and5.is_triggered())
    sleep_until(pf_warp_gate3._squad.alive_count() == 0)
    sleep(1)
    sq_warpgate4_major_anchor1.set_task("0xCF4EA1BF")
    sq_warpgate5_support1.set_task("0x9D6DEEFC")
    sleep_until(pf_warp_gate4._squad.alive_count() == 0)
    sq_warpgate4_major_anchor1.set_task("0x278024CC")
    sq_warpgate4_support1.set_task("0x9D6DEEFC")
    sleep_until(pf_warp_gate5._squad.alive_count() == 0)
    sq_warpgate3_support1.set_task("0x3E12C957")
    sq_warpgate3_support2.set_task("0x3E12C957")
    sq_warpgate4_major_anchor1.set_task("0xFE4850B4")
    sq_warpgate4_support1.set_task("0x3E12C957")
    sq_warpgate5_support1.set_task("0x3E12C957")
    sq_warpgate5_support2.set_task("0x3E12C957")

command_script cs_vex_cloud():
    set_channel_scalar("0x80296344", 1)
