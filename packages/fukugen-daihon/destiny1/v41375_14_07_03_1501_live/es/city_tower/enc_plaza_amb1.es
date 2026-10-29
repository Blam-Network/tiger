# es\city_tower\enc_plaza_amb1.es
#
# Tower plaza and underwatch ambience (bubble 3): the vendors and mentors,
# Shaxx and Arcite, and the underwatch's workers stand at their posts from the
# start, each on their idle performance; the ball and the balloon are out; the
# two walkers start on their first post. Pooled over eight retail 2.3.1
# visits (six fresh Tower instances, two joined running): everyone below
# was placed in every one, and only one of the two crate workers ever was
# (worker2 in six, worker1 in two).
# Not placed in any visit: the test squad and the black market (Xur). The
# droid greeters are not in 2.3.1's bundle. The ball and balloon are created
# anew over an instance's life (incarnation 31 in one joined running), never
# while a capture watched.

@activity_bundle("enc_plaza_amb1")

bool debug_plaza
squad sq_plaza_vendor_postmaster
squad sq_plaza_vendor_cryptarch
squad sq_plaza_vendor_gunsmith
squad sq_plaza_vendor_city_bounty
squad sq_plaza_vendor_mtx
object object_ball0
object object_balloon0
performance vendor_performance_sensor_postmaster
performance vendor_performance_sensor_cryptarch
performance vendor_performance_sensor_gunsmith
performance vendor_performance_sensor_city_bounty
bool debug_underwatch
squad sq_underwatch_vendor_guardian_mentor
squad sq_underwatch_vendor_hunter_mentor
squad sq_underwatch_vendor_warlock_mentor
squad sq_underwatch_shaxx
squad sq_underwatch_artcite
squad sq_underwatch_cannon_workers
squad sq_underwatch_workstation_workers
squad sq_underwatch_welder_workers
squad sq_underwatch_crate_workers
squad_member sq_underwatch_crate_workers__worker1
squad_member sq_underwatch_crate_workers__worker2
squad_member sq_underwatch_crate_workers__supervisor1
objective obj_underwatch_patrol_walkers1
objective obj_underwatch_patrol_walkers2
squad sq_underwatch_walkers1
squad sq_underwatch_walkers2
performance vendor_performance_sensor_titan
performance vendor_performance_sensor_hunter
performance vendor_performance_sensor_warlock
performance vendor_performance_sensor_shaxx
performance npc_shaxx_helper
performance vendor_performance_sensor_artcite
performance npc_underwatch_cannon_workers
performance npc_underwatch_workstation_workers
performance npc_underwatch_welder_worker
performance npc_underwatch_welder_supervisor
performance npc_underwatch_crate_workers1
performance npc_underwatch_crate_workers2
performance npc_underwatch_crate_supervisor

@startup()
script sc_main_plaza_thread():
    sc_plaza_vendor_postmasters.wake()
    sc_plaza_vendor_cryptarch.wake()
    sc_plaza_vendor_gunsmith.wake()
    sc_plaza_vendor_city_bounty.wake()
    sc_plaza_vendor_mtx.wake()
    object_ball0.create()
    object_balloon0.create()

@startup()
script sc_main_underwatch_thread():
    sc_underwatch_vendor_guardian_mentor.wake()
    sc_underwatch_vendor_hunter_mentor.wake()
    sc_underwatch_vendor_warlock_mentor.wake()
    sc_underwatch_shaxx.wake()
    sc_underwatch_artcite.wake()
    sc_underwatch_workers.wake()
    sc_underwatch_walkers.wake()

script sc_plaza_vendor_postmasters():
    if debug_plaza:
        print("sc_plaza_vendor_postmasters")
    sq_plaza_vendor_postmaster.place()
    sq_plaza_vendor_postmaster.activate_temperament("temper_tower_vendor")
    vendor_performance_sensor_postmaster.start_performance("0x30346F90")

script sc_plaza_vendor_cryptarch():
    if debug_plaza:
        print("sc_plaza_vendor_cryptarch")
    sq_plaza_vendor_cryptarch.place()
    sq_plaza_vendor_cryptarch.activate_temperament("temper_tower_guard")
    vendor_performance_sensor_cryptarch.start_performance("0xE51D73FD")

script sc_plaza_vendor_gunsmith():
    if debug_plaza:
        print("sc_plaza_vendor_gunsmith")
    sq_plaza_vendor_gunsmith.place()
    sq_plaza_vendor_gunsmith.activate_temperament("temper_tower_vendor")
    vendor_performance_sensor_gunsmith.start_performance("0xA01D0AD1")

script sc_plaza_vendor_city_bounty():
    if debug_plaza:
        print("sc_plaza_vendor_city_bounty")
    sq_plaza_vendor_city_bounty.place()
    sq_plaza_vendor_city_bounty.activate_temperament("temper_tower_vendor")
    vendor_performance_sensor_city_bounty.start_performance("0x1448DB86")

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
    vendor_performance_sensor_titan.start_performance("0xA01D0AD1")

script sc_underwatch_vendor_hunter_mentor():
    if debug_underwatch:
        print("Hunter Mentor: Spawn")
    sq_underwatch_vendor_hunter_mentor.place()
    sq_underwatch_vendor_hunter_mentor.activate_temperament("temper_tower_guard")
    vendor_performance_sensor_hunter.start_performance("0xD3B4F5DE")

script sc_underwatch_vendor_warlock_mentor():
    if debug_underwatch:
        print("Warlock Mentor: Spawn")
    sq_underwatch_vendor_warlock_mentor.place()
    sq_underwatch_vendor_warlock_mentor.activate_temperament("temper_tower_guard")
    vendor_performance_sensor_warlock.start_performance("0xA01D0AD1")

script sc_underwatch_shaxx():
    if debug_underwatch:
        print("Shaxx: Spawn")
    sq_underwatch_shaxx.place()
    sq_underwatch_shaxx.activate_temperament("temper_tower_vendor")
    vendor_performance_sensor_shaxx.start_performance("0x62D24173")
    npc_shaxx_helper.start_performance("0xCE0E7C8A")

script sc_underwatch_artcite():
    if debug_underwatch:
        print("Artcite: Spawn")
    sq_underwatch_artcite.place()
    sq_underwatch_artcite.activate_temperament("temper_tower_vendor")
    vendor_performance_sensor_artcite.start_performance("0x30346F90")

script sc_underwatch_workers():
    if debug_underwatch:
        print("Underwatch workers: Spawn")
    sq_underwatch_cannon_workers.place()
    npc_underwatch_cannon_workers.start_performance("0xC2C0EFEF")
    sq_underwatch_workstation_workers.place()
    npc_underwatch_workstation_workers.start_performance("0xC2C0EFEF")
    sq_underwatch_welder_workers.place()
    npc_underwatch_welder_worker.start_performance("0x43E2BF05")
    npc_underwatch_welder_supervisor.start_performance("0x409BBB47")
    # one crate worker of the two, with its own performance
    if random_chance(0.5):
        sq_underwatch_crate_workers__worker1.place()
        npc_underwatch_crate_workers1.start_performance("0x9096018D")
    else:
        sq_underwatch_crate_workers__worker2.place()
        npc_underwatch_crate_workers2.start_performance("0xD668C109")
    sq_underwatch_crate_workers__supervisor1.place()
    npc_underwatch_crate_supervisor.start_performance("0x409BBB47")

# The walkers' objectives each hold the same three posts. A fresh instance
# has both on patrol_point_1. They go round the three in order, always both
# in one update: 5-6.6 s apart in the first 40 s of five fresh instances,
# 1.3-40 s apart in the three long visits. What moves them on is not on the
# wire (their arrival is not), so they stay on the first post here.
script sc_underwatch_walkers():
    sq_underwatch_walkers1.set_objective(obj_underwatch_patrol_walkers1)
    sq_underwatch_walkers2.set_objective(obj_underwatch_patrol_walkers2)
    sq_underwatch_walkers1.set_task("patrol_point_1")
    sq_underwatch_walkers2.set_task("patrol_point_1")
    sq_underwatch_walkers1.place()
    sq_underwatch_walkers2.place()

def random_chance(chance):
    return mathlib.random_real(1) <= chance
