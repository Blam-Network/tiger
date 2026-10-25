# es\mars\enc_valley_amb1.es
#
# The Valley of Kings' ambient layer (bubble 26, a public bubble), loaded by
# every Mars activity and patrol that reaches the valley. Puts out the valley's
# props as soon as the bubble loads: the sunken warp gate and the cable at
# rest, the placement monitor's console and the patrol beacons. The Vex at
# the gate stand from the start too, and once the last of them dies the gate
# wakes and its teleport goes up.
# From the public host sessions of two captures: The Black Garden #5 and
# Exclusion Zone #4. Both served the same props at bubble entry. Only The
# Black Garden's run cleared the gate's Vex: the gate went to 1 and the
# teleports up 2.5 s after the last kill. Single run, unconfirmed; Exclusion
# Zone left with a Vex still up, and the patrol never had the valley on the
# wire, so whether the gate wakes outside The Black Garden is not known.
# Those captures are 2.3.1: TU0's bundle has one gate teleport and no large
# teleport or Taken haze.
# Not here: the Cabal encounters (scp_simple_*), the Taken blight, and
# Exclusion Zone's cage, cable and warp gate failure beats, which that
# mission drives.

@activity_bundle("enc_valley_amb1")

static_array<object, 3> patrol_beacons
object o_gate_teleport_start
countdown_placement scp_placement_monitor
encounter_handle scp_specops_gate
encounter_handle scp_specops_overload
# The gate's cloud (its dropship rows) never flew on the wire: the Vex were
# up at the first apply and came back on the encounter's own respawn timer.
@member_counts({_squad: [{hydra: 1}, {0xB4009D19: 1}, {minotaur: 1}, {minotaur: 1}, {minotaur: 1}, {minotaur: 1}]})
simple_encounter scp_vexcloud_gate
real gate_wake_delay = 2.5

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
    tasks = ["hydra", "0xB4009D19", "minotaurs", "minotaurs", "minotaurs", "minotaurs"]
    sleep_until(scp_vexcloud_gate._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        scp_vexcloud_gate._squad[i].set_objective(scp_vexcloud_gate._objective)
        scp_vexcloud_gate._squad[i].set_task(tasks[i])

@startup()
script sc_gate_wake():
    sleep_until(scp_vexcloud_gate._squad_group.alive_count() > 0)
    sleep_until(scp_vexcloud_gate._squad_group.alive_count() == 0)
    sleep(gate_wake_delay)
    scp_specops_gate.o_sunken_warpgate.set_device_position(1)
    o_gate_teleport_start.create()
