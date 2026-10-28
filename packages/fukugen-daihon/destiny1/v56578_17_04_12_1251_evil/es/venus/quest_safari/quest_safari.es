# es\venus\quest_safari\quest_safari.es
#
# The Vex oracles quest: from the headlands through the warp ruins and the
# baby ruins to the raid bridge, break the Vex security nodes (the oracles)
# under their Fallen guards, then kill the captains and their adds. The root
# puts the lifetime in pregame and runs the music and the Ghost's lines; the
# phases are the missions beside it, run in order. Mission file names are ours.
#
#   quest_safari_mission1.esp  the headlands: wait for the players
#   quest_safari_mission2.esp  the baby ruins: get to the trough
#   quest_safari_mission3.esp  the raid bridge: the vault, the trough, the oracles
#   quest_safari_mission4.esp  the raid bridge: the captains
#   quest_safari_mission5.esp  the outro
#
# The warp ruins' Fallen are unknown_82884527's, the raid bridge's fights
# unknown_f300fb1f's. Authored from one retail 2.3.1 capture for the 1.33
# build (tiger-packet-analysis docs/missions/quest_safari.md): every wait is
# that run's, unconfirmed.

@activity_bundle("quest_safari")
# The player spawns in the public headlands (bubble 10, region 80) at the GAS's
# spawn 5F17FAF0 and walks the warp ruins (28) and the baby ruins (2) to the
# raid bridge (16), where the last three phases play. The region transitions
# are the ones the GAS named once the client had been there; after the first
# wipe the raid bridge's became 5D45051D, the phase's checkpoint.
@activity("quest_safari")
@start_slice("headlands", "phase_headlands")
@phase("phase_headlands", "headlands")
@phase("phase_baby_ruins", "baby_ruins")
@phase("phase_raid_bridge", "raid_bridge")
@phase("phase_raid_bridge_boss", "raid_bridge")
@phase("phase_raid_bridge_end", "raid_bridge")
@spawn_transition(0x5F17FAF0)
@region_spawn_transition(80, 0x5F17FAF0)
@region_spawn_transition(224, 0x0385BDB2)
@region_spawn_transition(16, 0x575C33A4)
@region_spawn_transition(128, 0xD008C72E)

quest_safari_mission1 phase_headlands
quest_safari_mission2 phase_baby_ruins
quest_safari_mission3 phase_raid_bridge
quest_safari_mission4 phase_raid_bridge_boss
quest_safari_mission5 phase_raid_bridge_end
sequence landing_dialog
sequence headlands_exit_dialog
sequence warp_ruins_enter_dialog
sequence warp_ruins_exit_dialog
sequence raid_bridge_enter_dialog
sequence oracle_1_dialog
sequence oracle_2_dialog
sequence oracle_3_dialog
sequence oracle_last_dialog
sequence fallen_kill_dialog
sequence mission_done_dialog
sequence music_intro
sequence music_cue1
sequence music_outro

@startup()
script ss_quest_safari():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)

@startup()
# Once the player is in: the intro music, the first section of the cue, and
# the lines along the way, all in the same frame (each line waits for its own
# volume on the client).
script sc_intro():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    landing_dialog.start()
    headlands_exit_dialog.start()
    warp_ruins_enter_dialog.start()
    warp_ruins_exit_dialog.start()
    raid_bridge_enter_dialog.start()
    music_intro.start()
    music_cue1.start()
    music_cue1.set_switch_mask(1)
