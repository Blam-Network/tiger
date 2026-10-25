# es\city_tower\enc_plaza_amb1.es
#
# Tower plaza and underwatch ambience: places the vendors and mentors.
# Not placed: the test squad, Xur, the underwatch workers and walkers, and the
# balls and balloons (their rows are gone).

@activity_bundle("enc_plaza_amb1")

bool debug_plaza
squad sq_plaza_vendor_postmaster
squad sq_plaza_vendor_cryptarch
squad sq_plaza_vendor_gunsmith
squad sq_plaza_vendor_city_bounty
squad sq_plaza_vendor_mtx
bool debug_underwatch
squad sq_underwatch_vendor_guardian_mentor
squad sq_underwatch_vendor_hunter_mentor
squad sq_underwatch_vendor_warlock_mentor
squad sq_underwatch_shaxx
squad sq_underwatch_artcite

@startup()
script sc_main_plaza_thread():
    sc_plaza_vendor_postmasters.wake()
    sc_plaza_vendor_cryptarch.wake()
    sc_plaza_vendor_gunsmith.wake()
    sc_plaza_vendor_city_bounty.wake()
    sc_plaza_vendor_mtx.wake()

@startup()
script sc_main_underwatch_thread():
    sc_underwatch_vendor_guardian_mentor.wake()
    sc_underwatch_vendor_hunter_mentor.wake()
    sc_underwatch_vendor_warlock_mentor.wake()
    sc_underwatch_shaxx.wake()
    sc_underwatch_artcite.wake()

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

script sc_plaza_vendor_gunsmith():
    if debug_plaza:
        print("sc_plaza_vendor_gunsmith")
    sq_plaza_vendor_gunsmith.place()
    sq_plaza_vendor_gunsmith.activate_temperament("temper_tower_vendor")

script sc_plaza_vendor_city_bounty():
    if debug_plaza:
        print("sc_plaza_vendor_city_bounty")
    sq_plaza_vendor_city_bounty.place()
    sq_plaza_vendor_city_bounty.activate_temperament("temper_tower_vendor")

script sc_plaza_vendor_mtx():
    if debug_plaza:
        print("sc_plaza_vendor_mtx")
    sq_plaza_vendor_mtx.place()
    sq_plaza_vendor_mtx.activate_temperament("temper_tower_vendor")

script sc_underwatch_vendor_guardian_mentor():
    if debug_underwatch:
        print("Guardian Mentor: Spawn")
    sq_underwatch_vendor_guardian_mentor.place()
    sq_underwatch_vendor_guardian_mentor.activate_temperament("temper_tower_guard")

script sc_underwatch_vendor_hunter_mentor():
    if debug_underwatch:
        print("Hunter Mentor: Spawn")
    sq_underwatch_vendor_hunter_mentor.place()
    sq_underwatch_vendor_hunter_mentor.activate_temperament("temper_tower_guard")

script sc_underwatch_vendor_warlock_mentor():
    if debug_underwatch:
        print("Warlock Mentor: Spawn")
    sq_underwatch_vendor_warlock_mentor.place()
    sq_underwatch_vendor_warlock_mentor.activate_temperament("temper_tower_guard")

script sc_underwatch_shaxx():
    if debug_underwatch:
        print("Shaxx: Spawn")
    sq_underwatch_shaxx.place()
    sq_underwatch_shaxx.activate_temperament("temper_tower_vendor")

script sc_underwatch_artcite():
    if debug_underwatch:
        print("Artcite: Spawn")
    sq_underwatch_artcite.place()
    sq_underwatch_artcite.activate_temperament("temper_tower_vendor")
