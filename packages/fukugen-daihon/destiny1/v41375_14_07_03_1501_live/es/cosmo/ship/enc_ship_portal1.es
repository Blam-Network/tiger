# es\cosmo\ship\enc_ship_portal1.es
#
# Devils' Lair, the ship (Sepiks Prime): kill the guards to drop the boss's
# shield, then fight the servitor. It teleports around while shanks and
# reinforcements come in.

@activity_bundle("enc_ship_portal1")
c_squad_sensor_host sq_bossbattle_boss01
c_objective_sensor_host obj_bossbattle_fallen  # true name unknown
c_squad_sensor_host sq_bossbattle_reinf01
c_squad_sensor_host sq_bossbattle_reinf02
c_squad_sensor_host sq_bossbattle_dropsquad01
c_squad_sensor_host sq_bossbattle_dropsquad02
c_squad_sensor_host sq_bossbattle_sweeper01
c_squad_sensor_host sq_bossbattle_shanks01
c_squad_sensor_host sq_bossbattle_shanks02
c_squad_sensor_host sq_bossbattle_shanks03
c_squad_sensor_host sq_bossbattle_shanks04
c_squad_sensor_host sq_bossbattle_anticheese01
c_squad_sensor_host sq_bossbattle_anticheese02
c_squad_sensor_host sq_bossbattle_fallen01
c_squad_sensor_host sq_bossbattle_fallen02
c_squad_sensor_host sq_bossbattle_fallen03
c_squad_sensor_host sq_bossbattle_fallen04
c_player_trigger_sensor_host pt_play_s01_x120  # true name unknown
c_sequence_host seq_soulfx_a  # true name unknown
c_sequence_host seq_soulfx_b  # true name unknown
c_sequence_host seq_soulfx_c  # true name unknown
c_sequence_host seq_soulfx_d  # true name unknown
c_sequence_host seq_soulfx_e  # true name unknown
c_sequence_host seq_soulfx_f  # true name unknown
c_sequence_host seq_soulfx_g  # true name unknown
c_sequence_host seq_soulfx_h  # true name unknown
c_object_filter_sensor_host of_ultra_servitor
c_hop_on_sensor_host ho_servitor_performance_shield01  # true name unknown
c_trigger_volume_slot_host tv_arenaentry01
c_player_trigger_sensor_host pt_arenaentry01 bind(tv_arenaentry01)  # true name unknown
c_object_sensor_host o_sepix_stim
c_objective_sensor_host obj_ship_trash  # true name unknown

startup thread sc_ship_main:
    sq_bossbattle_boss01.set_objective(obj_bossbattle_fallen)
    sq_bossbattle_reinf01.set_objective(obj_bossbattle_fallen)
    sq_bossbattle_reinf02.set_objective(obj_bossbattle_fallen)
    sq_bossbattle_dropsquad01.set_objective(obj_bossbattle_fallen)
    sq_bossbattle_dropsquad02.set_objective(obj_bossbattle_fallen)
    sq_bossbattle_sweeper01.set_objective(obj_bossbattle_fallen)
    sq_bossbattle_shanks01.set_objective(obj_bossbattle_fallen)
    sq_bossbattle_shanks02.set_objective(obj_bossbattle_fallen)
    sq_bossbattle_shanks03.set_objective(obj_bossbattle_fallen)
    sq_bossbattle_shanks04.set_objective(obj_bossbattle_fallen)
    sq_bossbattle_anticheese01.set_objective(obj_bossbattle_fallen)
    sq_bossbattle_anticheese02.set_objective(obj_bossbattle_fallen)
    guard(sq_bossbattle_fallen01, "forward_push")
    guard(sq_bossbattle_fallen02, "default_fallen01")
    guard(sq_bossbattle_fallen03, "default_fallen02")
    guard(sq_bossbattle_fallen04, "group")
    sc_boss_entrance.wake()
    sc_arena.wake()
    sc_guards.wake()

thread sc_boss_entrance:
    sleep_until(pt_play_s01_x120.is_triggered())
    seq_soulfx_a.start()
    seq_soulfx_b.start()
    seq_soulfx_c.start()
    seq_soulfx_d.start()
    seq_soulfx_e.start()
    seq_soulfx_f.start()
    seq_soulfx_g.start()
    seq_soulfx_h.start()
    place_on_task(sq_bossbattle_boss01, "zone03")
    of_ultra_servitor.add(sq_bossbattle_boss01)
    sleep(1)
    ho_servitor_performance_shield01.set_filter(of_ultra_servitor)

thread sc_arena:
    sleep_until(pt_arenaentry01.is_triggered())
    sleep(13)
    o_sepix_stim.create()

thread sc_guards:
    sleep_until(guards_alive_count() > 0)
    sleep_until(guards_alive_count() == 0)
    sleep(10)
    ho_servitor_performance_shield01.clear_filter()
    sleep(1)
    seq_soulfx_a.stop()
    seq_soulfx_b.stop()
    seq_soulfx_c.stop()
    seq_soulfx_d.stop()
    seq_soulfx_e.stop()
    seq_soulfx_f.stop()
    seq_soulfx_g.stop()
    seq_soulfx_h.stop()

thread sc_boss_fight:
    sleep(9)
    sq_bossbattle_boss01.set_task("boss")
    place_on_task(sq_bossbattle_shanks01, "dropsquad01")
    place_on_task(sq_bossbattle_shanks02, "dropsquad02")
    place_on_task(sq_bossbattle_shanks03, "0xC2BCD7F6")
    place_on_task(sq_bossbattle_shanks04, "shanks01")
    sleep(24)
    sq_bossbattle_boss01.set_task("zone03")
    sleep(4)
    sq_bossbattle_boss01.set_task("boss")
    place_on_task(sq_bossbattle_reinf01, "zone05")
    place_on_task(sq_bossbattle_reinf02, "zone04")
    sleep(36)
    sq_bossbattle_boss01.set_task("zone03")
    sleep(4)
    patrol("teleport_on")
    patrol("zone01")
    patrol("teleport_on")
    patrol("zone02")
    patrol("0xFA33A175")

def patrol(task):
    if sq_bossbattle_boss01.alive_count() > 0:
        sq_bossbattle_boss01.set_task(task)
        sleep(12)

def guard(sq, task):
    sq.set_objective(obj_ship_trash)
    sq.set_task(task)
    sq.place()

def guards_alive_count():
    return sq_bossbattle_fallen01.alive_count() + sq_bossbattle_fallen02.alive_count() + sq_bossbattle_fallen03.alive_count()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
