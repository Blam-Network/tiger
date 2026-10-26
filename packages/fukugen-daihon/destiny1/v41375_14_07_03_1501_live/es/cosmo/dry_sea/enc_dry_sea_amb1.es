# es\cosmo\dry_sea\enc_dry_sea_amb1.es
#
# The dry sea's ambient layer (public bubble 11): Fallen around the main
# ship and its nose, Rasputin's island, the rock plateau, the caves, the
# south shore and the hive shore, and the bounty placement.
#
# From one capture (act_cosmo_m2_dome_c's public host, 2026-10-24, the
# player in the bubble from 6 s to 175 s):
# - Eight encounters are on the ground at the bubble's load. The north
#   delta's Fallen go in about 40 s after the load, as the graveyard's back
#   lot Shanks do (enc_graveyard_amb1).
# - The main ship's Fallen came back 41 s after they were wiped; Rasputin's
#   island 35 s after, as the player left its volume.
# - The patrol beacons, the loose candy, the bounty's placement and mission
#   2's two antennas (obj_m2_o2b_placement, which act_cosmo_m2_dome_c's
#   mission 2 has the player use) are out from the load.
# - Each antenna's cage went in 1.2-1.6 s after the antenna was used, opened
#   9 s later (8.8-9.0 s, both antennas) and was cleaned up within a second
#   of going.
# Not here, because the wire did not show them or day0 has no archetype:
# the pikes and the dome C shed (never placed; the pikes' squad walks the
# amb_ptrl_pikes01 route), the hive shore's route (its squad was against
# the route's first leg and moved between the two legs every 3-6 s from
# 92 s on; day0 has no patrol route archetype, so it stays on its own
# objective). The music never played.

@activity_bundle("enc_dry_sea_amb1")

static_array<object, 2> patrol_beacons
static_array<object, 10> candy_dynamic_objects
interactable_placement ip_bounty_dry_sea2 bind("ip_bounty_dry_sea2")
# mission 2's antennas, under the identifiers its objective listens on
interactable_placement_set obj_m2_o2b_placement bind("0xC9A2CA78", "0x9742D95D")
interactable_incident_listener il_antenna1 bind("0xC9A2CA78")
interactable_incident_listener il_antenna2 bind("0x9742D95D")
object o_m02_antenna1_cage
object o_m02_antenna2_cage
encounter_manager encounters
@member_counts({_squad: [{vandal: 2, captain: 1}, {dreg: 3}]})
simple_encounter amb_smpl_mainship01
@member_counts({_squad: [{vandal: 2}]})
simple_encounter amb_smpl_shipnose01
@member_counts({_squad: [{dreg: 2}]})
simple_encounter amb_smpl_fallen_deltan01
@member_counts({_squad: [{dreg: 1, vandal: 1}]})
simple_encounter amb_smpl_hiveshore01
@member_counts({_squad: [{dreg: 2, vandal: 1}, {captain: 1, vandal: 1}]})
simple_encounter amb_smpl_raspisland01
@member_counts({_squad: [{major_vandal: 1, shank: 1}]})
simple_encounter amb_smpl_rockplateau01
@member_counts({_squad: [{dreg: 2}]})
simple_encounter amb_smpl_bigcave01
@member_counts({_squad: [{dreg: 1, shank: 1}]})
simple_encounter amb_smpl_caveopening01
@member_counts({_squad: [{shank: 2}]})
simple_encounter amb_smpl_southshore

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()
    for candy in candy_dynamic_objects:
        candy.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 25
    encounters.add_ambient_encounter(amb_smpl_mainship01, 6, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_smpl_shipnose01, 2, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_smpl_hiveshore01, 2, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_smpl_raspisland01, 5, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_smpl_rockplateau01, 2, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_smpl_bigcave01, 2, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_smpl_caveopening01, 2, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_smpl_southshore, 2, 100, 20, 40, 0)
    encounters.add_ambient_encounter(amb_smpl_fallen_deltan01, 2, 100, 20, 40, 40)

@startup()
# TU0's squads carry no objective of their own, so each takes its
# encounter's objective and the task retail gave it (by influencer) once the
# encounter has placed it.
script sc_mainship01_tasks():
    assign_tasks(amb_smpl_mainship01, ["inner", "inner"])

@startup()
script sc_shipnose01_tasks():
    assign_tasks(amb_smpl_shipnose01, ["inner"])

@startup()
script sc_fallen_deltan01_tasks():
    assign_tasks(amb_smpl_fallen_deltan01, ["task"])

@startup()
script sc_raspisland01_tasks():
    assign_tasks(amb_smpl_raspisland01, ["inner", "outer"])

@startup()
script sc_rockplateau01_tasks():
    assign_tasks(amb_smpl_rockplateau01, ["task"])

@startup()
script sc_bigcave01_tasks():
    assign_tasks(amb_smpl_bigcave01, ["task"])

@startup()
script sc_caveopening01_tasks():
    assign_tasks(amb_smpl_caveopening01, ["inner"])

@startup()
script sc_southshore_tasks():
    assign_tasks(amb_smpl_southshore, ["task"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])

@startup()
script sc_antenna1_cage():
    antenna_cage(il_antenna1, o_m02_antenna1_cage)

@startup()
script sc_antenna2_cage():
    antenna_cage(il_antenna2, o_m02_antenna2_cage)

def antenna_cage(listener, cage):
    sleep_until(listener.get_count() > 0)
    sleep(1)
    cage.create()
    sleep(9)
    cage.set_device_position(1)
    sleep_until(not cage.is_alive())
    cage.delete_object()
