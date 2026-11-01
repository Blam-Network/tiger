# es\mars\subway\enc_subway_m06.es
#
# The subway for A Rising Tide: the platform fight on the way in, then five
# warp gates along the tracks that drop Vex as the player reaches them. The
# gates are placed with the bubble, invincible until the warp gate objective
# starts; the mission (act_mars_m06_subway_mission7) counts their kills.
# Every squad has its stretch's objective from the bubble load. Squads along
# the tracks spawn off the player triggers; a gate's drop is the
# vex_warp_gate archetype.
#
# The second drops and the task changes mid-fight are single-run facts
# (2026-11-01), read off the squads' death tallies: a squad down to its last
# member falls back, a wiped squad's partners move up, and the Vex still
# standing regroup as each gate falls. Where the earlier run's rule and this
# run disagree, the rule kept is the one this run fits.

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
    for sq in [sq_plat_wide_support1, sq_plat_wide_support2, sq_plat_wide_support3, sq_plat_wide_support4, sq_plat_wide_cloud]:
        sq.set_objective(obj_subway_m06_plat_wide)
    for sq in [sq_plat_thin_support1, sq_plat_thin_support2, sq_warpgate1_support1, sq_warpgate1_support2, sq_warpgate1_support3, sq_warpgate1_support4, sq_warpgate1_support_infinite]:
        sq.set_objective(obj_subway_m06_plat_thin)
    for sq in [sq_warpgate2_support1, sq_warpgate2_support2, sq_warpgate2_support3, sq_warpgate2_support4, sq_warpgate2_support_infinite]:
        sq.set_objective(obj_subway_m06_tracks_bend)
    for sq in [sq_warpgate3_anchor1, sq_warpgate3_support1, sq_warpgate3_support2, sq_warpgate3_support_infinite, sq_warpgate4_major_anchor1, sq_warpgate4_support1, sq_warpgate4_support2, sq_warpgate4_support_infinite, sq_warpgate5_anchor1, sq_warpgate5_support1, sq_warpgate5_support2, sq_warpgate5_support_infinite]:
        sq.set_objective(obj_subway_m06_maint)
    of_warpgate.add_combatant_type("vex_warpgate")
    ho_warpgate_invincible.set_filter(of_warpgate)
    pf_warp_gate1._squad.place()
    pf_warp_gate2._squad.place()
    pf_warp_gate3._squad.place()
    pf_warp_gate4._squad.place()
    pf_warp_gate5._squad.place()

# The platform ------------------------------------------------------------

@startup()
# the Vex are there when the subway loads
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

@startup()
# a cloud drops one more squad; the first squad pushes three seconds after
# it fades, and again a second later
script sc_platform_cloud():
    sq_plat_wide_support4.set_task("0x6AC57B9F")
    sq_plat_wide_cloud.place()
    sq_plat_wide_cloud__vex_cloud.execute(cs_vex_cloud())
    sleep(1)
    sq_plat_wide_cloud__vex_cloud.drop_squad(sq_plat_wide_support4); sleep_until(not sq_plat_wide_cloud__vex_cloud.is_dropping())
    sq_plat_wide_cloud.remove()
    sleep(3)
    sq_plat_wide_support1.set_task("0x3A8CE58F")
    sleep(1)
    sq_plat_wide_support1.set_task("0xAC2C587F")

@startup()
script sc_platform_support3():
    sleep_until_first_loss(sq_plat_wide_support3)
    sq_plat_wide_support3.set_task("0x3A8CE58F")
    sleep_until(sq_plat_wide_support3.alive_count() == 0)
    sq_plat_wide_support2.set_task("0x185D9E52")
    sq_plat_wide_support3.set_task("0x185D9E52")

# Warp gates 1 and 2 ------------------------------------------------------

@startup()
# the gates become vulnerable here, with the objective
script sc_warpgate1():
    sleep_until(pt_warpgate1.is_triggered())
    sleep(2)
    of_warpgate.remove(pf_warp_gate1._squad)
    of_warpgate.remove(pf_warp_gate2._squad)
    of_warpgate.remove(pf_warp_gate3._squad)
    of_warpgate.remove(pf_warp_gate4._squad)
    of_warpgate.remove(pf_warp_gate5._squad)
    sq_warpgate1_support1.set_task("0xAC171CF7")
    sq_warpgate1_support1.place()
    sq_warpgate1_support3.set_task("0xAC171CF7")
    pf_warp_gate1.drop_begin(sq_warpgate1_support3)

@startup()
# a second squad ten seconds after the first
script sc_warpgate1_reinforce():
    sleep_until(pt_warpgate1.is_triggered())
    sleep(14)
    if pf_warp_gate1._squad.alive_count() > 0:
        sq_warpgate1_support4.set_task("0xAC171CF7")
        pf_warp_gate1._squad__gate.drop_squad(sq_warpgate1_support4)

@startup()
script sc_warpgate1_push():
    sleep_until(sq_warpgate1_support3.alive_count() > 0)
    sleep_until(sq_warpgate1_support3.alive_count() == 0)
    sq_warpgate1_support1.set_task("0x80C9B1F0")
    sq_warpgate1_support3.set_task("0x80C9B1F0")
    sq_warpgate1_support4.set_task("0x80C9B1F0")

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

@startup()
# a second squad six seconds after the first
script sc_warpgate2_reinforce():
    sleep_until(pt_warpgate2.is_triggered())
    sleep(9)
    if pf_warp_gate2._squad.alive_count() > 0:
        sq_warpgate2_support3.set_task("0x64B8747A")
        pf_warp_gate2._squad__gate.drop_squad(sq_warpgate2_support3)

@startup()
script sc_warpgate2_fall():
    sleep_until(pt_warpgate2.is_triggered())
    sleep_until(pf_warp_gate2._squad.alive_count() == 0)
    sleep(1)
    sq_warpgate2_support1.set_task("0x7FC280D9")
    sq_warpgate2_support2.set_task("0x7FC280D9")
    sq_warpgate2_support3.set_task("0x7FC280D9")
    sq_warpgate2_support4.set_task("0x4E9047FD")

# Warp gates 3 to 5 -------------------------------------------------------

@startup()
# gates 3 to 5 share the maintenance stretch: residents first, then gates 3
# and 5 drop as the player closes in
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
# gate 4 drops once its residents are gone; the pair holding it falls back
script sc_warpgate4():
    sleep_until(pt_warpgate3and4and5resident.is_triggered())
    sleep_until(sq_warpgate4_major_anchor1.alive_count() > 0 and sq_warpgate4_support1.alive_count() > 0)
    sleep_until(sq_warpgate4_major_anchor1.alive_count() + sq_warpgate4_support1.alive_count() == 0)
    sq_warpgate5_support2.set_task("0x0AA58791")
    sleep(1)
    sq_warpgate4_support2.set_task("0x9D6DEEFC")
    pf_warp_gate4.drop_begin(sq_warpgate4_support2)

@startup()
script sc_warpgate3_support2():
    sleep_until(pt_warpgate3and4and5.is_triggered())
    sleep_until_down_to_last(sq_warpgate3_support2)
    sq_warpgate3_support2.set_task("0x0AA58791")

@startup()
script sc_warpgate4_support2():
    sleep_until(pt_warpgate3and4and5resident.is_triggered())
    sleep_until_down_to_last(sq_warpgate4_support2)
    sq_warpgate4_support2.set_task("0x0AA58791")

@startup()
# the Vex still standing regroup as each gate falls
script sc_gates_fall():
    sleep_until(pt_warpgate3and4and5.is_triggered())
    sleep_until(pf_warp_gate3._squad.alive_count() == 0)
    sleep(1)
    sq_warpgate4_major_anchor1.set_task("0xCF4EA1BF")
    sq_warpgate5_support1.set_task("0x9D6DEEFC")
    sleep_until(pf_warp_gate4._squad.alive_count() == 0)
    sleep(1)
    regroup(sq_warpgate4_major_anchor1, "0x278024CC")
    regroup(sq_warpgate4_support1, "0x9D6DEEFC")
    regroup(sq_warpgate5_support2, "0x9D6DEEFC")
    sleep_until(pf_warp_gate5._squad.alive_count() == 0)
    regroup(sq_warpgate3_support1, "0x3E12C957")
    regroup(sq_warpgate3_support2, "0x3E12C957")
    regroup(sq_warpgate4_major_anchor1, "0xFE4850B4")
    regroup(sq_warpgate4_support1, "0x3E12C957")
    regroup(sq_warpgate5_support1, "0x3E12C957")
    regroup(sq_warpgate5_support2, "0x3E12C957")

def regroup(sq, task):
    if sq.alive_count() > 0:
        sq.set_task(task)

def sleep_until_first_loss(sq):
    sleep_until(sq.alive_count() > 0)
    full = sq.alive_count()
    sleep_until(sq.alive_count() < full)

# down to its last member, or gone for a squad of one
def sleep_until_down_to_last(sq):
    sleep_until(sq.alive_count() > 0)
    last = 0
    if sq.alive_count() > 1:
        last = 1
    sleep_until(sq.alive_count() <= last)

command_script cs_vex_cloud():
    set_channel_scalar("0x80296344", 1)
