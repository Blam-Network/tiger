# es\cosmo\mission_pact\unknown_66c01eb9.es
#
# The command building in the pact mission. The three captains (Devils,
# Wolves, Kings), their Servitor and the locker room's Fallen stand as the
# player comes in; each room's Fallen go in as the player works through the
# lunchroom, the tight room and the two levels. When the captains' fight
# starts (mission 4 calls captains_fight) the captains break off; crossing
# their room sends in the first adds, and the captains turn on the player one
# after another. Once the Kings' captain is gone the second adds come. Names
# that were never cracked are written as "0x" literals. From one retail
# capture, so every wait here is that run's.

@activity_bundle(0x66C01EB9)

objective obj_fallen_command
objective obj_fallen_command_lookout
squad sq_fallen_lockerroom01
squad sq_fallen_lunchroom01
squad sq_fallen_lunchroom02
squad sq_fallen_lunchroom03
squad sq_fallen_2levels_lower01
squad sq_fallen_2levels_lower02
squad sq_fallen_2levels_upper01
squad sq_fallen_2levels_upper02
squad sq_fallen_2levels_upper03
squad sq_fallen_servitor
squad_member sq_fallen_servitor__servitor
squad sq_boss_devils
squad_member sq_boss_devils__captain
squad sq_boss_wolves
squad_member sq_boss_wolves__captain
squad sq_boss_kings
squad_member sq_boss_kings__captain
squad sq_adds_sword_vandals
squad sq_adds_devils01
squad sq_adds_kings_left01
squad sq_adds_kings_right01
squad sq_adds_wolves_center01
squad sq_adds_wolves_left01
squad sq_adds_wolves_right01
squad sq_adds_kings_left02
squad sq_adds_kings_right02
squad sq_adds_ammo_left01
squad sq_adds_ammo_right01
squad sq_t2_adds_kings_left01
squad sq_t2_adds_kings_right01
squad sq_t2_adds_wolves_center01
squad sq_t2_adds_wolves_left01
squad sq_t2_adds_wolves_right01
sequence seq_fallen_wave_announce2
sequence seq_fallen_wave_announce3
sequence seq_fallen_wave_announce4
sequence seq_fallen_wave_announce5
player_trigger pt_tightroom_spawn
player_trigger pt_2levels_lower_spawn
player_trigger pt_2levels_upper_spawn
trigger_volume tv_2levels_upper_suppress
player_monitor pm_2levels_upper_suppress bind(tv_2levels_upper_suppress)
player_trigger captains_flee_player_trigger
performance boss_devils_flee_performance
performance boss_wolves_flee_performance
performance boss_kings_flee_performance

@startup()
script sc_command_main():
    for sq in [sq_fallen_lockerroom01, sq_fallen_lunchroom01, sq_fallen_lunchroom02, sq_fallen_lunchroom03, sq_fallen_2levels_lower01, sq_fallen_2levels_lower02, sq_fallen_2levels_upper01, sq_fallen_2levels_upper02, sq_fallen_2levels_upper03]:
        sq.set_objective(obj_fallen_command)
    for sq in [sq_fallen_servitor, sq_adds_sword_vandals, sq_adds_devils01, sq_adds_kings_left01, sq_adds_kings_right01, sq_adds_wolves_center01, sq_adds_wolves_left01, sq_adds_wolves_right01, sq_adds_kings_left02, sq_adds_kings_right02, sq_adds_ammo_left01, sq_adds_ammo_right01, sq_t2_adds_kings_left01, sq_t2_adds_kings_right01, sq_t2_adds_wolves_center01, sq_t2_adds_wolves_left01, sq_t2_adds_wolves_right01]:
        sq.set_objective(obj_fallen_command_lookout)
    sq_fallen_lockerroom01.set_task("task_4")
    sq_fallen_servitor.set_task("0x94058FFD")
    boss_devils_flee_performance.start_performance("0x9CC782E3")
    boss_wolves_flee_performance.start_performance("0xC8470319")
    boss_kings_flee_performance.start_performance("0xBFBE9A8D")
    sq_boss_kings.place()
    sq_boss_wolves.place()
    sq_fallen_lockerroom01.place()
    sq_boss_devils.place()
    sq_fallen_servitor.place()
    sc_lunchroom.wake()
    sc_tightroom.wake()
    sc_2levels_lower.wake()
    sc_2levels_upper.wake()

# The lunchroom's Fallen come out as the locker room's are nearly down.
script sc_lunchroom():
    sleep_until(sq_fallen_lockerroom01.alive_count() > 1)
    sleep_until(sq_fallen_lockerroom01.alive_count() <= 1)
    sq_fallen_lockerroom01.set_task("task_7")
    sq_fallen_lunchroom01.set_task("task_5")
    sq_fallen_lunchroom01.place()
    sleep(2)
    sq_fallen_lunchroom02.set_task("0x8F0587D7")
    sq_fallen_lunchroom03.set_task("0x8F0587D9")
    sq_fallen_lunchroom02.place()
    sq_fallen_lunchroom03.place()

script sc_tightroom():
    sleep_until(pt_tightroom_spawn.is_triggered())
    sq_fallen_2levels_lower01.set_task("0x8F0587DE")
    sq_fallen_2levels_upper01.set_task("0x8F0587DD")
    sq_fallen_2levels_lower01.place()
    sq_fallen_2levels_upper01.place()

script sc_2levels_lower():
    sleep_until(pt_2levels_lower_spawn.is_triggered())
    sq_fallen_2levels_lower02.set_task("0x8F0587DF")
    sq_fallen_2levels_lower02.place()
    sleep(2)
    sq_fallen_2levels_lower01.set_task("0x8F0587DF")

# The upper level's Fallen go in, the lower level's fall back up to them, and
# the upper level's first squad presses once the player is up there.
script sc_2levels_upper():
    sleep_until(pt_2levels_upper_spawn.is_triggered())
    sq_fallen_2levels_upper02.set_task("task")
    sq_fallen_2levels_upper03.set_task("0x8F0587DB")
    sq_fallen_2levels_upper02.place()
    sq_fallen_2levels_upper03.place()
    sleep(3)
    sq_fallen_2levels_lower01.set_task("0x8F0587DC")
    sq_fallen_2levels_lower02.set_task("0x8F0587DC")
    sleep_until(pm_2levels_upper_suppress.test_any_inside())
    sq_fallen_2levels_upper01.set_task("0x8F0587D8")

def captains_fight():
    boss_devils_flee_performance.cue_performance("0xD41F5C1C")
    boss_wolves_flee_performance.cue_performance("0xD41F5C1C")
    boss_kings_flee_performance.cue_performance("0xD41F5C1C")
    sq_fallen_servitor.set_task("0x8E05866A")
    sc_captains.wake()

script sc_captains():
    sleep_until(captains_flee_player_trigger.is_triggered())
    sq_fallen_servitor.set_task("task_1")
    sq_adds_devils01.set_task("0x94058FF8")
    sq_adds_kings_left01.set_task("0x8E05866B")
    sq_adds_kings_right01.set_task("0x8E058669")
    sq_adds_wolves_center01.set_task("0x8D0584F1")
    for sq in [sq_adds_devils01, sq_adds_kings_left01, sq_adds_kings_right01, sq_adds_wolves_center01]:
        sq.place()
    sleep(1)
    sq_boss_devils.set_objective(obj_fallen_command_lookout)
    sq_adds_kings_left01.set_task("0x94058FFE")
    sq_adds_kings_right01.set_task("0x94058FFE")
    sq_adds_wolves_left01.set_task("0x8E058668")
    sq_adds_wolves_right01.set_task("0x8D0584FD")
    sq_adds_wolves_left01.place()
    sq_adds_wolves_right01.place()
    seq_fallen_wave_announce4.start()
    seq_fallen_wave_announce5.start()
    sleep(1.4)
    sq_boss_wolves.set_objective(obj_fallen_command_lookout)
    sq_boss_kings.set_objective(obj_fallen_command_lookout)
    sq_boss_kings.set_task("0x94058FF5")
    sleep_until(not sq_boss_kings__captain.is_alive())
    sq_adds_kings_left02.set_task("0x94058FFB")
    sq_adds_kings_right02.set_task("0x94058FFB")
    sq_adds_kings_left02.place()
    sq_adds_kings_right02.place()
    seq_fallen_wave_announce2.start()
    seq_fallen_wave_announce3.start()
    sq_adds_wolves_center01.set_task("0x8D0584FE")
    sq_adds_wolves_left01.set_task("0x8D0584FE")
    sq_adds_wolves_right01.set_task("0x8D0584FE")

def captains_dead():
    dead = 0
    for captain in [sq_boss_devils__captain, sq_boss_wolves__captain, sq_boss_kings__captain]:
        if not captain.is_alive():
            dead = dead + 1
    return dead
