# es\cosmo\highway\enc_highway_m0.es
#
# The highway in A Guardian Rises. Waits for the player to come in after the
# intro, then lets them spawn and releases the pigeons.

c_location_sensor_host highway  # true name unknown
c_player_trigger_sensor_host pt_bubble bind(highway)  # true name unknown
c_object_sensor_host pigeon_1
c_object_sensor_host pigeon_2
c_object_sensor_host pigeon_3
c_object_sensor_host pigeon_4
c_object_sensor_host pigeon_5
c_object_sensor_host pigeon_6
c_object_sensor_host pigeon_7
c_object_sensor_host pigeon_8
c_object_sensor_host pigeon_9
c_object_sensor_host pigeon_10
c_object_sensor_host pigeon_11
c_object_sensor_host pigeon_12
c_object_sensor_host pigeon_13
c_object_sensor_host pigeon_14
c_object_sensor_host pigeon_15
c_object_sensor_host pigeon_16
c_object_sensor_host pigeon_17
c_object_sensor_host pigeon_18
c_object_sensor_host pigeon_19
c_object_sensor_host pigeon_20
c_object_sensor_host pigeon_21
c_object_sensor_host pigeon_22

startup thread sc_highway_main:
    sleep_until(pt_bubble.is_triggered())
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.active)
    sleep_until(c_player_script_utilities.all_players_are_ready())
    pigeon_1.create()
    pigeon_2.create()
    pigeon_3.create()
    pigeon_4.create()
    pigeon_5.create()
    pigeon_6.create()
    pigeon_7.create()
    pigeon_8.create()
    pigeon_9.create()
    pigeon_10.create()
    pigeon_11.create()
    pigeon_12.create()
    pigeon_13.create()
    pigeon_14.create()
    pigeon_15.create()
    pigeon_16.create()
    pigeon_17.create()
    pigeon_18.create()
    pigeon_19.create()
    pigeon_20.create()
    pigeon_21.create()
    pigeon_22.create()
