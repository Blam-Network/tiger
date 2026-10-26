# es\cosmo\rocketyard\enc_rocketyard_amb1.es
#
# The rocketyard's ambient layer (public bubble 20): Fallen at the front,
# the centre and the command building, Hive at the front, the centre, the
# turntable and the platform.
#
# From one capture, and only a glimpse: the Cosmodrome patrol's public
# host that cosmo_portal_1 came back to (2026-10-03, 75 s), whose bubble
# had been running before the player joined it. Seven of the eight
# encounters were up at the first update and the command building's first
# Fallen (amb_smpl_fallen_command01) were not, so it is held back for room
# as the deltas and the Array hold one back; the costs are even, as
# nothing shows them. The Hive at the centre and the turntable were topped
# up 13-15 s in. Body counts are left at their defaults: the counts the
# wire carried had built up over the bubble's life before the capture, so
# they are not one placement's. When the encounters first go in, and how
# soon a wiped one comes back, are not on the wire; the 40 s return is the
# graveyard's and the Array's.
# The patrol beacons were out. The music never played.

@activity_bundle("enc_rocketyard_amb1")

static_array<object, 3> patrol_beacons
encounter_manager encounters
simple_encounter amb_smpl_fallen_front02
simple_encounter amb_smpl_fallen_command01
simple_encounter amb_smpl_fallen_command02
simple_encounter amb_smpl_hive_front01
simple_encounter amb_smpl_fallen_center01
simple_encounter amb_smpl_hive_center01
simple_encounter amb_smpl_hive_turntable01
simple_encounter amb_smpl_hive_platform01

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 7
    for enc in [amb_smpl_fallen_front02, amb_smpl_fallen_command02, amb_smpl_hive_front01, amb_smpl_fallen_center01, amb_smpl_hive_center01, amb_smpl_hive_turntable01, amb_smpl_hive_platform01, amb_smpl_fallen_command01]:
        encounters.add_ambient_encounter(enc, 1, 100, 20, 40, 0)

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
