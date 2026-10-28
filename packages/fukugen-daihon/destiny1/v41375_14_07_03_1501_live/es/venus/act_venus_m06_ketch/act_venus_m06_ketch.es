# es\venus\act_venus_m06_ketch\act_venus_m06_ketch.es
#
# Scourge of Winter, the sixth Venus story mission: from the shattered coast
# through the Fallen caldera to the Thieves' Den, where the Ghost picks up
# Draksis' trail and the players kill his major vandals, then out to the dock,
# through the Winter ketch and up to its throne to kill the captain. The root
# puts the lifetime in pregame; the phases are the missions beside it, run in
# order. Mission file names are ours.
#
#   act_venus_m06_ketch_mission1.esp  the Thieves' Den: find and kill the majors
#   act_venus_m06_ketch_mission2.esp  the dock: get to the ketch and inside
#   act_venus_m06_ketch_mission3.esp  through the ketch to the throne
#   act_venus_m06_ketch_mission4.esp  the captain
#   act_venus_m06_ketch_mission5.esp  the outro
#
# The areas' encounters are scripts of their own:
# es\venus\thieves_den\enc_thieves_den_m06.es,
# es\venus\fallen_dock\enc_fallen_dock_m06.es and
# es\venus\ketch\enc_ketch_m06.es; unknown_9ed3bc2b beside this file holds
# the music and the Ghost's lines. The throne room's door is the kill
# phase's, but it works while the goto phase runs, so the root drives it.
# Authored from one retail 2.3.1 capture (tiger-packet-analysis
# docs/missions/act_venus_m06_ketch.md): every wait is that run's,
# unconfirmed.

@activity_bundle("act_venus_m06_ketch")
# The player spawns in baby_shat (24, bubble 3 state 0) at the GAS's spawn
# FFBA6F9C and walks through the caldera (72) to the Thieves' Den (184); the
# lifetime runs the first phase in the den, the second on the dock (48) and
# the rest in the ketch (88). The region transitions are the ones the GAS
# named once the client had been there.
@activity("act_venus_m06_ketch")
@start_slice("baby_shat")
@phase("phase_thieves_den_hunt_kell", "thieves_den")
@phase("phase_ketch_infiltrate", "dock")
@phase("phase_ketch_goto_throne", "ketch")
@phase("phase_ketch_kill_captain", "ketch")
@phase("phase_ketch_outro", "ketch")
@spawn_transition(0xFFBA6F9C)
@region_spawn_transition(24, 0xFFBA6F9C)
@region_spawn_transition(72, 0xFFD8E61D)
@region_spawn_transition(184, 0x4E5B00C1)
@region_spawn_transition(48, 0x23F1A6D9)
@region_spawn_transition(88, 0x4F6A4D44)

act_venus_m06_ketch_mission1 phase_thieves_den_hunt_kell
act_venus_m06_ketch_mission2 phase_ketch_infiltrate
act_venus_m06_ketch_mission3 phase_ketch_goto_throne
act_venus_m06_ketch_mission4 phase_ketch_kill_captain
act_venus_m06_ketch_mission5 phase_ketch_outro
encounter_handle enc_ketch_m06
sequence md_vn06_020_20
sequence md_vn06_020_40

@startup()
script ss_venus_m06_ketch():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)

@startup()
# The throne room's door stands from the ketch's load and opens once the
# throne guard comes out (on the wire six seconds after them, a moment after
# the client's report on the door, so it follows the players). When a
# player is through it shuts behind them, the respawn moves into the throne
# room and the Ghost's dock line gives way to his throne line.
script sc_throne_door():
    throne = phase_ketch_kill_captain
    sleep_until(enc_ketch_m06.ketch_entered)
    throne.o_door.create()
    sleep_until(enc_ketch_m06.throne_alerted)
    sleep(6)
    throne.o_door.set_device_position(1)
    sleep_until(throne.pm_lock_door.test_any_inside())
    throne.o_door.set_device_position(0)
    throne.tg_boss_fight_respawn.activate()
    md_vn06_020_20.stop()
    md_vn06_020_40.start()
