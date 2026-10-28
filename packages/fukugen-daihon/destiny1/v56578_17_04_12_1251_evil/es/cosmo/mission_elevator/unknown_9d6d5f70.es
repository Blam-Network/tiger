# es\cosmo\mission_elevator\unknown_9d6d5f70.es
#
# The ball in the elevator mission, inside and up to its Taken boss. Taken
# wait at the foot of the ball as the bubble loads, under the area's Taken
# effects once the player is near; each trigger on the way up brings the next
# squads in: the ambush, the mid section, the ring (where the ambush's
# effects fade and come back), its two phalanxes, the lift. The boss phase
# (mission 4) spawns the boss in: it teleports between its points, and the
# boss trigger starts the fight and sends its psions.
#
# From one retail capture. The client never sensed the ball's squads, so no
# death shows in it and every wait here is a trigger or that run's timer.
# What the boss did after its psions came (two more teleports, a second
# channel phase, the snipers) followed its health, which nothing shows: it is
# left out. The objectives' task names after their first few look shifted
# against the squads that take them, so tasks are written as their hashes.

@activity_bundle(0x9D6D5F70)

objective mission_elevator_ball_objective
objective mission_elevator_boss_objective
@objective(mission_elevator_ball_objective)
squad elevator_squad
@objective(mission_elevator_ball_objective)
squad sniper_ambush_squad01
@objective(mission_elevator_ball_objective)
squad sniper_ambush_squad02
@objective(mission_elevator_ball_objective)
squad sniper_ambush_squad03
@objective(mission_elevator_ball_objective)
squad anchor_ambush_squad
@objective(mission_elevator_ball_objective)
squad lower_ambush_squad
@objective(mission_elevator_ball_objective)
squad taken_mid_squad01
@objective(mission_elevator_ball_objective)
squad taken_mid_squad02
@objective(mission_elevator_ball_objective)
squad sniper_mid_lower_squad
@objective(mission_elevator_ball_objective)
squad sniper_mid_upper_squad
@objective(mission_elevator_ball_objective)
squad anchor_mid_squad
@objective(mission_elevator_ball_objective)
squad fallen_mid_squad
@objective(mission_elevator_ball_objective)
squad fallen_ring_squad01
@objective(mission_elevator_ball_objective)
squad fallen_ring_squad02
@objective(mission_elevator_ball_objective)
squad sniper_ring_squad
@objective(mission_elevator_ball_objective)
squad phalanx_ring_squad01
@objective(mission_elevator_ball_objective)
squad phalanx_ring_squad02
@objective(mission_elevator_ball_objective)
squad lift_sniper_squad
@objective(mission_elevator_ball_objective)
squad lift_squad
@objective(mission_elevator_ball_objective)
squad lift_anchor_squad
@objective(mission_elevator_boss_objective)
squad boss_squad
squad_member boss_squad__boss
@objective(mission_elevator_boss_objective)
squad psion_boss_squad01
@objective(mission_elevator_boss_objective)
squad psion_boss_squad02
@objective(mission_elevator_boss_objective)
squad psion_boss_squad03
@objective(mission_elevator_boss_objective)
squad sniper_boss_center_squad
@objective(mission_elevator_boss_objective)
squad sniper_boss_left_squad
@objective(mission_elevator_boss_objective)
squad sniper_boss_right_squad
@objective(mission_elevator_boss_objective)
squad boss_kill_squad
action_point boss_teleport_point_set
object elevator_shade_spawn_in_object
performance shade_machine
taken_fx_controller taken_fx_controller_ball
specops_elevator specops_ball_elevator_a
specops_elevator specops_ball_elevator_b
specops_elevator specops_ball_elevator_c
trigger_volume elevator_spawn_volume
player_trigger elevator_spawn_trigger bind(elevator_spawn_volume)
trigger_volume remove_elevator_squad_volume
player_trigger remove_elevator_squad_trigger bind(remove_elevator_squad_volume)
trigger_volume ambush_volume
player_trigger ambush_trigger bind(ambush_volume)
trigger_volume midsecton_spawn_volume
player_trigger midsecton_spawn_trigger bind(midsecton_spawn_volume)
trigger_volume spawn_ring_volume
player_trigger spawn_ring_trigger bind(spawn_ring_volume)
trigger_volume taken_ring_spawn_volume
player_trigger taken_ring_spawn_trigger bind(taken_ring_spawn_volume)
trigger_volume lift_spawn_volume
player_trigger lift_spawn_trigger bind(lift_spawn_volume)
trigger_volume boss_volume
player_trigger boss_trigger bind(boss_volume)
bool boss_spawned = false

@startup()
script sc_ball_main():
    taken_fx_controller_ball.create(0)
    elevator_squad.set_task("elevator")
    elevator_squad.place()
    sc_elevator.wake()
    sc_remove_elevator_squad.wake()
    sc_ambush.wake()
    sc_midsection.wake()
    sc_ring.wake()
    sc_taken_ring.wake()
    sc_lift.wake()
    sc_boss_fight.wake()

# the Taken at the foot of the ball: their effects come up as the player
# nears and go as the last of them dies
script sc_elevator():
    sleep_until(elevator_spawn_trigger.is_triggered())
    taken_fx_controller_ball.set_intensity(0.9)
    sleep_until(elevator_squad.alive_count() == 0)
    taken_fx_controller_ball.set_intensity(0)

script sc_remove_elevator_squad():
    sleep_until(remove_elevator_squad_trigger.is_triggered())
    elevator_squad.remove()

script sc_ambush():
    sleep_until(ambush_trigger.is_triggered())
    sleep(1)
    sniper_ambush_squad02.set_task("sniper_ambush02")
    lower_ambush_squad.set_task("0x3798F91C")
    sniper_ambush_squad02.place()
    lower_ambush_squad.place()
    taken_fx_controller_ball.set_intensity(0.9)
    sleep(1)
    sniper_ambush_squad03.set_task("sniper_ambush03")
    anchor_ambush_squad.set_task("0xD7137F3B")
    sniper_ambush_squad03.place()
    anchor_ambush_squad.place()

script sc_midsection():
    sleep_until(midsecton_spawn_trigger.is_triggered())
    sleep(1)
    taken_mid_squad01.set_task("0x1B4204DD")
    taken_mid_squad02.set_task("0x58AC582E")
    sniper_mid_lower_squad.set_task("0x314759DF")
    sniper_mid_upper_squad.set_task("0xB962EB7E")
    fallen_mid_squad.set_task("0xF511FD9C")
    anchor_mid_squad.set_task("0x49FF7931")
    for sq in [taken_mid_squad01, taken_mid_squad02, sniper_mid_lower_squad, sniper_mid_upper_squad, fallen_mid_squad, anchor_mid_squad]:
        sq.place()

# the ring: the Fallen come in as the effects drop, which come back up 2 s
# later; the first phalanx followed 14 s on in the one run
script sc_ring():
    sleep_until(spawn_ring_trigger.is_triggered())
    sleep(1)
    taken_fx_controller_ball.set_intensity(0)
    fallen_ring_squad01.set_task("0x801C0CCE")
    fallen_ring_squad02.set_task("0x3F1BCD75")
    sniper_ring_squad.set_task("0x3F1BCD76")
    for sq in [fallen_ring_squad01, fallen_ring_squad02, sniper_ring_squad]:
        sq.place()
    sleep(2)
    taken_fx_controller_ball.set_intensity(0.9)
    sleep(11)
    phalanx_ring_squad01.set_task("0x40F70F05")
    phalanx_ring_squad01.place()

# the second phalanx, 6.6 s after its trigger in the one run
script sc_taken_ring():
    sleep_until(taken_ring_spawn_trigger.is_triggered())
    sleep(6.5)
    phalanx_ring_squad02.set_task("0x303ED33D")
    phalanx_ring_squad02.place()

script sc_lift():
    sleep_until(lift_spawn_trigger.is_triggered())
    sleep(0.5)
    lift_squad.set_task("0xF6C179C4")
    lift_sniper_squad.set_task("0xDF90B4BA")
    lift_anchor_squad.set_task("0x4E8C5BB6")
    boss_kill_squad.set_task("0x2AD53873")
    for sq in [lift_squad, lift_sniper_squad, lift_anchor_squad, boss_kill_squad]:
        sq.place()

# woken by the boss phase: the lift's last squad goes, the boss spawns in
# with its performance and 8 s on teleports to its first point
script sc_boss_spawn_in():
    boss_kill_squad.remove()
    elevator_shade_spawn_in_object.create()
    elevator_shade_spawn_in_object.set_device_position(1)
    boss_squad.set_task("0xFF7D52E9")
    boss_squad.place()
    shade_machine.start_performance("0xF6E02B5F")
    boss_spawned = true
    sleep(0.5)
    boss_squad.set_task("0xF9137584")
    boss_squad__boss.set_channel_scalar("boss_phase", 0)
    sleep(7.5)
    boss_squad__boss.execute(cs_boss_teleport(boss_teleport_point_set, 2))

# the fight: 3 s after the boss trigger the boss takes its next tasks and
# teleports again, and 6 s later its psions come in; the Taken effects go a
# second after the boss dies
script sc_boss_fight():
    sleep_until(boss_spawned and boss_trigger.is_triggered())
    sleep(3)
    boss_squad.set_task("0xD3E53CB6")
    boss_squad.set_task("0xB4C16B3A")
    boss_squad__boss.execute(cs_boss_teleport(boss_teleport_point_set, 4))
    sleep(6)
    for sq in [psion_boss_squad01, psion_boss_squad02, psion_boss_squad03]:
        sq.set_task("0x66884E1D")
        sq.place()
    sleep_until(boss_is_dead())
    sleep(1)
    taken_fx_controller_ball.set_intensity(0)

def boss_is_dead():
    return boss_spawned and not boss_squad__boss.is_alive()

command_script cs_boss_teleport(points, index):
    point_targeted_ability("teleport", "0xCBFDCA32", points, index)
