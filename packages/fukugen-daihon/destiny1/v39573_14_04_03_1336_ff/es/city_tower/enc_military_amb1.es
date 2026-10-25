# es\city_tower\enc_military_amb1.es
#
# The hangar (bubble 2): places its vendors and the guard droid. This
# build's hangar holds the shipwright, Future War Cult, Dead Orbit, the
# Vanguard and the black market; the gunsmith, Crucible and tournament
# vendors of the PS4 pre-alpha's hangar are gone (only the gunsmith's helpers
# remain). Temperaments are the 360 alpha's for the same vendors. Not placed:
# the helpers, sitters, standers, keyboarders, signalers, welders and walkers,
# and the hangar landing cinematics.

@activity_bundle("enc_military_amb1")

bool debug_military
squad sq_military_droid_guard1
squad vendor_ships
squad vendor_future_war_cult
squad vendor_dead_orbit
squad vendor_vanguard
squad vendor_black_market

@startup()
script sc_main_military_thread():
    sc_military_npcs_guards.wake()
    sc_military_vendors.wake()

script sc_military_npcs_guards():
    if debug_military:
        print("sc_military_npcs_guards")
    sq_military_droid_guard1.place()
    sq_military_droid_guard1.activate_temperament("temper_tower_guard")

script sc_military_vendors():
    if debug_military:
        print("sc_military_vendors")
    place_vendor(vendor_ships, "temper_tower_vendor")
    place_vendor(vendor_future_war_cult, "temper_tower_guard")
    place_vendor(vendor_dead_orbit, "temper_tower_guard")
    place_vendor(vendor_vanguard, "temper_tower_vendor")
    place_vendor(vendor_black_market, "temper_tower_guard")

def place_vendor(vendor, temperament):
    vendor.place()
    vendor.activate_temperament(temperament)
