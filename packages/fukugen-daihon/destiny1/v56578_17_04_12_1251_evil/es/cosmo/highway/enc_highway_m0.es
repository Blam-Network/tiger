# es\cosmo\highway\enc_highway_m0.es
#
# The highway in A Guardian Rises. Waits for the player to come in after the
# intro, then lets them spawn and releases the pigeons.

@activity_bundle("enc_highway_m0")

location highway
player_trigger pt_bubble bind(highway)
object pigeon_1
object pigeon_2
object pigeon_3
object pigeon_4
object pigeon_5
object pigeon_6
object pigeon_7
object pigeon_8
object pigeon_9
object pigeon_10
object pigeon_11
object pigeon_12
object pigeon_13
object pigeon_14
object pigeon_15
object pigeon_16
object pigeon_17
object pigeon_18
object pigeon_19
object pigeon_20
object pigeon_21
object pigeon_22

@startup()
script sc_highway_main():
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
