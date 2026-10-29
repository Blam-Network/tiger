# es\mars\valley\enc_valley_amb1.es
#
# The Valley of Kings' ambient layer (bubble 26, a public bubble), loaded by
# every Mars activity and patrol that reaches the valley: the valley's
# props, the Cabal at the strike line and the outpost, and the Vex at the
# sunken gate.
#
# From five public host sessions: The Black Garden #5 and Exclusion Zone #4
# (earlier drops), act_mars_m01_valley's valley host (2026-10-26 23-24-32#4,
# fresh, chests out 60-85 s, 129 s), the patrol's (Patrol Mars#12, fresh,
# chests 62-87 s, 203 s) and act_mars_m07_lowergarden's (2026-10-26
# 23-57-02#5, joined running).
# - Props, in all five: the sunken warp gate and the cable at rest, the
#   placement monitor's console and the patrol beacons out at bubble entry.
# - The gate's Vex stand from the start, under their own encounter, and
#   came back on its respawn timer; their cloud (the dropship rows) never
#   flew.
# - The Cabal: up at load in both fresh starts, the strike line's left,
#   anchor, mid and back squads, the outpost's front and left, and one more
#   (the strike line's right in the patrol's, the outpost's back2 in
#   m01's), 17-18 bodies; the strike line's right went in 1.6 s after
#   back2 was wiped, so the budget is 18. The outpost's back and back2 were
#   never up together (back alone in m07's joined host): kept apart, and
#   back2 goes in ahead of the strike line's right, as in m01's run. The
#   costs are the bodies the server placed.
# - A wiped Cabal encounter came back 10-11 s after its wipe when nothing
#   held it (the strike anchor, the outpost's left), the cooldown; the
#   strike line's left and back took 42 s.
# - The gate does not wake on its Vex alone: on the patrol's host all six
#   were dead by 94 s and the gate stayed at rest to the end, 109 s later.
#   It woke in The Black Garden's run (2.5 s after the last kill) and was
#   up in m07's joined host, so the wake is that mission's
#   (act_mars_m07_lowergarden_mission2), not this script's.
# Those captures are 2.3.1: TU0's bundle has one gate teleport and no large
# teleport or Taken haze.
# Not here: the Taken blight, act_mars_m01_valley's monitor cage and cable
# run as the monitor is used (one run), and Exclusion Zone's cage, cable and
# warp gate failure beats, which that mission drives.

@activity_bundle("enc_valley_amb1")

static_array<object, 3> patrol_beacons
object o_gate_teleport_start
countdown_placement scp_placement_monitor
encounter_handle scp_specops_gate
encounter_handle scp_specops_overload
@member_counts({_squad: [{hydra: 1}, {hobgoblin: 1}, {minotaur: 1}, {minotaur: 1}, {minotaur: 1}, {minotaur: 1}]})
simple_encounter scp_vexcloud_gate
encounter_manager encounters
@member_counts({_squad: [{0xA142AFF2: 1, phalanx: 1}, {centurion: 1}]})
simple_encounter scp_simple_strike_left
@member_counts({_squad: [{0xBF95E58C: 1}]})
simple_encounter scp_simple_strike_anchor
@member_counts({_squad: [{legionary: 2, centurion: 1}]})
simple_encounter scp_simple_strike_mid
@member_counts({_squad: [{0xA142AFF2: 2}]})
simple_encounter scp_simple_strike_back
@member_counts({_squad: [{legionary: 2, 0xA142AFF2: 1}]})
simple_encounter scp_simple_strike_right
@member_counts({_squad: [{legionary: 2}, {phalanx: 2}]})
simple_encounter scp_simple_outpost_front
@member_counts({_squad: [{phalanx: 2}]})
simple_encounter scp_simple_outpost_left
@member_counts({_squad: [{legionary: 2}]})
simple_encounter scp_simple_outpost_back
@member_counts({_squad: [{legionary: 2}]})
simple_encounter scp_simple_outpost_back2

@startup()
script sc_valley_props():
    for beacon in patrol_beacons:
        beacon.create()
    for o in [scp_specops_gate.o_sunken_warpgate, scp_specops_overload.o_valley_cable]:
        o.create()
        o.set_device_position(0)

@startup()
script sc_vexcloud_gate():
    scp_vexcloud_gate.activate()
    assign_tasks(scp_vexcloud_gate, ["hydra", "0xB4009D19", "minotaurs", "minotaurs", "minotaurs", "minotaurs"])

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 18
    encounters.add_exclusion(scp_simple_outpost_back, scp_simple_outpost_back2)
    encounters.add_ambient_encounter(scp_simple_strike_left, 3, 100, 20, 10, 0)
    encounters.add_ambient_encounter(scp_simple_strike_anchor, 1, 100, 20, 10, 0)
    encounters.add_ambient_encounter(scp_simple_strike_mid, 3, 100, 20, 10, 0)
    encounters.add_ambient_encounter(scp_simple_strike_back, 2, 100, 20, 10, 0)
    encounters.add_ambient_encounter(scp_simple_outpost_front, 4, 100, 20, 10, 0)
    encounters.add_ambient_encounter(scp_simple_outpost_left, 2, 100, 20, 10, 0)
    encounters.add_ambient_encounter(scp_simple_outpost_back2, 2, 100, 20, 10, 0)
    encounters.add_ambient_encounter(scp_simple_strike_right, 3, 100, 20, 10, 0)
    encounters.add_ambient_encounter(scp_simple_outpost_back, 2, 100, 20, 10, 0)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them (by influencer).
script sc_strike_left_tasks():
    assign_tasks(scp_simple_strike_left, ["0xC5100AF9", "0xEA36B269"])

@startup()
script sc_strike_anchor_tasks():
    assign_tasks(scp_simple_strike_anchor, ["0x90C7BA45"])

@startup()
script sc_strike_mid_tasks():
    assign_tasks(scp_simple_strike_mid, ["0xCF60B2E4"])

@startup()
script sc_strike_back_tasks():
    assign_tasks(scp_simple_strike_back, ["0xAD75D1BF"])

@startup()
script sc_strike_right_tasks():
    assign_tasks(scp_simple_strike_right, ["0x5C3F0944"])

@startup()
script sc_outpost_front_tasks():
    assign_tasks(scp_simple_outpost_front, ["0xC5116F7E", "0x963EA488"])

@startup()
script sc_outpost_left_tasks():
    assign_tasks(scp_simple_outpost_left, ["default"])

@startup()
script sc_outpost_back_tasks():
    assign_tasks(scp_simple_outpost_back, ["task"])

@startup()
script sc_outpost_back2_tasks():
    assign_tasks(scp_simple_outpost_back2, ["default"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
