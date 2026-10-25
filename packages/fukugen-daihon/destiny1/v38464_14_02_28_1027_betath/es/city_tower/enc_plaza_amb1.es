# es\city_tower\enc_plaza_amb1.es
#
# Tower plaza ambience: places the vendors. The pre-alpha's plaza has four,
# the postmaster, cryptarch, PvE and Vanguard vendors (TU0's gunsmith, bounty
# and mtx vendors aren't there yet); their temperaments are the 360 alpha's.
# The mentors are in enc_underwatch_amb1, the hangar's vendors (Shaxx among
# them) in enc_military_amb1 and the boulevard's in enc_boulevard_amb1, each
# a bubble of its own here. Not placed: the droids, the civilians and the
# ball and balloon.

@activity_bundle("enc_plaza_amb1")

bool debug_plaza
squad sq_plaza_vendor_postmaster
squad sq_plaza_vendor_cryptarch
squad sq_plaza_vendor_pve
squad sq_plaza_vendor_vanguard

@startup()
script sc_main_plaza_thread():
    sc_plaza_vendor_postmasters.wake()
    sc_plaza_vendor_cryptarch.wake()
    sc_plaza_vendor_pve.wake()
    sc_plaza_vendor_vanguard.wake()

script sc_plaza_vendor_postmasters():
    if debug_plaza:
        print("sc_plaza_vendor_postmasters")
    sq_plaza_vendor_postmaster.place()
    sq_plaza_vendor_postmaster.activate_temperament("temper_tower_vendor")

script sc_plaza_vendor_cryptarch():
    if debug_plaza:
        print("sc_plaza_vendor_cryptarch")
    sq_plaza_vendor_cryptarch.place()
    sq_plaza_vendor_cryptarch.activate_temperament("temper_tower_guard")

script sc_plaza_vendor_pve():
    if debug_plaza:
        print("sc_plaza_vendor_pve")
    sq_plaza_vendor_pve.place()
    sq_plaza_vendor_pve.activate_temperament("temper_tower_vendor")

script sc_plaza_vendor_vanguard():
    if debug_plaza:
        print("sc_plaza_vendor_vanguard")
    sq_plaza_vendor_vanguard.place()
    sq_plaza_vendor_vanguard.activate_temperament("temper_tower_vendor")
