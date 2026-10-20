# es\city_tower\enc_city_tower_default1.es
#
# The Tower's activity root. It only waits for the fireteam to join.

@activity_bundle("enc_city_tower_default1")
# The Tower's three states (default, Iron Banner, Queen) start in the bubble
# whose blueprint set loads the plaza, at its default spawn point.
@activity("city_tower_default1", "city_tower_iron_banner", "city_tower_queen")
@start_slice("plaza")

fireteam host

@startup()
script sc_main_thread():
    while not host.t30_hack_bind_host():
        print("waiting for a fireteam to join")
        sleep(1)
    print("---------------------------------------------------------")
    print("CITY TOWER DEFAULT ACTIVITY")
    print("---------------------------------------------------------")
