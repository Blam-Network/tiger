@activity_bundle("enc_dig_site_strike1")

u_globals utils
location dig_site
player_monitor pm_bubble_dig_site bind(dig_site)
@member_counts({goblin: 2})
@objective(obj_dig_site)
squad sq_strike01
@member_counts({goblin: 3})
@objective(obj_dig_site)
squad sq_strike02
@member_counts({goblin: 4})
@objective(obj_dig_site)
squad sq_strike03
@member_counts({hobgoblin: 2})
@objective(obj_dig_site)
squad sq_strike04
@member_counts({harpies: 1})
@objective(obj_dig_site)
squad sq_strike05a
@member_counts({harpies: 1})
@objective(obj_dig_site)
squad sq_strike05b
@member_counts({harpies: 1})
@objective(obj_dig_site)
squad sq_strike05c
@member_counts({cell_1: 2})
@objective(obj_dig_site)
squad sq_strike06
@member_counts({cell_1: 6})
@objective(obj_dig_site)
squad sq_strike07
@member_counts({hydra: 1, goblin: 3})
@objective(obj_dig_site)
squad sq_strike08
@member_counts({fallen: 4})
@objective(obj_dig_site)
squad sq_strike09
@member_counts({fallen: 4})
@objective(obj_dig_site)
squad sq_strike10
squad_group sg_fallen
squad_group sqg_strike05
@task(0x5BDE39C3, squad: sq_strike08)
@task("fallen", squad: sg_fallen)
@task(0x4C6E1126, squad: sq_strike07)
@task("harpies", squad: sqg_strike05)
@task("sniper", squad: sq_strike04)
@task("anchor", squad: sq_strike06)
objective obj_dig_site
trigger_volume tv_dig_site_suicide
player_trigger pt_dig_site_suicide bind(tv_dig_site_suicide)
trigger_volume tv_dig_site_hydra
player_trigger pt_dig_site_hydra bind(tv_dig_site_hydra)
loot_dig_site loot_venus_dig_site_1









@startup()
script sc_main_thread():
    sg_fallen.add_child(sq_strike09)
    sg_fallen.add_child(sq_strike10)
    sqg_strike05.add_child(sq_strike05a)
    sqg_strike05.add_child(sq_strike05b)
    sqg_strike05.add_child(sq_strike05c)

    sq_strike01.place()
    sq_strike02.place()
    sq_strike03.place()
    sq_strike04.place()
    sq_strike05a.place()
    sq_strike05b.place()
    sq_strike05c.place()
    sq_strike06.place()
    sq_strike08.place()
    sq_strike10.place()

    sleep_until(pt_dig_site_hydra.is_triggered())
    sq_strike09.place()

    sleep_until(pt_dig_site_suicide.is_triggered())
    sq_strike07.place()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8019
