# es\mars\mesa\enc_mesa_amb1.es
#
# The mesa's ambient layer (Mars' public bubble 14): the patrol beacons, the
# dynamic props and the parked vehicles, the three button placements, and
# the Cabal around the garage, the gate tunnel, the tower, the grotto, the
# carrot and the landing zones.
#
# From three fresh starts: act_mars_m05_warbase's public hosts
# (2026-10-26 23-39-22#5, 176 s, chests out 59-83 s, and 2026-11-01
# 00-28-50#7, 271 s, chests out 61-87 s) and the patrol's mesa host (Patrol
# Mars#10, 115 s):
# - Up at load in all three: the grotto's troops (on the ground, no ship),
#   the carrot, the garage front, the tower's first wave and the tunnel's
#   front, with the garage's psions in one run and its interior squad in
#   the other two, never both: the two are kept apart. 22 bodies in the run
#   with the psions, the budget (21 in the other two).
# - The tower is a wave: its second squads went in 0.6 and 1.7 s after the
#   first were down to two bodies (two runs), and the whole tower came back
#   52 s after the second wave was wiped (once; in m05's 2026-11-01 host it
#   was not back 90 s after, the player still in the bubble). The tunnel's
#   rear never went in.
# - The grotto's troops came back by ship 31 and 53 s after they were wiped
#   (two runs); lz_west's ship came in 1.2 s after the tower wave ended,
#   when there was room under the budget (2026-10-26), and lz_path's 16 s
#   after the garage, the tunnel and the grotto were all wiped at once
#   (2026-11-01, two squads of two). Each landing zone went in once, the
#   other never.
# - The costs are the bodies the server placed. lz_east never went in, with
#   room under the budget, so it stays out of the manager. TU0's
#   dropship_encounter always flies in, so the grotto comes by ship from
#   the start.
# - pf_placement_button was used in both of m05's hosts: the
#   countdown_placement archetype's own device run; the mission holds the
#   flag that unlocks it.
# Left out: the music, the task changes the task tree made by itself, and
# the 2.x content on the 2026-11-01 host (a mini Taken invasion from 111 s,
# when the Cabal at the garage, the tunnel and the grotto went down
# together, and the House of Wolves quest bundle).

@activity_bundle("enc_mesa_amb1")

static_array<object, 2> patrol_beacons
static_array<object, 10> dynamics
static_array<object, 3> vehicles
countdown_placement pf_placement_ch3_button
countdown_placement pf_placement_button
countdown_placement pf_obj_mesa_garage_placement
encounter_manager encounters
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 2}]})
dropship_encounter sp_dropship_grotto
@member_counts({_squad: [{centurion: 1, legionary: 2}]})
dropship_encounter sp_dropship_lz_west
dropship_encounter sp_dropship_lz_path
@member_counts({_squad: [{psion: 2}]})
simple_encounter sp_simple_carrot
@member_counts({_squad: [{0x3715BE01: 3}]})
simple_encounter sp_simple_garage_ext
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 2, 0xACEB567F: 1}]})
simple_encounter sp_simple_garage_int
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 4}]})
simple_encounter sp_simple_garage_psions
wave_encounter sp_wave_tower
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 1}, {0x3715BE01: 2}]})
simple_encounter sp_simple_tower1
@member_counts({_squad: [{anchor: 1, 0x3715BE01: 1}, {anchor: 1, 0x3715BE01: 1}]})
simple_encounter sp_simple_tower2
wave_encounter sp_wave_tunnel
@member_counts({_squad: [{anchor: 1}, {anchor: 1, 0x3715BE01: 2, 0xACEB567F: 1}]})
simple_encounter sp_simple_tunnel_front
simple_encounter sp_simple_tunnel_rear

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()
    for prop in dynamics:
        prop.create()
    for vehicle in vehicles:
        vehicle.create()

@startup()
script ss_encounter_controller_thread():
    sp_wave_tower.add_wave(sp_simple_tower1, 2)
    sp_wave_tower.add_wave(sp_simple_tower2, 0)
    sp_wave_tunnel.add_wave(sp_simple_tunnel_front, 2)
    sp_wave_tunnel.add_wave(sp_simple_tunnel_rear, 0)
    encounters.actor_budget = 22
    encounters.add_exclusion(sp_simple_garage_int, sp_simple_garage_psions)
    encounters.add_ambient_encounter(sp_dropship_grotto, 3, 100, 20, 31, 0)
    encounters.add_ambient_encounter(sp_simple_carrot, 2, 100, 20, 31, 0)
    encounters.add_ambient_encounter(sp_simple_garage_ext, 3, 100, 20, 31, 0)
    encounters.add_ambient_encounter(sp_simple_garage_psions, 5, 100, 20, 31, 0)
    encounters.add_ambient_encounter(sp_simple_garage_int, 4, 100, 20, 31, 0)
    encounters.add_ambient_encounter(sp_wave_tower, 4, 100, 20, 52, 0)
    encounters.add_ambient_encounter(sp_wave_tunnel, 5, 100, 20, 31, 0)
    encounters.add_ambient_encounter(sp_dropship_lz_west, 3, 100, 20, 31, 30)
    encounters.add_ambient_encounter(sp_dropship_lz_path, 4, 100, 20, 31, 30)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them (by influencer), and TU0's first task for the tunnel's rear, never
# placed.
script sc_grotto_tasks():
    assign_tasks(sp_dropship_grotto, ["0xEB52E3A9"])

@startup()
script sc_lz_west_tasks():
    assign_tasks(sp_dropship_lz_west, ["0x904EC313"])

@startup()
script sc_lz_path_tasks():
    assign_tasks(sp_dropship_lz_path, ["0x793C8E5B", "0xFCAD7221"])

@startup()
script sc_carrot_tasks():
    assign_tasks(sp_simple_carrot, ["0xA45573A7"])

@startup()
script sc_garage_ext_tasks():
    assign_tasks(sp_simple_garage_ext, ["0x56340E8D"])

@startup()
script sc_garage_int_tasks():
    assign_tasks(sp_simple_garage_int, ["0x3849F9A0"])

@startup()
script sc_garage_psions_tasks():
    assign_tasks(sp_simple_garage_psions, ["0x3849F9A0"])

@startup()
script sc_tower1_tasks():
    assign_tasks(sp_simple_tower1, ["0xED3FB761", "0x396B337D"])

@startup()
script sc_tower2_tasks():
    assign_tasks(sp_simple_tower2, ["0xB3AF8C1C", "0x0D53715E"])

@startup()
script sc_tunnel_front_tasks():
    assign_tasks(sp_simple_tunnel_front, ["0xF35586B6", "0xACA8BB15"])

@startup()
script sc_tunnel_rear_tasks():
    assign_tasks(sp_simple_tunnel_rear, ["0xF9DBEEF1"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
