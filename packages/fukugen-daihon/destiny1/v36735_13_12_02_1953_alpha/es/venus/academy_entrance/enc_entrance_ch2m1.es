@activity_bundle("enc_entrance_ch2m1")
u_globals utils
c_location_sensor_host entrance  # true name unknown
c_player_monitor_sensor_host pm_bubble_entrance bind(entrance)  # true name unknown
c_objective_sensor_host obj_entrance_ch2m1  # true name unknown
c_squad_sensor_host sq_fallen_minions01
c_squad_sensor_host sq_fallen_minions02a
c_squad_sensor_host sq_fallen_minions02b
c_squad_sensor_host sq_fallen_minions03
c_squad_sensor_host sq_fallen_minions04
c_squad_sensor_host sq_fallen_minions05
c_squad_sensor_host sq_fallen_captain
c_squad_member_sensor_host sq_fallen_captain__ch2m1_captain  # true name unknown
c_health_sensor_host captain_health  # true name unknown
c_trigger_volume_slot_host tv_fallback
c_trigger_volume_slot_host tv_reinf
c_player_trigger_sensor_host pt_reinf bind(tv_reinf)  # true name unknown
c_squad_group_sensor_host sg_fallen  # true name unknown
c_squad_group_sensor_host sqg_fallen_sniper  # true name unknown
bool b_init
loot_entrance loot_venus_entrance_1










startup thread ss_entrance_ch2m1:
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

thread ch2m1_objective:
    sq_fallen_captain.place()
    sleep_until(captain_health.is_ready(), 0.5)
    sleep_until(captain_health.get_health_fraction() < 0.75)
    b_init = true
    print("Fallback by damage")
    sleep_until(sq_fallen_captain.alive_count() < 1)
    sleep(5)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8009
