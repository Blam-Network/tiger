# es\mars\lobby\enc_lobby_m06.es
#
# The Vex transit lobby for A Rising Tide. Two fights: the south lobby, where
# clouds drop Vex as the player comes in, and the north platform with its pit
# turret. Every squad, clouds included, has its half's objective from the
# bubble load. Squads spawn off the player triggers; a Vex cloud is placed,
# drops its squads in one drop and fades once the drop is over (the first
# north cloud, three squads, took sixteen seconds; the others eight).
#
# The task changes mid-fight are single-run facts (2026-11-01), read off the
# squads' death tallies: a squad down to its last member moves up, and a
# wiped squad's partners move on. Where the earlier run's rule and this run
# disagree, the rule kept is the one this run fits.

@activity_bundle("enc_lobby_m06")

objective obj_lobby_m06_s
objective obj_lobby_m06_n
player_trigger pt_s_cloud_spawn
player_trigger pt_s_mid_spawn
player_trigger pt_s_back_spawn
player_trigger pt_n_plat_spawn
player_trigger pt_n_plat_entered
player_trigger pt_n_pit_approach
player_trigger pt_n_pit_mid
squad sq_s_cloud1
squad_member sq_s_cloud1__vex_cloud
squad sq_s_cloud1_support1
squad sq_s_cloud1_support2
squad sq_s_cloud2
squad_member sq_s_cloud2__vex_cloud
squad sq_s_cloud2_support1
squad sq_s_cloud2_support2
squad sq_s_cloud3
squad_member sq_s_cloud3__vex_cloud
squad sq_s_cloud3_support1
squad sq_s_back_support1
squad sq_s_back_support2
squad sq_s_back_support3
squad sq_n_plat_support1
squad sq_n_mezz_support1
squad sq_n_cloud1
squad_member sq_n_cloud1__vex_cloud
squad sq_n_cloud1_support1
squad sq_n_cloud1_support2
squad sq_n_cloud1_support3
squad sq_n_cloud2
squad_member sq_n_cloud2__vex_cloud
squad sq_n_cloud2_support1
squad sq_n_cloud2_support2
squad sq_n_cloud2_support3
squad sq_n_cloud2_support4
squad sq_n_pit_turret
squad_member sq_n_pit_turret__cyclops
squad sq_n_pit_turret_support1

@startup()
script sc_lobby_startup():
    for sq in [sq_s_cloud1, sq_s_cloud1_support1, sq_s_cloud1_support2, sq_s_cloud2, sq_s_cloud2_support1, sq_s_cloud2_support2, sq_s_cloud3, sq_s_cloud3_support1, sq_s_back_support1, sq_s_back_support2, sq_s_back_support3]:
        sq.set_objective(obj_lobby_m06_s)
    for sq in [sq_n_plat_support1, sq_n_mezz_support1, sq_n_cloud1, sq_n_cloud1_support1, sq_n_cloud1_support2, sq_n_cloud1_support3, sq_n_cloud2, sq_n_cloud2_support1, sq_n_cloud2_support2, sq_n_cloud2_support3, sq_n_cloud2_support4, sq_n_pit_turret, sq_n_pit_turret_support1]:
        sq.set_objective(obj_lobby_m06_n)

# South lobby ------------------------------------------------------------

@startup()
script sc_s_cloud1():
    sleep_until(pt_s_cloud_spawn.is_triggered())
    sleep(1)
    sq_s_cloud2_support2.set_task("0x7860D8AB")
    sq_s_cloud2_support2.place()
    sq_s_cloud1_support1.set_task("0x2257CE64")
    sq_s_cloud1.place()
    sq_s_cloud1__vex_cloud.execute(cs_vex_cloud())
    sleep(1)
    sq_s_cloud1__vex_cloud.drop_squad(sq_s_cloud1_support1); sleep_until(not sq_s_cloud1__vex_cloud.is_dropping())
    sq_s_cloud1.remove()

@startup()
script sc_s_cloud2():
    sleep_until(pt_s_cloud_spawn.is_triggered())
    sleep(3)
    sq_s_cloud2_support1.set_task("0xBCF82E06")
    sq_s_cloud2.place()
    sq_s_cloud2__vex_cloud.execute(cs_vex_cloud())
    sleep(1)
    sq_s_cloud2__vex_cloud.drop_squad(sq_s_cloud2_support1); sleep_until(not sq_s_cloud2__vex_cloud.is_dropping())
    sq_s_cloud2.remove()

@startup()
# the first cloud's squad moves up when down to its last, and both cloud
# squads when it is gone
script sc_s_push():
    sleep_until_down_to_last(sq_s_cloud1_support1)
    sq_s_cloud1_support1.set_task("0xE312E136")
    sleep_until(sq_s_cloud1_support1.alive_count() == 0)
    sq_s_cloud1_support1.set_task("0xFD1E9768")
    sq_s_cloud2_support1.set_task("0xFD1E9768")

@startup()
script sc_s_cloud2_support2():
    sleep_until_down_to_last(sq_s_cloud2_support2)
    sq_s_cloud2_support2.set_task("0x9D29E053")
    sleep_until(sq_s_cloud2_support2.alive_count() == 0)
    sq_s_cloud2_support2.set_task("0xB357694F")

@startup()
script sc_s_back():
    sleep_until(pt_s_back_spawn.is_triggered())
    sleep(1)
    sq_s_back_support1.set_task("0xD1A64DC8")
    sq_s_back_support2.set_task("0xD1A64DC8")
    sq_s_back_support1.place()
    sq_s_back_support2.place()
    sleep_until(sq_s_back_support1.alive_count() > 0 and sq_s_back_support2.alive_count() > 0)
    sleep_until(sq_s_back_support1.alive_count() == 0 or sq_s_back_support2.alive_count() == 0)
    sq_s_back_support1.set_task("0x2B95E7DD")
    sq_s_back_support2.set_task("0x2B95E7DD")

# North lobby ------------------------------------------------------------

@startup()
script sc_n_plat():
    sleep_until(pt_n_plat_spawn.is_triggered())
    sleep(1)
    sq_n_plat_support1.set_task("0xED68DC31")
    sq_n_mezz_support1.set_task("0xED68DC31")
    sq_n_plat_support1.place()
    sq_n_mezz_support1.place()
    sq_n_pit_turret.place()
    sleep_until(sq_s_back_support1.alive_count() + sq_s_back_support2.alive_count() == 0)
    sq_n_plat_support1.set_task("0x2305F0E6")
    sq_n_mezz_support1.set_task("0x2305F0E6")

@startup()
# the pit clouds: the second comes a few seconds after the first has faded
script sc_n_clouds():
    sleep_until(pt_n_pit_approach.is_triggered())
    sq_n_cloud1_support1.set_task("0x473E6AE2")
    sq_n_cloud1_support2.set_task("0xFCE82AE8")
    sq_n_cloud1_support3.set_task("0x8680E5C4")
    sq_n_cloud1.place()
    sq_n_cloud1__vex_cloud.execute(cs_vex_cloud())
    sleep(1)
    sq_n_cloud1__vex_cloud.drop_squad(sq_n_cloud1_support3)
    sq_n_cloud1__vex_cloud.drop_squad(sq_n_cloud1_support2)
    sq_n_cloud1__vex_cloud.drop_squad(sq_n_cloud1_support1); sleep_until(not sq_n_cloud1__vex_cloud.is_dropping())
    sq_n_cloud1.remove()
    sleep(2)
    sq_n_cloud2_support3.set_task("0x63D77DA2")
    sq_n_cloud2_support4.set_task("0x63D77DA2")
    sq_n_cloud2.place()
    sq_n_cloud2__vex_cloud.execute(cs_vex_cloud())
    sleep(1)
    sq_n_cloud2__vex_cloud.drop_squad(sq_n_cloud2_support3)
    sq_n_cloud2__vex_cloud.drop_squad(sq_n_cloud2_support4); sleep_until(not sq_n_cloud2__vex_cloud.is_dropping())
    sq_n_cloud2.remove()

@startup()
script sc_n_cloud1_support1():
    sleep_until_down_to_last(sq_n_cloud1_support1)
    sq_n_cloud1_support1.set_task("0x29B58723")

@startup()
script sc_n_cloud1_support3():
    sleep_until_down_to_last(sq_n_cloud1_support3)
    sq_n_cloud1_support3.set_task("0x29B58723")

@startup()
# with the first squad gone the first cloud's Vex regroup
script sc_n_cloud1_regroup():
    sleep_until(sq_n_cloud1_support1.alive_count() > 0)
    sleep_until(sq_n_cloud1_support1.alive_count() == 0)
    sq_n_cloud1_support1.set_task("0x04E91DB2")
    sq_n_cloud1_support2.set_task("0x04E91DB2")
    sq_n_cloud1_support3.set_task("0x04E91DB2")

@startup()
# the second cloud's pair moves on at its first loss
script sc_n_cloud2_push():
    sleep_until_first_loss(sq_n_cloud2_support3)
    sq_n_cloud2_support3.set_task("0x6D75A9E7")
    sq_n_cloud2_support4.set_task("0x6D75A9E7")

# down to its last member, or gone for a squad of one
def sleep_until_down_to_last(sq):
    sleep_until(sq.alive_count() > 0)
    last = 0
    if sq.alive_count() > 1:
        last = 1
    sleep_until(sq.alive_count() <= last)

def sleep_until_first_loss(sq):
    sleep_until(sq.alive_count() > 0)
    full = sq.alive_count()
    sleep_until(sq.alive_count() < full)

command_script cs_vex_cloud():
    set_channel_scalar("0x80296344", 1)
