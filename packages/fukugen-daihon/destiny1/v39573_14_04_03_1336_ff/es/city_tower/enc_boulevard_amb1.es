# es\city_tower\enc_boulevard_amb1.es
#
# The boulevard (bubble 0): places its vendors, the CRM, avatar and New
# Monarchy ones. The 360 alpha's boulevard holds the Warlock vendors, the
# shaders and the clan vendor instead; its temperament for the New Monarchy
# vendor goes on all three. Not placed: the civilians, the walkers, the
# Mask, the test vendor and the avatar vendor's performance sensor.

@activity_bundle("enc_boulevard_amb1")

bool debug_boulevard
squad sq_boulevard_vendor_crm
squad sq_boulevard_vendor_avatar
squad sq_boulevard_vendor_nm

@startup()
script sc_main_boulevard_thread():
    sc_boulevard_vendor_crm.wake()
    sc_boulevard_vendor_avatar.wake()
    sc_boulevard_vendor_nm.wake()

script sc_boulevard_vendor_crm():
    if debug_boulevard:
        print("sc_boulevard_vendor_crm")
    sq_boulevard_vendor_crm.place()
    sq_boulevard_vendor_crm.activate_temperament("temper_tower_guard")

script sc_boulevard_vendor_avatar():
    if debug_boulevard:
        print("sc_boulevard_vendor_avatar")
    sq_boulevard_vendor_avatar.place()
    sq_boulevard_vendor_avatar.activate_temperament("temper_tower_guard")

script sc_boulevard_vendor_nm():
    if debug_boulevard:
        print("sc_boulevard_vendor_nm")
    sq_boulevard_vendor_nm.place()
    sq_boulevard_vendor_nm.activate_temperament("temper_tower_guard")
