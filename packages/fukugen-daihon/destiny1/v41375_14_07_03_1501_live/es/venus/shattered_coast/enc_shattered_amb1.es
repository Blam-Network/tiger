# es\venus\shattered_coast\enc_shattered_amb1.es
#
# The shattered coast's ambient layer (Venus' public bubble 20, where the
# Venus story missions and patrol land): the patrol beacons, mission 1's two
# sensors and their cages, and the Fallen along the street, at the academy
# entrance, toward the headlands and at the outpost.
#
# From act_venus_m01_engineering's public host (2026-10-25 19-45-22#2),
# which the player reached 160 s after it started and stayed in for 308 s,
# with patrol_shat_com01's host (joined running) for the tasks:
# - On the ground when the player arrived: the outpost's Fallen (with no
#   ship in sight), the entrance, the headlands pair and both street
#   encounters, 23 bodies. The costs are the bodies the server placed and
#   the budget that set.
# - The street pair and the entrance were each placed again 41 s after they
#   were wiped. The outpost's ship came in 34 s after its Fallen were wiped,
#   dropped them 12 s later and left 20 s after that. TU0's
#   dropship_encounter flies its squads in, so the outpost's Fallen come by
#   ship from the start too.
# - The headlands pair came back 56 s after its first wipe (the player was
#   near) and 9 s after its second, once all five had gone together; the
#   cooldown is the other encounters' 41 s.
# - Each sensor's cage went up 2 s after the player started using it, and
#   opened 2 s after the sensor's device was all the way over (11 and 18 s
#   of use), then was gone a second later. act_venus_m01_engineering's
#   mission has the player use the sensors.
# Left out: the outpost's simple encounter, the entrance dropship and the
# street and baby shat squads, never placed in a capture; the music.

@activity_bundle("enc_shattered_amb1")

static_array<object, 3> patrol_beacons
# mission 1's sensors, under the identifiers its objective listens on
interactable_placement pf_sensor01 bind("0x6C824792")
interactable_placement pf_sensor02 bind("0x6C824791")
object o_m1_sensor_cage_a
object o_m1_sensor_cage_b
encounter_manager encounters
@member_counts({_squad: [{dregs: 3, vandal: 2}]})
dropship_encounter dropship_outpost
@member_counts({_squad: [{dreg: 3, vandal: 2}]})
simple_encounter simple_entrance
@member_counts({_squad: [{dreg: 3, vandal: 2}, {0xEF78C037: 1}]})
simple_encounter simple_headlands
@member_counts({_squad: [{dregs: 3, vandals: 1}]})
simple_encounter simple_street01
@member_counts({_squad: [{shanks: 3}]})
simple_encounter simple_street02

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 23
    encounters.add_ambient_encounter(dropship_outpost, 5, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_entrance, 5, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_headlands, 6, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_street01, 4, 100, 20, 41, 0)
    encounters.add_ambient_encounter(simple_street02, 3, 100, 20, 41, 0)

@startup()
# TU0's squads carry no objective of their own, so each takes its encounter's
# objective and task once the encounter has placed it: the tasks retail gave
# them.
script sc_dropship_outpost_tasks():
    assign_tasks(dropship_outpost, ["inner"])

@startup()
script sc_entrance_tasks():
    assign_tasks(simple_entrance, ["outer"])

@startup()
script sc_headlands_tasks():
    assign_tasks(simple_headlands, ["inner", "outer"])

@startup()
script sc_street01_tasks():
    assign_tasks(simple_street01, ["inner"])

@startup()
script sc_street02_tasks():
    assign_tasks(simple_street02, ["outer"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])

@startup()
script sc_sensor01_cage():
    sensor_cage(pf_sensor01, o_m1_sensor_cage_a)

@startup()
script sc_sensor02_cage():
    sensor_cage(pf_sensor02, o_m1_sensor_cage_b)

# The cage goes up over a sensor while it is in use and opens once the
# sensor is done; should the sensor's device not get there, it opens about
# when the two uses seen did. Seen once per sensor; each later use is the
# natural reading.
def sensor_cage(sensor, cage):
    while true:
        sleep_until(sensor._interactable.is_active())
        sleep(2)
        cage.create()
        sleep_until_timeout(sensor._device.get_device_position() >= 1, 14)
        sleep(2)
        cage.set_device_position(1)
        sleep(1)
        cage.delete_object()
        sleep_until(not sensor._interactable.is_active())
