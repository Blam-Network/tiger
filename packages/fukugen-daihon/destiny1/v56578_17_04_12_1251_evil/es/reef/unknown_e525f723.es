# es\reef\unknown_e525f723.es
#
# The Vestian Outpost's people (social_landing): Petra and her guards, Variks,
# the Eye, the postmaster, the Cryptarch's apprentice, the bounty master, and
# the Queen's and the dock's guards stand at their posts from the start, each
# on their idle performance; one of the three servitor balls is out. Petra
# talks every nine and a half seconds, one of her two lines at random, and
# her two guards play along. Two Awoken walk their rounds, stopping at each
# post for nine seconds. Awoken ships fly past, one every few seconds. Xur
# never came in any capture. Names that were never cracked are written as
# "0x" literals. Pooled over seven visits; the patrols start at a different
# post each visit.

@activity_bundle(0xE525F723)

objective patrolling_awoken_obj
squad petra_squad
squad variks_squad
squad eye_squad
squad postmaster_squad
squad queens_door_guards
squad cryptarch_apprentice_squad
squad bounty_board_squad
squad docking_port_fotc_squad
squad patrolling_awoken_main
squad patrolling_awoken_dock
performance p_petra
performance p_left_guard
performance p_keyboard_guard
performance petra_guard03_performance
performance petra_guard04_performance
performance variks_performance
performance variks_guard_performance
performance eye_performance
performance postmaster_performance
performance apprentice_performance
performance apprentice_guard_performance
performance bounty_performance
performance fotc_door_guard1_performance
performance fotc_door_guard2_performance
performance awoken_door_guard1_performance
performance patrolling_awoken_main_performance
performance patrolling_awoken_dock_performance
timer petra_talk_timer
object servitor_ball_a
object servitor_ball_b
object servitor_ball_c
cinematic reef_ship_flyby_awoken01
cinematic reef_ship_flyby_awoken02
cinematic reef_ship_flyby_awoken03
cinematic reef_ship_flyby_awoken04
cinematic reef_ship_flyby_awoken05
cinematic reef_ship_flyby_awoken06
cinematic reef_ship_flyby_awoken07

@startup()
script sc_outpost_main():
    for sq in [petra_squad, variks_squad, eye_squad, postmaster_squad, queens_door_guards, cryptarch_apprentice_squad, bounty_board_squad, docking_port_fotc_squad]:
        sq.place()
    p_petra.start_performance("0x970C71A4")
    p_left_guard.start_performance("0xAB40C90B")
    p_keyboard_guard.start_performance("0x40127D73")
    petra_guard03_performance.start_performance("0xE51D73FD")
    petra_guard04_performance.start_performance("0x40127D73")
    variks_performance.start_performance("0xAA18865F")
    variks_guard_performance.start_performance("0x780A6C55")
    eye_performance.start_performance("0xE51D73FD")
    postmaster_performance.start_performance("0x780A6C55")
    apprentice_performance.start_performance("0xE51D73FD")
    apprentice_guard_performance.start_performance("0x780A6C55")
    bounty_performance.start_performance("0x1448DB86")
    fotc_door_guard1_performance.start_performance("0x780A6C55")
    fotc_door_guard2_performance.start_performance("0x780A6C55")
    awoken_door_guard1_performance.start_performance("0x3D4F466F")
    balls = [servitor_ball_a, servitor_ball_b, servitor_ball_c]
    balls[mathlib.random_int_inclusive(0, 2)].create()
    sc_petra_talk.wake()
    sc_patrol_main.wake()
    sc_patrol_dock.wake()
    sc_flybys.wake()

script sc_petra_talk():
    petra_talk_timer.start()
    while true:
        sleep(9.5)
        line = "0x811F1427"
        if mathlib.random_int_inclusive(0, 1) == 1:
            line = "0xFB63255F"
        p_petra.cue_performance(line)
        p_left_guard.cue_performance(line)
        p_keyboard_guard.cue_performance(line)

script sc_patrol_main():
    patrol(patrolling_awoken_main, patrolling_awoken_main_performance, ["0xEC07E528", "0xC0E4C096", "0xD7D39C68", "0xAFF0971E", "0x249E368E", "0x27A44B86", "0xBDC6A75E"])

script sc_patrol_dock():
    patrol(patrolling_awoken_dock, patrolling_awoken_dock_performance, ["0x313F6118", "0x304E6A04", "0xD7BDB0DC", "0x7159C2ED", "0x9A362235", "0xDDAC709A", "0x59FE5754", "0x328328C4", "0xD6EF4BB8"])

script sc_flybys():
    flybys = [reef_ship_flyby_awoken01, reef_ship_flyby_awoken02, reef_ship_flyby_awoken03, reef_ship_flyby_awoken04, reef_ship_flyby_awoken05, reef_ship_flyby_awoken06, reef_ship_flyby_awoken07]
    while true:
        flybys[mathlib.random_int_inclusive(0, 6)].start()
        sleep(2 + mathlib.random_real(8))

# A walker's round: each post's task in turn, from a random one; at each post
# it plays its stop for nine seconds and moves on a second later.
def patrol(sq, stop, tasks):
    sq.set_objective(patrolling_awoken_obj)
    i = mathlib.random_int_inclusive(0, len(tasks) - 1)
    sq.set_task(tasks[i])
    sq.place()
    while true:
        sleep_until(sq.count_at_firing_area() > 0)
        stop.start_performance("0xC9D5FDBF")
        sleep(9)
        stop.start_performance("")
        sleep(1)
        i = (i + 1) % len(tasks)
        sq.set_task(tasks[i])
