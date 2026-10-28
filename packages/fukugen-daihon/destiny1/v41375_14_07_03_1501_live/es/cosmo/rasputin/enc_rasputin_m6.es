# es\cosmo\rasputin\enc_rasputin_m6.es
#
# Rasputin's core in act_cosmo_m6_rasputin: the Hive in the hall and the
# control room on the way in, the core door, Rasputin's console, and the
# fight for the core, which the boss phase wakes (sc_core). The core's lights
# and doors stand from the bubble's start; the console goes dark as a player
# comes into the hall.
#
# From two retail 2.3.1 runs, the first with two wipes in the core. The
# second never set off the hall's trigger: nothing came in the hall or the
# control room and the console stayed as it was until the boss phase, so the
# control room waits on the hall, and the core door on its own trigger and a
# clear control room. 2.3.1 split the hall off into its own bundle
# (enc_rasputin_m6_hall) and rebuilt the core fight around the Omnigul, with
# the ultra ogre coming in late (142 s and 313 s into the fight); TU0 has
# neither the Omnigul nor that bundle, so the hall's rules are written on
# TU0's hall and core squads (thrall, knights and troopers as 2.3.1 placed
# them) and the ultra ogre takes the Omnigul's entrance. TU0's wizards in the
# hall, its core wizard and the minion squads have no 2.3.1 counterpart that
# settles when they come, so nothing places them.

@activity_bundle("enc_rasputin_m6")

objective obj_rasputin_m6
object o_core_lights
object o_door_core
object o_door_minion1
object o_door_minion2
object o_boss_spawn
interactable_placement sp_placement_console bind("0xC5DB982F")
player_trigger pt_hall
player_trigger pt_control
player_trigger pt_core
sequence seq_hive_announce
squad sq_hall_knight
squad_member sq_hall_knight__knight
squad sq_hall_thrall_a
squad sq_hall_thrall_b
squad sq_hall_trooper_a
squad sq_hall_trooper_b
squad sq_hall_trooper_c
squad sq_hall_trooper_d
squad sq_core_knight_a
squad_member sq_core_knight_a__knight
squad sq_core_knight_b
squad_member sq_core_knight_b__knight
squad sq_core_trooper_a
squad sq_core_trooper_b
squad sq_boss
squad_member sq_boss__ultra_ogre

@startup()
# the bubble's start: lights and doors up, the minion doors open, every
# squad against the core's objective
script sc_rasputin():
    o_core_lights.create()
    o_door_core.create()
    for door in [o_door_minion1, o_door_minion2]:
        door.create()
        door.set_device_position(1)
    for sq in [sq_hall_knight, sq_hall_thrall_a, sq_hall_thrall_b, sq_hall_trooper_a, sq_hall_trooper_b, sq_hall_trooper_c, sq_hall_trooper_d, sq_core_knight_a, sq_core_knight_b, sq_core_trooper_a, sq_core_trooper_b, sq_boss]:
        sq.set_objective(obj_rasputin_m6)

@startup()
# the hall: its thrall and knight as a player comes in, with the console
# going dark, the troopers five seconds behind them; then the control room's
# knights and troopers as a player reaches it (both runs: nothing in the
# control room without the hall first)
script sc_hall():
    sleep_until(pt_hall.is_triggered())
    sleep(0.5)
    sp_placement_console._object.set_device_position(0)
    sq_hall_thrall_a.place()
    sq_hall_thrall_b.place()
    sq_hall_knight.place()
    sleep(5)
    for sq in [sq_hall_trooper_a, sq_hall_trooper_b, sq_hall_trooper_c, sq_hall_trooper_d]:
        sq.place()
    sleep_until(pt_control.is_triggered())
    sleep(0.5)
    for sq in [sq_core_knight_a, sq_core_knight_b, sq_core_trooper_a, sq_core_trooper_b]:
        sq.place()

@startup()
# the core door: once a player is at it and the control room is clear (or
# never came), it opens four and a half seconds on and shuts four after
# (4.3 and 6.5 s in the two runs)
script sc_core_door():
    sleep_until(pt_core.is_triggered())
    sleep_until(control_alive_count() == 0)
    sleep(4.5)
    o_door_core.set_device_position(1)
    sleep(4)
    o_door_core.set_device_position(0)

# The fight for the core, from the boss phase's start: the console lit, the
# core's lights half up, the ultra ogre's entrance, and the Hive's
# announcement as the kill objective goes active. The same after a wipe,
# where the encounter starts over with the players already in the core (its
# door's trigger not set) and the console goes dark first, as at each of the
# first run's two retries.
script sc_core():
    if not pt_core.is_triggered():
        sp_placement_console._object.set_device_position(0)
    sleep(1)
    sp_placement_console._object.set_device_position(1)
    sleep(4)
    o_core_lights.set_device_position(0.5)
    sleep(5)
    o_boss_spawn.create()
    sleep(1)
    o_boss_spawn.set_device_position(1)
    sleep(3)
    sq_boss.place()
    sleep(4)
    seq_hive_announce.start()

def control_alive_count():
    return sq_core_knight_a.alive_count() + sq_core_knight_b.alive_count() + sq_core_trooper_a.alive_count() + sq_core_trooper_b.alive_count()
