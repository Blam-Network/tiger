# es\city_tower\enc_city_tower_default1.es
#
# The Tower's activity root. It only waits for the fireteam to join.

@activity_bundle("enc_city_tower_default1")
c_fireteam_sensor_host host

startup thread sc_main_thread:
    while not host.t30_hack_bind_host():
        print("waiting for a fireteam to join")
        sleep(1)
    print("---------------------------------------------------------")
    print("CITY TOWER DEFAULT ACTIVITY")
    print("---------------------------------------------------------")
