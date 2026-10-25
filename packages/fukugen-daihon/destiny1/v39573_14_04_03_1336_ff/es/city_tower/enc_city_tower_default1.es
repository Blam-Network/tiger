# es\city_tower\enc_city_tower_default1.es
#
# The Tower's activity root. It only waits for the fireteam to join.

@activity_bundle("enc_city_tower_default1")
# The Tower starts in the bubble whose blueprint set loads the plaza (3), at
# its default spawn point. This build has only the default state (no Iron
# Banner or Queen activity).
@activity("city_tower_default1")
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
