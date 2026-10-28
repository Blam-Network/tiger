# es\hiveship\mission_touchdown\unknown_0c6ea3a4.es
#
# Touchdown's breech (bundle 0C6EA3A4, file name unknown; bubble 1, the
# activity's own). The Cabal and the Hive are already fighting over the
# breech as the bubble starts, the stern door half open. The Ghost talks as
# the players come up to it, and three Cabal cutters fly in over the
# trench, open up and leave again. The missions wake the rest:
#
#   sc_assault          (mission 4, the view over the breech) both sides push
#   sc_link_deployed    (mission 4, the link is down) the Cabal flag, a Hive wave
#   sc_counterattack    (mission 5) the Cabal counterattack: the tank out of the
#                       stern door, the second wave, the alarm, the Hive's third wave
#
# and mission 5 waits on cabal_defeated(). One retail 2.3.1 run: every hold
# is that run's gap, unconfirmed. No placement of an anonymous squad is on
# the wire: each is placed with its first task. Retail cleared the eliminate
# objective with a Cabal squad still taking tasks, so the clear waits on the
# tank alone (which the objective's start makes vulnerable); a run with the
# tank's kill on the wire would confirm it.

@activity_bundle(0x0C6EA3A4)

objective assault_objective
@objective(assault_objective)
squad goliath_squad
squad_member goliath_squad__pilot
@objective(assault_objective)
squad cabal_w1s1_squad
@objective(assault_objective)
squad cabal_w1s2_squad
@objective(assault_objective)
squad cabal_w1s3_squad
@objective(assault_objective)
squad cabal_w1s4_squad
@objective(assault_objective)
squad cabal_w2s1_squad
@objective(assault_objective)
squad cabal_w2s2_squad
@objective(assault_objective)
squad cabal_w2s3_squad
@objective(assault_objective)
squad cabal_w2s4_squad
@objective(assault_objective)
squad hive_intro_squad
@objective(assault_objective)
squad hive_w1s1_squad
@objective(assault_objective)
squad hive_w1s2_squad
@objective(assault_objective)
squad hive_w2s1_squad
@objective(assault_objective)
squad hive_w3s2_squad
@objective(assault_objective)
squad hive_w3s3_squad
@objective(assault_objective)
squad hive_w3s4_squad
squad cutter1_squad
squad_member cutter1_squad__pilot
squad cutter2_squad
squad_member cutter2_squad__pilot
squad cutter3_squad
squad_member cutter3_squad__pilot
control_point_set tank_enter_sequence
control_point_set cutter1_enter_sequence
control_point_set cutter1_exit_sequence
control_point_set cutter2_enter_sequence
control_point_set cutter2_exit_sequence
control_point_set cutter3_enter_sequence
control_point_set cutter3_exit_sequence
object door_stern
object flag
object playership_target
object_filter goliath_immune_filter
sequence cabal_alarm_sequence
sequence cabal_door_tank_sequence
trigger_volume assault_kickoff_volume
player_trigger assault_kickoff_trigger bind(assault_kickoff_volume)
trigger_volume trench_approach_volume
player_trigger trench_approach_trigger bind(trench_approach_volume)
encounter_handle unknown_5476e5b1

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def cabal_defeated():
    return goliath_squad.alive_count() == 0

@startup()
script sc_breech():
    door_stern.create()
    door_stern.set_device_position(0.4)
    for sq in [hive_intro_squad, hive_w1s1_squad, hive_w1s2_squad]:
        place_on_task(sq, "0x44E90289")
    for sq in [cabal_w1s1_squad, cabal_w1s2_squad, cabal_w1s3_squad]:
        place_on_task(sq, "0xE5135CA6")
    place_on_task(cabal_w1s4_squad, "0xF420502A")

@startup()
script sc_kickoff_dialog():
    sleep_until(assault_kickoff_trigger.is_triggered())
    sleep(1)
    unknown_5476e5b1.tch0120_ghost_dialogue.start()

@startup()
# the cutters come in over the trench, open their doors and pull away
script sc_cutters():
    sleep_until(trench_approach_trigger.is_triggered())
    sleep(2)
    for sq in [cutter1_squad, cutter2_squad, cutter3_squad]:
        sq.place()
    cutter1_squad__pilot.execute(cs_cutter_enter(cutter1_enter_sequence))
    cutter2_squad__pilot.execute(cs_cutter_enter(cutter2_enter_sequence))
    cutter3_squad__pilot.execute(cs_cutter_enter(cutter3_enter_sequence))
    sleep(16)
    cutter2_squad__pilot.execute(cs_cutter_exit(cutter2_exit_sequence))
    cutter3_squad__pilot.execute(cs_cutter_exit(cutter3_exit_sequence))
    sleep(1)
    cutter1_squad__pilot.execute(cs_cutter_exit(cutter1_exit_sequence))

script sc_assault():
    for sq in [hive_intro_squad, hive_w1s1_squad, hive_w1s2_squad]:
        sq.set_task("0x091F7F8C")
    for sq in [cabal_w1s1_squad, cabal_w1s2_squad, cabal_w1s3_squad]:
        sq.set_task("0x5AAD454A")

script sc_link_deployed():
    sleep(1)
    flag.create()
    sleep(4)
    place_on_task(hive_w2s1_squad, "0xF42F359B")

script sc_counterattack():
    for sq in [hive_w1s1_squad, hive_w1s2_squad]:
        sq.set_task("0xFAAE66F7")
    for sq in [cabal_w1s1_squad, cabal_w1s2_squad, cabal_w1s3_squad]:
        sq.set_task("0xD09F3EB8")
    goliath_squad.set_task("0x56BE3A40")
    goliath_squad.place()
    goliath_squad__pilot.execute(cs_tank_enter(tank_enter_sequence))
    door_stern.set_device_position(1)
    cabal_door_tank_sequence.start()
    sleep(1)
    for sq in [cabal_w2s1_squad, cabal_w2s2_squad, cabal_w2s3_squad]:
        place_on_task(sq, "0xD09F3EB8")
    sleep(8)
    playership_target.create()
    cabal_alarm_sequence.start()
    sleep(5)
    playership_target.delete_object()
    sleep(14)
    place_on_task(hive_w3s3_squad, "0x574867BF")
    place_on_task(hive_w3s4_squad, "0x574867BF")
    place_on_task(cabal_w2s4_squad, "0xF420502A")
    sleep(19)
    place_on_task(hive_w3s2_squad, "0xFAAE66F7")
    sleep(1)
    hive_w3s4_squad.set_task("0xC6E18C7D")

command_script cs_cutter_enter(path):
    snap_to(path, 0)
    ability("dropship", "enter_1")
    move_to(path, 1, true)
    set_channel_scalar("doors", 1)
    terminate_delay(5)

command_script cs_cutter_exit(path):
    move_to(path, 0, false)
    set_channel_scalar("doors", 0)
    move_to(path, 1, false)
    ability("dropship", "exit_1")

# the tank rolls out of the stern door and down onto the breech
command_script cs_tank_enter(path):
    snap_to(path, 0)
    set_flag(3, 3)
    move_to(path, 1, true)
    face(path, 1)
    sleep(2)
    move_to(path, 2, false)
    set_flag(3, 0)
    move_to(path, 3, false)
