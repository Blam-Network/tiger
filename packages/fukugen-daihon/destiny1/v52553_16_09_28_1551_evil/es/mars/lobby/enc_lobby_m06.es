# es\mars\lobby\enc_lobby_m06.es
#
# The Vex transit lobby for A Rising Tide. Two fights: the south lobby, where
# clouds drop Vex as the player comes in, and the north platform with its pit
# turret. Squads spawn off the player triggers; a Vex cloud is placed, drops
# its squad and fades. The task changes mid-fight follow what one run showed
# (a squad worn down to its last member moves up), so they are unconfirmed.

@activity_bundle("enc_lobby_m06")
c_objective_sensor_host obj_lobby_m06_s
c_objective_sensor_host obj_lobby_m06_n
c_player_trigger_sensor_host pt_s_cloud_spawn
c_player_trigger_sensor_host pt_s_mid_spawn
c_player_trigger_sensor_host pt_s_back_spawn
c_player_trigger_sensor_host pt_n_plat_spawn
c_player_trigger_sensor_host pt_n_plat_entered
c_player_trigger_sensor_host pt_n_pit_approach
c_player_trigger_sensor_host pt_n_pit_mid
c_squad_sensor_host sq_s_cloud1
c_squad_member_sensor_host sq_s_cloud1__vex_cloud
c_squad_sensor_host sq_s_cloud1_support1
c_squad_sensor_host sq_s_cloud1_support2
c_squad_sensor_host sq_s_cloud2
c_squad_member_sensor_host sq_s_cloud2__vex_cloud
c_squad_sensor_host sq_s_cloud2_support1
c_squad_sensor_host sq_s_cloud2_support2
c_squad_sensor_host sq_s_cloud3
c_squad_member_sensor_host sq_s_cloud3__vex_cloud
c_squad_sensor_host sq_s_cloud3_support1
c_squad_sensor_host sq_s_back_support1
c_squad_sensor_host sq_s_back_support2
c_squad_sensor_host sq_s_back_support3
c_squad_sensor_host sq_n_plat_support1
c_squad_sensor_host sq_n_mezz_support1
c_squad_sensor_host sq_n_cloud1
c_squad_member_sensor_host sq_n_cloud1__vex_cloud
c_squad_sensor_host sq_n_cloud1_support1
c_squad_sensor_host sq_n_cloud1_support2
c_squad_sensor_host sq_n_cloud1_support3
c_squad_sensor_host sq_n_cloud2
c_squad_member_sensor_host sq_n_cloud2__vex_cloud
c_squad_sensor_host sq_n_cloud2_support1
c_squad_sensor_host sq_n_cloud2_support2
c_squad_sensor_host sq_n_cloud2_support3
c_squad_sensor_host sq_n_cloud2_support4
c_squad_sensor_host sq_n_pit_turret
c_squad_member_sensor_host sq_n_pit_turret__cyclops
c_squad_sensor_host sq_n_pit_turret_support1

startup thread sc_lobby_startup:
    sq_s_cloud1_support1.set_objective(obj_lobby_m06_s)
    sq_s_cloud1_support2.set_objective(obj_lobby_m06_s)
    sq_s_cloud2_support1.set_objective(obj_lobby_m06_s)
    sq_s_cloud2_support2.set_objective(obj_lobby_m06_s)
    sq_s_cloud3_support1.set_objective(obj_lobby_m06_s)
    sq_s_back_support1.set_objective(obj_lobby_m06_s)
    sq_s_back_support2.set_objective(obj_lobby_m06_s)
    sq_s_back_support3.set_objective(obj_lobby_m06_s)
    sq_n_plat_support1.set_objective(obj_lobby_m06_n)
    sq_n_mezz_support1.set_objective(obj_lobby_m06_n)
    sq_n_cloud1_support1.set_objective(obj_lobby_m06_n)
    sq_n_cloud1_support2.set_objective(obj_lobby_m06_n)
    sq_n_cloud1_support3.set_objective(obj_lobby_m06_n)
    sq_n_cloud2_support1.set_objective(obj_lobby_m06_n)
    sq_n_cloud2_support2.set_objective(obj_lobby_m06_n)
    sq_n_cloud2_support3.set_objective(obj_lobby_m06_n)
    sq_n_cloud2_support4.set_objective(obj_lobby_m06_n)
    sq_n_pit_turret_support1.set_objective(obj_lobby_m06_n)

# South lobby ------------------------------------------------------------

startup thread sc_s_cloud1:
    sleep_until(pt_s_cloud_spawn.is_triggered())
    sleep(1)
    sq_s_cloud2_support2.set_task("0x7860D8AB")
    sq_s_cloud2_support2.place()
    sq_s_cloud1_support1.set_task("0x2257CE64")
    vex_cloud_drop(sq_s_cloud1, sq_s_cloud1__vex_cloud, sq_s_cloud1_support1)

startup thread sc_s_cloud2:
    sleep_until(pt_s_cloud_spawn.is_triggered())
    sleep(3)
    sq_s_cloud2_support1.set_task("0xBCF82E06")
    vex_cloud_drop(sq_s_cloud2, sq_s_cloud2__vex_cloud, sq_s_cloud2_support1)

startup thread sc_s_push:
    sleep_until(sq_s_cloud1_support1.alive_count() > 0)
    sleep_until(sq_s_cloud1_support1.alive_count() <= 1)
    sq_s_cloud1_support1.set_task("0xE312E136")
    sleep(1)
    sq_s_cloud1_support1.set_task("0xFD1E9768")
    sq_s_cloud2_support1.set_task("0xFD1E9768")
    sleep_until(sq_s_cloud2_support2.alive_count() <= 1)
    sq_s_cloud2_support2.set_task("0x9D29E053")
    sleep_until(pt_s_mid_spawn.is_triggered())
    sq_s_cloud2_support2.set_task("0xB357694F")

startup thread sc_s_back:
    sleep_until(pt_s_back_spawn.is_triggered())
    sleep(1)
    sq_s_back_support1.set_task("0xD1A64DC8")
    sq_s_back_support2.set_task("0xD1A64DC8")
    sq_s_back_support1.place()
    sq_s_back_support2.place()
    sleep_until(pt_n_plat_spawn.is_triggered())
    sq_s_back_support1.set_task("0x2B95E7DD")
    sq_s_back_support2.set_task("0x2B95E7DD")

# North lobby ------------------------------------------------------------

startup thread sc_n_plat:
    sleep_until(pt_n_plat_spawn.is_triggered())
    sleep(2)
    sq_n_plat_support1.set_task("0xED68DC31")
    sq_n_mezz_support1.set_task("0xED68DC31")
    sq_n_plat_support1.place()
    sq_n_mezz_support1.place()
    sq_n_pit_turret.place()
    sleep_until(sq_s_back_support1.alive_count() + sq_s_back_support2.alive_count() == 0)
    sq_n_plat_support1.set_task("0x2305F0E6")
    sq_n_mezz_support1.set_task("0x2305F0E6")

startup thread sc_n_cloud1:
    sleep_until(pt_n_pit_approach.is_triggered())
    sleep(1)
    sq_n_cloud1_support1.set_task("0x473E6AE2")
    sq_n_cloud1_support2.set_task("0xFCE82AE8")
    sq_n_cloud1_support3.set_task("0x8680E5C4")
    sq_n_cloud1.place()
    sq_n_cloud1__vex_cloud.execute(cs_vex_cloud())
    sleep(1)
    sq_n_cloud1__vex_cloud.drop_squad(sq_n_cloud1_support3); sleep_until(not sq_n_cloud1__vex_cloud.is_dropping())
    sq_n_cloud1__vex_cloud.drop_squad(sq_n_cloud1_support2); sleep_until(not sq_n_cloud1__vex_cloud.is_dropping())
    sq_n_cloud1__vex_cloud.drop_squad(sq_n_cloud1_support1); sleep_until(not sq_n_cloud1__vex_cloud.is_dropping())
    sq_n_cloud1.remove()

startup thread sc_n_cloud2:
    sleep_until(pt_n_pit_approach.is_triggered())
    sleep(6)
    sq_n_cloud2_support3.set_task("0x63D77DA2")
    sq_n_cloud2_support4.set_task("0x63D77DA2")
    sq_n_cloud2.place()
    sq_n_cloud2__vex_cloud.execute(cs_vex_cloud())
    sleep(1)
    sq_n_cloud2__vex_cloud.drop_squad(sq_n_cloud2_support3); sleep_until(not sq_n_cloud2__vex_cloud.is_dropping())
    sq_n_cloud2__vex_cloud.drop_squad(sq_n_cloud2_support4); sleep_until(not sq_n_cloud2__vex_cloud.is_dropping())
    sq_n_cloud2.remove()

startup thread sc_n_push:
    sleep_until(sq_n_cloud2.alive_count() > 0)
    sleep_until(sq_n_cloud2.alive_count() == 0)
    sleep(2)
    sq_n_cloud1_support1.set_task("0x29B58723")
    sleep_until(sq_n_cloud1_support1.alive_count() <= 1 or sq_n_cloud1_support2.alive_count() <= 1)
    sq_n_cloud1_support1.set_task("0x04E91DB2")
    sq_n_cloud1_support2.set_task("0x04E91DB2")
    sq_n_cloud1_support3.set_task("0x04E91DB2")
    sleep(10)
    sq_n_cloud2_support3.set_task("0x6D75A9E7")
    sq_n_cloud2_support4.set_task("0x6D75A9E7")

# A Vex cloud: placed, it drops its squad and fades once the squad is down.
def vex_cloud_drop(cloud, pilot, sq):
    cloud.place()
    pilot.execute(cs_vex_cloud())
    sleep(1)
    pilot.drop_squad(sq); sleep_until(not pilot.is_dropping())
    cloud.remove()

command_script cs_vex_cloud():
    set_channel_scalar("0x80296344", 1)
