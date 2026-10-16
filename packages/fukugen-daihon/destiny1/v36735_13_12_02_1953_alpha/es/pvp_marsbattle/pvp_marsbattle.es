@activity_bundle("pvp")
c_pvp_controller pvp_controller
c_pvp_slayer slayer
c_pvp_slayer_ffa slayer_ffa
c_pvp_dominion dominion
c_pvp_salvage salvage
c_player_script_iterator player_iterator
string_hash slayer_hash = "slayer"
string_hash slayer_ffa_hash = "slayer_ffa"
string_hash dominion_hash = "dominion"
string_hash salvage_hash = "salvage"
static_array<c_object_sensor_host, 4> pikes
c_object_sensor_host interceptors
static_array<c_object_sensor_host, 3> turrets
static_array<c_object_sensor_host, 2> heavy_ammo
static_array<c_object_sensor_host, 3> special_ammo






startup thread main:
    pvp_controller.register_game_type(slayer, slayer_hash)
    pvp_controller.register_game_type(dominion, dominion_hash)
    pvp_controller.register_game_type(slayer_ffa, slayer_ffa_hash)
    pvp_controller.register_game_type(salvage, salvage_hash)
    pvp_controller.run()


    print("sleeping until players are ready")
    sleep_until(c_player_script_utilities.all_players_are_ready())
    print("players ready")
    player_iterator.begin()
    first_player = player_iterator.get_sensor()
    sleep_until(not first_player.is_dead())
    print("first player spawned")
    for pike in pikes:
        pike.create_anew()
        print("NEW PIKE")

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 82260001
