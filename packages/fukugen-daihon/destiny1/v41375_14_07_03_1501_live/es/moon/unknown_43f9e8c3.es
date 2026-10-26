# es\moon\unknown_43f9e8c3.es
#
# The launch tubes after mission 1 (the Moon's private bubble 3), loaded by
# the Moon patrol, the strikes and the story missions from
# act_moon_m3_lowercitadel on: the three gates, standing open, and the Hive
# in the court and down the tubes, each group brought in as a player walks
# past its trigger.
#
# The gates were out and open from world entry in all three missions that
# loaded it (act_moon_m3_lowercitadel, act_moon_m4_uppercitadel,
# act_moon_m5_strength, 2026-10-25). The Hive are from the one run that
# crossed the tubes (act_moon_m5_strength, 2026-10-25 19-30-30#1), so those
# rules are a single run's; each trigger put its squads in 0.5-1.6 s later:
# - at load: the court's upper and first lower squads;
# - pt_spawn_courtlow: the second lower squad;
# - pt_tube: the shuttle troopers and the first Thrall;
# - pt_spawn_tube_mid: the front and rear troopers and the second Thrall;
# - pt_spawn_tube_low: the upper rear troopers;
# - pt_tube_retreat: the third Thrall;
# - pt_arena_end: the centre Thrall at the end;
# - pt_exit: the exit Thrall.
# Bodies are the ones the server placed; tasks are the friendly objective's,
# by name.
# Left out: the hellpoint, gate and end squads and the ogre roar, never
# placed or played in a capture.

@activity_bundle(0x43F9E8C3)

object o_gate_intro
object o_gate_blocker
object o_gate_exit
objective obj_launchtubes_ch01_m03_friendly
trigger_volume tv_spawn_courtlow
player_trigger pt_spawn_courtlow bind(tv_spawn_courtlow)
trigger_volume tv_tube
player_trigger pt_tube bind(tv_tube)
trigger_volume tv_spawn_tube_mid
player_trigger pt_spawn_tube_mid bind(tv_spawn_tube_mid)
trigger_volume tv_spawn_tube_low
player_trigger pt_spawn_tube_low bind(tv_spawn_tube_low)
trigger_volume tv_tube_retreat
player_trigger pt_tube_retreat bind(tv_tube_retreat)
trigger_volume tv_arena_end
player_trigger pt_arena_end bind(tv_arena_end)
trigger_volume tv_exit
player_trigger pt_exit bind(tv_exit)
@member_counts({troopers: 2})
squad sq_court_high_a
@member_counts({troopers: 2, 0xFBDB79B4: 1})
squad sq_court_low_a
@member_counts({thrall: 2, 0xFBDB79B4: 1})
squad sq_court_low_b
@member_counts({troopers: 3, thrall: 0})
squad sq_tube_shuttle
squad sq_tube_thrall_a
@member_counts({troopers: 3})
squad sq_tube_front
@member_counts({troopers: 3, wizard: 1})
squad sq_tube_rear
@member_counts({thrall: 2})
squad sq_tube_thrall_b
squad sq_tube_rear_upper
@member_counts({thrall: 2})
squad sq_tube_thrall_c
@member_counts({thrall: 3, 0xE00ECB2C: 1})
squad sq_end_center_thrall
@member_counts({thrall: 3, 0xE00ECB2C: 1})
squad sq_end_exit_thrall

@startup()
script sc_main_thread():
    for gate in [o_gate_intro, o_gate_blocker, o_gate_exit]:
        gate.create()
        gate.set_device_position(1)
    place_on_task(sq_court_high_a, "0x9D50BEEF")
    place_on_task(sq_court_low_a, "0x99B86EDB")

@startup()
script sc_court_low():
    sleep_until(pt_spawn_courtlow.is_triggered())
    sleep(1)
    place_on_task(sq_court_low_b, "0x99B86EDB")

@startup()
script sc_tube():
    sleep_until(pt_tube.is_triggered())
    sleep(1)
    place_on_task(sq_tube_shuttle, "0x4780CD54")
    place_on_task(sq_tube_thrall_a, "0xAB04E10F")

@startup()
script sc_tube_mid():
    sleep_until(pt_spawn_tube_mid.is_triggered())
    sleep(1)
    place_on_task(sq_tube_front, "0x4780CD54")
    place_on_task(sq_tube_rear, "0x4780CD54")
    place_on_task(sq_tube_thrall_b, "0xAB04E10F")

@startup()
script sc_tube_low():
    sleep_until(pt_spawn_tube_low.is_triggered())
    sleep(1)
    place_on_task(sq_tube_rear_upper, "0x4780CD54")

@startup()
script sc_tube_retreat():
    sleep_until(pt_tube_retreat.is_triggered())
    sleep(1)
    place_on_task(sq_tube_thrall_c, "0xAB04E10F")

@startup()
script sc_arena_end():
    sleep_until(pt_arena_end.is_triggered())
    sleep(1)
    place_on_task(sq_end_center_thrall, "end_exit")

@startup()
script sc_exit():
    sleep_until(pt_exit.is_triggered())
    sleep(0.5)
    place_on_task(sq_end_exit_thrall, "end_exit")

def place_on_task(sq, task):
    sq.set_objective(obj_launchtubes_ch01_m03_friendly)
    sq.set_task(task)
    sq.place()
