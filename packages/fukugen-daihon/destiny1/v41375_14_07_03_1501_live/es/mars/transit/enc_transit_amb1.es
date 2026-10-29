# es\mars\transit\enc_transit_amb1.es
#
# The transit hub's ambient layer (Mars' public bubble 24): the patrol
# beacons and the Vex in the plaza, the lobby, the corner, the office and
# the pipe room, the last three each a wave of two encounters. Loaded by
# the patrol, the strikes and the story missions.
#
# Pooled over two fresh starts on the patrol's public hosts (Patrol Mars#4,
# 335 s, and #6, 407 s; the chests came out 64-88 s in both):
# - Up as the bubble loaded in both: the lobby bouncers, both plaza
#   encounters and the second corner encounter, and one of the office and
#   the pipe room waves (the pipe room in #4, the office in #6), 15 and 14
#   bodies: the budget is 15, and which of the two waves waits for room is
#   picked at random. The first corner encounter went in once there was
#   room (102 s in #4) and the bus never did. Later counts (18 in #6 at
#   219 s) include an office squad that had dropped out of sense at 131 s
#   and was not killed, so they do not set the budget.
# - The waves: the pipe room's second wave went in the moment the first was
#   wiped (#4, 29 s); the lobby's and the office's as the first was down to
#   one (#4 at 102 s, #6 at 12 s and 54 s). One run of each.
# - Wiped encounters came back 26-117 s later, when there was room: the
#   cooldown is the shortest return.
# - The costs are the bodies the server placed (the squads' cell counts); a
#   wave costs its larger wave. The lobby's second encounter put down three
#   on 2.3.1's two cells where TU0 has one member, so it keeps TU0's count;
#   the bus never went in and keeps TU0's bodies.
# - The tasks are the ones retail gave each squad at its placement, by
#   influencer; the squads' later moves are the task tree's own.
# Left out: the patrol VIP encounter (pf_encounter_simple_patrols_vip, never
# placed; the patrol's own), the bubble trigger, armed and never fired, and
# the music, which never played.

@activity_bundle("enc_transit_amb1")

static_array<object, 3> patrol_beacons
encounter_manager encounters
@member_counts({_squad: [{goblin: 2}, {minotaur: 1}]})
simple_encounter office_simple_encounter_wave1
@member_counts({_squad: [{hobgoblin: 2, goblin: 1}]})
simple_encounter office_simple_encounter_wave2
wave_encounter office_wave_encounter
@member_counts({_squad: [{goblins: 2, hobgoblin: 1}, {goblins: 1}]})
simple_encounter pipe_room_simple_encounter_wave1
@member_counts({_squad: [{goblins: 2, hobgoblin: 2}]})
simple_encounter pipe_room_simple_encounter_wave2
wave_encounter pipe_room_wave_encounter
@member_counts({_squad: [{minotaur: 1}, {0xB80F9586: 2}]})
simple_encounter lobby_bouncers_simple_encounter
simple_encounter lobby_bouncers_simple_encounter2
wave_encounter lobby_bouncers_wave_encounter
@member_counts({_squad: [{minotaur: 1, goblin: 2}]})
simple_encounter corner_simple_encounter
@member_counts({_squad: [{hobgoblin: 2}]})
simple_encounter corner_simple_encounter2
simple_encounter bus_simple_encounter
@member_counts({_squad: [{goblin: 3}]})
simple_encounter plaza_simple_encounter
@member_counts({_squad: [{harpy: 3}]})
simple_encounter plaza_simple_encounter2

@startup()
script sc_transit_props():
    for beacon in patrol_beacons:
        beacon.create()

@startup()
script ss_encounter_controller_thread():
    office_wave_encounter.add_wave(office_simple_encounter_wave1, 1)
    office_wave_encounter.add_wave(office_simple_encounter_wave2, 0)
    pipe_room_wave_encounter.add_wave(pipe_room_simple_encounter_wave1, 0)
    pipe_room_wave_encounter.add_wave(pipe_room_simple_encounter_wave2, 0)
    lobby_bouncers_wave_encounter.add_wave(lobby_bouncers_simple_encounter, 1)
    lobby_bouncers_wave_encounter.add_wave(lobby_bouncers_simple_encounter2, 0)

    encounters.actor_budget = 15
    encounters.add_ambient_encounter(lobby_bouncers_wave_encounter, 3, 100, 20, 26, 0)
    encounters.add_ambient_encounter(plaza_simple_encounter, 3, 100, 20, 26, 0)
    encounters.add_ambient_encounter(plaza_simple_encounter2, 3, 100, 20, 26, 0)
    encounters.add_ambient_encounter(corner_simple_encounter2, 2, 100, 20, 26, 0)

    # the manager starts them in order, so the wave added last is the one
    # left waiting for room
    waves = [office_wave_encounter, pipe_room_wave_encounter]
    costs = [3, 4]
    i_last = mathlib.random_int_never_highest_value(0, len(waves))
    for i in range(len(waves)):
        if i != i_last:
            encounters.add_ambient_encounter(waves[i], costs[i], 100, 20, 26, 0)
    encounters.add_ambient_encounter(waves[i_last], costs[i_last], 100, 20, 26, 0)

    encounters.add_ambient_encounter(corner_simple_encounter, 3, 100, 20, 26, 0)
    # never placed on the wire: TU0's default bodies
    encounters.add_ambient_encounter(bus_simple_encounter, 2, 100, 20, 26, 30)

@startup()
# TU0's squads carry no objective of their own, so each takes its
# encounter's objective and the task retail gave it (by influencer) once the
# encounter has placed it; the first task for the bus, never seen up.
script sc_office_wave1_tasks():
    assign_tasks(office_simple_encounter_wave1, ["outer", "0xA21827B6"])

@startup()
script sc_office_wave2_tasks():
    assign_tasks(office_simple_encounter_wave2, ["back"])

@startup()
script sc_pipe_room_wave1_tasks():
    assign_tasks(pipe_room_simple_encounter_wave1, ["task", "outer"])

@startup()
script sc_pipe_room_wave2_tasks():
    assign_tasks(pipe_room_simple_encounter_wave2, ["0x388F5180"])

@startup()
script sc_lobby_bouncers_tasks():
    assign_tasks(lobby_bouncers_simple_encounter, ["task", "task_1"])

@startup()
script sc_lobby_bouncers2_tasks():
    assign_tasks(lobby_bouncers_simple_encounter2, ["task"])

@startup()
script sc_corner_tasks():
    assign_tasks(corner_simple_encounter, ["0x7F078672"])

@startup()
script sc_corner2_tasks():
    assign_tasks(corner_simple_encounter2, ["task"])

@startup()
script sc_bus_tasks():
    assign_tasks(bus_simple_encounter, ["task_1"])

@startup()
script sc_plaza_tasks():
    assign_tasks(plaza_simple_encounter, ["fallback"])

@startup()
script sc_plaza2_tasks():
    assign_tasks(plaza_simple_encounter2, ["0xCF8C255A"])

def assign_tasks(enc, tasks):
    sleep_until(enc._squad_group.alive_count() > 0)
    for i in range(len(tasks)):
        enc._squad[i].set_objective(enc._objective)
        enc._squad[i].set_task(tasks[i])
