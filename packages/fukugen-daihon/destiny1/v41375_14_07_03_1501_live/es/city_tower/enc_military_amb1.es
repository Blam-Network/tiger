# es\city_tower\enc_military_amb1.es
#
# The hangar (bubble 2): the shipwright, the Vanguard quartermaster, Dead
# Orbit and the Future War Cult at their posts, with the hangar's helpers,
# sitters, standers, signaler, welders and repair droid, each on their idle
# performance. Only one of the Hunter clubhouse's two sitter groups is out.
# From the two 2.3.1 visits that went into the hangar (A Guardian Rises #5,
# 2026-10-28_15-52-52 #1; one of each sitter group): everyone else was placed
# in both. Not placed in either: the black market (Xur). The guard droid is
# not in 2.3.1's bundle.

@activity_bundle("enc_military_amb1")

bool debug_military
squad vendor_ships
squad vendor_vanguard
squad vendor_future_war_cult
squad vendor_dead_orbit
performance vendor_performance_sensor_ships
performance vendor_performance_sensor_vanguard
performance vendor_performance_sensor_fwc
performance vendor_performance_sensor_do
squad hunter_clubhouse_sitters1
squad hunter_clubhouse_sitters2
squad hunter_clubhouse_keyboarders1
squad future_war_cult_sitters1
squad future_war_cult_sitters2
squad dead_orbit_standers
squad vendor_ships_helpers1
squad vendor_weapons_helpers1
squad ship_signalers
squad ship_welders
squad sq_droid_repair
performance npc_hunter_clubhouse_sitter1_2
performance npc_hunter_clubhouse_sitter1_3
performance npc_hunter_clubhouse_sitter2_1
performance npc_hunter_clubhouse_sitter2_2
performance npc_hunter_clubhouse_sitter2_3
performance npc_hunter_clubhouse_keyboarder
performance npc_fwc_sitter1
performance npc_fwc_sitter2
performance npc_fwc_sitter3
performance npc_do_stander1
performance npc_do_stander2
performance npc_vendor_ship_helper1
performance npc_vendor_ship_helper2
performance npc_vendor_weapons_helper1
performance npc_vendor_weapons_helper2
performance npc_vendor_weapons_helper3
performance npc_ship_signaler
performance npc_welder
performance npc_droid_repair

@startup()
script sc_main_military_thread():
    sc_military_vendors.wake()
    sc_military_npcs.wake()

# Temperaments are the 360 alpha's for the same vendors.
script sc_military_vendors():
    if debug_military:
        print("sc_military_vendors")
    place_vendor(vendor_ships, "temper_tower_vendor")
    vendor_performance_sensor_ships.start_performance("0x5331B1AC")
    place_vendor(vendor_vanguard, "temper_tower_vendor")
    vendor_performance_sensor_vanguard.start_performance("0x30346F90")
    place_vendor(vendor_future_war_cult, "temper_tower_guard")
    vendor_performance_sensor_fwc.start_performance("0x7AD88D29")
    place_vendor(vendor_dead_orbit, "temper_tower_guard")
    vendor_performance_sensor_do.start_performance("0xE51D73FD")

script sc_military_npcs():
    if debug_military:
        print("sc_military_npcs")
    if random_chance(0.5):
        hunter_clubhouse_sitters1.place()
        npc_hunter_clubhouse_sitter1_2.start_performance("0xD454ED66")
        npc_hunter_clubhouse_sitter1_3.start_performance("0xD454ED67")
    else:
        hunter_clubhouse_sitters2.place()
        npc_hunter_clubhouse_sitter2_1.start_performance("0xD454ED65")
        npc_hunter_clubhouse_sitter2_2.start_performance("0xD454ED66")
        npc_hunter_clubhouse_sitter2_3.start_performance("0xD454ED67")
    hunter_clubhouse_keyboarders1.place()
    npc_hunter_clubhouse_keyboarder.start_performance("0xC2C0EFEF")
    future_war_cult_sitters1.place()
    future_war_cult_sitters2.place()
    npc_fwc_sitter1.start_performance("0xD454ED67")
    npc_fwc_sitter2.start_performance("0xD454ED65")
    npc_fwc_sitter3.start_performance("0x348470D6")
    dead_orbit_standers.place()
    npc_do_stander1.start_performance("0x83D76C66")
    npc_do_stander2.start_performance("0xFBBFF840")
    vendor_ships_helpers1.place()
    npc_vendor_ship_helper1.start_performance("0xE395C2A9")
    npc_vendor_ship_helper2.start_performance("0xBFA88CC6")
    vendor_weapons_helpers1.place()
    npc_vendor_weapons_helper1.start_performance("0xC2C0EFEF")
    npc_vendor_weapons_helper2.start_performance("0xFBBFF843")
    npc_vendor_weapons_helper3.start_performance("0xD668C109")
    ship_signalers.place()
    npc_ship_signaler.start_performance("0x4DB3F162")
    ship_welders.place()
    npc_welder.start_performance("0xF80059EF")
    sq_droid_repair.place()
    npc_droid_repair.start_performance("0xBE73739E")

def place_vendor(vendor, temperament):
    vendor.place()
    vendor.activate_temperament(temperament)

def random_chance(chance):
    return mathlib.random_real(1) <= chance
