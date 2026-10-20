# es\venus\academy_dig_site\enc_dig_site_strike1.es
#
# The strike's dig site encounter.

@activity_bundle("enc_dig_site_strike1")

squad_group sg_fallen
@member_counts({fallen: 4}) squad sq_strike09
@member_counts({fallen: 4}) squad sq_strike10
squad_group sqg_strike05
squad sq_strike05a
squad sq_strike05b
squad sq_strike05c
@member_counts({goblin: 2}) squad sq_strike01
@member_counts({goblin: 3}) squad sq_strike02
@member_counts({goblin: 4}) squad sq_strike03
@member_counts({hobgoblin: 2}) squad sq_strike04
@member_counts({cell_1: 2}) squad sq_strike06
@member_counts({goblin: 3}) squad sq_strike08
location dig_site
player_monitor pm_bubble_dig_site bind(dig_site)
trigger_volume tv_dig_site_suicide
player_trigger pt_dig_site_suicide bind(tv_dig_site_suicide)
@member_counts({cell_1: 6}) squad sq_strike07
trigger_volume tv_dig_site_hydra
player_trigger pt_dig_site_hydra bind(tv_dig_site_hydra)

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
