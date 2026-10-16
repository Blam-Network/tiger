@activity_bundle("pvp")
c_pvp_controller pvp_controller
c_pvp_slayer slayer
c_pvp_dominion dominion
c_pvp_salvage salvage
c_pvp_slayer_ffa slayer_ffa
string_hash slayer_hash = "slayer"
string_hash dominion_hash = "dominion"
string_hash salvage_hash = "salvage"
string_hash slayer_ffa_hash = "slayer_ffa"
c_object_sensor_host heavy_ammo
static_array<c_object_sensor_host, 2> special_ammo


startup thread main:
    pvp_controller.register_game_type(slayer, slayer_hash)
    pvp_controller.register_game_type(dominion, dominion_hash)
    pvp_controller.register_game_type(salvage, salvage_hash)
    pvp_controller.register_game_type(slayer_ffa, slayer_ffa_hash)
    pvp_controller.run()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 82236001
