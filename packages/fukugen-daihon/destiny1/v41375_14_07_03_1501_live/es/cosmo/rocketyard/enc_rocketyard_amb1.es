# es\cosmo\rocketyard\enc_rocketyard_amb1.es
#
# The rocketyard's ambient layer (public bubble 20): Fallen at the front,
# the centre and the command building, Hive at the front, the centre, the
# turntable and the platform.
#
# Pooled over the Cosmodrome patrol's three fresh starts of the bubble
# (2026-10-29 Patrol Earth#11, #18, #20; 76 s, 37 s and 52 s) and the host
# cosmo_portal_1 came back to (2026-10-03, joined running, 75 s).
# - At load six of the eight were up, 22-23 bodies, and two held back for
#   room: the command building's two and the centre's in one run, a command
#   building one and another in each of the others, so the manager's pick
#   varies; the Hive at the front, the platform and the turntable were up
#   in all three. The costs below are the bodies each placed, the budget
#   the largest set seen (23), the list order the 37 s run's.
# - A wipe let a held one in 1-13 s later (three times), and a wiped
#   encounter came back itself 23 s after its wipe once (the turntable's,
#   with the command building's first still held). One run each.
# - The body counts are the fresh starts'. The patrol beacons were out. The
#   music never played.

@activity_bundle("enc_rocketyard_amb1")

static_array<object, 3> patrol_beacons
encounter_manager encounters
@member_counts({_squad: [{servitor: 1}, {dreg: 2}]})
simple_encounter amb_smpl_fallen_front02
@member_counts({_squad: [{vandal: 2}, {dreg: 2}]})
simple_encounter amb_smpl_fallen_command01
@member_counts({_squad: [{dreg: 3}, {servitor: 1}]})
simple_encounter amb_smpl_fallen_command02
@member_counts({_squad: [{trooper: 3}, {knight: 1}]})
simple_encounter amb_smpl_hive_front01
@member_counts({_squad: [{vandal: 1}, {dreg: 3}]})
simple_encounter amb_smpl_fallen_center01
@member_counts({_squad: [{trooper: 3}, {knight: 1}]})
simple_encounter amb_smpl_hive_center01
@member_counts({_squad: [{trooper: 2}, {knight: 2}]})
simple_encounter amb_smpl_hive_turntable01
@member_counts({_squad: [{trooper: 3}]})
simple_encounter amb_smpl_hive_platform01

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 23
    encounters.add_ambient_encounter(amb_smpl_hive_front01, 4, 100, 20, 22, 0)
    encounters.add_ambient_encounter(amb_smpl_hive_platform01, 3, 100, 20, 22, 0)
    encounters.add_ambient_encounter(amb_smpl_hive_turntable01, 4, 100, 20, 22, 0)
    encounters.add_ambient_encounter(amb_smpl_fallen_front02, 3, 100, 20, 22, 0)
    encounters.add_ambient_encounter(amb_smpl_hive_center01, 4, 100, 20, 22, 0)
    encounters.add_ambient_encounter(amb_smpl_fallen_command01, 4, 100, 20, 22, 0)
    encounters.add_ambient_encounter(amb_smpl_fallen_center01, 4, 100, 20, 22, 0)
    encounters.add_ambient_encounter(amb_smpl_fallen_command02, 4, 100, 20, 22, 0)

@startup()
# TU0's squads carry no objective of their own, so each takes its
# encounter's objective and the task retail's squads were on (by
# influencer) once the encounter has placed it.
script sc_fallen_front02_tasks():
    assign_tasks(amb_smpl_fallen_front02, ["task_1", "task"])

@startup()
script sc_fallen_command02_tasks():
    assign_tasks(amb_smpl_fallen_command02, ["task_1", "task"])

@startup()
script sc_hive_front01_tasks():
    assign_tasks(amb_smpl_hive_front01, ["task", "task"])

@startup()
script sc_fallen_center01_tasks():
    assign_tasks(amb_smpl_fallen_center01, ["task", "task_1"])

@startup()
script sc_hive_center01_tasks():
    assign_tasks(amb_smpl_hive_center01, ["task", "task_1"])

@startup()
script sc_hive_turntable01_tasks():
    assign_tasks(amb_smpl_hive_turntable01, ["task", "task"])

@startup()
script sc_hive_platform01_tasks():
    assign_tasks(amb_smpl_hive_platform01, ["task"])

@startup()
script sc_fallen_command01_tasks():
    assign_tasks(amb_smpl_fallen_command01, ["task", "task"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
