# es\cosmo\ship\enc_ship_portal1.es
#
# Devils' Lair, the ship (Sepiks Prime): kill the guards to drop the boss's
# shield, then fight the servitor. It teleports around while shanks and
# reinforcements come in, and its adds die with it.
#
# The servitor comes in blind and deaf under its shield and wakes as the last
# guard dies, with the stim; the shield goes 8 s later. In the one capture
# that moment is also 13 s after pt_arenaentry01, so the arena trigger could
# be the real cue.

@activity_bundle("enc_ship_portal1")

squad sq_bossbattle_boss01
squad_member sq_bossbattle_boss01__servitor
objective obj_bossbattle_fallen
@member_counts({dregs: 2, vandal: 1})
squad sq_bossbattle_reinf01
@member_counts({dregs: 2, vandal: 1})
squad sq_bossbattle_reinf02
squad sq_bossbattle_dropsquad01
squad sq_bossbattle_dropsquad02
squad sq_bossbattle_sweeper01
@member_counts({shanks_a: 2})
squad sq_bossbattle_shanks01
@member_counts({shanks_a: 2})
squad sq_bossbattle_shanks02
@member_counts({shanks_a: 2})
squad sq_bossbattle_shanks03
@member_counts({shanks_a: 2})
squad sq_bossbattle_shanks04
squad sq_bossbattle_anticheese01
squad sq_bossbattle_anticheese02
@member_counts({dreg01: 1, dreg02: 1, vandal01: 1})
squad sq_bossbattle_fallen01
@member_counts({dreg01: 1, dreg02: 1, vandal01: 1})
squad sq_bossbattle_fallen02
@member_counts({dreg01: 1, dreg02: 1})
squad sq_bossbattle_fallen03
@member_counts({dreg01: 1, dreg02: 1})
squad sq_bossbattle_fallen04
player_trigger pt_play_s01_x120
sequence seq_soulfx_a
sequence seq_soulfx_b
sequence seq_soulfx_c
sequence seq_soulfx_d
sequence seq_soulfx_e
sequence seq_soulfx_f
sequence seq_soulfx_g
sequence seq_soulfx_h
object_filter of_ultra_servitor
hop_on ho_servitor_performance_shield01
object o_sepix_stim
objective obj_ship_trash

@startup()
script sc_ship_main():
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
    sc_guards.wake()

script sc_boss_entrance():
    sleep_until(pt_play_s01_x120.is_triggered())
    seq_soulfx_a.start()
    seq_soulfx_b.start()
    seq_soulfx_c.start()
    seq_soulfx_d.start()
    seq_soulfx_e.start()
    seq_soulfx_f.start()
    seq_soulfx_g.start()
    seq_soulfx_h.start()
    sq_bossbattle_boss01__servitor.set_blind(true)
    sq_bossbattle_boss01__servitor.set_deaf(true)
    place_on_task(sq_bossbattle_boss01, "zone03")
    of_ultra_servitor.add(sq_bossbattle_boss01)
    sleep(1)
    ho_servitor_performance_shield01.set_filter(of_ultra_servitor)

script sc_guards():
    sleep_until(guards_alive_count() > 0)
    sleep_until(guards_alive_count() == 0)
    sq_bossbattle_boss01__servitor.set_blind(false)
    sq_bossbattle_boss01__servitor.set_deaf(false)
    o_sepix_stim.create()
    sleep(8)
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

script sc_boss_fight():
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

# Sepiks Prime is dead: the fight stops sending squads and whatever still
# stands dies with him
def end_boss_fight():
    sc_boss_fight.kill()
    for sq in [sq_bossbattle_shanks01, sq_bossbattle_shanks02, sq_bossbattle_shanks03, sq_bossbattle_shanks04, sq_bossbattle_reinf01, sq_bossbattle_reinf02, sq_bossbattle_fallen01, sq_bossbattle_fallen02, sq_bossbattle_fallen03, sq_bossbattle_fallen04]:
        sq.kill()

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
