# es\cosmo\mission_pact\unknown_66c01eb9.es
#
# The command building in the pact mission. The three captains (Devils,
# Wolves, Kings), their Servitor and the locker room's Fallen stand as the
# player comes in; each room's Fallen go in as the player works through the
# lunchroom, the tight room and the two levels. When the captains' fight
# starts (mission 4 calls captains_fight) the captains break off; crossing
# their room sends in the first adds, and the captains turn on the player one
# after another; each death sends the next wave. Names that were never
# cracked are written as "0x" literals. From two retail captures: the rooms'
# triggers and the captains' waves agree across both (the captains died in
# another order in each); the lunchroom's rule and the waits inside each
# wave are the first run's.

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
player_trigger pt_lunchroom_spawn
player_trigger pt_lunchroom_ambush_spawn
player_trigger pt_tightroom_spawn
player_trigger pt_2levels_lower_spawn
player_trigger pt_2levels_upper_spawn
trigger_volume tv_2levels_upper_suppress
player_monitor pm_2levels_upper_suppress bind(tv_2levels_upper_suppress)
player_trigger captains_flee_player_trigger
performance boss_devils_flee_performance
performance boss_wolves_flee_performance
performance boss_kings_flee_performance
bool devils_joined = false

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

# The lunchroom's Fallen come out as the locker room's are nearly down, or
# as the player walks into the lunchroom past them (the second run); the
# other two squads 2 s later, or as the player reaches the ambush.
script sc_lunchroom():
    sleep_until(sq_fallen_lockerroom01.alive_count() > 1)
    sleep_until(sq_fallen_lockerroom01.alive_count() <= 1 or pt_lunchroom_spawn.is_triggered())
    if sq_fallen_lockerroom01.alive_count() <= 1:
        sq_fallen_lockerroom01.set_task("task_7")
    sq_fallen_lunchroom01.set_task("task_5")
    sq_fallen_lunchroom01.place()
    sleep_until_timeout(pt_lunchroom_ambush_spawn.is_triggered(), 2)
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
    sc_2levels_lower01_fallback.wake()

# The two levels' squads move on as each is wiped, not on a clock: the first
# run's flipped 0.3 s after their last deaths, the second run's player ran
# through without a kill and none of them moved.
script sc_2levels_lower01_fallback():
    sleep_until(sq_fallen_2levels_lower01.alive_count() > 0)
    sleep_until(sq_fallen_2levels_lower01.alive_count() == 0)
    sq_fallen_2levels_lower01.set_task("0x8F0587DF")

# The upper level's Fallen go in; once the lower level's second squad is
# wiped, both lower squads fall back up to them.
script sc_2levels_upper():
    sleep_until(pt_2levels_upper_spawn.is_triggered())
    sq_fallen_2levels_upper02.set_task("task")
    sq_fallen_2levels_upper03.set_task("0x8F0587DB")
    sq_fallen_2levels_upper02.place()
    sq_fallen_2levels_upper03.place()
    sc_2levels_upper01_press.wake()
    sleep_until(sq_fallen_2levels_lower02.alive_count() > 0)
    sleep_until(sq_fallen_2levels_lower02.alive_count() == 0)
    sq_fallen_2levels_lower01.set_task("0x8F0587DC")
    sq_fallen_2levels_lower02.set_task("0x8F0587DC")

# The upper level's first squad presses once the player is up there and it
# is wiped.
script sc_2levels_upper01_press():
    sleep_until(sq_fallen_2levels_upper01.alive_count() > 0)
    sleep_until(pm_2levels_upper_suppress.test_any_inside() and sq_fallen_2levels_upper01.alive_count() == 0)
    sq_fallen_2levels_upper01.set_task("0x8F0587D8")

def captains_fight():
    boss_devils_flee_performance.cue_performance("0xD41F5C1C")
    boss_wolves_flee_performance.cue_performance("0xD41F5C1C")
    boss_kings_flee_performance.cue_performance("0xD41F5C1C")
    sq_fallen_servitor.set_task("0x8E05866A")
    sc_captains.wake()

# The first adds go in once the captains have had 3 s to break off and the
# player has crossed their room (both runs: 2.9 s after the cue; the first
# run's player crossed 0.1 s before, the second's 3.8 s before). The captains
# join 2.6 s later, a beat apart. Each captain's death sends the next wave:
# the first the wolves' flankers, the second the Kings' reinforcements, and
# the Kings' captain's own death pulls the wolves' adds back in. With the
# third the adds fall back.
script sc_captains():
    sleep(2.9)
    sleep_until(captains_flee_player_trigger.is_triggered())
    sq_fallen_servitor.set_task("task_1")
    sq_adds_devils01.set_task("0x94058FF8")
    sq_adds_kings_left01.set_task("0x8E05866B")
    sq_adds_kings_right01.set_task("0x8E058669")
    sq_adds_wolves_center01.set_task("0x8D0584F1")
    for sq in [sq_adds_devils01, sq_adds_kings_left01, sq_adds_kings_right01, sq_adds_wolves_center01]:
        sq.place()
    sc_first_captain_dead.wake()
    sc_second_captain_dead.wake()
    sc_kings_captain_dead.wake()
    sc_last_captain_dead.wake()
    sleep(2.6)
    sq_boss_wolves.set_objective(obj_fallen_command_lookout)
    sleep(0.4)
    sq_boss_kings.set_objective(obj_fallen_command_lookout)
    if captains_dead() == 0:
        sq_boss_kings.set_task("task_2")
    else:
        sq_boss_kings.set_task("0x94058FF5")
    sleep(0.4)
    if not devils_joined:
        devils_joined = true
        sq_boss_devils.set_objective(obj_fallen_command_lookout)
        sq_boss_devils.set_task("0x94058FF9")

# A Devils' captain killed before he joins takes his squad onto the
# lookout objective as he falls (the first run's, 0.5 s after his death).
script sc_first_captain_dead():
    sleep_until(captains_dead() >= 1)
    if not devils_joined and not sq_boss_devils__captain.is_alive():
        devils_joined = true
        sq_boss_devils.set_objective(obj_fallen_command_lookout)
    sq_adds_kings_left01.set_task("0x94058FFE")
    sq_adds_kings_right01.set_task("0x94058FFE")
    sq_adds_wolves_left01.set_task("0x8E058668")
    sq_adds_wolves_right01.set_task("0x8D0584FD")
    sq_adds_wolves_left01.place()
    sq_adds_wolves_right01.place()
    seq_fallen_wave_announce4.start()
    seq_fallen_wave_announce5.start()
    sq_boss_kings.set_task("0x94058FF5")

script sc_second_captain_dead():
    sleep_until(captains_dead() >= 2)
    sq_adds_kings_left02.set_task("0x94058FFB")
    sq_adds_kings_right02.set_task("0x94058FFB")
    sq_adds_kings_left02.place()
    sq_adds_kings_right02.place()
    seq_fallen_wave_announce2.start()
    seq_fallen_wave_announce3.start()

script sc_kings_captain_dead():
    sleep_until(not sq_boss_kings__captain.is_alive())
    sq_adds_wolves_center01.set_task("0x8D0584FE")
    sq_adds_wolves_left01.set_task("0x8D0584FE")
    sq_adds_wolves_right01.set_task("0x8D0584FE")

script sc_last_captain_dead():
    sleep_until(captains_dead() == 3)
    for sq in [sq_adds_devils01, sq_adds_kings_left01, sq_adds_kings_right01, sq_adds_wolves_center01, sq_adds_wolves_left01, sq_adds_wolves_right01, sq_adds_kings_left02, sq_adds_kings_right02]:
        if sq.alive_count() > 0:
            sq.set_task("0x8D0584F0")

def captains_dead():
    dead = 0
    for captain in [sq_boss_devils__captain, sq_boss_wolves__captain, sq_boss_kings__captain]:
        if not captain.is_alive():
            dead = dead + 1
    return dead
