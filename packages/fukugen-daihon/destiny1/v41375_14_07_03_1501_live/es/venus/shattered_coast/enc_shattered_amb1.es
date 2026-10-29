# es\venus\shattered_coast\enc_shattered_amb1.es
#
# The shattered coast's ambient layer (Venus' public bubble 20, where the
# Venus story missions and patrol land): the patrol beacons, mission 1's two
# sensors and their cages, and the Fallen along the street, at the academy
# entrance, toward the headlands and at the outpost.
#
# From three of its hosts: act_venus_m01_engineering's (2026-10-25
# 19-45-22#2, reached 160 s after it started, 308 s in it) and two fresh
# starts on the patrol (Patrol Venus#2, 785 s, and Patrol Venus#8, 186 s),
# with patrol_shat_com01's 2026-10-25 host (joined running) for the tasks:
# - On the ground when the player arrived, in all three: the entrance, the
#   headlands pair and both street encounters, and the outpost's Fallen,
#   23 bodies. The costs are the bodies the server placed and the budget
#   that set. Where the start was on the wire (Patrol Venus#8) the outpost's
#   ship flew in 5 s after the bubble came up and dropped its Fallen 12 s
#   later, as TU0's dropship_encounter does.
# - A wiped encounter comes back after its cooldown, once no player is in
#   its area (the later returns, 47-140 s, are read as that). The
#   street pair and the entrance came back 40.6-41.6 s after a wipe (twelve
#   returns over the three runs): 40 s. The outpost's ship was back 22-41 s
#   after its Fallen were wiped (five times; it then flew 11-13 s before
#   dropping them and left 19-21 s after): 22 s. The headlands pair came
#   back 8.5-21 s after a wipe (seven times; twice later, 56 and 310 s):
#   8 s.
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
    encounters.add_ambient_encounter(dropship_outpost, 5, 100, 20, 22, 0)
    encounters.add_ambient_encounter(simple_entrance, 5, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_headlands, 6, 100, 20, 8, 0)
    encounters.add_ambient_encounter(simple_street01, 4, 100, 20, 40, 0)
    encounters.add_ambient_encounter(simple_street02, 3, 100, 20, 40, 0)

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
