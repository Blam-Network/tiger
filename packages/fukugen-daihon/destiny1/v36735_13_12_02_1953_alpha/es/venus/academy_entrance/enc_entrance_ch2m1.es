@activity_bundle("enc_entrance_ch2m1")

u_globals utils
location entrance
player_monitor pm_bubble_entrance bind(entrance)
@task(0x3CB10C27, squad: sq_fallen_captain)
@task(0x15E7E700, condition: b_init)
@task(0x6CED22A4, squad: sq_fallen_minions01)
@task(0xA66C4401, squad: sq_fallen_minions03)
@task(0x8138828B, squad: sqg_fallen_sniper)
objective obj_entrance_ch2m1
@member_counts({cell_1: 4})
@objective(obj_entrance_ch2m1)
squad sq_fallen_minions01
@member_counts({cell_1: 3})
@objective(obj_entrance_ch2m1)
squad sq_fallen_minions02a
@member_counts({cell_1: 3})
@objective(obj_entrance_ch2m1)
squad sq_fallen_minions02b
@member_counts({cell_1: 3})
@objective(obj_entrance_ch2m1)
squad sq_fallen_minions03
@member_counts({cell_1: 1})
@objective(obj_entrance_ch2m1)
squad sq_fallen_minions04
@member_counts({cell_1: 1})
@objective(obj_entrance_ch2m1)
squad sq_fallen_minions05
@member_counts({ch2m1_captain: 0})
@objective(obj_entrance_ch2m1)
squad sq_fallen_captain
squad_member sq_fallen_captain__ch2m1_captain
health captain_health
trigger_volume tv_fallback
trigger_volume tv_reinf
player_trigger pt_reinf bind(tv_reinf)
squad_group sg_fallen
squad_group sqg_fallen_sniper
bool b_init
loot_entrance loot_venus_entrance_1










@startup()
script ss_entrance_ch2m1():
    print("script startup")

    sg_fallen.add_child(sq_fallen_minions01)
    sg_fallen.add_child(sq_fallen_captain)
    sqg_fallen_sniper.add_child(sq_fallen_minions04)
    sqg_fallen_sniper.add_child(sq_fallen_minions05)
    captain_health.bind_combatant(sq_fallen_captain__ch2m1_captain)
    sleep_until(pm_bubble_entrance.test_any_inside())



    sq_fallen_minions01.place()
    sq_fallen_minions03.place()
    sq_fallen_minions04.place()
    sq_fallen_minions05.place()

    sleep_until(pt_reinf.is_triggered())
    sq_fallen_minions02a.place()
    sq_fallen_minions02b.place()

script ch2m1_objective():
    sq_fallen_captain.place()
    sleep_until(captain_health.is_ready(), 0.5)
    sleep_until(captain_health.get_health_fraction() < 0.75)
    b_init = true
    print("Fallback by damage")
    sleep_until(sq_fallen_captain.alive_count() < 1)
    sleep(5)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8009
